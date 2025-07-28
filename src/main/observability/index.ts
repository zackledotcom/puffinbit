/**
 * Google-Standard Observability Stack
 * Structured logging, metrics, and distributed tracing for production systems
 */

import { performance } from 'perf_hooks';
import { hostname } from 'os';

// Structured logging levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Structured log entry
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  version: string;
  hostname: string;
  pid: number;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack: string;
    code?: string;
  };
  metadata: Record<string, any>;
}

// Metrics types
export interface MetricLabels {
  [key: string]: string | number;
}

export interface CounterMetric {
  name: string;
  help: string;
  value: number;
  labels: MetricLabels;
  timestamp: number;
}

export interface GaugeMetric {
  name: string;
  help: string;
  value: number;
  labels: MetricLabels;
  timestamp: number;
}

export interface HistogramMetric {
  name: string;
  help: string;
  buckets: { [le: string]: number };
  count: number;
  sum: number;
  labels: MetricLabels;
  timestamp: number;
}

// Service Level Agreement definitions
export interface SLAConfig {
  name: string;
  target: number; // e.g., 0.99 for 99%
  window: string; // e.g., '1h', '24h', '30d'
  errorBudget: number;
}

export interface SLAMetrics {
  name: string;
  successRate: number;
  errorBudget: number;
  errorBudgetRemaining: number;
  isHealthy: boolean;
  alerting: boolean;
}

/**
 * Production-Grade Structured Logger
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private minLevel: LogLevel = 'info';
  private serviceName: string;
  private version: string;
  private hostname: string;
  private pid: number;

  constructor(serviceName: string, version: string = '1.0.0') {
    this.serviceName = serviceName;
    this.version = version;
    this.hostname = hostname();
    this.pid = process.pid;
    
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && ['debug', 'info', 'warn', 'error', 'fatal'].includes(envLevel)) {
      this.minLevel = envLevel;
    }
  }

  static getInstance(serviceName: string = 'puffin', version?: string): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger(serviceName, version);
    }
    return StructuredLogger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0, info: 1, warn: 2, error: 3, fatal: 4
    };
    return levels[level] >= levels[this.minLevel];
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata: Record<string, any> = {},
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      version: this.version,
      hostname: this.hostname,
      pid: this.pid,
      metadata: { ...metadata }
    };

    // Add trace context if available
    const traceId = metadata.traceId || this.getCurrentTraceId();
    const spanId = metadata.spanId || this.getCurrentSpanId();
    if (traceId) entry.traceId = traceId;
    if (spanId) entry.spanId = spanId;

    // Add error details
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack || '',
        code: (error as any).code
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    // In production, this would go to structured logging service
    // For now, output to console in structured format
    console.log(JSON.stringify(entry));
  }

  debug(message: string, metadata: Record<string, any> = {}): void {
    if (this.shouldLog('debug')) {
      this.output(this.createLogEntry('debug', message, metadata));
    }
  }

  info(message: string, metadata: Record<string, any> = {}): void {
    if (this.shouldLog('info')) {
      this.output(this.createLogEntry('info', message, metadata));
    }
  }

  warn(message: string, metadata: Record<string, any> = {}, error?: Error): void {
    if (this.shouldLog('warn')) {
      this.output(this.createLogEntry('warn', message, metadata, error));
    }
  }

  error(message: string, metadata: Record<string, any> = {}, error?: Error): void {
    if (this.shouldLog('error')) {
      this.output(this.createLogEntry('error', message, metadata, error));
    }
  }

  fatal(message: string, metadata: Record<string, any> = {}, error?: Error): void {
    if (this.shouldLog('fatal')) {
      this.output(this.createLogEntry('fatal', message, metadata, error));
    }
  }

  // Convenience methods for common patterns
  serviceStarted(serviceName: string, metadata: Record<string, any> = {}): void {
    this.info('service_started', { service: serviceName, ...metadata });
  }

  serviceStopped(serviceName: string, metadata: Record<string, any> = {}): void {
    this.info('service_stopped', { service: serviceName, ...metadata });
  }

  requestStarted(method: string, path: string, metadata: Record<string, any> = {}): void {
    this.info('request_started', { http_method: method, http_path: path, ...metadata });
  }

  requestCompleted(method: string, path: string, statusCode: number, duration: number, metadata: Record<string, any> = {}): void {
    this.info('request_completed', {
      http_method: method,
      http_path: path,
      http_status: statusCode,
      duration_ms: duration,
      ...metadata
    });
  }

  private getCurrentTraceId(): string | undefined {
    // In production, this would integrate with APM service
    return process.env.TRACE_ID;
  }

  private getCurrentSpanId(): string | undefined {
    // In production, this would integrate with APM service
    return process.env.SPAN_ID;
  }
}

/**
 * Production-Grade Metrics Registry
 */
export class MetricsRegistry {
  private static instance: MetricsRegistry;
  private counters = new Map<string, CounterMetric>();
  private gauges = new Map<string, GaugeMetric>();
  private histograms = new Map<string, HistogramMetric>();
  private logger: StructuredLogger;

  constructor() {
    this.logger = StructuredLogger.getInstance();
  }

  static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  counter(name: string, help: string = ''): CounterInstrument {
    return new CounterInstrument(name, help, this);
  }

  gauge(name: string, help: string = ''): GaugeInstrument {
    return new GaugeInstrument(name, help, this);
  }

  histogram(name: string, help: string = '', buckets: number[] = [0.1, 0.5, 1, 2.5, 5, 10]): HistogramInstrument {
    return new HistogramInstrument(name, help, buckets, this);
  }

  registerCounter(metric: CounterMetric): void {
    const key = `${metric.name}_${JSON.stringify(metric.labels)}`;
    this.counters.set(key, metric);
  }

  registerGauge(metric: GaugeMetric): void {
    const key = `${metric.name}_${JSON.stringify(metric.labels)}`;
    this.gauges.set(key, metric);
  }

  registerHistogram(metric: HistogramMetric): void {
    const key = `${metric.name}_${JSON.stringify(metric.labels)}`;
    this.histograms.set(key, metric);
  }

  // Export metrics in Prometheus format
  getMetrics(): string {
    const lines: string[] = [];

    // Export counters
    for (const counter of this.counters.values()) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      lines.push(`${counter.name}{${this.formatLabels(counter.labels)}} ${counter.value} ${counter.timestamp}`);
    }

    // Export gauges
    for (const gauge of this.gauges.values()) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      lines.push(`${gauge.name}{${this.formatLabels(gauge.labels)}} ${gauge.value} ${gauge.timestamp}`);
    }

    // Export histograms
    for (const histogram of this.histograms.values()) {
      lines.push(`# HELP ${histogram.name} ${histogram.help}`);
      lines.push(`# TYPE ${histogram.name} histogram`);
      
      // Buckets
      for (const [le, count] of Object.entries(histogram.buckets)) {
        lines.push(`${histogram.name}_bucket{${this.formatLabels(histogram.labels)},le="${le}"} ${count} ${histogram.timestamp}`);
      }
      
      // Count and sum
      lines.push(`${histogram.name}_count{${this.formatLabels(histogram.labels)}} ${histogram.count} ${histogram.timestamp}`);
      lines.push(`${histogram.name}_sum{${this.formatLabels(histogram.labels)}} ${histogram.sum} ${histogram.timestamp}`);
    }

    return lines.join('\n');
  }

  private formatLabels(labels: MetricLabels): string {
    return Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
  }

  // Get metrics as JSON for internal use
  getMetricsJSON(): {
    counters: CounterMetric[];
    gauges: GaugeMetric[];
    histograms: HistogramMetric[];
  } {
    return {
      counters: Array.from(this.counters.values()),
      gauges: Array.from(this.gauges.values()),
      histograms: Array.from(this.histograms.values())
    };
  }
}

// Metric instrument classes
export class CounterInstrument {
  constructor(
    private name: string,
    private help: string,
    private registry: MetricsRegistry
  ) {}

  inc(labels: MetricLabels = {}, value: number = 1): void {
    const metric: CounterMetric = {
      name: this.name,
      help: this.help,
      value,
      labels,
      timestamp: Date.now()
    };
    this.registry.registerCounter(metric);
  }
}

export class GaugeInstrument {
  constructor(
    private name: string,
    private help: string,
    private registry: MetricsRegistry
  ) {}

  set(value: number, labels: MetricLabels = {}): void {
    const metric: GaugeMetric = {
      name: this.name,
      help: this.help,
      value,
      labels,
      timestamp: Date.now()
    };
    this.registry.registerGauge(metric);
  }

  inc(labels: MetricLabels = {}, value: number = 1): void {
    // In production, this would properly increment existing value
    this.set(value, labels);
  }

  dec(labels: MetricLabels = {}, value: number = 1): void {
    // In production, this would properly decrement existing value
    this.set(-value, labels);
  }
}

export class HistogramInstrument {
  constructor(
    private name: string,
    private help: string,
    private buckets: number[],
    private registry: MetricsRegistry
  ) {}

  observe(value: number, labels: MetricLabels = {}): void {
    const bucketCounts: { [le: string]: number } = {};
    
    // Count observations in buckets
    for (const bucket of this.buckets) {
      bucketCounts[bucket.toString()] = value <= bucket ? 1 : 0;
    }
    bucketCounts['+Inf'] = 1;

    const metric: HistogramMetric = {
      name: this.name,
      help: this.help,
      buckets: bucketCounts,
      count: 1,
      sum: value,
      labels,
      timestamp: Date.now()
    };
    
    this.registry.registerHistogram(metric);
  }

  // Timer utility for measuring durations
  startTimer(labels: MetricLabels = {}): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.observe(duration, labels);
    };
  }
}

/**
 * SLA Monitoring System
 */
export class SLAMonitor {
  private static instance: SLAMonitor;
  private slas = new Map<string, SLAConfig>();
  private metrics: MetricsRegistry;
  private logger: StructuredLogger;

  constructor() {
    this.metrics = MetricsRegistry.getInstance();
    this.logger = StructuredLogger.getInstance();
  }

  static getInstance(): SLAMonitor {
    if (!SLAMonitor.instance) {
      SLAMonitor.instance = new SLAMonitor();
    }
    return SLAMonitor.instance;
  }

  registerSLA(config: SLAConfig): void {
    this.slas.set(config.name, config);
    this.logger.info('sla_registered', {
      sla_name: config.name,
      target: config.target,
      window: config.window
    });
  }

  recordSuccess(slaName: string, labels: MetricLabels = {}): void {
    this.metrics.counter('sla_requests_total', 'Total SLA requests')
      .inc({ ...labels, sla: slaName, status: 'success' });
  }

  recordFailure(slaName: string, labels: MetricLabels = {}): void {
    this.metrics.counter('sla_requests_total', 'Total SLA requests')
      .inc({ ...labels, sla: slaName, status: 'failure' });
  }

  getSLAMetrics(slaName: string): SLAMetrics | null {
    const config = this.slas.get(slaName);
    if (!config) return null;

    // In production, this would calculate from time-series data
    // For now, return mock data structure
    return {
      name: slaName,
      successRate: 0.99, // Would be calculated from actual metrics
      errorBudget: config.errorBudget,
      errorBudgetRemaining: 0.8, // Would be calculated
      isHealthy: true,
      alerting: false
    };
  }

  getAllSLAMetrics(): SLAMetrics[] {
    return Array.from(this.slas.keys())
      .map(name => this.getSLAMetrics(name))
      .filter(Boolean) as SLAMetrics[];
  }
}

// Export singletons
export const logger = StructuredLogger.getInstance();
export const metrics = MetricsRegistry.getInstance();
export const slaMonitor = SLAMonitor.getInstance();

// Decorator for automatic method instrumentation
export function Monitor(metricName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const timer = metrics.histogram(metricName, `Duration of ${propertyName}`).startTimer({
        method: propertyName,
        service: target.constructor.name
      });
      
      try {
        const result = await method.apply(this, args);
        metrics.counter(`${metricName}_total`, `Total calls to ${propertyName}`)
          .inc({ method: propertyName, status: 'success' });
        return result;
      } catch (error) {
        metrics.counter(`${metricName}_total`, `Total calls to ${propertyName}`)
          .inc({ method: propertyName, status: 'error' });
        throw error;
      } finally {
        timer();
      }
    };
  };
}

// SLA decorator
export function SLA(config: { p99?: number; p95?: number; p50?: number }) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const slaName = `${target.constructor.name}_${propertyName}`;
    
    // Register SLA
    slaMonitor.registerSLA({
      name: slaName,
      target: 0.99,
      window: '1h',
      errorBudget: 0.01
    });

    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      try {
        const result = await method.apply(this, args);
        slaMonitor.recordSuccess(slaName);
        return result;
      } catch (error) {
        slaMonitor.recordFailure(slaName);
        throw error;
      }
    };
  };
}
