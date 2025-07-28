/**
 * Model Management IPC Handlers - Model lifecycle and resource management
 * Uses dependency injection for ModelManager
 */

import { ipcMain } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeError } from '../utils/safeLogger';

export function registerModelHandlers(
  container: DependencyContainer,
  Security: any
): void {

  /**
   * Register a model with the model manager
   */
  ipcMain.handle('umsl-register-model', async (_, config: any) => {
    try {
      if (!config || typeof config !== 'object') {
        return { success: false, error: 'Config must be a valid object' };
      }

      if (!config.id || typeof config.id !== 'string') {
        return { success: false, error: 'Model ID is required and must be a string' };
      }

      // Sanitize config inputs
      const sanitizedConfig = {
        ...config,
        id: Security.sanitizeInput(config.id),
        name: config.name ? Security.sanitizeInput(config.name) : config.id,
        description: config.description ? Security.sanitizeInput(config.description) : ''
      };

      const modelManager = container.get('modelManager');
      const instance = await modelManager.registerModel(sanitizedConfig);
      
      return { success: true, modelId: instance.config.id };
    } catch (error: any) {
      safeError('❌ umsl-register-model error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Load a model
   */
  ipcMain.handle('umsl-load-model', async (_, modelId: string, options: any = {}) => {
    try {
      if (typeof modelId !== 'string' || !modelId.trim()) {
        return { success: false, error: 'Model ID must be a non-empty string' };
      }

      const sanitizedModelId = Security.sanitizeInput(modelId.trim());
      const modelManager = container.get('modelManager');
      await modelManager.loadModel(sanitizedModelId, options);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ umsl-load-model error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Unload a model
   */
  ipcMain.handle('umsl-unload-model', async (_, modelId: string) => {
    try {
      if (typeof modelId !== 'string' || !modelId.trim()) {
        return { success: false, error: 'Model ID must be a non-empty string' };
      }

      const sanitizedModelId = Security.sanitizeInput(modelId.trim());
      const modelManager = container.get('modelManager');
      await modelManager.unloadModel(sanitizedModelId);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ umsl-unload-model error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Execute model request
   */
  ipcMain.handle('umsl-execute-model', async (_, modelId: string, prompt: string, options: any = {}) => {
    try {
      if (typeof modelId !== 'string' || !modelId.trim()) {
        return { success: false, error: 'Model ID must be a non-empty string' };
      }

      if (typeof prompt !== 'string' || !prompt.trim()) {
        return { success: false, error: 'Prompt must be a non-empty string' };
      }

      const sanitizedModelId = Security.sanitizeInput(modelId.trim());
      const sanitizedPrompt = Security.sanitizeInput(prompt.trim());
      
      const modelManager = container.get('modelManager');
      const result = await modelManager.executeRequest(sanitizedModelId, sanitizedPrompt, options);
      
      return { success: true, result };
    } catch (error: any) {
      safeError('❌ umsl-execute-model error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get model statistics
   */
  ipcMain.handle('umsl-get-model-stats', async (_, modelId?: string) => {
    try {
      if (modelId !== undefined && (typeof modelId !== 'string' || !modelId.trim())) {
        return { success: false, error: 'Model ID must be a non-empty string if provided' };
      }

      const sanitizedModelId = modelId ? Security.sanitizeInput(modelId.trim()) : undefined;
      const modelManager = container.get('modelManager');
      const stats = modelManager.getModelStats(sanitizedModelId);
      
      return { success: true, stats };
    } catch (error: any) {
      safeError('❌ umsl-get-model-stats error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get resource usage
   */
  ipcMain.handle('umsl-get-resource-usage', async () => {
    try {
      const modelManager = container.get('modelManager');
      const usage = modelManager.getResourceUsage();
      
      return { success: true, usage };
    } catch (error: any) {
      safeError('❌ umsl-get-resource-usage error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Prefetch models for faster loading
   */
  ipcMain.handle('umsl-prefetch-models', async (_, modelIds: string[]) => {
    try {
      if (!Array.isArray(modelIds)) {
        return { success: false, error: 'Model IDs must be an array' };
      }

      // Validate and sanitize all model IDs
      const sanitizedModelIds = modelIds
        .filter(id => typeof id === 'string' && id.trim())
        .map(id => Security.sanitizeInput(id.trim()));

      if (sanitizedModelIds.length === 0) {
        return { success: false, error: 'At least one valid model ID is required' };
      }

      const modelManager = container.get('modelManager');
      await modelManager.prefetchModels(sanitizedModelIds);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ umsl-prefetch-models error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update resource quota
   */
  ipcMain.handle('umsl-update-resource-quota', async (_, quota: any) => {
    try {
      if (!quota || typeof quota !== 'object') {
        return { success: false, error: 'Quota must be a valid object' };
      }

      // Validate quota structure
      const validQuotaKeys = ['maxMemory', 'maxModels', 'maxConcurrentRequests', 'memoryThreshold'];
      const hasValidKeys = Object.keys(quota).some(key => validQuotaKeys.includes(key));
      
      if (!hasValidKeys) {
        return { 
          success: false, 
          error: `Quota must contain at least one of: ${validQuotaKeys.join(', ')}` 
        };
      }

      const modelManager = container.get('modelManager');
      modelManager.updateResourceQuota(quota);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ umsl-update-resource-quota error:', error);
      return { success: false, error: error.message };
    }
  });

  safeLog('✅ Model handlers registered');
}
