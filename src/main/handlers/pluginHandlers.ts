/**
 * Plugin IPC Handlers - Plugin management system
 * Uses dependency injection for PluginManager
 */

import { ipcMain } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeError } from '../utils/safeLogger';

export function registerPluginHandlers(
  container: DependencyContainer,
  Security: any
): void {

  /**
   * Install a plugin
   */
  ipcMain.handle('plugin-install', async (_, pluginId: string, version?: string) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      if (version !== undefined && (typeof version !== 'string' || !version.trim())) {
        return { success: false, error: 'Version must be a non-empty string if provided' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      const sanitizedVersion = version ? Security.sanitizeInput(version.trim()) : undefined;

      const pluginManager = container.get('pluginManager');
      await pluginManager.installPlugin(sanitizedPluginId, sanitizedVersion);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ plugin-install error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Uninstall a plugin
   */
  ipcMain.handle('plugin-uninstall', async (_, pluginId: string) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      const pluginManager = container.get('pluginManager');
      await pluginManager.uninstallPlugin(sanitizedPluginId);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ plugin-uninstall error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Enable a plugin
   */
  ipcMain.handle('plugin-enable', async (_, pluginId: string) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      const pluginManager = container.get('pluginManager');
      await pluginManager.enablePlugin(sanitizedPluginId);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ plugin-enable error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Disable a plugin
   */
  ipcMain.handle('plugin-disable', async (_, pluginId: string) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      const pluginManager = container.get('pluginManager');
      await pluginManager.disablePlugin(sanitizedPluginId);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ plugin-disable error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update a plugin
   */
  ipcMain.handle('plugin-update', async (_, pluginId: string, version?: string) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      if (version !== undefined && (typeof version !== 'string' || !version.trim())) {
        return { success: false, error: 'Version must be a non-empty string if provided' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      const sanitizedVersion = version ? Security.sanitizeInput(version.trim()) : undefined;

      const pluginManager = container.get('pluginManager');
      await pluginManager.updatePlugin(sanitizedPluginId, sanitizedVersion);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ plugin-update error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * List installed plugins
   */
  ipcMain.handle('plugin-list-installed', async () => {
    try {
      const pluginManager = container.get('pluginManager');
      const plugins = pluginManager.getInstalledPlugins();
      
      return { success: true, plugins };
    } catch (error: any) {
      safeError('❌ plugin-list-installed error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get plugin state
   */
  ipcMain.handle('plugin-get-state', async (_, pluginId: string) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      const pluginManager = container.get('pluginManager');
      const state = pluginManager.getPluginState(sanitizedPluginId);
      
      return { success: true, state };
    } catch (error: any) {
      safeError('❌ plugin-get-state error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Search plugin registry
   */
  ipcMain.handle('plugin-search-registry', async (_, query: string, options?: any) => {
    try {
      if (typeof query !== 'string' || !query.trim()) {
        return { success: false, error: 'Query must be a non-empty string' };
      }

      const sanitizedQuery = Security.sanitizeInput(query.trim());
      const pluginManager = container.get('pluginManager');
      const results = await pluginManager.searchRegistry(sanitizedQuery, options);
      
      return { success: true, results };
    } catch (error: any) {
      safeError('❌ plugin-search-registry error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Execute plugin method
   */
  ipcMain.handle('plugin-execute', async (_, pluginId: string, method: string, args?: any[]) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      if (typeof method !== 'string' || !method.trim()) {
        return { success: false, error: 'Method must be a non-empty string' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      const sanitizedMethod = Security.sanitizeInput(method.trim());
      const sanitizedArgs = args || [];

      const pluginManager = container.get('pluginManager');
      const result = await pluginManager.executePlugin(sanitizedPluginId, sanitizedMethod, sanitizedArgs);
      
      return { success: true, result };
    } catch (error: any) {
      safeError('❌ plugin-execute error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get plugin configuration
   */
  ipcMain.handle('plugin-get-config', async (_, pluginId: string) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      const pluginManager = container.get('pluginManager');
      const config = await pluginManager.getPluginConfig(sanitizedPluginId);
      
      return { success: true, config };
    } catch (error: any) {
      safeError('❌ plugin-get-config error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Set plugin configuration
   */
  ipcMain.handle('plugin-set-config', async (_, pluginId: string, config: Record<string, any>) => {
    try {
      if (typeof pluginId !== 'string' || !pluginId.trim()) {
        return { success: false, error: 'Plugin ID must be a non-empty string' };
      }

      if (!config || typeof config !== 'object') {
        return { success: false, error: 'Config must be a valid object' };
      }

      const sanitizedPluginId = Security.sanitizeInput(pluginId.trim());
      
      // Sanitize string values in config
      const sanitizedConfig = { ...config };
      Object.keys(sanitizedConfig).forEach(key => {
        if (typeof sanitizedConfig[key] === 'string') {
          sanitizedConfig[key] = Security.sanitizeInput(sanitizedConfig[key]);
        }
      });

      const pluginManager = container.get('pluginManager');
      await pluginManager.setPluginConfig(sanitizedPluginId, sanitizedConfig);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ plugin-set-config error:', error);
      return { success: false, error: error.message };
    }
  });

  safeLog('✅ Plugin handlers registered');
}
