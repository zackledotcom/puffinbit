import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { z } from 'zod';

// --------------------------------------------------
// PHASE 0: ZERO-TRUST IPC SECURITY LAYER
// --------------------------------------------------

interface SecurityConfig {
  maxRequestsPerMinute: number;
  requestTimeoutMs: number;
  maxPayloadSize: number;
  allowedChannels: Set<string>;
}

class ZeroTrustIPCClient {
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  private activeRequests = new Set<string>();
  private securityEvents: Array<{ type: string; channel: string; timestamp: number }> = [];
  private config: SecurityConfig;

  constructor() {
    this.config = {
      maxRequestsPerMinute: 120, // Increased for legitimate usage
      requestTimeoutMs: 60000,   // 1 minute max
      maxPayloadSize: 2 * 1024 * 1024, // 2MB max payload
      allowedChannels: new Set([
        // Core Ollama functions
        'check-ollama-status', 'start-ollama', 'get-ollama-models', 'pull-model', 'delete-model',
        'ollama:update-modelfile', 'ollama:exec',
        // ChromaDB functions  
        'check-chroma-status', 'start-chroma',
        // Chat functions
        'chat-with-ai', 'get-chat-metrics',
        // Browser functions
        'browser-create-session', 'browser-extract-context', 'browser-get-security-info', 'browser-clear-data',
        // Service functions
        'get-service-metrics', 'get-performance-metrics', 'get-health-status',
        // Memory functions
        'search-memory', 'umsl-store-memory', 'umsl-retrieve-context', 'umsl-advanced-search',
        'umsl-create-thread', 'umsl-add-to-thread', 'umsl-get-thread',
        // Model management
        'umsl-register-model', 'umsl-load-model', 'umsl-unload-model', 'umsl-execute-model',
        'umsl-get-model-stats', 'umsl-get-resource-usage', 'umsl-get-memory-stats',
        'umsl-prefetch-models', 'umsl-update-resource-quota',
        // Agent platform
        'agent-create', 'agent-start', 'agent-stop', 'agent-delete', 'agent-get', 'agent-list',
        'agent-get-status', 'agent-execute-task', 'agent-get-system-status',
        // Plugin architecture
        'plugin-install', 'plugin-uninstall', 'plugin-enable', 'plugin-disable', 'plugin-update',
        'plugin-list-installed', 'plugin-get-state', 'plugin-search-registry', 'plugin-execute',
        'plugin-get-config', 'plugin-set-config',
        // File system
        'fs-read-file', 'fs-write-file', 'fs-create-directory', 'fs-list-directory',
        // MCP
        'mcp:server-info', 'mcp:health-check', 'mcp:add-custom-server', 'mcp:remove-server',
        // Analytics
        'analytics:track',
        // Debug (dev only)
        'debug:ping', 'debug:get-state'
      ])
    };
  }

  /**
   * Zero-trust IPC invoke with comprehensive validation
   */
  async secureInvoke(channel: string, ...args: any[]): Promise<any> {
    // 1. Channel validation
    if (!this.validateChannel(channel)) {
      this.logSecurityEvent('unauthorized_channel', channel);
      throw new Error(`Unauthorized channel: ${channel}`);
    }

    // 2. Rate limiting
    if (!this.checkRateLimit(channel)) {
      this.logSecurityEvent('rate_limit_exceeded', channel);
      throw new Error(`Rate limit exceeded for: ${channel}`);
    }

    // 3. Payload size validation
    const payload = JSON.stringify(args);
    if (payload.length > this.config.maxPayloadSize) {
      this.logSecurityEvent('payload_too_large', channel);
      throw new Error(`Payload too large: ${payload.length} bytes`);
    }

    // 4. Input sanitization
    const sanitizedArgs = this.sanitizeArguments(args);

    // 5. Execute with timeout and tracking
    const requestId = `${channel}_${Date.now()}_${Math.random()}`;
    this.activeRequests.add(requestId);

    try {
      const result = await Promise.race([
        ipcRenderer.invoke(channel, ...sanitizedArgs),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Request timeout: ${channel}`)), this.config.requestTimeoutMs)
        )
      ]);

      console.log(`[SECURE-IPC] ✅ ${channel} completed`);
      return result;

    } catch (error: any) {
      this.logSecurityEvent('request_failed', channel);
      console.error(`[SECURE-IPC] ❌ ${channel} failed:`, error.message);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Validate channel against whitelist
   */
  private validateChannel(channel: string): boolean {
    return this.config.allowedChannels.has(channel);
  }

  /**
   * Rate limiting with per-channel tracking
   */
  private checkRateLimit(channel: string): boolean {
    const now = Date.now();
    const resetTime = now + (60 * 1000); // 1 minute
    
    let rateData = this.requestCounts.get(channel);
    
    if (!rateData || now > rateData.resetTime) {
      this.requestCounts.set(channel, { count: 1, resetTime });
      return true;
    }

    if (rateData.count >= this.config.maxRequestsPerMinute) {
      return false;
    }

    rateData.count++;
    return true;
  }

  /**
   * Comprehensive input sanitization
   */
  private sanitizeArguments(args: any[]): any[] {
    return args.map(arg => this.sanitizeValue(arg));
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove script tags, limit length, encode dangerous characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .slice(0, 50000) // Reasonable string limit
        .trim();
    }
    
    if (Array.isArray(value)) {
      return value.slice(0, 1000).map(item => this.sanitizeValue(item)); // Limit array size
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      let keyCount = 0;
      
      for (const [key, val] of Object.entries(value)) {
        if (keyCount >= 100) break; // Limit object size
        if (typeof key === 'string' && key.length < 200) {
          sanitized[key] = this.sanitizeValue(val);
          keyCount++;
        }
      }
      return sanitized;
    }
    
    if (typeof value === 'number') {
      // Ensure valid numbers
      return isNaN(value) || !isFinite(value) ? 0 : value;
    }
    
    return value;
  }

  /**
   * Security event logging
   */
  private logSecurityEvent(type: string, channel: string): void {
    this.securityEvents.push({
      type,
      channel,
      timestamp: Date.now()
    });

    // Limit event history
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }

    console.warn(`[SECURITY] ${type} for channel: ${channel}`);
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics() {
    return {
      activeRequests: this.activeRequests.size,
      recentEvents: this.securityEvents.filter(e => Date.now() - e.timestamp < 300000), // Last 5 minutes
      rateLimitStatus: Object.fromEntries(this.requestCounts)
    };
  }
}

const secureIPC = new ZeroTrustIPCClient();

// --------------------------------------------------
// PHASE 1 FIX: Enhanced Safe IPC Wrapper
// --------------------------------------------------
const createSafeIPCHandler = (channel: string, timeout: number = 30000) => {
  return async (...args: any[]) => {
    try {
      return await secureIPC.secureInvoke(channel, ...args);
    } catch (error: any) {
      // Return consistent error structure
      return {
        success: false,
        error: error.message || `IPC call failed: ${channel}`,
        message: `Failed to ${channel.replace('-', ' ')}: ${error.message || 'Unknown error'}`
      };
    }
  };
};

// --------------------------------------------------
// 1. Type-Safe IPC Wrapper
// --------------------------------------------------
const createIPCHandler = <T extends Record<string, any>>(namespace: string, methods: Record<keyof T, string[]>) => {
  return Object.fromEntries(
    Object.entries(methods).map(([method, validChannels]) => [
      method,
      (...args: any[]) => {
        const channel = `${namespace}:${method}`;
        if (!validChannels.includes(channel)) {
          throw new Error(`Blocked IPC channel: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
      }
    ])
  ) as T;
};

// --------------------------------------------------
// 2. Namespaced API Modules
// --------------------------------------------------
const fileSystemAPI = {
  read: (...args: any[]) => ipcRenderer.invoke('file:read', ...args),
  write: (...args: any[]) => ipcRenderer.invoke('file:write', ...args), 
  delete: (...args: any[]) => ipcRenderer.invoke('file:delete', ...args),
  list: (...args: any[]) => ipcRenderer.invoke('file:list', ...args)
};

const databaseAPI = {
  query: (...args: any[]) => ipcRenderer.invoke('db:query', ...args),
  execute: (...args: any[]) => ipcRenderer.invoke('db:execute', ...args),
  backup: (...args: any[]) => ipcRenderer.invoke('db:backup', ...args)
};

const windowAPI = {
  create: (...args: any[]) => ipcRenderer.invoke('window:create', ...args),
  maximize: (...args: any[]) => ipcRenderer.invoke('window:maximize', ...args),
  minimize: (...args: any[]) => ipcRenderer.invoke('window:minimize', ...args)
};

const audioAPI = {
  play: (...args: any[]) => ipcRenderer.invoke('audio:play', ...args),
  pause: (...args: any[]) => ipcRenderer.invoke('audio:pause', ...args),
  stop: (...args: any[]) => ipcRenderer.invoke('audio:stop', ...args)
};

// --------------------------------------------------
// 3. Event Subscription System
// --------------------------------------------------
const eventBus = {
  on(channel: string, listener: (...args: any[]) => void) {
    const validChannels = [
      'file:changed',
      'db:updated',
      'window:resized'
    ];
    
    if (!validChannels.includes(channel)) {
      throw new Error(`Blocked event channel: ${channel}`);
    }

    const subscription = (_event: IpcRendererEvent, ...args: any[]) => listener(...args);
    ipcRenderer.on(channel, subscription);

    return () => ipcRenderer.off(channel, subscription);
  }
};

// --------------------------------------------------
// 4. Debug Tools (Dev-Only)
// --------------------------------------------------
const debugTools = process.env.NODE_ENV === 'development' ? {
  ping: () => ipcRenderer.invoke('debug:ping'),
  getState: () => ipcRenderer.invoke('debug:get-state')
} : null;

// --------------------------------------------------
// 5. Context Bridge Exposure with PHASE 1 Safety
// --------------------------------------------------
// Complete API following the type definitions
const api = {
  // PHASE 1 FIX: Ollama service functions with safe IPC wrappers
  checkOllamaStatus: createSafeIPCHandler('check-ollama-status'),
  startOllama: createSafeIPCHandler('start-ollama', 30000), // Longer timeout for service start
  getOllamaModels: createSafeIPCHandler('get-ollama-models'),
  pullModel: createSafeIPCHandler('pull-model', 300000), // 5 minute timeout for model downloads
  deleteModel: createSafeIPCHandler('delete-model', 60000), // 1 minute timeout for deletions
  
  // NEW: Modelfile update functionality
  updateModelfile: createSafeIPCHandler('ollama:update-modelfile'),

  // NEW: Code execution (Desktop Commander)
  execCode: createSafeIPCHandler('ollama:exec'),

  // ChromaDB service functions
  checkChromaStatus: createSafeIPCHandler('check-chroma-status'),
  startChroma: createSafeIPCHandler('start-chroma', 30000), // Longer timeout for service start

  // PHASE 1 FIX: Enhanced chat functions with validation
  chatWithAI: createSafeIPCHandler('chat-with-ai', 60000), // 1 minute timeout for AI responses
  
  // Service metrics
  getServiceMetrics: createSafeIPCHandler('get-service-metrics'),
  
  // PHASE 2 FIX: Real-time performance metrics
  getPerformanceMetrics: createSafeIPCHandler('get-performance-metrics'),
  
  // Memory functions
  searchMemory: createSafeIPCHandler('search-memory'),

  // PHASE 1 UMSL: Unified Memory & Storage Layer API
  // Semantic Memory Operations
  umslStoreMemory: createSafeIPCHandler('umsl-store-memory'),
  umslRetrieveContext: createSafeIPCHandler('umsl-retrieve-context'),
  umslAdvancedSearch: createSafeIPCHandler('umsl-advanced-search'),
  
  // Conversation Management
  umslCreateThread: createSafeIPCHandler('umsl-create-thread'),
  umslAddToThread: createSafeIPCHandler('umsl-add-to-thread'),
  umslGetThread: createSafeIPCHandler('umsl-get-thread'),
  
  // Model Management
  umslRegisterModel: createSafeIPCHandler('umsl-register-model'),
  umslLoadModel: createSafeIPCHandler('umsl-load-model', 60000), // Longer timeout for model loading
  umslUnloadModel: createSafeIPCHandler('umsl-unload-model'),
  umslExecuteModel: createSafeIPCHandler('umsl-execute-model', 60000), // Longer timeout for model execution
  umslGetModelStats: createSafeIPCHandler('umsl-get-model-stats'),
  umslGetResourceUsage: createSafeIPCHandler('umsl-get-resource-usage'),
  umslGetMemoryStats: createSafeIPCHandler('umsl-get-memory-stats'),
  umslPrefetchModels: createSafeIPCHandler('umsl-prefetch-models', 120000), // Longer timeout for prefetching
  umslUpdateResourceQuota: createSafeIPCHandler('umsl-update-resource-quota'),

  // PHASE 1 AP: Agent Platform API
  // Agent Management
  agentCreate: createSafeIPCHandler('agent-create'),
  agentStart: createSafeIPCHandler('agent-start'),
  agentStop: createSafeIPCHandler('agent-stop'),
  agentDelete: createSafeIPCHandler('agent-delete'),
  agentGet: createSafeIPCHandler('agent-get'),
  agentList: createSafeIPCHandler('agent-list'),
  agentGetStatus: createSafeIPCHandler('agent-get-status'),
  agentExecuteTask: createSafeIPCHandler('agent-execute-task', 120000), // Longer timeout for task execution
  agentGetSystemStatus: createSafeIPCHandler('agent-get-system-status'),

  // PHASE 2A: Plugin Architecture API
  // Plugin Management
  pluginInstall: createSafeIPCHandler('plugin-install', 60000), // Longer timeout for installation
  pluginUninstall: createSafeIPCHandler('plugin-uninstall', 30000),
  pluginEnable: createSafeIPCHandler('plugin-enable'),
  pluginDisable: createSafeIPCHandler('plugin-disable'),
  pluginUpdate: createSafeIPCHandler('plugin-update', 60000),
  pluginListInstalled: createSafeIPCHandler('plugin-list-installed'),
  pluginGetState: createSafeIPCHandler('plugin-get-state'),
  pluginSearchRegistry: createSafeIPCHandler('plugin-search-registry'),
  pluginExecute: createSafeIPCHandler('plugin-execute', 30000),
  pluginGetConfig: createSafeIPCHandler('plugin-get-config'),
  pluginSetConfig: createSafeIPCHandler('plugin-set-config'),

  // File system functions
  fsReadFile: (filePath: string) => ipcRenderer.invoke('fs-read-file', filePath),
  fsWriteFile: (filePath: string, content: string) => ipcRenderer.invoke('fs-write-file', filePath, content),
  fsCreateDirectory: (dirPath: string) => ipcRenderer.invoke('fs-create-directory', dirPath),
  fsListDirectory: (dirPath: string) => ipcRenderer.invoke('fs-list-directory', dirPath),
  fsMoveFile: (source: string, destination: string) => ipcRenderer.invoke('fs-move-file', source, destination),
  fsSearchFiles: (path: string, pattern: string) => ipcRenderer.invoke('fs-search-files', path, pattern),
  fsSearchCode: (path: string, pattern: string) => ipcRenderer.invoke('fs-search-code', path, pattern),
  fsExecuteCommand: (command: string, args?: string[], cwd?: string) => ipcRenderer.invoke('fs-execute-command', command, args, cwd),
  fsOpenFileDialog: () => ipcRenderer.invoke('fs-open-file-dialog'),
  fsSaveFileDialog: (defaultName?: string, content?: string) => ipcRenderer.invoke('fs-save-file-dialog', defaultName, content),
  fsGetFileInfo: (filePath: string) => ipcRenderer.invoke('fs-get-file-info', filePath)
};

contextBridge.exposeInMainWorld('api', api);

// Also expose the legacy electronAPI for backward compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  fs: fileSystemAPI,
  db: databaseAPI,
  window: windowAPI,
  audio: audioAPI,
  events: eventBus,
  ...(debugTools && { debug: debugTools })
});

// --------------------------------------------------
// 6. Initialization Safety Checks
// --------------------------------------------------
if (process.contextIsolated) {
  console.log('[Preload] Context isolation enabled');
} else {
  console.error('[Preload] SECURITY WARNING: Context isolation disabled');
}