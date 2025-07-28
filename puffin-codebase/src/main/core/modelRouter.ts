import { crashRecovery, ErrorContext } from './crashRecovery'
import { telemetry } from './telemetry'

export interface ModelConfig {
  name: string
  endpoint: string
  available: boolean
  priority: number
  capabilities: string[]
  maxTokens: number
  costPerToken?: number
  healthCheck: () => Promise<boolean>
}

export interface RoutingOptions {
  preferredModel?: string
  requiredCapabilities?: string[]
  maxRetries?: number
  fallbackToOffline?: boolean
  timeout?: number
}

export interface RoutingResult {
  selectedModel: ModelConfig
  fallbackUsed: boolean
  routingPath: string[]
  startTime: number
  totalAttempts: number
}

class ModelRouter {
  private models: Map<string, ModelConfig> = new Map()
  private healthCache: Map<string, { healthy: boolean; lastCheck: number }> = new Map()
  private routingHistory: Array<{ timestamp: string; route: string; success: boolean }> = []

  constructor() {
    this.initializeDefaultModels()
    this.startHealthMonitoring()
  }

  private initializeDefaultModels() {
    // Ollama local models
    this.registerModel({
      name: 'ollama-llama2',
      endpoint: 'http://127.0.0.1:11434',
      available: false,
      priority: 10,
      capabilities: ['chat', 'completion', 'local'],
      maxTokens: 4096,
      healthCheck: this.checkOllamaHealth.bind(this)
    })

    this.registerModel({
      name: 'ollama-codellama',
      endpoint: 'http://127.0.0.1:11434',
      available: false,
      priority: 9,
      capabilities: ['chat', 'completion', 'code', 'local'],
      maxTokens: 16384,
      healthCheck: this.checkOllamaHealth.bind(this)
    })

    this.registerModel({
      name: 'ollama-mistral',
      endpoint: 'http://127.0.0.1:11434',
      available: false,
      priority: 8,
      capabilities: ['chat', 'completion', 'local'],
      maxTokens: 8192,
      healthCheck: this.checkOllamaHealth.bind(this)
    })

    // Offline fallback model (simplified processing)
    this.registerModel({
      name: 'offline-fallback',
      endpoint: 'local://offline',
      available: true,
      priority: 1,
      capabilities: ['basic-text', 'offline'],
      maxTokens: 1024,
      healthCheck: async () => true
    })
  }

  registerModel(config: ModelConfig) {
    this.models.set(config.name, config)
    telemetry.trackEvent({
      type: 'system_event',
      category: 'model_router',
      action: 'model_registered',
      label: config.name,
      metadata: {
        endpoint: config.endpoint,
        capabilities: config.capabilities
      }
    })
  }

  private async checkOllamaHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  private startHealthMonitoring() {
    setInterval(async () => {
      await this.updateHealthStatus()
    }, 30000) // Check every 30 seconds
  }

  private async updateHealthStatus() {
    const now = Date.now()

    for (const [name, model] of this.models.entries()) {
      const cached = this.healthCache.get(name)

      // Skip if checked recently (within 30 seconds)
      if (cached && now - cached.lastCheck < 30000) {
        continue
      }

      try {
        const healthy = await model.healthCheck()
        this.healthCache.set(name, { healthy, lastCheck: now })

        if (model.available !== healthy) {
          model.available = healthy

          telemetry.trackEvent({
            type: 'system_event',
            category: 'model_router',
            action: 'health_status_changed',
            label: name,
            value: healthy ? 1 : 0
          })
        }
      } catch (error) {
        this.healthCache.set(name, { healthy: false, lastCheck: now })
        model.available = false

        await crashRecovery.logError(error as Error, {
          operation: 'model_health_check',
          component: 'service',
          severity: 'low',
          timestamp: new Date().toISOString(),
          metadata: { modelName: name }
        })
      }
    }
  }

  async routeRequest(options: RoutingOptions = {}): Promise<RoutingResult> {
    const startTime = Date.now()
    const routingPath: string[] = []
    let totalAttempts = 0
    let fallbackUsed = false

    telemetry.trackEvent({
      type: 'operation',
      category: 'model_router',
      action: 'route_request_start',
      metadata: options
    })

    try {
      // Get candidate models
      let candidates = this.getCandidateModels(options)

      // Try preferred model first
      if (options.preferredModel) {
        const preferred = this.models.get(options.preferredModel)
        if (preferred && this.isModelSuitable(preferred, options)) {
          const result = await this.attemptModel(preferred, options)
          if (result.success) {
            routingPath.push(preferred.name)
            return this.createSuccessResult(
              preferred,
              routingPath,
              startTime,
              totalAttempts + 1,
              fallbackUsed
            )
          }
          totalAttempts++
          routingPath.push(`${preferred.name}-failed`)
        }
      }

      // Try candidates in priority order
      const maxRetries = options.maxRetries || 3

      for (const model of candidates) {
        if (totalAttempts >= maxRetries) break

        const result = await this.attemptModel(model, options)
        totalAttempts++
        routingPath.push(result.success ? model.name : `${model.name}-failed`)

        if (result.success) {
          return this.createSuccessResult(
            model,
            routingPath,
            startTime,
            totalAttempts,
            fallbackUsed
          )
        }
      }

      // Try offline fallback if enabled
      if (options.fallbackToOffline !== false) {
        const offlineModel = this.models.get('offline-fallback')
        if (offlineModel) {
          fallbackUsed = true
          routingPath.push('offline-fallback')
          totalAttempts++

          telemetry.trackEvent({
            type: 'operation',
            category: 'model_router',
            action: 'fallback_to_offline',
            metadata: { originalOptions: options }
          })

          return this.createSuccessResult(
            offlineModel,
            routingPath,
            startTime,
            totalAttempts,
            fallbackUsed
          )
        }
      }

      // All models failed
      throw new Error('No available models found')
    } catch (error) {
      await crashRecovery.logError(error as Error, {
        operation: 'model_routing',
        component: 'service',
        severity: 'high',
        timestamp: new Date().toISOString(),
        metadata: { options, routingPath, totalAttempts }
      })

      telemetry.trackEvent({
        type: 'error',
        category: 'model_router',
        action: 'routing_failed',
        metadata: { error: error.message, routingPath, totalAttempts }
      })

      throw error
    }
  }

  private getCandidateModels(options: RoutingOptions): ModelConfig[] {
    return Array.from(this.models.values())
      .filter((model) => this.isModelSuitable(model, options))
      .filter((model) => model.available)
      .sort((a, b) => b.priority - a.priority)
  }

  private isModelSuitable(model: ModelConfig, options: RoutingOptions): boolean {
    // Check required capabilities
    if (options.requiredCapabilities) {
      for (const capability of options.requiredCapabilities) {
        if (!model.capabilities.includes(capability)) {
          return false
        }
      }
    }

    // Skip offline models unless specifically requested
    if (model.capabilities.includes('offline') && !options.fallbackToOffline) {
      return false
    }

    return true
  }

  private async attemptModel(
    model: ModelConfig,
    options: RoutingOptions
  ): Promise<{ success: boolean; error?: Error }> {
    const timeout = options.timeout || 30000

    try {
      // Quick health check
      const healthy = await Promise.race([
        model.healthCheck(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ])

      if (!healthy) {
        return { success: false, error: new Error(`Model ${model.name} health check failed`) }
      }

      // Update availability
      model.available = true
      this.healthCache.set(model.name, { healthy: true, lastCheck: Date.now() })

      return { success: true }
    } catch (error) {
      model.available = false
      this.healthCache.set(model.name, { healthy: false, lastCheck: Date.now() })

      return { success: false, error: error as Error }
    }
  }

  private createSuccessResult(
    model: ModelConfig,
    routingPath: string[],
    startTime: number,
    totalAttempts: number,
    fallbackUsed: boolean
  ): RoutingResult {
    const result: RoutingResult = {
      selectedModel: model,
      fallbackUsed,
      routingPath,
      startTime,
      totalAttempts
    }

    // Log successful routing
    this.routingHistory.push({
      timestamp: new Date().toISOString(),
      route: routingPath.join(' → '),
      success: true
    })

    telemetry.trackEvent({
      type: 'operation',
      category: 'model_router',
      action: 'routing_success',
      label: model.name,
      value: Date.now() - startTime,
      metadata: {
        routingPath,
        totalAttempts,
        fallbackUsed
      }
    })

    return result
  }

  getAvailableModels(): ModelConfig[] {
    return Array.from(this.models.values()).filter((m) => m.available)
  }

  getModelStatus(): Record<string, any> {
    const status: Record<string, any> = {}

    for (const [name, model] of this.models.entries()) {
      const health = this.healthCache.get(name)
      status[name] = {
        available: model.available,
        priority: model.priority,
        capabilities: model.capabilities,
        lastHealthCheck: health?.lastCheck || null,
        healthy: health?.healthy || false,
        endpoint: model.endpoint
      }
    }

    return {
      models: status,
      recentRouting: this.routingHistory.slice(-10),
      totalModels: this.models.size,
      availableModels: Array.from(this.models.values()).filter((m) => m.available).length
    }
  }

  async forceHealthCheck(): Promise<void> {
    this.healthCache.clear()
    await this.updateHealthStatus()
  }
}

export const modelRouter = new ModelRouter()

// Wrapper function for all model operations
export async function withModelRouting<T>(
  operation: (model: ModelConfig) => Promise<T>,
  options: RoutingOptions = {}
): Promise<{ result: T; routing: RoutingResult }> {
  const routing = await modelRouter.routeRequest(options)

  try {
    const result = await operation(routing.selectedModel)

    telemetry.trackEvent({
      type: 'operation',
      category: 'model_operation',
      action: 'success',
      label: routing.selectedModel.name,
      value: Date.now() - routing.startTime
    })

    return { result, routing }
  } catch (error) {
    await crashRecovery.logError(error as Error, {
      operation: 'model_operation',
      component: 'service',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      metadata: {
        selectedModel: routing.selectedModel.name,
        routingPath: routing.routingPath
      }
    })

    throw error
  }
}
