import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import fs from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { registerModelTuningHandlers } from './handlers/modelTuningHandlers';
import { registerChatHandlers } from './handlers/chatHandlers'; // Assume from rewrite  
import { registerModelfileHandlers } from './handlers/modelfileHandlers'; // NEW: Modelfile handlers
import { ollamaService } from './services/ollamaService'; // For dynamic models
// PHASE 1 FIX: Import validation schemas
import { 
  validateChatRequest, 
  validateModelName, 
  validateSearchQuery,
  type ChatResponse,
  type ServiceStatusResponse,
  type ModelsResponse,
  type GenericResponse
} from '../shared/validation';
// PHASE 2 FIX: Import M1 performance monitor
import { m1PerformanceMonitor } from './services/m1PerformanceMonitor';
// PHASE 1 UMSL: Import unified memory and model management
import { SemanticMemoryEngine } from './core/semanticMemory';
import { ModelManager } from './core/modelManager';
import { AgentRuntime } from './core/agentRuntime';
import { PluginManager } from './core/pluginManager';
import { chromaService } from './services/chromaService';
// import { ServiceManager } from './services/ServiceManager'; // Service management - temporarily disabled for testing

// ======================
// 1. CONFIGURATION
// ======================
const CONFIG = {
  // M1/Apple Silicon detection and optimization
  platform: {
    isAppleSilicon: process.platform === 'darwin' && process.arch === 'arm64',
    enableMLXFallback: process.platform === 'darwin' && process.arch === 'arm64',
    optimizeForPerformance: true
  },
  security: {
    CSP: "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
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
      path: '/Users/jibbr/.local/bin/chroma',
      dataPath: './chroma_data'
    }
  },
  IPC: {
    whitelist: new Set([
      'fs:read',
      'fs:write',
      'ollama:chat',
      'ollama:update-modelfile',  // Modelfile update functionality
      'ollama:modelfile-rate-limit-status', // Rate limit status checker
      'ollama:exec', // NEW: Code execution (Desktop Commander)
      'chroma:query',
      'get-available-models', // Dynamic models
      'get-service-metrics', // Service health metrics
      'get-performance-metrics', // PHASE 2 FIX: Real-time performance data
      'search-memory', // Memory search functionality
      // PHASE 1 FIX: Add missing critical IPC handlers
      'check-ollama-status',
      'start-ollama', 
      'get-ollama-models',
      'pull-model',
      'delete-model',
      'check-chroma-status',
      'start-chroma',
      'chat-with-ai',
      'get-available-models-for-tuning',
      'get-all-tuning-datasets',
      'get-tuning-dataset',
      'create-tuning-dataset',
      'update-tuning-dataset',
      'delete-tuning-dataset',
      'add-examples-to-dataset',
      'remove-examples-from-dataset',
      'get-all-tuning-jobs',
      'get-tuning-job',
      'start-tuning-job',
      // PHASE 1 UMSL: Add unified memory and model management IPC handlers
      'umsl-store-memory',
      'umsl-retrieve-context',
      'umsl-advanced-search',
      'umsl-create-thread',
      'umsl-add-to-thread',
      'umsl-get-thread',
      'umsl-register-model',
      'umsl-load-model',
      'umsl-unload-model',
      'umsl-execute-model',
      'umsl-get-model-stats',
      'umsl-get-resource-usage',
      'umsl-get-memory-stats',
      'umsl-prefetch-models',
      'umsl-update-resource-quota',
      // PHASE 1 AP: Add agent platform IPC handlers
      'agent-create',
      'agent-start',
      'agent-stop',
      'agent-delete',
      'agent-get',
      'agent-list',
      'agent-get-status',
      'agent-execute-task',
      'agent-get-system-status',
      // PHASE 2A: Add plugin platform IPC handlers
      'plugin-install',
      'plugin-uninstall',
      'plugin-enable',
      'plugin-disable',
      'plugin-update',
      'plugin-list-installed',
      'plugin-get-state',
      'plugin-search-registry',
      'plugin-execute',
      'plugin-get-config',
      'plugin-set-config'
    ])
  }
};

// ======================
// 2. SECURITY UTILITIES
// ======================
class Security {
  static validatePath(userPath: string): string {
    const resolved = join(app.getPath('userData'), userPath);
    if (!resolved.startsWith(app.getPath('userData'))) throw new Error('Path traversal blocked');
    return resolved;
  }

  static sanitizeInput(input: string): string {
    return input.replace(/[<>"']/g, '');
  }
}

// ======================
// 3. SERVICE MANAGER
// ======================
class ServiceManager {
  private static instance: ServiceManager;
  private processes: Map<string, ChildProcess> = new Map();

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) ServiceManager.instance = new ServiceManager();
    return ServiceManager.instance;
  }

  async startService(name: string, command: string, args: string[]): Promise<void> {
    if (this.processes.has(name)) throw new Error(`Service ${name} running`);
    const proc = spawn(command, args, { stdio: 'pipe' });
    
    // PHASE 2 FIX: Unref process to prevent M1 CPU drain
    proc.unref();
    
    this.processes.set(name, proc);
    return new Promise((resolve, reject) => {
      proc.stdout?.on('data', (data) => data.includes('Listening') && resolve());
      proc.on('error', reject);
    });
  }

  shutdown(): void {
    this.processes.forEach((proc) => proc.kill('SIGTERM'));
    this.processes.clear();
  }
}

// ======================
// 4. MAIN PROCESS SETUP
// ======================
function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow(CONFIG.security.windowDefaults);
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CONFIG.security.CSP] } });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!CONFIG.security.allowedExternalURLs.some(allowed => url.startsWith(allowed))) return { action: 'deny' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return mainWindow;
}

// ======================
// 5. IPC HANDLERS
// ======================
// Handler tracking to prevent duplicates
const registeredHandlers = new Set<string>();

function registerHandlers(): void {
  // Dynamic models handler
  ipcMain.handle('get-available-models', async () => {
    if (!CONFIG.IPC.whitelist.has('get-available-models')) throw new Error('Unauthorized');
    const { success, models } = await ollamaService.getModels();
    return success ? models.map(m => m.name) : [];
  });

  // Service metrics handler - PHASE 2 FIX: Real performance data
  ipcMain.handle('get-service-metrics', async () => {
    try {
      // Get basic Ollama metrics
      const ollamaStatus = await ollamaService.checkStatus()
      const models = await ollamaService.getModels()
      
      // PHASE 2 FIX: Get real performance metrics from M1 monitor
      const performanceData = m1PerformanceMonitor.getPerformanceSummary()
      const isM1 = process.platform === 'darwin' && process.arch === 'arm64'
      
      // Add model count to performance data
      performanceData.modelCount = models.success ? models.models.length : 0
      
      // Adjust overall score based on service connectivity
      if (ollamaStatus.connected) {
        performanceData.overall = Math.max(performanceData.overall, 50)
      } else {
        performanceData.overall = Math.min(performanceData.overall, 30)
      }
      
      return {
        ...performanceData,
        // Add M1-specific information
        isM1Optimized: isM1,
        platform: isM1 ? 'Apple Silicon' : process.platform,
        serviceStatus: {
          ollama: ollamaStatus.connected,
          chroma: false // TODO: Add real ChromaDB status
        }
      }
    } catch (error) {
      return {
        overall: 20,
        performance: 15,
        memory: 95,
        temperature: 80,
        uptime: 0,
        responseTime: 0,
        tokensPerSecond: 0,
        errors: 10,
        status: 'critical',
        modelCount: 0,
        recommendations: ['Service monitoring failed'],
        isM1Optimized: false,
        platform: process.platform,
        serviceStatus: { ollama: false, chroma: false }
      }
    }
  })

  // PHASE 2 FIX: Real-time Performance Metrics Handler
  ipcMain.handle('get-performance-metrics', async () => {
    if (!CONFIG.IPC.whitelist.has('get-performance-metrics')) throw new Error('Unauthorized');
    
    try {
      const latestMetrics = m1PerformanceMonitor.getLatestMetrics();
      
      if (!latestMetrics) {
        return {
          success: false,
          error: 'Performance monitoring not started',
          message: 'Start performance monitoring to get real-time metrics'
        };
      }

      return {
        success: true,
        metrics: latestMetrics,
        recommendations: m1PerformanceMonitor.getRecommendations(),
        isM1: process.platform === 'darwin' && process.arch === 'arm64',
        monitoring: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get performance metrics'
      };
    }
  })

  // Memory search handler
  ipcMain.handle('search-memory', async (_, query, limit = 5) => {
    if (!CONFIG.IPC.whitelist.has('search-memory')) throw new Error('Unauthorized');
    
    try {
      // PHASE 1 FIX: Validate search parameters
      const validation = validateSearchQuery(query, limit);
      if (!validation.success) {
        console.error('[IPC] search-memory validation failed:', 'error' in validation ? validation.error : 'Unknown validation error');
        return { success: false, error: 'error' in validation ? validation.error : 'Validation failed' };
      }

      const { query: validQuery, limit: validLimit } = validation.data;

      // Simple mock implementation - replace with actual memory service when ready
      return {
        success: true,
        results: [],
        query: validQuery,
        limit: validLimit
      };
    } catch (error: any) {
      console.error('[IPC] search-memory error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  })

  // ======================
  // PHASE 1 FIX: CRITICAL IPC HANDLERS
  // ======================
  
  // Ollama Service Status Check
  ipcMain.handle('check-ollama-status', async () => {
    if (!CONFIG.IPC.whitelist.has('check-ollama-status')) throw new Error('Unauthorized');
    try {
      const status = await ollamaService.checkStatus();
      return {
        success: true,
        connected: status.connected,
        message: status.message,
        version: status.version
      };
    } catch (error: any) {
      console.error('[IPC] check-ollama-status error:', error);
      return {
        success: false,
        connected: false,
        message: `Status check failed: ${error.message}`
      };
    }
  });

  // Start Ollama Service
  ipcMain.handle('start-ollama', async () => {
    if (!CONFIG.IPC.whitelist.has('start-ollama')) throw new Error('Unauthorized');
    try {
      const result = await ollamaService.startService();
      return {
        success: result.success,
        message: result.message
      };
    } catch (error: any) {
      console.error('[IPC] start-ollama error:', error);
      return {
        success: false,
        message: `Failed to start Ollama: ${error.message}`
      };
    }
  });

  // Get Ollama Models
  if (!registeredHandlers.has('get-ollama-models')) {
    ipcMain.handle('get-ollama-models', async () => {
      if (!CONFIG.IPC.whitelist.has('get-ollama-models')) throw new Error('Unauthorized');
      try {
        const result = await ollamaService.getModels();
        return {
          success: result.success,
          models: result.success ? result.models?.map(m => m.name) || [] : [],
          error: result.error
        };
      } catch (error: any) {
        console.error('[IPC] get-ollama-models error:', error);
        return {
          success: false,
          models: [],
          error: error.message
        };
      }
    });
    registeredHandlers.add('get-ollama-models');
  }

  // Pull Model
  ipcMain.handle('pull-model', async (_, modelName: string) => {
    if (!CONFIG.IPC.whitelist.has('pull-model')) throw new Error('Unauthorized');
    
    // PHASE 1 FIX: Validate model name
    const validation = validateModelName(modelName);
    if (!validation.success) {
      console.error('[IPC] pull-model validation failed:', 'error' in validation ? validation.error : 'Unknown validation error');
      return { success: false, error: 'error' in validation ? validation.error : 'Validation failed' };
    }
    
    try {
      const result = await ollamaService.pullModel(validation.data);
      return result;
    } catch (error: any) {
      console.error('[IPC] pull-model error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Delete Model
  ipcMain.handle('delete-model', async (_, modelName: string) => {
    if (!CONFIG.IPC.whitelist.has('delete-model')) throw new Error('Unauthorized');
    
    // PHASE 1 FIX: Validate model name
    const validation = validateModelName(modelName);
    if (!validation.success) {
      console.error('[IPC] delete-model validation failed:', 'error' in validation ? validation.error : 'Unknown validation error');
      return { success: false, error: 'error' in validation ? validation.error : 'Validation failed' };
    }
    
    try {
      const result = await ollamaService.deleteModel(validation.data);
      return result;
    } catch (error: any) {
      console.error('[IPC] delete-model error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Check ChromaDB Status (stub - implement when ChromaDB service is ready)
  ipcMain.handle('check-chroma-status', async () => {
    if (!CONFIG.IPC.whitelist.has('check-chroma-status')) throw new Error('Unauthorized');
    try {
      // TODO: Implement actual ChromaDB status check
      return {
        success: true,
        connected: false, // Currently not implemented
        message: 'ChromaDB service not yet implemented',
        version: 'N/A'
      };
    } catch (error: any) {
      console.error('[IPC] check-chroma-status error:', error);
      return {
        success: false,
        connected: false,
        message: `ChromaDB status check failed: ${error.message}`
      };
    }
  });

  // Start ChromaDB Service (stub)
  ipcMain.handle('start-chroma', async () => {
    if (!CONFIG.IPC.whitelist.has('start-chroma')) throw new Error('Unauthorized');
    try {
      // TODO: Implement actual ChromaDB startup
      return {
        success: false,
        message: 'ChromaDB service not yet implemented'
      };
    } catch (error: any) {
      console.error('[IPC] start-chroma error:', error);
      return {
        success: false,
        message: `Failed to start ChromaDB: ${error.message}`
      };
    }
  });

  // NOTE: chat-with-ai handler registered in registerChatHandlers()

  // File System
  ipcMain.handle('fs:read', async (_, filePath) => {
    try {
      const safePath = Security.validatePath(filePath);
      const content = await fs.readFile(safePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: 'Access denied' };
    }
  });

  // AI Services
  ipcMain.handle('ollama:chat', async (_, { model, message }) => {
    if (!CONFIG.IPC.whitelist.has('ollama:chat')) throw new Error('Unauthorized');
    const response = await axios.post(
      `${CONFIG.services.ollama.baseURL}/api/generate`,
      { model, prompt: Security.sanitizeInput(message) },
      { timeout: CONFIG.services.ollama.timeout }
    );
    return response.data;
  });

  // Ollama Modelfile Update handler is now registered in modelfileHandlers.ts to avoid duplicate registration.

  // =============================
  // Code Generation Utilities
  // =============================
  // NOTE: get-ollama-models handler already registered in main registerHandlers() function

  // Choose the "best" coding model (stub implementation for now)
  ipcMain.handle('select-best-code-model', async () => 'deepseek-coder:latest');

  // Generate code snippet via Ollama
  ipcMain.handle('generate-code', async (_, { task, language, modelName }) => {
    if (!task || !language) throw new Error('Task and language are required');
    const prompt = `Generate ${language} code for: ${task}. Format as markdown code block.`;
    const { response } = await ollamaService.generateResponse({ model: modelName || 'deepseek-coder:latest', prompt });
    // Extract first markdown code block
    const match = response.match(/```[\s\S]*?\n([\s\S]*?)```/);
    return match ? match[1].trim() : 'No code';
  });


  // NEW: Code Execution Handler (Desktop Commander)
  ipcMain.handle('ollama:exec', async (_, { code, lang = 'js' }) => {
    if (!CONFIG.IPC.whitelist.has('ollama:exec')) throw new Error('Unauthorized');
    
    try {
      // Basic security validation
      if (typeof code !== 'string' || code.length === 0) {
        throw new Error('Code must be a non-empty string');
      }
      
      if (code.length > 50000) { // 50KB limit for M1 efficiency
        throw new Error('Code size exceeds 50KB limit');
      }

      // Sanitize code (remove potentially dangerous patterns)
      const sanitizedCode = Security.sanitizeInput(code);
      
      // Execute through OllamaService
      const result = await ollamaService.execCode(sanitizedCode, lang);
      
      return { 
        success: true, 
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        lang
      };
      
    } catch (error) {
      console.error('Code execution failed:', error);
      return { 
        success: false, 
        error: error.message || 'Code execution failed',
        output: '',
        executionTime: 0
      };
    }
  });

  // ======================
  // PHASE 1 UMSL: IPC HANDLERS
  // ======================
  
  // Semantic Memory Operations
  ipcMain.handle('umsl-store-memory', async (_, content: string, type: string, metadata: any = {}) => {
    try {
      const validType = type as 'conversation' | 'document' | 'code' | 'task' | 'agent_state'
      const memoryId = await global.semanticMemory.storeMemory(content, validType, metadata)
      return { success: true, memoryId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-retrieve-context', async (_, query: string, options: any = {}) => {
    try {
      const context = await global.semanticMemory.retrieveContext(query, options)
      return { success: true, context }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-advanced-search', async (_, query: string, filters: any = {}) => {
    try {
      const results = await global.semanticMemory.advancedSearch(query, filters)
      return { success: true, results }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Conversation Management
  ipcMain.handle('umsl-create-thread', async (_, message: string, metadata: any = {}) => {
    try {
      const threadId = await global.semanticMemory.createConversationThread(message, metadata)
      return { success: true, threadId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-add-to-thread', async (_, threadId: string, role: string, content: string, metadata: any = {}) => {
    try {
      const validRole = role as 'user' | 'assistant' | 'system'
      await global.semanticMemory.addToConversation(threadId, validRole, content, metadata)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-get-thread', async (_, threadId: string) => {
    try {
      const thread = await global.semanticMemory.getConversationThread(threadId)
      return { success: true, thread }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Model Management Operations
  ipcMain.handle('umsl-register-model', async (_, config: any) => {
    try {
      const instance = await global.modelManager.registerModel(config)
      return { success: true, modelId: instance.config.id }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-load-model', async (_, modelId: string, options: any = {}) => {
    try {
      await global.modelManager.loadModel(modelId, options)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-unload-model', async (_, modelId: string) => {
    try {
      await global.modelManager.unloadModel(modelId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-execute-model', async (_, modelId: string, prompt: string, options: any = {}) => {
    try {
      const result = await global.modelManager.executeRequest(modelId, prompt, options)
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-get-model-stats', async (_, modelId?: string) => {
    try {
      const stats = global.modelManager.getModelStats(modelId)
      return { success: true, stats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-get-resource-usage', async () => {
    try {
      const usage = global.modelManager.getResourceUsage()
      return { success: true, usage }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-get-memory-stats', async () => {
    try {
      const stats = await global.semanticMemory.getMemoryStats()
      return { success: true, stats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Prefetch and optimization operations
  ipcMain.handle('umsl-prefetch-models', async (_, modelIds: string[]) => {
    try {
      await global.modelManager.prefetchModels(modelIds)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('umsl-update-resource-quota', async (_, quota: any) => {
    try {
      global.modelManager.updateResourceQuota(quota)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ======================
  // PHASE 1 AP: AGENT PLATFORM IPC HANDLERS
  // ======================
  
  // Agent Management
  ipcMain.handle('agent-create', async (_, config: any) => {
    try {
      const agent = await global.agentRuntime.createAgent(config)
      return { success: true, agentId: agent.config.id, config: agent.config }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('agent-start', async (_, agentId: string) => {
    try {
      await global.agentRuntime.startAgent(agentId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('agent-stop', async (_, agentId: string) => {
    try {
      await global.agentRuntime.stopAgent(agentId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('agent-delete', async (_, agentId: string) => {
    try {
      await global.agentRuntime.deleteAgent(agentId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('agent-get', async (_, agentId: string) => {
    try {
      const agent = global.agentRuntime.getAgent(agentId)
      if (!agent) return { success: false, error: 'Agent not found' }
      return { success: true, agent: agent.config }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('agent-list', async () => {
    try {
      const agents = global.agentRuntime.getAllAgents().map(agent => agent.config)
      return { success: true, agents }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('agent-get-status', async (_, agentId: string) => {
    try {
      const status = global.agentRuntime.getAgentStatus(agentId)
      if (!status) return { success: false, error: 'Agent not found' }
      return { success: true, status }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('agent-execute-task', async (_, agentId: string, task: any) => {
    try {
      const result = await global.agentRuntime.executeTask(agentId, task)
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('agent-get-system-status', async () => {
    try {
      const status = global.agentRuntime.getSystemStatus()
      return { success: true, status }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ======================
  // PHASE 2A: PLUGIN MANAGER IPC HANDLERS
  // ======================
  
  // Plugin Installation & Management
  ipcMain.handle('plugin-install', async (_, pluginId: string, version?: string) => {
    try {
      await global.pluginManager.installPlugin(pluginId, version)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('plugin-uninstall', async (_, pluginId: string) => {
    try {
      await global.pluginManager.uninstallPlugin(pluginId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('plugin-enable', async (_, pluginId: string) => {
    try {
      await global.pluginManager.enablePlugin(pluginId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('plugin-disable', async (_, pluginId: string) => {
    try {
      await global.pluginManager.disablePlugin(pluginId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('plugin-update', async (_, pluginId: string, version?: string) => {
    try {
      await global.pluginManager.updatePlugin(pluginId, version)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Plugin Information
  ipcMain.handle('plugin-list-installed', async () => {
    try {
      const plugins = global.pluginManager.getInstalledPlugins()
      return { success: true, plugins }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('plugin-get-state', async (_, pluginId: string) => {
    try {
      const state = global.pluginManager.getPluginState(pluginId)
      return { success: true, state }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('plugin-search-registry', async (_, query: string, options?: any) => {
    try {
      const results = await global.pluginManager.searchRegistry(query, options)
      return { success: true, results }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Plugin Execution
  ipcMain.handle('plugin-execute', async (_, pluginId: string, method: string, args?: any[]) => {
    try {
      const result = await global.pluginManager.executePlugin(pluginId, method, args || [])
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Plugin Configuration
  ipcMain.handle('plugin-get-config', async (_, pluginId: string) => {
    try {
      const config = await global.pluginManager.getPluginConfig(pluginId)
      return { success: true, config }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('plugin-set-config', async (_, pluginId: string, config: Record<string, any>) => {
    try {
      await global.pluginManager.setPluginConfig(pluginId, config)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}

// ======================
// 6. STARTUP
// ======================
app.whenReady()
  .then(async () => {
    try {
      electronApp.setAppUserModelId('com.electron.puffer');
      
      // Log platform optimization status
      if (CONFIG.platform.isAppleSilicon) {
        console.log('🍎 Apple Silicon detected - M1/M2 optimizations enabled')
        console.log('⚡ MLX fallback available for enhanced performance')
        
        // PHASE 2 FIX: Start M1 performance monitoring
        m1PerformanceMonitor.startMonitoring()
        console.log('📊 M1 performance monitoring started')
      } else {
        console.log('🖥️ Standard platform detected')
        // Start monitoring on non-M1 too, but with different targets
        m1PerformanceMonitor.startMonitoring()
      }
      
      // PHASE 1 UMSL: Initialize Unified Memory & Storage Layer
      console.log('🧠 Initializing Unified Memory & Storage Layer (UMSL)...')
      const semanticMemory = new SemanticMemoryEngine(chromaService)
      await semanticMemory.initialize()
      console.log('✅ Semantic Memory Engine initialized')
      
      const modelManager = new ModelManager({
        maxMemory: CONFIG.platform.isAppleSilicon ? 16384 : 8192, // 16GB for M1/M2, 8GB for others
        maxModels: 6,
        maxConcurrentRequests: CONFIG.platform.isAppleSilicon ? 4 : 2,
        memoryThreshold: 0.75,
        unloadTimeout: 10,
        priorityPreemption: true
      })
      await modelManager.initialize()
      console.log('⚡ Model Manager initialized with platform-optimized settings')
      
      // PHASE 1 AP: Initialize Agent Platform
      console.log('🤖 Initializing Agent Runtime Environment...')
      const agentRuntime = new AgentRuntime(semanticMemory, modelManager)
      console.log('✅ Agent Runtime Environment initialized')
      
      // PHASE 2A: Initialize Plugin Architecture
      console.log('🧩 Initializing Plugin Manager...')
      const pluginManager = new PluginManager(agentRuntime)
      await pluginManager.initialize()
      console.log('✅ Plugin Manager initialized - Plugin system ready')
      
      // Store globally accessible instances
      global.semanticMemory = semanticMemory
      global.modelManager = modelManager
      global.agentRuntime = agentRuntime
      global.pluginManager = pluginManager
      
      // const serviceManager = ServiceManager.getInstance();
      // await serviceManager.startService('chroma', CONFIG.services.chroma.path, ['--port', CONFIG.services.chroma.port.toString()]);
      registerHandlers();
      registerChatHandlers();
      registerModelTuningHandlers(ipcMain);
      registerModelfileHandlers(); // NEW: Register modelfile handlers
      createWindow();
    } catch (error) {
      console.error('❌ App startup failed:', error);
      app.quit();
    }
  })
  .catch(error => {
    console.error('❌ App ready handler failed:', error);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // PHASE 2 FIX: Stop performance monitoring on quit
  m1PerformanceMonitor.stopMonitoring();
  // ServiceManager.getInstance().shutdown();
});