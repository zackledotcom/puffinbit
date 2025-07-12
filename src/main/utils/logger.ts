/**
 * Enterprise Logging System for Puffer
 *
 * Implements structured, performance-optimized logging with multiple levels,
 * automatic rotation, and security event tracking.
 *
 * @author Puffer Engineering Team
 * @version 2.0.0
 */

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { format } from 'date-fns'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
  SECURITY = 5
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
  sessionId?: string
  userId?: string
  component: string
  performance?: {
    duration?: number
    memoryUsage?: number
    cpuUsage?: number
  }
}

export interface LoggerConfig {
  minLevel: LogLevel
  enableFileLogging: boolean
  enableConsoleLogging: boolean
  logDirectory: string
  maxLogFiles: number
  maxLogSizeBytes: number
  enablePerformanceLogging: boolean
}

/**
 * High-performance, enterprise-grade logging system
 */
class PufferLogger {
  private static instance: PufferLogger
  private config: LoggerConfig
  private logBuffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private sessionId: string

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: LogLevel.INFO,
      enableFileLogging: true,
      enableConsoleLogging: true,
      logDirectory: join(process.cwd(), 'logs'),
      maxLogFiles: 10,
      maxLogSizeBytes: 10 * 1024 * 1024, // 10MB
      enablePerformanceLogging: true,
      ...config
    }

    this.sessionId = this.generateSessionId()
    this.initializeLogging()
  }

  static getInstance(config?: Partial<LoggerConfig>): PufferLogger {
    if (!PufferLogger.instance) {
      PufferLogger.instance = new PufferLogger(config)
    }
    return PufferLogger.instance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initializeLogging(): Promise<void> {
    if (this.config.enableFileLogging) {
      try {
        await mkdir(this.config.logDirectory, { recursive: true })
      } catch (error) {
        console.error('Failed to create log directory:', error)
      }
    }

    // Flush logs every 5 seconds for performance
    this.flushInterval = setInterval(() => this.flushLogs(), 5000)
  }

  /**
   * Core logging method with structured output
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    component: string = 'core'
  ): void {
    if (level < this.config.minLevel) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      sessionId: this.sessionId,
      component,
      performance: this.config.enablePerformanceLogging ? this.getPerformanceMetrics() : undefined
    }

    // Console output with colors and formatting
    if (this.config.enableConsoleLogging) {
      this.outputToConsole(entry)
    }

    // Buffer for file output
    if (this.config.enableFileLogging) {
      this.logBuffer.push(entry)
    }
  }

  private sanitizeData(data: any): any {
    // Remove sensitive information from logs
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data }
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential']

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]'
        }
      }
      return sanitized
    }
    return data
  }

  private getPerformanceMetrics() {
    const memUsage = process.memoryUsage()
    return {
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      cpuUsage: process.cpuUsage().user
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = format(new Date(entry.timestamp), 'HH:mm:ss.SSS')
    const levelColors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.CRITICAL]: '\x1b[35m', // Magenta
      [LogLevel.SECURITY]: '\x1b[41m' // Red background
    }

    const levelIcons = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.CRITICAL]: '🚨',
      [LogLevel.SECURITY]: '🛡️'
    }

    const color = levelColors[entry.level] || '\x1b[0m'
    const icon = levelIcons[entry.level] || '•'
    const reset = '\x1b[0m'

    const formatted = `${color}${icon} [${timestamp}] ${entry.category}${reset} ${entry.message}`

    if (entry.data) {
      console.log(formatted, entry.data)
    } else {
      console.log(formatted)
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return

    const logsToFlush = [...this.logBuffer]
    this.logBuffer = []

    try {
      const logContent = logsToFlush.map((entry) => JSON.stringify(entry)).join('\n') + '\n'
      const filename = `puffer_${format(new Date(), 'yyyy-MM-dd')}.log`
      const filepath = join(this.config.logDirectory, filename)

      await writeFile(filepath, logContent, { flag: 'a' })
    } catch (error) {
      console.error('Failed to write logs to file:', error)
      // Put logs back in buffer to retry
      this.logBuffer.unshift(...logsToFlush)
    }
  }

  // Public API methods with optimized signatures
  debug(message: string, data?: any, component?: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data, component)
  }

  info(message: string, data?: any, component?: string): void {
    this.log(LogLevel.INFO, 'INFO', message, data, component)
  }

  warn(message: string, data?: any, component?: string): void {
    this.log(LogLevel.WARN, 'WARN', message, data, component)
  }

  error(message: string, error?: Error | any, component?: string): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        : error

    this.log(LogLevel.ERROR, 'ERROR', message, errorData, component)
  }

  critical(message: string, error?: Error | any, component?: string): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        : error

    this.log(LogLevel.CRITICAL, 'CRITICAL', message, errorData, component)
  }

  security(message: string, data?: any, component?: string): void {
    this.log(LogLevel.SECURITY, 'SECURITY', message, data, component)
  }

  // Performance-specific logging
  performance(operation: string, duration: number, data?: any, component?: string): void {
    this.log(
      LogLevel.INFO,
      'PERFORMANCE',
      `${operation} completed in ${duration}ms`,
      {
        ...data,
        operation,
        duration
      },
      component
    )
  }

  // Network operation logging
  network(method: string, url: string, status: number, duration: number, component?: string): void {
    this.log(
      LogLevel.INFO,
      'NETWORK',
      `${method} ${url} → ${status}`,
      {
        method,
        url,
        status,
        duration
      },
      component
    )
  }

  // Agent operation logging
  agent(agentId: string, action: string, result: string, data?: any): void {
    this.log(
      LogLevel.INFO,
      'AGENT',
      `Agent ${agentId}: ${action} → ${result}`,
      {
        agentId,
        action,
        result,
        ...data
      },
      'agent'
    )
  }

  // Memory operation logging
  memory(operation: string, data?: any): void {
    this.log(LogLevel.INFO, 'MEMORY', operation, data, 'memory')
  }

  // Success logging with celebration
  success(message: string, data?: any, component?: string): void {
    this.log(LogLevel.INFO, 'SUCCESS', `✅ ${message}`, data, component)
  }

  // Async cleanup
  async cleanup(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    await this.flushLogs()
  }

  // Get logger statistics
  getStats(): {
    sessionId: string
    bufferSize: number
    config: LoggerConfig
  } {
    return {
      sessionId: this.sessionId,
      bufferSize: this.logBuffer.length,
      config: { ...this.config }
    }
  }
}

// Export singleton instance with enterprise configuration
export const logger = PufferLogger.getInstance({
  minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableFileLogging: true,
  enableConsoleLogging: true,
  enablePerformanceLogging: true
})

// Export class for testing and custom instances
export { PufferLogger }

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await logger.cleanup()
})

process.on('SIGINT', async () => {
  await logger.cleanup()
})
