import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// import type { 
//   FileSystemAPI, 
//   DatabaseAPI, 
//   WindowAPI, 
//   AudioAPI 
// } from '../../shared/types'; // Shared TypeScript interfaces - temporarily disabled

// --------------------------------------------------
// PHASE 1 FIX: Safe IPC Wrapper with Error Handling
// --------------------------------------------------
const createSafeIPCHandler = (channel: string, timeout: number = 10000) => {
  return async (...args: any[]) => {
    try {
      console.log(`[IPC] Calling ${channel}...`);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`IPC timeout: ${channel} took longer than ${timeout}ms`)), timeout);
      });

      // Race between IPC call and timeout
      const result = await Promise.race([
        ipcRenderer.invoke(channel, ...args),
        timeoutPromise
      ]);

      console.log(`[IPC] ✅ ${channel} completed successfully`);
      return result;
      
    } catch (error: any) {
      console.error(`[IPC] ❌ ${channel} failed:`, error.message);
      
      // Return a consistent error structure
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