// Note: Using fallback logging instead of pino to avoid dependency issues
// TODO: Install and configure pino for production logging
import { v4 as uuidv4 } from 'uuid'
import { safeLog, safeError, safeWarn, safeInfo } from './safeLogger'

export interface LogContext {
  traceId?: string
  requestId?: string
  userId?: string
  service?: string
  operation?: string
  latency_ms?: number
  memory_mb?: number
  [key: string]: any
}

class GoogleStyleLogger {
  // Fallback logger implementation to avoid pino dependency
  private logger = {
    info: (data: any) => safeInfo(this.formatLogMessage(data)),
    error: (data: any) => safeError(this.formatLogMessage(data)),
    warn: (data: any) => safeWarn(this.formatLogMessage(data)),
    debug: (data: any) => safeLog(this.formatLogMessage(data))
  }
  
  constructor() {
    // Using fallback logger - TODO: Replace with pino in production
  }

  private formatLogMessage(data: any): string {
    if (typeof data === 'string') return data
    if (data.message) {
      const context = { ...data }
      delete context.message
      return `${data.message} ${Object.keys(context).length > 0 ? JSON.stringify(context) : ''}`
    }
    return JSON.stringify(data)
  }

  private generateIds() {
    return {
      traceId: uuidv4().replace(/-/g, ''),
      requestId: uuidv4().replace(/-/g, '')
    }
  }

  info(message: string, context: LogContext = {}) {
    const { traceId, requestId } = context.traceId ? context : this.generateIds()
    
    this.logger.info({
      message,
      trace_id: traceId,
      request_id: requestId,
      service: context.service || 'puffin',
      ...context
    })
  }

  error(message: string, error?: Error, context: LogContext = {}) {
    const { traceId, requestId } = context.traceId ? context : this.generateIds()
    
    this.logger.error({
      message,
      trace_id: traceId,
      request_id: requestId,
      service: context.service || 'puffin',
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...context
    })
  }

  warn(message: string, context: LogContext = {}) {
    const { traceId, requestId } = context.traceId ? context : this.generateIds()
    
    this.logger.warn({
      message,
      trace_id: traceId,
      request_id: requestId,
      service: context.service || 'puffin',
      ...context
    })
  }

  fatal(message: string, error?: Error, context: LogContext = {}) {
    const { traceId, requestId } = context.traceId ? context : this.generateIds()
    
    this.logger.fatal({
      message,
      trace_id: traceId,
      request_id: requestId,
      service: context.service || 'puffin',
      severity: 'CRITICAL',
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...context
    })
  }
}

export const logger = new GoogleStyleLogger()
