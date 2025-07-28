/**
 * Safe Logger Utility for Puffer
 *
 * Prevents EPIPE errors by safely handling console output
 * when streams might be closed or unavailable.
 */

export class SafeLogger {
  private static instance: SafeLogger
  private isOutputSafe: boolean = true
  private logBuffer: string[] = []

  private constructor() {
    this.setupErrorHandlers()
  }

  public static getInstance(): SafeLogger {
    if (!SafeLogger.instance) {
      SafeLogger.instance = new SafeLogger()
    }
    return SafeLogger.instance
  }

  private setupErrorHandlers(): void {
    // Handle stdout/stderr errors
    if (process.stdout) {
      process.stdout.on('error', (error) => {
        if (error.code === 'EPIPE') {
          this.isOutputSafe = false
        }
      })
    }

    if (process.stderr) {
      process.stderr.on('error', (error) => {
        if (error.code === 'EPIPE') {
          this.isOutputSafe = false
        }
      })
    }

    // Re-enable output when process becomes stable
    process.on('SIGTERM', () => {
      this.isOutputSafe = false
    })

    process.on('SIGINT', () => {
      this.isOutputSafe = false
    })
  }

  private safeWrite(method: 'log' | 'error' | 'warn' | 'info', ...args: any[]): void {
    try {
      if (this.isOutputSafe && process.stdout && process.stderr) {
        console[method](...args)
      } else {
        // Buffer the log for later if needed
        this.logBuffer.push(`[${method.toUpperCase()}] ${args.join(' ')}`)

        // Keep buffer size manageable
        if (this.logBuffer.length > 100) {
          this.logBuffer = this.logBuffer.slice(-50)
        }
      }
    } catch (error) {
      // Silently handle any logging errors to prevent cascading failures
      this.isOutputSafe = false
    }
  }

  public log(...args: any[]): void {
    this.safeWrite('log', ...args)
  }

  public error(...args: any[]): void {
    this.safeWrite('error', ...args)
  }

  public warn(...args: any[]): void {
    this.safeWrite('warn', ...args)
  }

  public info(...args: any[]): void {
    this.safeWrite('info', ...args)
  }

  public getBufferedLogs(): string[] {
    return [...this.logBuffer]
  }

  public clearBuffer(): void {
    this.logBuffer = []
  }

  public isLoggingSafe(): boolean {
    return this.isOutputSafe
  }
}

// Export a singleton instance for easy use
export const safeLogger = SafeLogger.getInstance()

// Export convenience functions
export const safeLog = (...args: any[]) => safeLogger.log(...args)
export const safeError = (...args: any[]) => safeLogger.error(...args)
export const safeWarn = (...args: any[]) => safeLogger.warn(...args)
export const safeInfo = (...args: any[]) => safeLogger.info(...args)
