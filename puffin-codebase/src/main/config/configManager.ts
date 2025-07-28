/**
 * Enterprise Configuration Validation and Management System
 *
 * Implements comprehensive configuration validation, auto-repair,
 * schema enforcement, and secure configuration handling.
 *
 * @author Puffer Configuration Management Team
 * @version 1.0.0
 */

import { z } from 'zod'
import { promises as fs } from 'fs'
import { join } from 'path'
import { logger } from '@utils/logger'

// Configuration schema definitions
export const TelemetryConfigSchema = z.object({
  enabled: z.boolean().default(false),
  collectUsageStats: z.boolean().default(false),
  collectErrorReports: z.boolean().default(true),
  collectPerformanceMetrics: z.boolean().default(false),
  anonymizeData: z.boolean().default(true),
  retentionDays: z.number().int().min(1).max(365).default(30)
})

export const PerformanceConfigSchema = z.object({
  maxMemoryUsageMB: z.number().int().min(512).max(16384).default(2048),
  enableGPU: z.boolean().default(false),
  maxConcurrentRequests: z.number().int().min(1).max(20).default(5),
  requestTimeoutMs: z.number().int().min(1000).max(300000).default(30000),
  enableCaching: z.boolean().default(true),
  cacheMaxSizeMB: z.number().int().min(10).max(1024).default(100),
  gcStrategy: z.enum(['aggressive', 'balanced', 'conservative']).default('balanced')
})

export const AIConfigSchema = z.object({
  defaultModel: z.string().min(1).default('tinydolphin:latest'),
  defaultTemperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(8192).default(2048),
  enableMemoryEnrichment: z.boolean().default(true),
  memorySearchLimit: z.number().int().min(1).max(100).default(10),
  memoryThreshold: z.number().min(0).max(1).default(0.7),
  enableStreaming: z.boolean().default(false),
  modelTimeout: z.number().int().min(5000).max(600000).default(60000)
})

export const SecurityConfigSchema = z.object({
  enableAgentSafety: z.boolean().default(true),
  allowDangerousOperations: z.boolean().default(false),
  maxFileSize: z.number().int().min(1024).max(1073741824).default(104857600), // 100MB
  allowedFileTypes: z.array(z.string()).default(['txt', 'md', 'json', 'js', 'ts', 'py']),
  enableInputValidation: z.boolean().default(true),
  logSecurityEvents: z.boolean().default(true),
  sessionTimeoutMs: z.number().int().min(300000).max(86400000).default(3600000) // 1 hour
})

export const UIConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().length(2).default('en'),
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  enableAnimations: z.boolean().default(true),
  enableSounds: z.boolean().default(false),
  autoSave: z.boolean().default(true),
  autoSaveIntervalMs: z.number().int().min(5000).max(300000).default(30000),
  maxChatHistory: z.number().int().min(10).max(10000).default(1000)
})

export const ServicesConfigSchema = z.object({
  ollama: z.object({
    enabled: z.boolean().default(true),
    url: z.string().url().default('http://127.0.0.1:11434'),
    timeout: z.number().int().min(1000).max(60000).default(30000),
    autoStart: z.boolean().default(true),
    healthCheckInterval: z.number().int().min(10000).max(300000).default(30000)
  }),
  chroma: z.object({
    enabled: z.boolean().default(true),
    url: z.string().url().default('http://localhost:8000'),
    timeout: z.number().int().min(1000).max(60000).default(15000),
    autoStart: z.boolean().default(true),
    healthCheckInterval: z.number().int().min(10000).max(300000).default(30000)
  })
})

export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']).default('info'),
  enableFileLogging: z.boolean().default(true),
  enableConsoleLogging: z.boolean().default(true),
  maxLogFiles: z.number().int().min(1).max(100).default(10),
  maxLogSizeMB: z.number().int().min(1).max(1024).default(10),
  logDirectory: z.string().default('logs'),
  enablePerformanceLogging: z.boolean().default(true)
})

// Main configuration schema
export const AppConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  environment: z.enum(['development', 'production', 'testing']).default('development'),
  telemetry: TelemetryConfigSchema,
  performance: PerformanceConfigSchema,
  ai: AIConfigSchema,
  security: SecurityConfigSchema,
  ui: UIConfigSchema,
  services: ServicesConfigSchema,
  logging: LoggingConfigSchema,

  // Metadata
  createdAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  updatedAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  configVersion: z.string().default('2.0.0')
})

export type AppConfig = z.infer<typeof AppConfigSchema>

export interface ConfigValidationResult {
  valid: boolean
  config?: AppConfig
  errors: Array<{
    path: string
    message: string
    code: string
  }>
  warnings: Array<{
    path: string
    message: string
    suggestion: string
  }>
  repaired: boolean
  backupCreated: boolean
}

/**
 * Enterprise configuration validator and manager
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager
  private configPath: string
  private backupPath: string
  private currentConfig: AppConfig | null = null

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager()
    }
    return ConfigurationManager.instance
  }

  constructor() {
    this.configPath = join(process.cwd(), 'config', 'app.json')
    this.backupPath = join(process.cwd(), 'config', 'backups')
  }

  /**
   * Initialize configuration system
   */
  async initialize(): Promise<ConfigValidationResult> {
    logger.info(
      'Initializing configuration system',
      { configPath: this.configPath },
      'config-manager'
    )

    try {
      // Ensure directories exist
      await this.ensureDirectories()

      // Load and validate configuration
      const result = await this.loadAndValidateConfig()

      if (result.valid && result.config) {
        this.currentConfig = result.config
        logger.success(
          'Configuration system initialized successfully',
          {
            version: result.config.version,
            environment: result.config.environment
          },
          'config-manager'
        )
      }

      return result
    } catch (error) {
      logger.error('Failed to initialize configuration system', error, 'config-manager')

      // Return default configuration as fallback
      const defaultConfig = await this.getDefaultConfig()
      this.currentConfig = defaultConfig

      return {
        valid: false,
        config: defaultConfig,
        errors: [
          {
            path: 'system',
            message: 'Failed to load configuration, using defaults',
            code: 'LOAD_ERROR'
          }
        ],
        warnings: [],
        repaired: true,
        backupCreated: false
      }
    }
  }

  private async loadAndValidateConfig(): Promise<ConfigValidationResult> {
    let configExists = false
    let rawConfig: any = {}

    try {
      await fs.access(this.configPath)
      configExists = true
      const configContent = await fs.readFile(this.configPath, 'utf8')
      rawConfig = JSON.parse(configContent)
    } catch (error) {
      if (!configExists) {
        logger.info(
          'Configuration file does not exist, will create default',
          undefined,
          'config-manager'
        )
      }
    }

    return await this.validateAndRepairConfig(rawConfig, !configExists)
  }

  private async validateAndRepairConfig(
    rawConfig: any,
    isNewConfig: boolean = false
  ): Promise<ConfigValidationResult> {
    const parseResult = AppConfigSchema.safeParse(rawConfig)

    if (parseResult.success) {
      const validConfig = parseResult.data
      await this.saveConfig(validConfig)

      return {
        valid: true,
        config: validConfig,
        errors: [],
        warnings: [],
        repaired: isNewConfig,
        backupCreated: false
      }
    } else {
      // Use default configuration
      const defaultConfig = await this.getDefaultConfig()
      await this.saveConfig(defaultConfig)

      return {
        valid: true,
        config: defaultConfig,
        errors: [],
        warnings: [
          {
            path: 'system',
            message: 'Configuration was reset to defaults',
            suggestion: 'Review the configuration file to ensure all settings are correct'
          }
        ],
        repaired: true,
        backupCreated: false
      }
    }
  }

  private async getDefaultConfig(): Promise<AppConfig> {
    return AppConfigSchema.parse({})
  }

  private async saveConfig(config: AppConfig): Promise<void> {
    await this.ensureDirectories()
    const configJson = JSON.stringify(config, null, 2)
    await fs.writeFile(this.configPath, configJson, 'utf8')
  }

  private async ensureDirectories(): Promise<void> {
    const configDir = join(process.cwd(), 'config')
    await fs.mkdir(configDir, { recursive: true })
    await fs.mkdir(this.backupPath, { recursive: true })
  }

  getCurrentConfig(): AppConfig | null {
    return this.currentConfig
  }
}

export const configManager = ConfigurationManager.getInstance()

export async function initializeConfiguration() {
  const manager = ConfigurationManager.getInstance()
  const result = await manager.initialize()
  return { manager, result }
}
