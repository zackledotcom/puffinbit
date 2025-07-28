/**
 * Configuration Service - Centralized configuration management
 * Replaces hardcoded CONFIG object with a proper service
 */

import { join } from 'path';
import { app } from 'electron';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { Service, ServiceConfig, HealthStatus, ServiceMetrics } from './ServiceManager';
import { safeLog, safeError, safeInfo, safeWarn } from '../utils/safeLogger';

export interface AppConfiguration {
  version: string;
  platform: {
    isAppleSilicon: boolean;
    enableMLXFallback: boolean;
    optimizeForPerformance: boolean;
  };
  security: {
    CSP: string;
    allowedExternalURLs: string[];
    windowDefaults: {
      width: number;
      height: number;
      webPreferences: {
        nodeIntegration: boolean;
        contextIsolation: boolean;
        sandbox: boolean;
        webSecurity: boolean;
        preload: string;
      };
    };
  };
  services: {
    ollama: {
      baseURL: string;
      timeout: number;
    };
    chroma: {
      port: number;
      path: string;
      dataPath: string;
    };
  };
  IPC: {
    whitelist: Set<string>;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFileLogging: boolean;
    maxLogFiles: number;
  };
  performance: {
    maxMemoryUsage: number;
    healthCheckInterval: number;
    metricsRetentionDays: number;
  };
}

export class ConfigurationService implements Service {
  public readonly name = 'configuration';
  
  public readonly config: ServiceConfig = {
    name: 'configuration',
    displayName: 'Configuration Service',
    description: 'Centralized configuration management',
    dependencies: [],
    healthCheckInterval: 30000, // 30 seconds
    timeout: 5000,
    maxRetries: 3,
    circuitBreakerThreshold: 5,
    autoRestart: true,
    critical: true
  };

  private configuration: AppConfiguration;
  private configPath: string;
  private metrics: ServiceMetrics = {
    uptime: 0,
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0
  };
  private startTime: Date | null = null;

  constructor() {
    this.configPath = join(app.getPath('userData'), 'config.json');
    this.configuration = this.getDefaultConfiguration();
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Verify configuration is valid
      this.validateConfiguration(this.configuration);
      
      const responseTime = Date.now() - startTime;
      this.metrics.averageResponseTime = (this.metrics.averageResponseTime + responseTime) / 2;

      return {
        status: 'healthy',
        message: 'Configuration service operational',
        timestamp: new Date(),
        responseTime,
        details: {
          configPath: this.configPath,
          configVersion: this.configuration.version,
          lastModified: existsSync(this.configPath) ? 'exists' : 'default'
        },
        metrics: this.metrics
      };
    } catch (error: any) {
      this.metrics.errorCount++;
      return {
        status: 'critical',
        message: `Configuration validation failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        metrics: this.metrics
      };
    }
  }

  async start(): Promise<{ success: boolean; message: string }> {
    try {
      safeInfo('Starting Configuration Service...');
      this.startTime = new Date();
      
      // Load configuration from file if it exists
      await this.loadConfiguration();
      
      // Validate the loaded configuration
      this.validateConfiguration(this.configuration);
      
      safeInfo('✅ Configuration Service started successfully');
      return { success: true, message: 'Configuration service started' };
    } catch (error: any) {
      safeError('❌ Configuration service start error:', error);
      return { success: false, message: error.message };
    }
  }

  async stop(): Promise<{ success: boolean; message: string }> {
    try {
      safeInfo('Stopping Configuration Service...');
      
      // Save current configuration
      await this.saveConfiguration();
      
      this.startTime = null;
      safeInfo('✅ Configuration Service stopped');
      return { success: true, message: 'Configuration service stopped' };
    } catch (error: any) {
      safeError('❌ Configuration service stop error:', error);
      return { success: false, message: error.message };
    }
  }

  async restart(): Promise<{ success: boolean; message: string }> {
    safeInfo('Restarting Configuration Service...');
    
    const stopResult = await this.stop();
    if (!stopResult.success) {
      return stopResult;
    }
    
    return this.start();
  }

  getMetrics(): ServiceMetrics {
    if (this.startTime) {
      this.metrics.uptime = Date.now() - this.startTime.getTime();
    }
    return { ...this.metrics };
  }

  /**
   * Get complete configuration
   */
  getConfiguration(): AppConfiguration {
    this.metrics.requestCount++;
    return { ...this.configuration };
  }

  /**
   * Get specific configuration section
   */
  getConfigSection<K extends keyof AppConfiguration>(section: K): AppConfiguration[K] {
    this.metrics.requestCount++;
    return this.configuration[section];
  }

  /**
   * Update configuration section
   */
  async updateConfigSection<K extends keyof AppConfiguration>(
    section: K, 
    updates: Partial<AppConfiguration[K]>
  ): Promise<void> {
    try {
      this.configuration[section] = {
        ...(this.configuration[section] || {}),
        ...updates
      };

      // Validate updated configuration
      this.validateConfiguration(this.configuration);
      
      // Save to disk
      await this.saveConfiguration();
      
      safeInfo(`Configuration section '${section}' updated`);
    } catch (error: any) {
      this.metrics.errorCount++;
      safeError(`Failed to update configuration section '${section}':`, error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    try {
      this.configuration = this.getDefaultConfiguration();
      await this.saveConfiguration();
      safeInfo('Configuration reset to defaults');
    } catch (error: any) {
      this.metrics.errorCount++;
      safeError('Failed to reset configuration:', error);
      throw error;
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      if (existsSync(this.configPath)) {
        const configData = await readFile(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(configData);
        
        // Merge with defaults to ensure all required fields exist
        this.configuration = {
          ...this.getDefaultConfiguration(),
          ...loadedConfig
        };
        
        safeInfo('Configuration loaded from file');
      } else {
        safeInfo('No configuration file found, using defaults');
        await this.saveConfiguration();
      }
    } catch (error: any) {
      safeError('Failed to load configuration, using defaults:', error);
      this.configuration = this.getDefaultConfiguration();
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      // Ensure directory exists
      const configDir = join(app.getPath('userData'));
      if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
      }

      // Convert Set to Array for JSON serialization
      const configToSave = {
        ...this.configuration,
        IPC: {
          ...this.configuration.IPC,
          whitelist: Array.from(this.configuration.IPC.whitelist)
        }
      };

      await writeFile(this.configPath, JSON.stringify(configToSave, null, 2));
      safeInfo('Configuration saved to file');
    } catch (error: any) {
      safeError('Failed to save configuration:', error);
      throw error;
    }
  }

  private validateConfiguration(config: AppConfiguration): void {
    // Basic validation
    if (!config.version) {
      throw new Error('Configuration missing version');
    }

    if (!config.services?.ollama?.baseURL) {
      throw new Error('Configuration missing Ollama base URL');
    }

    if (!config.security?.CSP) {
      throw new Error('Configuration missing CSP policy');
    }

    if (!config.IPC?.whitelist || config.IPC.whitelist.size === 0) {
      throw new Error('Configuration missing IPC whitelist');
    }

    // Validate security settings
    if (config.security.CSP.includes("'unsafe-inline'") && 
        config.security.CSP.includes('script-src')) {
      safeWarn('⚠️ CSP contains unsafe-inline for scripts - security risk');
    }
  }

  private getDefaultConfiguration(): AppConfiguration {
    const isAppleSilicon = process.platform === 'darwin' && process.arch === 'arm64';
    
    return {
      version: '1.0.0',
      platform: {
        isAppleSilicon,
        enableMLXFallback: isAppleSilicon,
        optimizeForPerformance: true
      },
      security: {
        CSP: "default-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:*",
        allowedExternalURLs: ['https://trusted-domain.com'],
        windowDefaults: {
          width: 1200,
          height: 800,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            preload: join(__dirname, '../preload/index.js')
          }
        }
      },
      services: {
        ollama: {
          baseURL: 'http://127.0.0.1:11434',
          timeout: 120000
        },
        chroma: {
          port: 8000,
          path: '/Users/jibbro/.local/bin/chroma',
          dataPath: './chroma_data'
        }
      },
      IPC: {
        whitelist: new Set([
          'fs:read', 'fs:write', 'ollama:chat', 'ollama:update-modelfile', 'ollama:modelfile-rate-limit-status',
          'ollama:exec', 'chroma:query', 'get-available-models', 'get-service-metrics', 'get-performance-metrics',
          'search-memory', 'check-ollama-status', 'start-ollama', 'get-ollama-models', 'pull-model', 'delete-model',
          'check-chroma-status', 'start-chroma', 'chat-with-ai', 'get-available-models-for-tuning',
          'get-all-tuning-datasets', 'get-tuning-dataset', 'create-tuning-dataset', 'update-tuning-dataset',
          'delete-tuning-dataset', 'add-examples-to-dataset', 'remove-examples-from-dataset', 'get-all-tuning-jobs',
          'get-tuning-job', 'start-tuning-job', 'umsl-store-memory', 'umsl-retrieve-context', 'umsl-advanced-search',
          'umsl-create-thread', 'umsl-add-to-thread', 'umsl-get-thread', 'umsl-register-model', 'umsl-load-model',
          'umsl-unload-model', 'umsl-execute-model', 'umsl-get-model-stats', 'umsl-get-resource-usage',
          'umsl-get-memory-stats', 'umsl-prefetch-models', 'umsl-update-resource-quota', 'agent-create',
          'agent-start', 'agent-stop', 'agent-delete', 'agent-get', 'agent-list', 'agent-get-status',
          'agent-execute-task', 'agent-get-system-status', 'plugin-install', 'plugin-uninstall', 'plugin-enable',
          'plugin-disable', 'plugin-update', 'plugin-list-installed', 'plugin-get-state', 'plugin-search-registry',
          'plugin-execute', 'plugin-get-config', 'plugin-set-config', 'get-service-health', 'get-system-health',
          'browser-create-session', 'browser-extract-context', 'browser-get-security-info', 'browser-clear-data'
        ])
      },
      logging: {
        level: 'info',
        enableFileLogging: true,
        maxLogFiles: 5
      },
      performance: {
        maxMemoryUsage: isAppleSilicon ? 16384 : 8192,
        healthCheckInterval: 10000,
        metricsRetentionDays: 7
      }
    };
  }
}

// Export singleton instance
export const configurationService = new ConfigurationService();
