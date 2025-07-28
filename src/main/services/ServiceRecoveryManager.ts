/**
 * Service Recovery Manager - Enhanced error recovery strategies
 * Provides intelligent recovery mechanisms for different types of service failures
 */

import { EventEmitter } from 'events';
import { serviceManager } from './ServiceManager';
import { safeLog, safeError, safeWarn, safeInfo } from '../utils/safeLogger';

export interface RecoveryStrategy {
  name: string;
  description: string;
  execute(serviceName: string, error: Error, context: RecoveryContext): Promise<RecoveryResult>;
  canHandle(error: Error, serviceName: string): boolean;
  priority: number; // Higher priority strategies are tried first
}

export interface RecoveryContext {
  serviceName: string;
  error: Error;
  attemptCount: number;
  lastSuccessfulOperation?: Date;
  serviceUptime: number;
  previousRecoveryAttempts: RecoveryAttempt[];
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  message: string;
  nextAction?: 'retry' | 'escalate' | 'disable' | 'fallback';
  estimatedRecoveryTime?: number;
}

export interface RecoveryAttempt {
  timestamp: Date;
  strategy: string;
  success: boolean;
  error?: string;
}

/**
 * Restart Service Recovery Strategy
 * Simple restart for temporary failures
 */
class RestartRecoveryStrategy implements RecoveryStrategy {
  name = 'restart';
  description = 'Restart the service to recover from temporary failures';
  priority = 100;

  canHandle(error: Error, serviceName: string): boolean {
    // Handle connection errors, timeout errors, etc.
    const restartableErrors = [
      'connection refused',
      'timeout',
      'service unavailable',
      'network error',
      'socket hang up'
    ];
    
    return restartableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType)
    );
  }

  async execute(serviceName: string, error: Error, context: RecoveryContext): Promise<RecoveryResult> {
    try {
      safeInfo(`🔄 Attempting restart recovery for ${serviceName}`);
      
      // Wait before restart to avoid rapid cycling
      const waitTime = Math.min(context.attemptCount * 2000, 10000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      const result = await serviceManager.restart(serviceName);
      
      if (result.success) {
        return {
          success: true,
          strategy: this.name,
          message: `Service ${serviceName} restarted successfully`,
          nextAction: 'retry',
          estimatedRecoveryTime: waitTime
        };
      } else {
        return {
          success: false,
          strategy: this.name,
          message: `Failed to restart ${serviceName}: ${result.message}`,
          nextAction: 'escalate'
        };
      }
    } catch (recoveryError: any) {
      return {
        success: false,
        strategy: this.name,
        message: `Restart recovery failed: ${recoveryError.message}`,
        nextAction: 'escalate'
      };
    }
  }
}

/**
 * Clear State Recovery Strategy
 * Clear corrupted state/cache and restart
 */
class ClearStateRecoveryStrategy extends RestartRecoveryStrategy {
  name = 'clear-state';
  description = 'Clear service state and restart';
  priority = 80;

  canHandle(error: Error, serviceName: string): boolean {
    const stateCorruptionErrors = [
      'corrupted state',
      'invalid state',
      'state mismatch',
      'cache error',
      'data inconsistency'
    ];
    
    return stateCorruptionErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType)
    );
  }

  async execute(serviceName: string, error: Error, context: RecoveryContext): Promise<RecoveryResult> {
    try {
      safeInfo(`🧹 Attempting clear-state recovery for ${serviceName}`);
      
      // Service-specific state clearing
      await this.clearServiceState(serviceName);
      
      // Now restart the service
      return super.execute(serviceName, error, context);
      
    } catch (recoveryError: any) {
      return {
        success: false,
        strategy: this.name,
        message: `Clear-state recovery failed: ${recoveryError.message}`,
        nextAction: 'escalate'
      };
    }
  }

  private async clearServiceState(serviceName: string): Promise<void> {
    // Service-specific state clearing logic
    switch (serviceName) {
      case 'ollama':
        safeInfo('Clearing Ollama cache and temporary files');
        // Could implement actual cache clearing here
        break;
      case 'chroma':
        safeInfo('Clearing ChromaDB temporary indexes');
        // Could implement actual index clearing here
        break;
      default:
        safeInfo(`No specific state clearing for ${serviceName}`);
    }
  }
}

/**
 * Fallback Mode Recovery Strategy  
 * Switch to degraded functionality mode
 */
class FallbackModeRecoveryStrategy implements RecoveryStrategy {
  name = 'fallback-mode';
  description = 'Switch to degraded functionality mode';
  priority = 60;

  canHandle(error: Error, serviceName: string): boolean {
    // Use fallback for non-critical services or after multiple restart failures
    return serviceName === 'chroma' || error.message.includes('persistent failure');
  }

  async execute(serviceName: string, error: Error, context: RecoveryContext): Promise<RecoveryResult> {
    try {
      safeWarn(`⚠️ Switching ${serviceName} to fallback mode`);
      
      // Enable fallback functionality
      await this.enableFallbackMode(serviceName);
      
      return {
        success: true,
        strategy: this.name,
        message: `${serviceName} running in degraded mode`,
        nextAction: 'fallback',
        estimatedRecoveryTime: 0
      };
    } catch (recoveryError: any) {
      return {
        success: false,
        strategy: this.name,
        message: `Fallback mode activation failed: ${recoveryError.message}`,
        nextAction: 'disable'
      };
    }
  }

  private async enableFallbackMode(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'chroma':
        safeInfo('Enabling in-memory vector storage fallback');
        // Could implement in-memory fallback here
        break;
      case 'ollama':
        safeInfo('Enabling API fallback mode');
        // Could implement remote API fallback here
        break;
      default:
        safeInfo(`Generic fallback mode for ${serviceName}`);
    }
  }
}

/**
 * Resource Recovery Strategy
 * Free up resources and restart
 */
class ResourceRecoveryStrategy implements RecoveryStrategy {
  name = 'resource-recovery';
  description = 'Free up system resources and restart service';
  priority = 70;

  canHandle(error: Error, serviceName: string): boolean {
    const resourceErrors = [
      'out of memory',
      'memory limit exceeded',
      'disk full',
      'too many files',
      'resource exhausted'
    ];
    
    return resourceErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType)
    );
  }

  async execute(serviceName: string, error: Error, context: RecoveryContext): Promise<RecoveryResult> {
    try {
      safeWarn(`🧽 Attempting resource recovery for ${serviceName}`);
      
      // Free up resources
      await this.freeUpResources(serviceName);
      
      // Wait for resources to be freed
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Restart with resource constraints
      const result = await serviceManager.restart(serviceName);
      
      if (result.success) {
        return {
          success: true,
          strategy: this.name,
          message: `${serviceName} restarted with resource optimization`,
          nextAction: 'retry',
          estimatedRecoveryTime: 10000
        };
      } else {
        return {
          success: false,
          strategy: this.name,
          message: `Resource recovery failed: ${result.message}`,
          nextAction: 'escalate'
        };
      }
    } catch (recoveryError: any) {
      return {
        success: false,
        strategy: this.name,
        message: `Resource recovery failed: ${recoveryError.message}`,
        nextAction: 'escalate'
      };
    }
  }

  private async freeUpResources(serviceName: string): Promise<void> {
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Service-specific resource cleanup
    switch (serviceName) {
      case 'ollama':
        safeInfo('Clearing Ollama model cache');
        // Could implement model cache clearing
        break;
      case 'chroma':
        safeInfo('Clearing ChromaDB memory indexes');
        // Could implement index clearing
        break;
      default:
        safeInfo(`Generic resource cleanup for ${serviceName}`);
    }
  }
}

/**
 * Main Service Recovery Manager
 */
export class ServiceRecoveryManager extends EventEmitter {
  private static instance: ServiceRecoveryManager;
  private strategies: RecoveryStrategy[] = [];
  private recoveryHistory = new Map<string, RecoveryAttempt[]>();
  private isRecovering = new Set<string>();

  private constructor() {
    super();
    this.initializeStrategies();
  }

  static getInstance(): ServiceRecoveryManager {
    if (!ServiceRecoveryManager.instance) {
      ServiceRecoveryManager.instance = new ServiceRecoveryManager();
    }
    return ServiceRecoveryManager.instance;
  }

  private initializeStrategies(): void {
    this.strategies = [
      new RestartRecoveryStrategy(),
      new ClearStateRecoveryStrategy(),
      new ResourceRecoveryStrategy(),
      new FallbackModeRecoveryStrategy()
    ].sort((a, b) => b.priority - a.priority);
    
    safeLog('✅ Service recovery strategies initialized');
  }

  /**
   * Attempt to recover a failed service
   */
  async recoverService(serviceName: string, error: Error): Promise<RecoveryResult> {
    if (this.isRecovering.has(serviceName)) {
      return {
        success: false,
        strategy: 'none',
        message: `Recovery already in progress for ${serviceName}`,
        nextAction: 'retry'
      };
    }

    this.isRecovering.add(serviceName);
    
    try {
      const context = this.buildRecoveryContext(serviceName, error);
      
      // Try each strategy in priority order
      for (const strategy of this.strategies) {
        if (strategy.canHandle(error, serviceName)) {
          safeInfo(`🔧 Trying recovery strategy '${strategy.name}' for ${serviceName}`);
          
          const result = await strategy.execute(serviceName, error, context);
          
          // Record the attempt
          this.recordRecoveryAttempt(serviceName, {
            timestamp: new Date(),
            strategy: strategy.name,
            success: result.success,
            error: result.success ? undefined : result.message
          });

          if (result.success) {
            safeInfo(`✅ Recovery successful for ${serviceName} using ${strategy.name}`);
            this.emit('recovery:success', { serviceName, strategy: strategy.name, result });
            return result;
          } else {
            safeWarn(`❌ Recovery strategy '${strategy.name}' failed for ${serviceName}: ${result.message}`);
          }
        }
      }

      // No strategy could handle the error
      const failureResult: RecoveryResult = {
        success: false,
        strategy: 'none',
        message: `No recovery strategy available for ${serviceName} error: ${error.message}`,
        nextAction: 'disable'
      };

      this.emit('recovery:failed', { serviceName, error, result: failureResult });
      return failureResult;

    } finally {
      this.isRecovering.delete(serviceName);
    }
  }

  private buildRecoveryContext(serviceName: string, error: Error): RecoveryContext {
    const history = this.recoveryHistory.get(serviceName) || [];
    const health = serviceManager.getHealth(serviceName);
    
    return {
      serviceName,
      error,
      attemptCount: history.length,
      serviceUptime: health?.metrics?.uptime || 0,
      previousRecoveryAttempts: history
    };
  }

  private recordRecoveryAttempt(serviceName: string, attempt: RecoveryAttempt): void {
    if (!this.recoveryHistory.has(serviceName)) {
      this.recoveryHistory.set(serviceName, []);
    }
    
    const history = this.recoveryHistory.get(serviceName)!;
    history.push(attempt);
    
    // Keep only last 10 attempts
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get recovery history for a service
   */
  getRecoveryHistory(serviceName: string): RecoveryAttempt[] {
    return [...(this.recoveryHistory.get(serviceName) || [])];
  }

  /**
   * Clear recovery history for a service
   */
  clearRecoveryHistory(serviceName: string): void {
    this.recoveryHistory.delete(serviceName);
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    totalAttempts: number;
    successRate: number;
    mostUsedStrategy: string;
    serviceStats: Record<string, { attempts: number; successRate: number }>;
  } {
    let totalAttempts = 0;
    let totalSuccess = 0;
    const strategyCount = new Map<string, number>();
    const serviceStats: Record<string, { attempts: number; successRate: number }> = {};

    for (const [serviceName, history] of this.recoveryHistory) {
      const attempts = history.length;
      const success = history.filter(h => h.success).length;
      
      totalAttempts += attempts;
      totalSuccess += success;
      
      serviceStats[serviceName] = {
        attempts,
        successRate: attempts > 0 ? success / attempts : 0
      };

      // Count strategy usage
      history.forEach(attempt => {
        strategyCount.set(attempt.strategy, (strategyCount.get(attempt.strategy) || 0) + 1);
      });
    }

    const mostUsedStrategy = Array.from(strategyCount.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      totalAttempts,
      successRate: totalAttempts > 0 ? totalSuccess / totalAttempts : 0,
      mostUsedStrategy,
      serviceStats
    };
  }
}

// Export singleton instance
export const serviceRecoveryManager = ServiceRecoveryManager.getInstance();
