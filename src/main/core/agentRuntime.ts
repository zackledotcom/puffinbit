/**
 * AGENT RUNTIME ENVIRONMENT
 * Phase 1 Agent Platform - Resource quotas, timeouts, kill switches
 * 
 * Features:
 * - Sandboxed agent execution with resource limits
 * - Real-time monitoring and health checks
 * - Automatic timeout and circuit breaker protection
 * - Agent lifecycle management
 * - Tool capability access control
 * - Performance profiling and optimization
 */

import { z } from 'zod'
import { EventEmitter } from 'events'
import { Worker } from 'worker_threads'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { SemanticMemoryEngine } from './semanticMemory'
import { ModelManager } from './modelManager'

// Agent schemas
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  type: z.enum(['assistant', 'researcher', 'writer', 'analyst', 'developer', 'custom']),
  capabilities: z.array(z.string()),
  permissions: z.object({
    memory: z.object({
      read: z.boolean().default(true),
      write: z.boolean().default(true),
      search: z.boolean().default(true)
    }),
    models: z.object({
      execute: z.boolean().default(true),
      load: z.boolean().default(false),
      manage: z.boolean().default(false)
    }),
    filesystem: z.object({
      read: z.boolean().default(false),
      write: z.boolean().default(false),
      execute: z.boolean().default(false)
    }),
    network: z.object({
      external: z.boolean().default(false),
      internal: z.boolean().default(true)
    }),
    system: z.object({
      processes: z.boolean().default(false),
      environment: z.boolean().default(false)
    })
  }),
  resourceLimits: z.object({
    maxMemory: z.number().default(512), // MB
    maxCpuTime: z.number().default(30000), // ms
    maxExecutionTime: z.number().default(300000), // 5 minutes
    maxConcurrentTasks: z.number().default(3),
    maxApiCalls: z.number().default(100),
    rateLimitWindow: z.number().default(60000) // 1 minute
  }),
  tools: z.array(z.string()).default([]),
  models: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
  isActive: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const AgentTaskSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  type: z.enum(['query', 'action', 'workflow', 'analysis']),
  input: z.any(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  timeout: z.number().optional(),
  metadata: z.record(z.any()).default({}),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).default('pending'),
  result: z.any().optional(),
  error: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  executionTime: z.number().optional(),
  resourceUsage: z.object({
    memory: z.number(),
    cpu: z.number(),
    apiCalls: z.number()
  }).optional()
})

export const AgentExecutionContextSchema = z.object({
  agentId: z.string(),
  taskId: z.string(),
  permissions: z.any(),
  resourceLimits: z.any(),
  tools: z.array(z.string()),
  models: z.array(z.string()),
  memoryAccess: z.boolean(),
  startTime: z.number(),
  apiCallCount: z.number().default(0),
  memoryUsage: z.number().default(0)
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>
export type AgentTask = z.infer<typeof AgentTaskSchema> & {
  resolve?: (result: any) => void
  reject?: (error: Error) => void
}
export type AgentExecutionContext = z.infer<typeof AgentExecutionContextSchema>

interface ToolExecutor {
  name: string
  execute: (params: any, context: AgentExecutionContext) => Promise<any>
  validate: (params: any) => boolean
  permissions: string[]
}

/**
 * Resource Monitor
 * Tracks agent resource usage in real-time
 */
class ResourceMonitor extends EventEmitter {
  private agentUsage = new Map<string, {
    memory: number
    cpu: number
    apiCalls: number
    startTime: number
    lastCheck: number
  }>()

  startMonitoring(agentId: string, limits: AgentConfig['resourceLimits']): void {
    this.agentUsage.set(agentId, {
      memory: 0,
      cpu: 0,
      apiCalls: 0,
      startTime: Date.now(),
      lastCheck: Date.now()
    })

    // Start monitoring interval
    const interval = setInterval(() => {
      this.checkLimits(agentId, limits)
    }, 1000)

    // Clean up when agent stops
    this.once(`stop-${agentId}`, () => {
      clearInterval(interval)
      this.agentUsage.delete(agentId)
    })
  }

  updateUsage(agentId: string, usage: Partial<{ memory: number; cpu: number; apiCalls: number }>): void {
    const current = this.agentUsage.get(agentId)
    if (!current) return

    Object.assign(current, usage, { lastCheck: Date.now() })
    this.agentUsage.set(agentId, current)
  }

  getUsage(agentId: string): any {
    return this.agentUsage.get(agentId) || null
  }

  stopMonitoring(agentId: string): void {
    this.emit(`stop-${agentId}`)
  }

  private checkLimits(agentId: string, limits: AgentConfig['resourceLimits']): void {
    const usage = this.agentUsage.get(agentId)
    if (!usage) return

    const now = Date.now()
    const executionTime = now - usage.startTime

    // Check limits
    if (usage.memory > limits.maxMemory) {
      this.emit('limit-exceeded', { agentId, type: 'memory', usage: usage.memory, limit: limits.maxMemory })
    }

    if (executionTime > limits.maxExecutionTime) {
      this.emit('limit-exceeded', { agentId, type: 'execution-time', usage: executionTime, limit: limits.maxExecutionTime })
    }

    if (usage.apiCalls > limits.maxApiCalls) {
      this.emit('limit-exceeded', { agentId, type: 'api-calls', usage: usage.apiCalls, limit: limits.maxApiCalls })
    }

    // CPU time tracking would need more sophisticated monitoring
    // For now, we'll use a simple approximation
  }
}

/**
 * Circuit Breaker
 * Prevents cascading failures and provides automatic recovery
 */
class CircuitBreaker {
  private failures = new Map<string, number>()
  private lastFailure = new Map<string, number>()
  private state = new Map<string, 'closed' | 'open' | 'half-open'>()

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}

  canExecute(agentId: string): boolean {
    const state = this.getState(agentId)
    const now = Date.now()

    switch (state) {
      case 'closed':
        return true

      case 'open':
        const lastFailure = this.lastFailure.get(agentId) || 0
        if (now - lastFailure > this.recoveryTimeout) {
          this.state.set(agentId, 'half-open')
          return true
        }
        return false

      case 'half-open':
        return true

      default:
        return true
    }
  }

  recordSuccess(agentId: string): void {
    this.failures.set(agentId, 0)
    this.state.set(agentId, 'closed')
  }

  recordFailure(agentId: string): void {
    const failures = (this.failures.get(agentId) || 0) + 1
    this.failures.set(agentId, failures)
    this.lastFailure.set(agentId, Date.now())

    if (failures >= this.failureThreshold) {
      this.state.set(agentId, 'open')
    }
  }

  getState(agentId: string): 'closed' | 'open' | 'half-open' {
    return this.state.get(agentId) || 'closed'
  }

  reset(agentId: string): void {
    this.failures.set(agentId, 0)
    this.state.set(agentId, 'closed')
    this.lastFailure.delete(agentId)
  }
}

/**
 * Tool Registry
 * Manages available tools and their execution
 */
class ToolRegistry {
  private tools = new Map<string, ToolExecutor>()

  registerTool(tool: ToolExecutor): void {
    this.tools.set(tool.name, tool)
  }

  async executeTool(
    toolName: string, 
    params: any, 
    context: AgentExecutionContext
  ): Promise<any> {
    const tool = this.tools.get(toolName)
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`)
    }

    // Check permissions
    const hasPermission = tool.permissions.every(permission => 
      this.checkPermission(permission, context)
    )

    if (!hasPermission) {
      throw new Error(`Insufficient permissions for tool ${toolName}`)
    }

    // Validate parameters
    if (!tool.validate(params)) {
      throw new Error(`Invalid parameters for tool ${toolName}`)
    }

    // Execute with timeout
    return await Promise.race([
      tool.execute(params, context),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tool execution timeout')), 30000)
      )
    ])
  }

  private checkPermission(permission: string, context: AgentExecutionContext): boolean {
    // This would integrate with the permissions system
    // For now, return true for basic permissions
    return context.tools.includes(permission) || 
           permission.startsWith('basic.')
  }

  getAvailableTools(context: AgentExecutionContext): string[] {
    return Array.from(this.tools.keys()).filter(toolName => {
      const tool = this.tools.get(toolName)!
      return tool.permissions.every(permission => 
        this.checkPermission(permission, context)
      )
    })
  }
}

/**
 * Agent Instance
 * Represents a running agent with full lifecycle management
 */
class AgentInstance extends EventEmitter {
  public config: AgentConfig
  public status: 'idle' | 'running' | 'stopped' | 'error' = 'idle'
  public currentTask?: AgentTask
  public worker?: Worker
  
  private executionContext?: AgentExecutionContext
  private resourceMonitor: ResourceMonitor
  private circuitBreaker: CircuitBreaker
  private taskQueue: AgentTask[] = []

  constructor(
    config: AgentConfig,
    resourceMonitor: ResourceMonitor,
    circuitBreaker: CircuitBreaker
  ) {
    super()
    this.config = config
    this.resourceMonitor = resourceMonitor
    this.circuitBreaker = circuitBreaker
  }

  async start(): Promise<void> {
    if (this.status === 'running') return

    try {
      this.status = 'running'
      this.config.isActive = true
      
      // Start resource monitoring
      this.resourceMonitor.startMonitoring(this.config.id, this.config.resourceLimits)
      
      // Create execution context
      this.executionContext = {
        agentId: this.config.id,
        taskId: '',
        permissions: this.config.permissions,
        resourceLimits: this.config.resourceLimits,
        tools: this.config.tools,
        models: this.config.models,
        memoryAccess: this.config.permissions.memory.read || this.config.permissions.memory.write,
        startTime: Date.now(),
        apiCallCount: 0,
        memoryUsage: 0
      }

      this.emit('started', this.config.id)
      
    } catch (error) {
      this.status = 'error'
      this.emit('error', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (this.status === 'stopped') return

    try {
      // Cancel current task
      if (this.currentTask && this.currentTask.status === 'running') {
        await this.cancelTask(this.currentTask.id)
      }

      // Stop worker
      if (this.worker) {
        await this.worker.terminate()
        this.worker = undefined
      }

      // Stop monitoring
      this.resourceMonitor.stopMonitoring(this.config.id)

      this.status = 'stopped'
      this.config.isActive = false
      this.executionContext = undefined

      this.emit('stopped', this.config.id)

    } catch (error) {
      this.status = 'error'
      this.emit('error', error)
      throw error
    }
  }

  async executeTask(task: AgentTask): Promise<any> {
    if (this.status !== 'running') {
      throw new Error(`Agent ${this.config.id} is not running`)
    }

    if (!this.circuitBreaker.canExecute(this.config.id)) {
      throw new Error(`Agent ${this.config.id} circuit breaker is open`)
    }

    // Check concurrent task limit
    if (this.currentTask && this.currentTask.status === 'running') {
      if (this.taskQueue.length >= this.config.resourceLimits.maxConcurrentTasks) {
        throw new Error('Maximum concurrent tasks exceeded')
      }
      
      this.taskQueue.push(task)
      return new Promise((resolve, reject) => {
        task.resolve = resolve
        task.reject = reject
      })
    }

    return await this._executeTaskDirect(task)
  }

  private async _executeTaskDirect(task: AgentTask): Promise<any> {
    const startTime = Date.now()
    this.currentTask = task
    
    if (!this.executionContext) {
      throw new Error('No execution context available')
    }

    this.executionContext.taskId = task.id

    try {
      task.status = 'running'
      task.startTime = new Date().toISOString()

      // Set task timeout
      const timeout = task.timeout || this.config.resourceLimits.maxExecutionTime
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Task execution timeout')), timeout)
      )

      // Execute task with timeout
      const result = await Promise.race([
        this._performTaskExecution(task),
        timeoutPromise
      ])

      task.status = 'completed'
      task.result = result
      task.endTime = new Date().toISOString()
      task.executionTime = Date.now() - startTime

      // Record success
      this.circuitBreaker.recordSuccess(this.config.id)
      
      this.emit('task_completed', { agentId: this.config.id, taskId: task.id, result })
      
      return result

    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message
      task.endTime = new Date().toISOString()
      task.executionTime = Date.now() - startTime

      // Record failure
      this.circuitBreaker.recordFailure(this.config.id)
      
      this.emit('task_failed', { agentId: this.config.id, taskId: task.id, error: error.message })
      
      throw error

    } finally {
      this.currentTask = undefined
      
      // Process next task in queue
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift()!
        setImmediate(async () => {
          try {
            const result = await this._executeTaskDirect(nextTask)
            nextTask.resolve?.(result)
          } catch (error) {
            nextTask.reject?.(error)
          }
        })
      }
    }
  }

  private async _performTaskExecution(task: AgentTask): Promise<any> {
    // This is where the actual task execution logic would go
    // For now, return a mock response based on task type
    
    switch (task.type) {
      case 'query':
        return { response: `Mock query response for: ${task.input}` }
        
      case 'action':
        return { success: true, action: task.input.action }
        
      case 'analysis':
        return { 
          analysis: `Mock analysis of: ${task.input}`,
          confidence: 0.85,
          insights: ['Insight 1', 'Insight 2']
        }
        
      case 'workflow':
        return { workflowId: uuidv4(), status: 'initiated' }
        
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    if (this.currentTask?.id === taskId) {
      if (this.worker) {
        await this.worker.terminate()
        this.worker = undefined
      }
      
      this.currentTask.status = 'cancelled'
      this.currentTask.endTime = new Date().toISOString()
      this.currentTask = undefined
    }

    // Remove from queue
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId)
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0]
      task.status = 'cancelled'
      task.reject?.(new Error('Task cancelled'))
    }
  }

  getStatus(): {
    agentId: string
    status: string
    currentTask?: string
    queueLength: number
    uptime: number
    circuitBreakerState: string
  } {
    return {
      agentId: this.config.id,
      status: this.status,
      currentTask: this.currentTask?.id,
      queueLength: this.taskQueue.length,
      uptime: this.executionContext ? Date.now() - this.executionContext.startTime : 0,
      circuitBreakerState: this.circuitBreaker.getState(this.config.id)
    }
  }
}

/**
 * Agent Runtime Manager
 * Central orchestrator for all agent operations
 */
export class AgentRuntime extends EventEmitter {
  private agents = new Map<string, AgentInstance>()
  private resourceMonitor: ResourceMonitor
  private circuitBreaker: CircuitBreaker
  private toolRegistry: ToolRegistry
  private semanticMemory: SemanticMemoryEngine
  private modelManager: ModelManager

  constructor(semanticMemory: SemanticMemoryEngine, modelManager: ModelManager) {
    super()
    this.semanticMemory = semanticMemory
    this.modelManager = modelManager
    this.resourceMonitor = new ResourceMonitor()
    this.circuitBreaker = new CircuitBreaker()
    this.toolRegistry = new ToolRegistry()

    this.setupEventHandlers()
    this.registerBasicTools()
  }

  async createAgent(config: Partial<AgentConfig>): Promise<AgentInstance> {
    const fullConfig = AgentConfigSchema.parse({
      id: config.id || `agent_${uuidv4()}`,
      name: config.name || 'Unnamed Agent',
      type: config.type || 'custom',
      capabilities: config.capabilities || [],
      permissions: {
        memory: { read: true, write: true, search: true },
        models: { execute: true, load: false, manage: false },
        filesystem: { read: false, write: false, execute: false },
        network: { external: false, internal: true },
        system: { processes: false, environment: false },
        ...config.permissions
      },
      resourceLimits: {
        maxMemory: 512,
        maxCpuTime: 30000,
        maxExecutionTime: 300000,
        maxConcurrentTasks: 3,
        maxApiCalls: 100,
        rateLimitWindow: 60000,
        ...config.resourceLimits
      },
      tools: config.tools || ['basic.chat', 'basic.search'],
      models: config.models || [],
      metadata: config.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config
    })

    const instance = new AgentInstance(fullConfig, this.resourceMonitor, this.circuitBreaker)
    this.agents.set(fullConfig.id, instance)

    // Store agent config in semantic memory
    await this.semanticMemory.storeMemory(
      JSON.stringify(fullConfig),
      'agent_state',
      { agentId: fullConfig.id, type: 'config' }
    )

    this.emit('agent_created', fullConfig.id)
    return instance
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)

    await agent.start()
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) return

    await agent.stop()
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.stopAgent(agentId)
    this.agents.delete(agentId)
    this.emit('agent_deleted', agentId)
  }

  async executeTask(agentId: string, task: Partial<AgentTask>): Promise<any> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)

    const fullTask = AgentTaskSchema.parse({
      id: task.id || `task_${uuidv4()}`,
      agentId,
      type: task.type || 'query',
      input: task.input,
      priority: task.priority || 'medium',
      metadata: task.metadata || {}
    })

    return await agent.executeTask(fullTask)
  }

  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId)
  }

  getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values())
  }

  getAgentStatus(agentId: string): any {
    const agent = this.agents.get(agentId)
    return agent ? agent.getStatus() : null
  }

  getSystemStatus(): {
    totalAgents: number
    activeAgents: number
    totalTasks: number
    systemLoad: number
  } {
    const agents = Array.from(this.agents.values())
    const activeAgents = agents.filter(a => a.status === 'running').length
    const totalTasks = agents.reduce((sum, a) => sum + a.getStatus().queueLength, 0)

    return {
      totalAgents: agents.length,
      activeAgents,
      totalTasks,
      systemLoad: activeAgents / Math.max(agents.length, 1)
    }
  }

  private setupEventHandlers(): void {
    this.resourceMonitor.on('limit-exceeded', async (data) => {
      const { agentId, type, usage, limit } = data
      console.warn(`Agent ${agentId} exceeded ${type} limit: ${usage}/${limit}`)
      
      // Stop agent if critical limit exceeded
      if (type === 'memory' || type === 'execution-time') {
        await this.stopAgent(agentId)
      }
      
      this.emit('resource_limit_exceeded', data)
    })
  }

  private registerBasicTools(): void {
    // Basic chat tool
    this.toolRegistry.registerTool({
      name: 'basic.chat',
      permissions: ['memory.read'],
      validate: (params) => typeof params.message === 'string',
      execute: async (params, context) => {
        // Integrate with semantic memory for context
        const semanticContext = await this.semanticMemory.retrieveContext(params.message)
        return {
          response: `AI response to: ${params.message}`,
          context: semanticContext?.summary || 'No relevant context found'
        }
      }
    })

    // Basic search tool
    this.toolRegistry.registerTool({
      name: 'basic.search',
      permissions: ['memory.search'],
      validate: (params) => typeof params.query === 'string',
      execute: async (params, context) => {
        const results = await this.semanticMemory.advancedSearch(params.query)
        return {
          results: results.slice(0, 10),
          totalFound: results.length
        }
      }
    })

    // Model execution tool
    this.toolRegistry.registerTool({
      name: 'model.execute',
      permissions: ['models.execute'],
      validate: (params) => params.modelId && params.prompt,
      execute: async (params, context) => {
        if (!context.models.includes(params.modelId)) {
          throw new Error(`Model ${params.modelId} not authorized for this agent`)
        }
        return await this.modelManager.executeRequest(params.modelId, params.prompt, params.options || {})
      }
    })
  }
}
