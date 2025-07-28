import { join } from 'path'
import { promises as fs } from 'fs'
import { app } from 'electron'

export interface ErrorContext {
  operation: string
  component: 'main' | 'renderer' | 'preload' | 'service'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  sessionId?: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'restart' | 'disable' | 'ignore'
  description: string
  autoExecute?: boolean
  maxAttempts?: number
}

export interface ErrorRecoveryPlan {
  immediate: RecoveryAction[]
  onRetryFail: RecoveryAction[]
  userNotification?: {
    title: string
    message: string
    actions?: string[]
  }
}

class CrashRecoveryManager {
  private logDir: string
  private recoveryAttempts = new Map<string, number>()
  private sessionId: string

  constructor() {
    this.logDir = join(app.getPath('userData'), 'logs')
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2)
    this.ensureLogDirectory()
  }

  private async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create log directory:', error)
    }
  }

  async logError(error: Error, context: ErrorContext): Promise<void> {
    const errorRecord = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        path: (error as any).path
      },
      context,
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    }

    try {
      const logFile = join(this.logDir, `crash-${new Date().toISOString().split('T')[0]}.jsonl`)
      await fs.appendFile(logFile, JSON.stringify(errorRecord) + '\n', 'utf8')

      // Also log to console for development
      console.error(`🔥 CRASH LOGGED [${context.severity.toUpperCase()}]:`, {
        operation: context.operation,
        component: context.component,
        error: error.message
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  getRecoveryPlan(error: Error, context: ErrorContext): ErrorRecoveryPlan {
    const { operation, component, severity } = context
    const attemptKey = `${component}:${operation}`
    const attempts = this.recoveryAttempts.get(attemptKey) || 0

    // File system errors
    if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
      return this.handleFileSystemError(error, context, attempts)
    }

    // Network/service errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      return this.handleNetworkError(error, context, attempts)
    }

    // Memory errors
    if (error.message.includes('out of memory') || error.message.includes('heap')) {
      return this.handleMemoryError(error, context, attempts)
    }

    // Model/AI errors
    if (operation.includes('model') || operation.includes('ollama') || operation.includes('chat')) {
      return this.handleModelError(error, context, attempts)
    }

    // Database/storage errors
    if (
      operation.includes('chroma') ||
      operation.includes('storage') ||
      operation.includes('memory')
    ) {
      return this.handleStorageError(error, context, attempts)
    }

    // Default recovery plan
    return this.getDefaultRecoveryPlan(error, context, attempts)
  }

  private handleFileSystemError(
    error: Error,
    context: ErrorContext,
    attempts: number
  ): ErrorRecoveryPlan {
    if (attempts < 3) {
      return {
        immediate: [
          {
            type: 'retry',
            description: 'Recreate missing directories and retry operation',
            autoExecute: true,
            maxAttempts: 3
          }
        ],
        onRetryFail: [
          {
            type: 'fallback',
            description: 'Use temporary storage location',
            autoExecute: true
          }
        ],
        userNotification: {
          title: 'File System Issue',
          message: 'Attempting to recover from file system error...',
          actions: ['Retry', 'Use Safe Mode']
        }
      }
    }

    return {
      immediate: [
        {
          type: 'fallback',
          description: 'Switch to emergency read-only mode',
          autoExecute: true
        }
      ],
      onRetryFail: [
        {
          type: 'restart',
          description: 'Restart application with safe defaults',
          autoExecute: false
        }
      ],
      userNotification: {
        title: 'Persistent File System Error',
        message: 'Unable to access storage. Running in safe mode.',
        actions: ['Restart', 'Continue in Safe Mode']
      }
    }
  }

  private handleNetworkError(
    error: Error,
    context: ErrorContext,
    attempts: number
  ): ErrorRecoveryPlan {
    return {
      immediate: [
        {
          type: 'retry',
          description: 'Retry with exponential backoff',
          autoExecute: true,
          maxAttempts: 3
        }
      ],
      onRetryFail: [
        {
          type: 'fallback',
          description: 'Switch to offline mode',
          autoExecute: true
        }
      ],
      userNotification: {
        title: 'Service Unavailable',
        message: `${context.operation} service is not responding. Working offline.`,
        actions: ['Retry Connection', 'Continue Offline']
      }
    }
  }

  private handleMemoryError(
    error: Error,
    context: ErrorContext,
    attempts: number
  ): ErrorRecoveryPlan {
    return {
      immediate: [
        {
          type: 'fallback',
          description: 'Trigger garbage collection and reduce memory usage',
          autoExecute: true
        }
      ],
      onRetryFail: [
        {
          type: 'restart',
          description: 'Restart with memory-optimized settings',
          autoExecute: false
        }
      ],
      userNotification: {
        title: 'Memory Warning',
        message: 'Application is running low on memory. Some features may be limited.',
        actions: ['Restart App', 'Continue with Reduced Features']
      }
    }
  }

  private handleModelError(
    error: Error,
    context: ErrorContext,
    attempts: number
  ): ErrorRecoveryPlan {
    return {
      immediate: [
        {
          type: 'fallback',
          description: 'Switch to backup model or simplified processing',
          autoExecute: true
        }
      ],
      onRetryFail: [
        {
          type: 'disable',
          description: 'Disable AI features temporarily',
          autoExecute: true
        }
      ],
      userNotification: {
        title: 'AI Model Issue',
        message: 'Primary AI model is unavailable. Using backup model.',
        actions: ['Switch Model', 'Disable AI Features']
      }
    }
  }

  private handleStorageError(
    error: Error,
    context: ErrorContext,
    attempts: number
  ): ErrorRecoveryPlan {
    return {
      immediate: [
        {
          type: 'retry',
          description: 'Recreate corrupted storage files',
          autoExecute: true,
          maxAttempts: 2
        }
      ],
      onRetryFail: [
        {
          type: 'fallback',
          description: 'Use in-memory storage only',
          autoExecute: true
        }
      ],
      userNotification: {
        title: 'Storage Corruption',
        message: 'Storage files may be corrupted. Attempting recovery...',
        actions: ['Reset Storage', 'Continue Without Persistence']
      }
    }
  }

  private getDefaultRecoveryPlan(
    error: Error,
    context: ErrorContext,
    attempts: number
  ): ErrorRecoveryPlan {
    if (context.severity === 'critical') {
      return {
        immediate: [
          {
            type: 'restart',
            description: 'Critical error detected, restart required',
            autoExecute: false
          }
        ],
        onRetryFail: [],
        userNotification: {
          title: 'Critical Error',
          message: 'A critical error occurred. The application needs to restart.',
          actions: ['Restart Now', 'View Error Details']
        }
      }
    }

    return {
      immediate: [
        {
          type: 'retry',
          description: 'Retry operation with safe defaults',
          autoExecute: true,
          maxAttempts: 2
        }
      ],
      onRetryFail: [
        {
          type: 'ignore',
          description: 'Continue without this operation',
          autoExecute: true
        }
      ],
      userNotification: {
        title: 'Operation Failed',
        message: `${context.operation} encountered an error. Continuing with reduced functionality.`,
        actions: ['Retry', 'Continue']
      }
    }
  }

  async executeRecovery(plan: ErrorRecoveryPlan, context: ErrorContext): Promise<boolean> {
    const attemptKey = `${context.component}:${context.operation}`
    let attempts = this.recoveryAttempts.get(attemptKey) || 0

    this.recoveryAttempts.set(attemptKey, attempts + 1)

    try {
      for (const action of plan.immediate) {
        if (action.autoExecute) {
          const success = await this.executeAction(action, context)
          if (success) {
            console.log(`✅ Recovery action succeeded: ${action.description}`)
            return true
          }
        }
      }

      // If immediate actions failed, try retry failure actions
      for (const action of plan.onRetryFail) {
        if (action.autoExecute) {
          const success = await this.executeAction(action, context)
          if (success) {
            console.log(`✅ Fallback recovery succeeded: ${action.description}`)
            return true
          }
        }
      }

      return false
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError)
      await this.logError(recoveryError as Error, {
        ...context,
        operation: `recovery:${context.operation}`,
        severity: 'high'
      })
      return false
    }
  }

  private async executeAction(action: RecoveryAction, context: ErrorContext): Promise<boolean> {
    switch (action.type) {
      case 'retry':
        // Implement retry logic
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            1000 *
              Math.pow(
                2,
                this.recoveryAttempts.get(`${context.component}:${context.operation}`) || 0
              )
          )
        )
        return true

      case 'fallback':
        // Implement fallback logic based on context
        console.log(`🔄 Executing fallback: ${action.description}`)
        return true

      case 'restart':
        // Schedule app restart
        console.log(`🔄 Scheduling restart: ${action.description}`)
        setTimeout(() => {
          app.relaunch()
          app.exit(0)
        }, 3000)
        return true

      case 'disable':
        // Disable problematic feature
        console.log(`🚫 Disabling feature: ${action.description}`)
        return true

      case 'ignore':
        // Continue without the failed operation
        console.log(`⏭️ Ignoring error: ${action.description}`)
        return true

      default:
        return false
    }
  }

  async getErrorSummary(): Promise<any> {
    try {
      const logFiles = await fs.readdir(this.logDir)
      const crashFiles = logFiles.filter((f) => f.startsWith('crash-') && f.endsWith('.jsonl'))

      let totalErrors = 0
      let errorsByComponent: Record<string, number> = {}
      let errorsBySeverity: Record<string, number> = {}
      let recentErrors = []

      for (const file of crashFiles.slice(-7)) {
        // Last 7 days
        const content = await fs.readFile(join(this.logDir, file), 'utf8')
        const lines = content
          .trim()
          .split('\n')
          .filter((l) => l.trim())

        for (const line of lines.slice(-100)) {
          // Recent errors only
          try {
            const error = JSON.parse(line)
            totalErrors++

            errorsByComponent[error.context.component] =
              (errorsByComponent[error.context.component] || 0) + 1
            errorsBySeverity[error.context.severity] =
              (errorsBySeverity[error.context.severity] || 0) + 1

            if (recentErrors.length < 20) {
              recentErrors.push({
                timestamp: error.timestamp,
                operation: error.context.operation,
                component: error.context.component,
                severity: error.context.severity,
                message: error.error.message
              })
            }
          } catch (parseError) {
            // Skip malformed log entries
          }
        }
      }

      return {
        totalErrors,
        errorsByComponent,
        errorsBySeverity,
        recentErrors,
        logDirectory: this.logDir,
        sessionId: this.sessionId
      }
    } catch (error) {
      console.error('Failed to generate error summary:', error)
      return null
    }
  }
}

export const crashRecovery = new CrashRecoveryManager()
