/**
 * Backward Compatibility Layer for Legacy Global State
 * Provides compatibility shims for code that still references global variables
 * This prevents breaking changes during the migration period
 */

import { dependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeWarn, safeError } from '../utils/safeLogger';

/**
 * Legacy Global State Compatibility Shim
 * Provides deprecated global.* access while warning developers to migrate
 */
export class LegacyCompatibilityLayer {
  private static instance: LegacyCompatibilityLayer;
  private warningsSent = new Set<string>();

  static getInstance(): LegacyCompatibilityLayer {
    if (!LegacyCompatibilityLayer.instance) {
      LegacyCompatibilityLayer.instance = new LegacyCompatibilityLayer();
    }
    return LegacyCompatibilityLayer.instance;
  }

  /**
   * Setup global compatibility shims
   * Call this after dependencyContainer is initialized
   */
  setupGlobalShims(): void {
    try {
      // Only setup shims if container is initialized
      if (!dependencyContainer.isInitialized()) {
        safeWarn('Cannot setup global shims - dependency container not initialized');
        return;
      }

      // Create compatibility proxies for each service
      this.createSemanticMemoryShim();
      this.createModelManagerShim();
      this.createAgentRuntimeShim();
      this.createPluginManagerShim();

      safeLog('✅ Legacy compatibility shims installed');

    } catch (error) {
      safeError('❌ Failed to setup legacy compatibility shims:', error);
    }
  }

  private createSemanticMemoryShim(): void {
    if (typeof global !== 'undefined') {
      Object.defineProperty(global, 'semanticMemory', {
        get: () => {
          this.logDeprecationWarning('semanticMemory', 'dependencyContainer.get("semanticMemory")');
          try {
            return dependencyContainer.get('semanticMemory');
          } catch (error) {
            safeError('Legacy global.semanticMemory access failed:', error);
            return null;
          }
        },
        configurable: true
      });
    }
  }

  private createModelManagerShim(): void {
    if (typeof global !== 'undefined') {
      Object.defineProperty(global, 'modelManager', {
        get: () => {
          this.logDeprecationWarning('modelManager', 'dependencyContainer.get("modelManager")');
          try {
            return dependencyContainer.get('modelManager');
          } catch (error) {
            safeError('Legacy global.modelManager access failed:', error);
            return null;
          }
        },
        configurable: true
      });
    }
  }

  private createAgentRuntimeShim(): void {
    if (typeof global !== 'undefined') {
      Object.defineProperty(global, 'agentRuntime', {
        get: () => {
          this.logDeprecationWarning('agentRuntime', 'dependencyContainer.get("agentRuntime")');
          try {
            return dependencyContainer.get('agentRuntime');
          } catch (error) {
            safeError('Legacy global.agentRuntime access failed:', error);
            return null;
          }
        },
        configurable: true
      });
    }
  }

  private createPluginManagerShim(): void {
    if (typeof global !== 'undefined') {
      Object.defineProperty(global, 'pluginManager', {
        get: () => {
          this.logDeprecationWarning('pluginManager', 'dependencyContainer.get("pluginManager")');
          try {
            return dependencyContainer.get('pluginManager');
          } catch (error) {
            safeError('Legacy global.pluginManager access failed:', error);
            return null;
          }
        },
        configurable: true
      });
    }
  }

  private logDeprecationWarning(serviceName: string, replacement: string): void {
    const warningKey = `global.${serviceName}`;
    
    if (!this.warningsSent.has(warningKey)) {
      safeWarn(`🚨 DEPRECATED: global.${serviceName} is deprecated. Use ${replacement} instead.`);
      safeWarn(`   This compatibility shim will be removed in a future version.`);
      this.warningsSent.add(warningKey);
    }
  }

  /**
   * Remove global shims (for testing or cleanup)
   */
  removeGlobalShims(): void {
    if (typeof global !== 'undefined') {
      delete (global as any).semanticMemory;
      delete (global as any).modelManager;
      delete (global as any).agentRuntime;
      delete (global as any).pluginManager;
    }
    safeLog('✅ Legacy compatibility shims removed');
  }

  /**
   * Check if any legacy code is still using global state
   */
  getUsageStats(): {
    serviceName: string;
    accessCount: number;
    lastAccessed: Date | null;
  }[] {
    // This would be enhanced to track actual usage
    return Array.from(this.warningsSent).map(warning => ({
      serviceName: warning.replace('global.', ''),
      accessCount: 1, // Simplified - could track actual count
      lastAccessed: new Date()
    }));
  }
}

// Export singleton instance
export const legacyCompatibility = LegacyCompatibilityLayer.getInstance();
