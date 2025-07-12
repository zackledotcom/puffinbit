/**
 * Enterprise Error Boundary and Recovery System for Puffer
 *
 * Implements comprehensive error handling, automatic recovery mechanisms,
 * circuit breakers, and intelligent error classification for maximum stability.
 *
 * @author Puffer Engineering Team
 * @version 2.0.0
 */

import { logger } from '@utils/logger'
import { crashRecovery } from './crashRecovery'

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  FILESYSTEM = 'filesystem',
  MEMORY = 'memory',
  AI_SERVICE = 'ai_service',
  AGENT = 'agent',
  PERMISSION = 'permission',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low', // Information/warning level
  MEDIUM = 'medium', // Handled error, functionality degraded
  HIGH = 'high', // Service failure, manual intervention needed
  CRITICAL = 'critical' // System failure, requires immediate attention
}

export interface ErrorContext {
  operation: string
  component: 'main' | 'renderer' | 'preload' | 'service'
  userId?: string
  sessionId?: string
  requestId?: string
  metadata?: Record<string, any>
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'reset' | 'escalate' | 'ignore'
  description: string
  automated: boolean
  maxAttempts?: number
  delayMs?: number
}

export interface ErrorClassification {
  category: ErrorCategory
  severity: ErrorSeverity
  recoverable: boolean
  userVisible: boolean
  requiresNotification: boolean
  recoveryActions: RecoveryAction[]
}

/**
 * Intelligent error classifier using pattern matching and heuristics
 */
export class ErrorClassifier {
  private static patterns: Array<{
    pattern: RegExp | string
    classification: Partial<ErrorClassification>
  }> = [
    // Network errors
    {
      pattern: /ECONNREFUSED|ENOTFOUND|ECONNRESET|timeout/i,
      classification: {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        userVisible: true,
        recoveryActions: [
          {
            type: 'retry',
            description: 'Retry with exponential backoff',
            automated: true,
            maxAttempts: 3,
            delayMs: 1000
          },
          { type: 'fallback', description: 'Switch to offline mode', automated: true }
        ]
      }
    },

    // Validation errors
    {
      pattern: /validation|invalid|schema|zod/i,
      classification: {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        recoverable: false,
        userVisible: true,
        requiresNotification: true,
        recoveryActions: [
          { type: 'ignore', description: 'Return validation error to user', automated: true }
        ]
      }
    },

    // File system errors
    {
      pattern: /ENOENT|EACCES|EPERM|EMFILE|ENOSPC/i,
      classification: {
        category: ErrorCategory.FILESYSTEM,
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        userVisible: true,
        recoveryActions: [
          {
            type: 'retry',
            description: 'Retry with different path',
            automated: true,
            maxAttempts: 2
          },
          { type: 'fallback', description: 'Use temporary storage', automated: true }
        ]
      }
    },

    // Memory errors
    {
      pattern: /out of memory|heap|Maximum call stack/i,
      classification: {
        category: ErrorCategory.MEMORY,
        severity: ErrorSeverity.CRITICAL,
        recoverable: true,
        userVisible: false,
        requiresNotification: true,
        recoveryActions: [
          { type: 'reset', description: 'Clear memory caches', automated: true },
          { type: 'escalate', description: 'Restart application', automated: false }
        ]
      }
    },

    // AI Service errors
    {
      pattern: /ollama|model not found|inference failed/i,
      classification: {
        category: ErrorCategory.AI_SERVICE,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        userVisible: true,
        recoveryActions: [
          {
            type: 'retry',
            description: 'Retry with different model',
            automated: true,
            maxAttempts: 2
          },
          { type: 'fallback', description: 'Use backup model', automated: true }
        ]
      }
    },

    // Agent errors
    {
      pattern: /agent|tool|dangerous operation/i,
      classification: {
        category: ErrorCategory.AGENT,
        severity: ErrorSeverity.HIGH,
        recoverable: false,
        userVisible: true,
        requiresNotification: true,
        recoveryActions: [
          { type: 'ignore', description: 'Block dangerous operation', automated: true }
        ]
      }
    }
  ]

  static classify(error: Error, context: ErrorContext): ErrorClassification {
    const errorMessage = error.message.toLowerCase()
    const errorStack = error.stack?.toLowerCase() || ''
    const combinedText = `${errorMessage} ${errorStack}`

    // Find matching pattern
    for (const { pattern, classification } of this.patterns) {
      const matches =
        typeof pattern === 'string'
          ? combinedText.includes(pattern.toLowerCase())
          : pattern.test(combinedText)

      if (matches) {
        return {
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          recoverable: true,
          userVisible: false,
          requiresNotification: false,
          recoveryActions: [],
          ...classification
        } as ErrorClassification
      }
    }

    // Default classification for unknown errors
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      userVisible: false,
      requiresNotification: true,
      recoveryActions: [
        {
          type: 'retry',
          description: 'Generic retry',
          automated: true,
          maxAttempts: 1,
          delayMs: 1000
        },
        { type: 'escalate', description: 'Log for manual review', automated: true }
      ]
    }
  }
}

/**
 * Circuit breaker pattern implementation for preventing cascade failures
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private maxFailures: number = 5,
    private timeoutMs: number = 60000, // 1 minute
    private name: string = 'unnamed'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'half-open'
        logger.info(`Circuit breaker ${this.name} entering half-open state`)
      } else {
        throw new Error(`Circuit breaker ${this.name} is open`)
      }
    }

    try {
      const result = await operation()

      if (this.state === 'half-open') {
        this.reset()
        logger.success(`Circuit breaker ${this.name} recovered`)
      }

      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  private recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.maxFailures) {
      this.state = 'open'
      logger.warn(`Circuit breaker ${this.name} opened after ${this.failures} failures`)
    }
  }

  private reset(): void {
    this.failures = 0
    this.state = 'closed'
    this.lastFailureTime = 0
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}

/**
 * Main error boundary class that orchestrates error handling
 */
export class ErrorBoundary {
  private static instance: ErrorBoundary
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private errorCounts = new Map<string, number>()
  private recoveryAttempts = new Map<string, number>()

  static getInstance(): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary()
    }
    return ErrorBoundary.instance
  }

  /**
   * Main error handling method - wraps operations with comprehensive error handling
   */
  async withErrorBoundary<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      enableCircuitBreaker?: boolean
      maxRetries?: number
      retryDelay?: number
      fallback?: () => Promise<T>
    } = {}
  ): Promise<T> {
    const { enableCircuitBreaker = true, maxRetries = 3, retryDelay = 1000, fallback } = options

    const operationKey = `${context.component}:${context.operation}`
    let lastError: Error

    // Get or create circuit breaker
    let circuitBreaker: CircuitBreaker | null = null
    if (enableCircuitBreaker) {
      if (!this.circuitBreakers.has(operationKey)) {
        this.circuitBreakers.set(operationKey, new CircuitBreaker(5, 60000, operationKey))
      }
      circuitBreaker = this.circuitBreakers.get(operationKey)!
    }

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = circuitBreaker ? await circuitBreaker.execute(operation) : await operation()

        // Reset error count on success
        this.errorCounts.delete(operationKey)
        this.recoveryAttempts.delete(operationKey)

        if (attempt > 1) {
          logger.success(`Operation ${operationKey} succeeded on attempt ${attempt}`)
        }

        return result
      } catch (error) {
        lastError = error as Error

        // Classify the error
        const classification = ErrorClassifier.classify(lastError, context)

        // Log the error with classification
        this.logError(lastError, context, classification, attempt)

        // Update error statistics
        this.updateErrorStats(operationKey)

        // Check if we should continue retrying
        if (!classification.recoverable || attempt === maxRetries) {
          break
        }

        // Apply recovery actions
        const recovered = await this.applyRecoveryActions(
          lastError,
          context,
          classification,
          attempt
        )

        if (recovered) {
          logger.info(`Recovery successful for ${operationKey} on attempt ${attempt}`)
          continue
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1)
          logger.debug(
            `Retrying ${operationKey} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed, try fallback
    if (fallback) {
      try {
        logger.warn(`Using fallback for ${operationKey} after ${maxRetries} failures`)
        return await fallback()
      } catch (fallbackError) {
        logger.error(`Fallback failed for ${operationKey}`, fallbackError)
      }
    }

    // Final error handling
    const finalClassification = ErrorClassifier.classify(lastError!, context)
    await this.handleFinalFailure(lastError!, context, finalClassification)

    throw lastError!
  }

  private logError(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification,
    attempt: number
  ): void {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      classification,
      attempt
    }

    switch (classification.severity) {
      case ErrorSeverity.CRITICAL:
        logger.critical(`Critical error in ${context.operation}`, logData)
        break
      case ErrorSeverity.HIGH:
        logger.error(`High severity error in ${context.operation}`, logData)
        break
      case ErrorSeverity.MEDIUM:
        logger.warn(`Medium severity error in ${context.operation}`, logData)
        break
      case ErrorSeverity.LOW:
        logger.info(`Low severity error in ${context.operation}`, logData)
        break
    }

    // Security-specific logging
    if (
      classification.category === ErrorCategory.PERMISSION ||
      classification.category === ErrorCategory.AGENT
    ) {
      logger.security(`Security-related error in ${context.operation}`, logData)
    }
  }

  private updateErrorStats(operationKey: string): void {
    const currentCount = this.errorCounts.get(operationKey) || 0
    this.errorCounts.set(operationKey, currentCount + 1)
  }

  private async applyRecoveryActions(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification,
    attempt: number
  ): Promise<boolean> {
    for (const action of classification.recoveryActions) {
      if (!action.automated) continue

      try {
        const success = await this.executeRecoveryAction(action, error, context, attempt)
        if (success) {
          logger.info(`Recovery action ${action.type} succeeded`, action)
          return true
        }
      } catch (recoveryError) {
        logger.warn(`Recovery action ${action.type} failed`, recoveryError)
      }
    }

    return false
  }

  private async executeRecoveryAction(
    action: RecoveryAction,
    error: Error,
    context: ErrorContext,
    attempt: number
  ): Promise<boolean> {
    const operationKey = `${context.component}:${context.operation}`

    switch (action.type) {
      case 'retry':
        // Just return false to continue the main retry loop
        return false

      case 'reset':
        // Clear caches and reset state
        if (global.gc) {
          global.gc()
          logger.info('Forced garbage collection during recovery')
        }
        return true

      case 'fallback':
        // Let the main handler deal with fallback
        return false

      case 'escalate':
        // Log to crash recovery system
        await crashRecovery.logError(error, {
          component: context.component,
          operation: context.operation,
          severity: 'high',
          timestamp: new Date().toISOString(),
          metadata: context.metadata
        })
        return false

      case 'ignore':
        // Mark as handled
        return true

      default:
        return false
    }
  }

  private async handleFinalFailure(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<void> {
    // Log to crash recovery system for critical/high severity errors
    if (
      classification.severity === ErrorSeverity.CRITICAL ||
      classification.severity === ErrorSeverity.HIGH
    ) {
      await crashRecovery.logError(error, {
        component: context.component,
        operation: context.operation,
        severity: classification.severity,
        timestamp: new Date().toISOString(),
        metadata: {
          ...context.metadata,
          errorCategory: classification.category,
          recoverable: classification.recoverable
        }
      })
    }

    // Generate user notification if required
    if (classification.requiresNotification && classification.userVisible) {
      this.generateUserNotification(error, context, classification)
    }
  }

  private generateUserNotification(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): void {
    // This would integrate with the UI notification system
    logger.info('User notification required', {
      error: error.message,
      category: classification.category,
      severity: classification.severity,
      context: context.operation
    })
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    totalErrors: number
    errorsByOperation: Record<string, number>
    circuitBreakerStates: Record<string, any>
    topErrors: Array<{ operation: string; count: number }>
  } {
    const errorsByOperation = Object.fromEntries(this.errorCounts)
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0)

    const topErrors = Array.from(this.errorCounts.entries())
      .map(([operation, count]) => ({ operation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const circuitBreakerStates = Object.fromEntries(
      Array.from(this.circuitBreakers.entries()).map(([key, cb]) => [key, cb.getState()])
    )

    return {
      totalErrors,
      errorsByOperation,
      circuitBreakerStates,
      topErrors
    }
  }

  /**
   * Reset error statistics
   */
  resetStats(): void {
    this.errorCounts.clear()
    this.recoveryAttempts.clear()
    logger.info('Error statistics reset')
  }
}

/**
 * Convenience wrapper for IPC handlers
 */
export function withErrorBoundary<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  component: 'main' | 'renderer' | 'preload' | 'service',
  operation?: string
) {
  return async (...args: T): Promise<R | { success: false; error: any }> => {
    const errorBoundary = ErrorBoundary.getInstance()
    const context: ErrorContext = {
      operation: operation || handler.name,
      component,
      sessionId: 'current', // Would be passed from session context
      metadata: { argsLength: args.length }
    }

    try {
      return await errorBoundary.withErrorBoundary(() => handler(...args), context, {
        enableCircuitBreaker: true,
        maxRetries: 2,
        retryDelay: 1000
      })
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HANDLER_ERROR',
          operation: context.operation,
          component: context.component
        }
      }
    }
  }
}

// Export singleton instance
export const errorBoundary = ErrorBoundary.getInstance()
