/**
 * Core IPC Handlers - Basic application functionality
 * Uses dependency injection instead of global state
 */

import { ipcMain } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeError } from '../utils/safeLogger';
import fs from 'fs/promises';
import * as vm from 'vm';

export function registerCoreHandlers(
  container: DependencyContainer, 
  Security: any
): void {
  
  /**
   * Get available models from Ollama service
   */
  ipcMain.handle('get-available-models', async () => {
    try {
      const ollamaService = container.get('ollamaService');
      const { success, models } = await ollamaService.getModels();
      return success ? models.map((m: any) => m.name) : [];
    } catch (error: any) {
      safeError('❌ get-available-models error:', error);
      return [];
    }
  });

  /**
   * Get Ollama models with full details
   */
  ipcMain.handle('get-ollama-models', async () => {
    try {
      const ollamaService = container.get('ollamaService');
      const result = await ollamaService.getModels();
      
      return {
        success: result.success,
        models: result.success ? result.models?.map((m: any) => m.name) || [] : [],
        error: result.error
      };
    } catch (error: any) {
      safeError('❌ get-ollama-models error:', error);
      return { success: false, models: [], error: error.message };
    }
  });

  /**
   * Pull a model from Ollama
   */
  ipcMain.handle('pull-model', async (_, modelName: string) => {
    try {
      if (typeof modelName !== 'string' || !modelName.trim()) {
        return { success: false, error: 'Invalid model name' };
      }

      const ollamaService = container.get('ollamaService');
      return await ollamaService.pullModel(modelName.trim());
    } catch (error: any) {
      safeError('❌ pull-model error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Delete a model from Ollama
   */
  ipcMain.handle('delete-model', async (_, modelName: string) => {
    try {
      if (typeof modelName !== 'string' || !modelName.trim()) {
        return { success: false, error: 'Invalid model name' };
      }

      const ollamaService = container.get('ollamaService');
      return await ollamaService.deleteModel(modelName.trim());
    } catch (error: any) {
      safeError('❌ delete-model error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Secure file reading with path validation
   */
  ipcMain.handle('fs:read', async (_, filePath: string) => {
    try {
      const safePath = Security.validatePath(filePath);
      const content = await fs.readFile(safePath, 'utf-8');
      return { success: true, content };
    } catch (error: any) {
      safeError('❌ fs:read error:', error);
      return { success: false, error: 'Access denied' };
    }
  });

  /**
   * Secure code execution in sandboxed VM
   */
  ipcMain.handle('ollama:exec', async (_, { code, lang = 'js' }) => {
    try {
      // Input validation
      if (typeof code !== 'string' || code.length === 0) {
        throw new Error('Code must be a non-empty string');
      }
      if (code.length > 50000) {
        throw new Error('Code size exceeds 50KB limit');
      }
      
      // Create sandboxed context
      const sandbox = {
        console: console,
        Math: Math,
        Date: Date,
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearTimeout: clearTimeout,
        clearInterval: clearInterval,
        __result: undefined
      };
      
      // Wrap code to capture return value
      const wrappedCode = `
        try {
          __result = (function() {
            ${code}
          })();
        } catch (e) {
          throw e;
        }
      `;
      
      const context = vm.createContext(sandbox);
      const startTime = Date.now();
      
      vm.runInContext(wrappedCode, context, { 
        timeout: 5000, // 5 second timeout
        displayErrors: true 
      });
      
      const executionTime = Date.now() - startTime;
      const result = sandbox.__result;
      
      return { 
        success: true, 
        output: result || 'Success', 
        error: null, 
        executionTime, 
        lang 
      };
    } catch (error: any) {
      safeError('❌ Code execution failed:', error);
      return { 
        success: false, 
        output: '', 
        error: error.message || 'Code execution failed', 
        executionTime: 0 
      };
    }
  });

  safeLog('✅ Core handlers registered');
}
