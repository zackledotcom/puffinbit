/**
 * Service Manager & Health System - Phase 1 Backend Strengthening
 * 
 * Provides centralized service management, health monitoring, and dependency tracking
 * for all Puffin services. Implements circuit breakers, auto-restart, and graceful
 * degradation as outlined in the backend strengthening plan.
 */

import { EventEmitter } from 'events'
import { safeLog, safeError, safeWarn, safeInfo } from '@utils/safeLogger'

// Core interfaces
export interface ServiceConfig {
  name: string
  displayName: string
  description: string
  dependencies: string[]
  healthCheckInterval: number
  timeout: number
  maxRetries: number
  circuitBreakerThreshold: number
  autoRestart: boolean
  critical: boolean
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical' | 'down'
  message: string
  timestamp: Date
  responseTime: number
  details?: Record<string, any>
  metrics?: ServiceMetrics
}

export interface ServiceMetrics {
  uptime: number
  requestCount: number
  errorCount: number
  averageResponseTime: number
  lastError?: string
  memoryUsage?: number
  cpuUsage?: number
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailure?: Date
  nextAttempt?: Date
}

// Service interface that all services must implement
export interface Service {
  name: string
  config: ServiceConfig
  healthCheck(): Promise<HealthStatus>
  start(): Promise<{ success: boolean; message: string }>
  stop(): Promise<{ success: boolean; message: string }>
  restart(): Promise<{ success: boolean; message: string }>
  getMetrics(): ServiceMetrics
}

// Performance monitoring
interface PerformanceMetrics {
  timestamp: Date
  memoryUsage: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  cpuUsage: number
  activeConnections: number
  requestsPerSecond: number
}

/**
 * Circuit Breaker implementation for service resilience
 */
class CircuitBreaker {
  private state: CircuitBreakerState
  private readonly threshold: number
  private readonly timeout: number

  constructor(threshold: number = 5, timeout: number = 60000) {
    this.threshold = threshold
    this.timeout = timeout
    this.state = {
      state: 'closed',
      failureCount: 0
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.state.failureCount = 0
    this.state.state = 'closed'
    this.state.lastFailure = undefined
    this.state.nextAttempt = undefined
  }

  private onFailure(): void {
    this.state.failureCount++
    this.state.lastFailure = new Date()

    if (this.state.failureCount >= this.threshold) {
      this.state.state = 'open'
      this.state.nextAttempt = new Date(Date.now() + this.timeout)
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.state.nextAttempt &&
      new Date() >= this.state.nextAttempt
    )
  }

  getState(): CircuitBreakerState {
    return { ...this.state }
  }
}

/**
 * Main Service Manager class
 */
export class ServiceManager extends EventEmitter {
  private services = new Map<string, Service>()
  private healthStatuses = new Map<string, HealthStatus>()
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>()
  private performanceMetrics: PerformanceMetrics[] = []
  private connectionPool = new Map<string, any>()
  
  // Performance monitoring
  private metricsInterval?: NodeJS.Timeout
  private readonly maxMetricsHistory = 1000

  constructor() {
    super()
    this.startPerformanceMonitoring()
    this.setupGracefulShutdown()
  }

  /**
   * Register a service with the manager
   */
  register(service: Service): void {
    const { name, config } = service
    
    safeInfo(`Registering service: ${name}`)
    
    this.services.set(name, service)
    this.circuitBreakers.set(name, new CircuitBreaker(
      config.circuitBreakerThreshold,
      60000 // 1 minute timeout
    ))
    
    // Initialize health status
    this.healthStatuses.set(name, {
      status: 'down',
      message: 'Service registered but not started',
      timestamp: new Date(),
      responseTime: 0
    })

    // Start health monitoring
    this.startHealthMonitoring(service)
    
    this.emit('service:registered', { name, config })
  }

  /**
   * Start a service with dependency checking
   */
  async start(serviceName: string): Promise<{ success: boolean; message: string }> {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service ${serviceName} not found`)
    }

    try {
      // Check dependencies first
      await this.checkDependencies(service.config.dependencies)
      
      const circuitBreaker = this.circuitBreakers.get(serviceName)!
      const result = await circuitBreaker.execute(() => service.start())
      
      if (result.success) {
        safeInfo(`Service ${serviceName} started successfully`)
        this.emit('service:started', { name: serviceName })
      }
      
      return result
    } catch (error) {
      const message = `Failed to start ${serviceName}: ${error instanceof Error ? error.message : error}`
      safeError(message)
      return { success: false, message }
    }
  }

  /**
   * Stop a service gracefully
   */
  async stop(serviceName: string): Promise<{ success: boolean; message: string }> {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service ${serviceName} not found`)
    }

    try {
      // Stop health monitoring
      const interval = this.healthCheckIntervals.get(serviceName)
      if (interval) {
        clearInterval(interval)
        this.healthCheckIntervals.delete(serviceName)
      }

      const result = await service.stop()
      
      if (result.success) {
        safeInfo(`Service ${serviceName} stopped successfully`)
        this.emit('service:stopped', { name: serviceName })
      }
      
      return result
    } catch (error) {
      const message = `Failed to stop ${serviceName}: ${error instanceof Error ? error.message : error}`
      safeError(message)
      return { success: false, message }
    }
  }

  /**
   * Restart a service
   */
  async restart(serviceName: string): Promise<{ success: boolean; message: string }> {
    safeInfo(`Restarting service: ${serviceName}`)
    
    const stopResult = await this.stop(serviceName)
    if (!stopResult.success) {
      return stopResult
    }

    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return this.start(serviceName)
  }

  /**
   * Get health status of a service
   */
  getHealth(serviceName: string): HealthStatus | undefined {
    return this.healthStatuses.get(serviceName)
  }

  /**
   * Get health status of all services
   */
  getAllHealth(): Map<string, HealthStatus> {
    return new Map(this.healthStatuses)
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical' | 'down'
    message: string
    servicesUp: number
    servicesDown: number
    criticalServicesDown: string[]
  } {
    const services = Array.from(this.services.values())
    const healthStatuses = Array.from(this.healthStatuses.values())
    
    const servicesUp = healthStatuses.filter(h => h.status === 'healthy').length
    const servicesDown = healthStatuses.filter(h => h.status === 'down').length
    
    const criticalServicesDown = services
      .filter(service => {
        const health = this.healthStatuses.get(service.name)
        return service.config.critical && health?.status !== 'healthy'
      })
      .map(service => service.name)

    let status: 'healthy' | 'warning' | 'critical' | 'down'
    let message: string

    if (criticalServicesDown.length > 0) {
      status = 'critical'
      message = `Critical services down: ${criticalServicesDown.join(', ')}`
    } else if (servicesDown > 0) {
      status = 'warning'
      message = `${servicesDown} service(s) down, ${servicesUp} healthy`
    } else if (servicesUp === services.length && services.length > 0) {
      status = 'healthy'
      message = `All ${servicesUp} services healthy`
    } else {
      status = 'down'
      message = 'No services running'
    }

    return {
      status,
      message,
      servicesUp,
      servicesDown,
      criticalServicesDown
    }
  }

  /**
   * Get service dependencies
   */
  getDependencies(serviceName: string): string[] {
    const service = this.services.get(serviceName)
    return service?.config.dependencies || []
  }

  /**
   * Get all registered services
   */
  getAllServices(): Service[] {
    return Array.from(this.services.values())
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMetrics.slice(-100) // Last 100 metrics
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    const states = new Map<string, CircuitBreakerState>()
    for (const [name, breaker] of this.circuitBreakers) {
      states.set(name, breaker.getState())
    }
    return states
  }

  /**
   * Start health monitoring for a service
   */
  private startHealthMonitoring(service: Service): void {
    const interval = setInterval(async () => {
      try {
        const startTime = Date.now()
        const health = await service.healthCheck()
        health.responseTime = Date.now() - startTime
        health.timestamp = new Date()
        
        this.healthStatuses.set(service.name, health)
        this.emit('health:updated', { name: service.name, health })
        
        // Auto-restart if service is critical and down
        if (service.config.autoRestart && service.config.critical && health.status === 'down') {
          safeWarn(`Critical service ${service.name} is down, attempting restart`)
          this.restart(service.name).catch(error => {
            safeError(`Auto-restart failed for ${service.name}:`, error)
          })
        }
      } catch (error) {
        safeError(`Health check failed for ${service.name}:`, error)
        this.healthStatuses.set(service.name, {
          status: 'down',
          message: `Health check failed: ${error instanceof Error ? error.message : error}`,
          timestamp: new Date(),
          responseTime: 0
        })
      }
    }, service.config.healthCheckInterval)

    this.healthCheckIntervals.set(service.name, interval)
  }

  /**
   * Check if service dependencies are satisfied
   */
  private async checkDependencies(dependencies: string[]): Promise<void> {
    for (const dep of dependencies) {
      const health = this.healthStatuses.get(dep)
      if (!health || health.status !== 'healthy') {
        throw new Error(`Dependency ${dep} is not healthy`)
      }
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()
      
      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        memoryUsage,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000, // Convert to ms
        activeConnections: this.connectionPool.size,
        requestsPerSecond: 0 // TODO: Implement request counting
      }

      this.performanceMetrics.push(metrics)
      
      // Keep only recent metrics
      if (this.performanceMetrics.length > this.maxMetricsHistory) {
        this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsHistory)
      }

      this.emit('metrics:updated', metrics)
    }, 5000) // Every 5 seconds
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      safeInfo('ServiceManager: Graceful shutdown initiated')
      
      // Stop performance monitoring
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval)
      }

      // Stop all health check intervals
      for (const interval of this.healthCheckIntervals.values()) {
        clearInterval(interval)
      }

      // Stop all services in reverse dependency order
      const services = Array.from(this.services.values())
      for (const service of services.reverse()) {
        try {
          await this.stop(service.name)
        } catch (error) {
          safeError(`Error stopping service ${service.name}:`, error)
        }
      }

      safeInfo('ServiceManager: Shutdown complete')
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('beforeExit', shutdown)
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    safeInfo('ServiceManager: Manual shutdown requested')
    
    // Stop performance monitoring
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    // Stop all health monitoring
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval)
    }
    this.healthCheckIntervals.clear()

    // Stop all services
    const stopPromises = Array.from(this.services.keys()).map(name => this.stop(name))
    await Promise.allSettled(stopPromises)

    // Clear collections
    this.services.clear()
    this.healthStatuses.clear()
    this.circuitBreakers.clear()
    this.connectionPool.clear()
    this.performanceMetrics.length = 0

    this.emit('shutdown:complete')
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager()
export default serviceManager