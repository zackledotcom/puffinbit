/**
 * Process Error Handler for Puffer
 *
 * Handles uncaught exceptions and unhandled promise rejections
 * to prevent application crashes and provide graceful error recovery.
 */

import { safeError, safeWarn, safeLog } from './safeLogger'

export class ProcessErrorHandler {
  private static instance: ProcessErrorHandler
  private isShuttingDown: boolean = false

  private constructor() {
    this.setupErrorHandlers()
  }

  public static getInstance(): ProcessErrorHandler {
    if (!ProcessErrorHandler.instance) {
      ProcessErrorHandler.instance = new ProcessErrorHandler()
    }
    return ProcessErrorHandler.instance
  }

  private setupErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      safeError('🔥 Uncaught Exception:', error.message)
      safeError('Stack trace:', error.stack)

      // Prevent multiple shutdown attempts
      if (!this.isShuttingDown) {
        this.isShuttingDown = true
        this.gracefulShutdown('uncaughtException', error)
      }
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      safeError('🔥 Unhandled Promise Rejection at:', promise)
      safeError('Reason:', reason)

      // For now, just log it - don't shut down for promise rejections
      // as they're often recoverable
    })

    // Handle EPIPE errors specifically
    process.on('SIGPIPE', () => {
      safeWarn('🔧 SIGPIPE received - output stream closed')
      // Don't exit for SIGPIPE, just acknowledge it
    })

    // Handle graceful shutdown signals
    process.on('SIGTERM', () => {
      safeLog('🛑 SIGTERM received - initiating graceful shutdown')
      this.gracefulShutdown('SIGTERM')
    })

    process.on('SIGINT', () => {
      safeLog('🛑 SIGINT received - initiating graceful shutdown')
      this.gracefulShutdown('SIGINT')
    })

    // Handle memory warnings
    process.on('warning', (warning) => {
      safeWarn('⚠️ Process Warning:', warning.name, warning.message)
      if (warning.stack) {
        safeWarn('Warning stack:', warning.stack)
      }
    })
  }

  private async gracefulShutdown(reason: string, error?: Error): Promise<void> {
    safeLog(`🔄 Starting graceful shutdown due to: ${reason}`)

    try {
      // Give the application a chance to clean up
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Log final status
      safeLog('✅ Graceful shutdown completed')

      // Exit with appropriate code
      const exitCode = error ? 1 : 0
      process.exit(exitCode)
    } catch (shutdownError) {
      safeError('❌ Error during graceful shutdown:', shutdownError)
      process.exit(1)
    }
  }

  public setShuttingDown(value: boolean): void {
    this.isShuttingDown = value
  }

  public isApplicationShuttingDown(): boolean {
    return this.isShuttingDown
  }
}

// Initialize the error handler
export const processErrorHandler = ProcessErrorHandler.getInstance()
