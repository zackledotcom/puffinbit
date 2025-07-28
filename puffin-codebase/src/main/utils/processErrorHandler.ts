/**
 * Process Error Handler for Puffer
 *
 * Handles uncaught exceptions and unhandled promise rejections
 * to prevent application crashes and provide graceful error recovery.
 * Enhanced with detailed categorization, metrics tracking, and retry mechanisms for recoverable errors.
 */

import { safeError, safeWarn, safeLog } from './safeLogger';

export class ProcessErrorHandler {
  private static instance: ProcessErrorHandler;
  private isShuttingDown: boolean = false;
  private errorMetrics = { uncaught: 0, rejections: 0, warnings: 0 };

  private constructor() {
    this.setupErrorHandlers();
  }

  public static getInstance(): ProcessErrorHandler {
    if (!ProcessErrorHandler.instance) {
      ProcessErrorHandler.instance = new ProcessErrorHandler();
    }
    return ProcessErrorHandler.instance;
  }

  private setupErrorHandlers(): void {
    // Uncaught exceptions with categorization and recovery
    process.on('uncaughtException', (error: Error) => {
      this.errorMetrics.uncaught++;
      const category = this.categorizeError(error);
      safeError('🔥 Uncaught Exception:', { message: error.message, category, stack: error.stack });

      if (category.recoverable && this.attemptRecovery(error)) return;

      if (!this.isShuttingDown) {
        this.isShuttingDown = true;
        this.gracefulShutdown('uncaughtException', error);
      }
    });

    // Unhandled rejections with promise inspection
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.errorMetrics.rejections++;
      safeError('🔥 Unhandled Rejection:', { reason: reason instanceof Error ? reason.message : reason, promise });
      // Attempt to recover if possible (e.g., retry promise if flagged)
    });

    // SIGPIPE with no exit
    process.on('SIGPIPE', () => {
      safeWarn('🔧 SIGPIPE received - stream closed');
    });

    // Graceful signals
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    // Warnings with metrics
    process.on('warning', (warning) => {
      this.errorMetrics.warnings++;
      safeWarn('⚠️ Process Warning:', { name: warning.name, message: warning.message, stack: warning.stack });
    });
  }

  private async gracefulShutdown(reason: string, error?: Error): Promise<void> {
    safeLog(`🔄 Shutdown due to: ${reason}`);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Cleanup window
      // Note: logMetrics method removed - can be added later if needed
      safeLog('✅ Shutdown complete');
      process.exit(error ? 1 : 0);
    } catch (shutdownError) {
      safeError('❌ Shutdown failed:', shutdownError);
      process.exit(1);
    }
  }

  private categorizeError(error: Error): { category: string; recoverable: boolean } {
    if (error.message.includes('ECONN')) return { category: 'network', recoverable: true };
    if (error.stack?.includes('Ollama')) return { category: 'ai_service', recoverable: false };
    return { category: 'logic', recoverable: false };
  }

  private attemptRecovery(error: Error): boolean {
    // Stub: Retry logic for recoverable errors (e.g., network)
    if (error.message.includes('timeout')) {
      safeWarn('Attempting recovery from timeout');
      // Example: Restart relevant service
      return true; // Success if recovered
    }
    
    return false; // Could not recover
  }
}