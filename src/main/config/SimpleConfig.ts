/**
 * Google-Style Simple Configuration
 * Replaces over-engineered config management with environment-based approach
 */

export interface Config {
  // Service URLs
  ollamaUrl: string
  chromaUrl: string
  chromaPort: number
  
  // Performance settings
  maxMemoryUsageMB: number
  maxConcurrentRequests: number
  requestTimeoutMs: number
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  enableFileLogging: boolean
  
  // Features
  enableTelemetry: boolean
  enableGPU: boolean
  
  // Environment
  environment: 'development' | 'production' | 'test'
  port: number
}

class SimpleConfig {
  private static instance: Config
  
  static get(): Config {
    if (!SimpleConfig.instance) {
      SimpleConfig.instance = SimpleConfig.load()
    }
    return SimpleConfig.instance
  }
  
  private static load(): Config {
    return {
      // Service URLs - directly from environment
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
      chromaPort: parseInt(process.env.CHROMA_PORT || '8000'),
      
      // Performance settings
      maxMemoryUsageMB: parseInt(process.env.MAX_MEMORY_MB || '2048'),
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5'),
      requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
      
      // Logging
      logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
      enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
      
      // Features
      enableTelemetry: process.env.ENABLE_TELEMETRY === 'true',
      enableGPU: process.env.ENABLE_GPU === 'true',
      
      // Environment
      environment: (process.env.NODE_ENV as Config['environment']) || 'development',
      port: parseInt(process.env.PORT || '3000')
    }
  }
  
  static validate(): void {
    const config = SimpleConfig.get()
    
    // Simple validation - throw on invalid config
    if (!config.ollamaUrl.startsWith('http')) {
      throw new Error('OLLAMA_URL must be a valid HTTP URL')
    }
    
    if (config.chromaPort < 1 || config.chromaPort > 65535) {
      throw new Error('CHROMA_PORT must be a valid port number')
    }
    
    if (config.maxMemoryUsageMB < 512) {
      throw new Error('MAX_MEMORY_MB must be at least 512')
    }
  }
}

export { SimpleConfig }
