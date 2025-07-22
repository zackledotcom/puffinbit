/**
 * Service Manager & Health System - Phase 1 Backend Strengthening
 * 
 * Provides centralized service management, health monitoring, and dependency tracking
 * for all Puffin services. Implements circuit breakers, auto-restart, and graceful
 * degradation as outlined in the backend strengthening plan.
 */

import { EventEmitter } from 'events';
import { safeLog, safeError, safeWarn, safeInfo } from '@utils/safeLogger';

// Core interfaces
export interface ServiceConfig {
  name: string;
  displayName: string;
  description: string;
  dependencies: string[];
  healthCheckInterval: number;
  timeout: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
  autoRestart: boolean;
  critical: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical' | 'down';
  message: string;
  timestamp: Date;
  responseTime: number;
  details?: Record<string, any>;
  metrics?: ServiceMetrics;
}

export interface ServiceMetrics {
  uptime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastError?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure?: Date;
  nextAttempt?: Date;
}

// Service interface that all services must implement
export interface Service {
  name: string;
  config: ServiceConfig;
  healthCheck(): Promise<HealthStatus>;
  start(): Promise<{ success: boolean; message: string }>;
  stop(): Promise<{ success: boolean; message: string }>;
  restart(): Promise<{ success: boolean; message: string }>;
  getMetrics(): ServiceMetrics;
}

// Performance monitoring
interface PerformanceMetrics {
  timestamp: Date;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
}

/**
 * Circuit Breaker implementation for service resilience
 */
class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold: number = 5, timeout: number = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = {
      state: 'closed',
      failureCount: 0,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failureCount = 0;
    this.state.state = 'closed';
    this.state.lastFailure = undefined;
    this.state.nextAttempt = undefined;
  }

  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailure = new Date();

    if (this.state.failureCount >= this.threshold) {
      this.state.state = 'open';
      this.state.nextAttempt = new Date(Date.now() + this.timeout);
    }
  }

  private shouldAttemptReset(): boolean {
    return !!this.state.nextAttempt && new Date() >= this.state.nextAttempt;
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

/**
 * Main Service Manager class
 */
export class ServiceManager extends EventEmitter {
  private services = new Map<string, { factory: () => Service; instance: Service | null }>();
  private healthStatuses = new Map<string, HealthStatus>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();
  private performanceMetrics: PerformanceMetrics[] = [];
  private connectionPool = new Map<string, any>();
  private metricsInterval?: NodeJS.Timeout;
  private readonly maxMetricsHistory = 1000;
  private config = { lazyLoad: true };

  constructor() {
    super();
    this.startPerformanceMonitoring();
    this.setupGracefulShutdown();
  }

  /**
   * Register a service with lazy factory
   */
  register(name: string, factory: () => Service): void {
    const config = factory().config; // Peek config without init
    safeInfo(`Registering service: ${name}`);

    this.services.set(name, { factory, instance: null });
    this.circuitBreakers.set(name, new CircuitBreaker(config.circuitBreakerThreshold));

    this.healthStatuses.set(name, {
      status: 'down',
      message: 'Registered but not started',
      timestamp: new Date(),
      responseTime: 0,
    });

    this.startHealthMonitoring(name, factory);
    this.emit('service:registered', { name, config });
  }

  /**
   * Get service instance (lazy init)
   */
  get(name: string): Service {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service ${name} not found`);
    if (!service.instance && this.config.lazyLoad) service.instance = service.factory();
    return service.instance!;
  }

  /**
   * Start a service with dependency checking
   */
  async start(serviceName: string): Promise<{ success: boolean; message: string }> {
    try {
      const deps = this.get(serviceName).config.dependencies;
      await this.checkDependencies(deps);

      const circuitBreaker = this.circuitBreakers.get(serviceName)!;
      const result = await circuitBreaker.execute(() => this.get(serviceName).start());

      if (result.success) {
        safeInfo(`Service ${serviceName} started`);
        this.emit('service:started', { name: serviceName });
      }
      return result;
    } catch (error) {
      safeError(`Failed to start ${serviceName}:`, error);
      return { success: false, message: `${error}` };
    }
  }

  /**
   * Stop a service gracefully
   */
  async stop(serviceName: string): Promise<{ success: boolean; message: string }> {
    try {
      const interval = this.healthCheckIntervals.get(serviceName);
      if (interval) clearInterval(interval);
      this.healthCheckIntervals.delete(serviceName);

      const result = await this.get(serviceName).stop();

      if (result.success) {
        safeInfo(`Service ${serviceName} stopped`);
        this.emit('service:stopped', { name: serviceName });
      }
      return result;
    } catch (error) {
      safeError(`Failed to stop ${serviceName}:`, error);
      return { success: false, message: `${error}` };
    }
  }

  /**
   * Restart a service
   */
  async restart(serviceName: string): Promise<{ success: boolean; message: string }> {
    safeInfo(`Restarting ${serviceName}`);
    const stopResult = await this.stop(serviceName);
    if (!stopResult.success) return stopResult;
    await new Promise(r => setTimeout(r, 1000));
    return this.start(serviceName);
  }

  getHealth(serviceName: string): HealthStatus | undefined {
    return this.healthStatuses.get(serviceName);
  }

  getAllHealth(): Map<string, HealthStatus> {
    return new Map(this.healthStatuses);
  }

  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical' | 'down';
    message: string;
    servicesUp: number;
    servicesDown: number;
    criticalServicesDown: string[];
  } {
    const services = Array.from(this.services.keys());
    const healthStatuses = Array.from(this.healthStatuses.values());
    const servicesUp = healthStatuses.filter(h => h.status === 'healthy').length;
    const servicesDown = healthStatuses.filter(h => h.status === 'down').length;
    const criticalServicesDown = services.filter(name => {
      const health = this.healthStatuses.get(name);
      const config = this.services.get(name)?.factory().config;
      return config?.critical && health?.status !== 'healthy';
    });

    let status: 'healthy' | 'warning' | 'critical' | 'down';
    let message: string;

    if (criticalServicesDown.length > 0) {
      status = 'critical';
      message = `Critical down: ${criticalServicesDown.join(', ')}`;
    } else if (servicesDown > 0) {
      status = 'warning';
      message = `${servicesDown} down, ${servicesUp} healthy`;
    } else if (servicesUp === services.length && services.length > 0) {
      status = 'healthy';
      message = `All ${servicesUp} healthy`;
    } else {
      status = 'down';
      message = 'No services running';
    }

    return { status, message, servicesUp, servicesDown, criticalServicesDown };
  }

  getDependencies(serviceName: string): string[] {
    return this.services.get(serviceName)?.factory().config.dependencies || [];
  }

  getAllServices(): string[] {
    return Array.from(this.services.keys());
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMetrics.slice(-100);
  }

  getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    const states = new Map<string, CircuitBreakerState>();
    for (const [name, breaker] of this.circuitBreakers) states.set(name, breaker.getState());
    return states;
  }

  private startHealthMonitoring(name: string, factory: () => Service): void {
    const config = factory().config;
    const interval = setInterval(async () => {
      try {
        const startTime = Date.now();
        const health = await factory().healthCheck();
        health.responseTime = Date.now() - startTime;
        health.timestamp = new Date();
        this.healthStatuses.set(name, health);
        this.emit('health:updated', { name, health });

        if (config.autoRestart && config.critical && health.status === 'down') {
          safeWarn(`Critical ${name} down, restarting`);
          this.restart(name).catch(err => safeError(`Auto-restart failed for ${name}:`, err));
        }
      } catch (error) {
        safeError(`Health check failed for ${name}:`, error);
        this.healthStatuses.set(name, {
          status: 'down',
          message: `${error}`,
          timestamp: new Date(),
          responseTime: 0,
        });
      }
    }, config.healthCheckInterval);
    this.healthCheckIntervals.set(name, interval);
  }

  private async checkDependencies(dependencies: string[]): Promise<void> {
    for (const dep of dependencies) {
      const health = this.healthStatuses.get(dep);
      if (!health || health.status !== 'healthy') throw new Error(`Dependency ${dep} not healthy`);
    }
  }

  private startPerformanceMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        memoryUsage,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000,
        activeConnections: this.connectionPool.size,
        requestsPerSecond: 0, // Implement counter
      };
      this.performanceMetrics.push(metrics);
      if (this.performanceMetrics.length > this.maxMetricsHistory) this.performanceMetrics.shift();
      this.emit('metrics:updated', metrics);
    }, 5000);
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      safeInfo('Graceful shutdown');
      if (this.metricsInterval) clearInterval(this.metricsInterval);
      for (const interval of this.healthCheckIntervals.values()) clearInterval(interval);
      const stopPromises = Array.from(this.services.keys()).map(name => this.stop(name));
      await Promise.allSettled(stopPromises);
      safeInfo('Shutdown complete');
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('beforeExit', shutdown);
  }

  async shutdown(): Promise<void> {
    safeInfo('Manual shutdown');
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    for (const interval of this.healthCheckIntervals.values()) clearInterval(interval);
    this.healthCheckIntervals.clear();
    const stopPromises = Array.from(this.services.keys()).map(name => this.stop(name));
    await Promise.allSettled(stopPromises);
    this.services.clear();
    this.healthStatuses.clear();
    this.circuitBreakers.clear();
    this.connectionPool.clear();
    this.performanceMetrics = [];
    this.emit('shutdown:complete');
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager();
export default serviceManager;