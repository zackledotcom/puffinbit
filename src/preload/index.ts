// src/preload/index.ts - COMPLETE API EXPOSURE
import { contextBridge, ipcRenderer } from 'electron'

/**
 * COMPLETE PRELOAD SCRIPT
 * - Matches ALL IPC handlers in the main process
 * - Provides complete type-safe API for renderer stores
 * - Includes all methods that stores expect
 */

// Define the complete API interface
interface ElectronAPI {
  // Chat operations
  chatWithAI: (request: {
    message: string
    model: string
    history?: Array<{ role: string; content: string; timestamp?: Date }>
    memoryOptions?: { enabled: boolean; contextLength?: number; smartFilter?: boolean }
    options?: { temperature?: number; maxTokens?: number }
  }) => Promise<{
    success: boolean
    message?: string
    error?: string
    model?: string
    memoryContext?: string[]
  }>

  // Model operations
  getOllamaModels: () => Promise<{
    success: boolean
    models: string[]
    error?: string
  }>

  setActiveModel: (model: string) => Promise<{ success: boolean; error?: string }>

  // Status checks
  checkOllamaStatus: () => Promise<{
    success: boolean
    status: string
    error?: string
  }>

  checkChromaStatus: () => Promise<{
    success: boolean
    status: string
    error?: string
  }>

  // Enhanced Memory operations
  getMemoryStats: () => Promise<{
    success: boolean
    stats?: {
      totalItems: number
      totalSize: number
      lastAccess: string
      health: 'good' | 'warning' | 'full' | 'unknown'
    }
    error?: string
  }>

  setMemoryEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>
  resetMemory: () => Promise<{ success: boolean; error?: string }>

  // Advanced Memory Management (UMSL)
  searchMemory: (query: string, limit?: number) => Promise<{
    success: boolean
    results?: any[]
    analytics?: any
    searchTime?: number
    cacheHit?: boolean
    totalFound?: number
    error?: string
  }>

  storeMemory: (content: string, type: string, metadata?: any) => Promise<{
    success: boolean
    memoryId?: string
    error?: string
  }>

  advancedSearch: (query: string, options?: any) => Promise<{
    success: boolean
    results?: any[]
    analytics?: any
    searchTime?: number
    cacheHit?: boolean
    totalFound?: number
    error?: string
  }>

  getMemoryAnalytics: () => Promise<{
    success: boolean
    stats?: any
    chromaAnalytics?: any
    config?: any
    error?: string
  }>

  vacuumMemory: (dataPath?: string) => Promise<{
    success: boolean
    vacuumResult?: any
    optimizeResult?: any
    message?: string
    error?: string
  }>

  configureHNSW: (collectionName: string, config: any) => Promise<{
    success: boolean
    error?: string
  }>

  updateMemoryConfig: (config: any) => Promise<{
    success: boolean
    config?: any
    message?: string
    error?: string
  }>

  clearMemoryCache: () => Promise<{
    success: boolean
    message?: string
    error?: string
  }>

  getPerformanceMetrics: () => Promise<{
    success: boolean
    metrics?: {
      cacheHitRate: number
      avgLatency: number
      storageStats: any
    }
    error?: string
  }>

  retrieveMemory: (memoryId: string) => Promise<{
    success: boolean
    memoryItem?: any
    found?: boolean
    error?: string
  }>

  getCollections: () => Promise<{
    success: boolean
    collections?: any[]
    error?: string
  }>

  createCollection: (name: string, metadata?: any, hnswConfig?: any) => Promise<{
    success: boolean
    error?: string
  }>

  deleteCollection: (name: string) => Promise<{
    success: boolean
    error?: string
  }>

  // System operations
  getSystemHealth: () => Promise<{
    success: boolean
    health: {
      status: string
      services: Array<{ name: string; status: string }>
    }
    error?: string
  }>

  // File system operations for context selector
  readFile: (filePath: string) => Promise<{
    success: boolean
    content?: string
    error?: string
  }>

  listDirectory: (dirPath: string) => Promise<{
    success: boolean
    files?: Array<{
      name: string
      isDirectory: boolean
      isFile: boolean
      path: string
    }>
    error?: string
  }>

  openFileDialog: () => Promise<{
    success: boolean
    filePath?: string
    error?: string
  }>

  getFileInfo: (filePath: string) => Promise<{
    success: boolean
    info?: {
      size: number
      isFile: boolean
      isDirectory: boolean
      created: Date
      modified: Date
      path: string
      name: string
      extension: string
    }
    error?: string
  }>

  // Canvas operations
  canvas: {
    listFiles: (dirPath: string) => Promise<any[] | null>
    readFile: (filePath: string) => Promise<string | null>
    writeFile: (filePath: string, content: string) => Promise<boolean>
    createFile: (filePath: string) => Promise<boolean>
    createFolder: (folderPath: string) => Promise<boolean>
    delete: (itemPath: string) => Promise<boolean>
    rename: (oldPath: string, newName: string) => Promise<boolean>
    selectDirectory: () => Promise<string | null>
    uploadFiles: () => Promise<string[] | null>
  }
}

// Create the complete API implementation
const electronAPI: ElectronAPI = {
  // Chat with AI
  chatWithAI: async (request) => {
    try {
      console.log('[Preload] Chat request:', { model: request.model, messageLength: request.message.length })
      const response = await ipcRenderer.invoke('chat-with-ai', request)
      console.log('[Preload] Chat response:', { success: response.success, hasMessage: !!response.message })
      return response
    } catch (error) {
      console.error('[Preload] Chat error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed',
        message: 'Failed to communicate with AI service. Please try again.'
      }
    }
  },

  // Get Ollama models
  getOllamaModels: async () => {
    try {
      const response = await ipcRenderer.invoke('get-ollama-models')
      console.log('[Preload] Get models response:', response)
      return response
    } catch (error) {
      console.error('[Preload] Get models failed:', error)
      return {
        success: false,
        models: ['llama3.2:latest'],
        error: 'Failed to get models'
      }
    }
  },

  // Set active model
  setActiveModel: async (model: string) => {
    try {
      const response = await ipcRenderer.invoke('set-active-model', model)
      console.log('[Preload] Set active model response:', response)
      return response
    } catch (error) {
      console.error('[Preload] Set active model failed:', error)
      return {
        success: false,
        error: 'Failed to set active model'
      }
    }
  },

  // Check Ollama status
  checkOllamaStatus: async () => {
    try {
      const response = await ipcRenderer.invoke('check-ollama-status')
      console.log('[Preload] Ollama status:', response)
      return response
    } catch (error) {
      console.error('[Preload] Ollama status check failed:', error)
      return {
        success: false,
        status: 'error',
        error: 'Status check failed'
      }
    }
  },

  // Check ChromaDB status
  checkChromaStatus: async () => {
    try {
      const response = await ipcRenderer.invoke('check-chroma-status')
      console.log('[Preload] ChromaDB status:', response)
      return response
    } catch (error) {
      console.error('[Preload] ChromaDB status check failed:', error)
      return {
        success: false,
        status: 'error',
        error: 'Status check failed'
      }
    }
  },

  // Get memory stats
  getMemoryStats: async () => {
    try {
      const response = await ipcRenderer.invoke('get-memory-stats')
      console.log('[Preload] Memory stats:', response)
      return response
    } catch (error) {
      console.error('[Preload] Get memory stats failed:', error)
      return {
        success: false,
        error: 'Failed to get memory stats'
      }
    }
  },

  // Set memory enabled
  setMemoryEnabled: async (enabled: boolean) => {
    try {
      const response = await ipcRenderer.invoke('set-memory-enabled', enabled)
      console.log('[Preload] Set memory enabled:', response)
      return response
    } catch (error) {
      console.error('[Preload] Set memory enabled failed:', error)
      return {
        success: false,
        error: 'Failed to set memory enabled'
      }
    }
  },

  // Reset memory
  resetMemory: async () => {
    try {
      const response = await ipcRenderer.invoke('reset-memory')
      console.log('[Preload] Reset memory:', response)
      return response
    } catch (error) {
      console.error('[Preload] Reset memory failed:', error)
      return {
        success: false,
        error: 'Failed to reset memory'
      }
    }
  },

  // Enhanced Memory Management (UMSL)
  searchMemory: async (query: string, limit?: number) => {
    try {
      const response = await ipcRenderer.invoke('search-memory', query, limit)
      console.log('[Preload] Search memory:', { query, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Search memory failed:', error)
      return {
        success: false,
        error: 'Failed to search memory'
      }
    }
  },

  storeMemory: async (content: string, type: string, metadata?: any) => {
    try {
      const response = await ipcRenderer.invoke('umsl-store-memory', content, type, metadata)
      console.log('[Preload] Store memory:', { type, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Store memory failed:', error)
      return {
        success: false,
        error: 'Failed to store memory'
      }
    }
  },

  advancedSearch: async (query: string, options?: any) => {
    try {
      const response = await ipcRenderer.invoke('umsl-advanced-search', query, options)
      console.log('[Preload] Advanced search:', { query, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Advanced search failed:', error)
      return {
        success: false,
        error: 'Failed to perform advanced search'
      }
    }
  },

  getMemoryAnalytics: async () => {
    try {
      const response = await ipcRenderer.invoke('umsl-get-memory-analytics')
      console.log('[Preload] Get memory analytics:', response.success)
      return response
    } catch (error) {
      console.error('[Preload] Get memory analytics failed:', error)
      return {
        success: false,
        error: 'Failed to get memory analytics'
      }
    }
  },

  vacuumMemory: async (dataPath?: string) => {
    try {
      const response = await ipcRenderer.invoke('umsl-vacuum-memory', dataPath)
      console.log('[Preload] Vacuum memory:', response.success)
      return response
    } catch (error) {
      console.error('[Preload] Vacuum memory failed:', error)
      return {
        success: false,
        error: 'Failed to vacuum memory'
      }
    }
  },

  configureHNSW: async (collectionName: string, config: any) => {
    try {
      const response = await ipcRenderer.invoke('umsl-configure-hnsw', collectionName, config)
      console.log('[Preload] Configure HNSW:', { collection: collectionName, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Configure HNSW failed:', error)
      return {
        success: false,
        error: 'Failed to configure HNSW parameters'
      }
    }
  },

  updateMemoryConfig: async (config: any) => {
    try {
      const response = await ipcRenderer.invoke('umsl-update-config', config)
      console.log('[Preload] Update memory config:', response.success)
      return response
    } catch (error) {
      console.error('[Preload] Update memory config failed:', error)
      return {
        success: false,
        error: 'Failed to update memory configuration'
      }
    }
  },

  clearMemoryCache: async () => {
    try {
      const response = await ipcRenderer.invoke('umsl-clear-cache')
      console.log('[Preload] Clear memory cache:', response.success)
      return response
    } catch (error) {
      console.error('[Preload] Clear memory cache failed:', error)
      return {
        success: false,
        error: 'Failed to clear memory cache'
      }
    }
  },

  getPerformanceMetrics: async () => {
    try {
      const response = await ipcRenderer.invoke('umsl-get-performance-metrics')
      console.log('[Preload] Get performance metrics:', response.success)
      return response
    } catch (error) {
      console.error('[Preload] Get performance metrics failed:', error)
      return {
        success: false,
        error: 'Failed to get performance metrics'
      }
    }
  },

  retrieveMemory: async (memoryId: string) => {
    try {
      const response = await ipcRenderer.invoke('umsl-retrieve-memory', memoryId)
      console.log('[Preload] Retrieve memory:', { memoryId, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Retrieve memory failed:', error)
      return {
        success: false,
        error: 'Failed to retrieve memory'
      }
    }
  },

  getCollections: async () => {
    try {
      const response = await ipcRenderer.invoke('umsl-get-collections')
      console.log('[Preload] Get collections:', response.success)
      return response
    } catch (error) {
      console.error('[Preload] Get collections failed:', error)
      return {
        success: false,
        error: 'Failed to get collections'
      }
    }
  },

  createCollection: async (name: string, metadata?: any, hnswConfig?: any) => {
    try {
      const response = await ipcRenderer.invoke('umsl-create-collection', name, metadata, hnswConfig)
      console.log('[Preload] Create collection:', { name, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Create collection failed:', error)
      return {
        success: false,
        error: 'Failed to create collection'
      }
    }
  },

  deleteCollection: async (name: string) => {
    try {
      const response = await ipcRenderer.invoke('umsl-delete-collection', name)
      console.log('[Preload] Delete collection:', { name, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Delete collection failed:', error)
      return {
        success: false,
        error: 'Failed to delete collection'
      }
    }
  },

  // Get system health
  getSystemHealth: async () => {
    try {
      const response = await ipcRenderer.invoke('get-system-health')
      console.log('[Preload] System health:', response)
      return response
    } catch (error) {
      console.error('[Preload] System health check failed:', error)
      return {
        success: false,
        health: {
          status: 'unknown',
          services: []
        },
        error: 'Health check failed'
      }
    }
  },

  // File system operations for context selector
  readFile: async (filePath: string) => {
    try {
      const response = await ipcRenderer.invoke('fs-read-file', filePath)
      console.log('[Preload] Read file:', { path: filePath, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Read file failed:', error)
      return { success: false, error: 'Failed to read file' }
    }
  },

  listDirectory: async (dirPath: string) => {
    try {
      const response = await ipcRenderer.invoke('fs-list-directory', dirPath)
      console.log('[Preload] List directory:', { path: dirPath, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] List directory failed:', error)
      return { success: false, error: 'Failed to list directory' }
    }
  },

  openFileDialog: async () => {
    try {
      const response = await ipcRenderer.invoke('fs-open-file-dialog')
      console.log('[Preload] Open file dialog:', response)
      return response
    } catch (error) {
      console.error('[Preload] Open file dialog failed:', error)
      return { success: false, error: 'Failed to open file dialog' }
    }
  },

  getFileInfo: async (filePath: string) => {
    try {
      const response = await ipcRenderer.invoke('fs-get-file-info', filePath)
      console.log('[Preload] Get file info:', { path: filePath, success: response.success })
      return response
    } catch (error) {
      console.error('[Preload] Get file info failed:', error)
      return { success: false, error: 'Failed to get file info' }
    }
  },

  // Canvas operations
  canvas: {
    listFiles: async (dirPath: string) => {
      try {
        const response = await ipcRenderer.invoke('canvas:listFiles', dirPath)
        console.log('[Preload] Canvas list files:', { path: dirPath, success: !!response })
        return response
      } catch (error) {
        console.error('[Preload] Canvas list files failed:', error)
        return null
      }
    },
    
    readFile: async (filePath: string) => {
      try {
        const response = await ipcRenderer.invoke('canvas:readFile', filePath)
        console.log('[Preload] Canvas read file:', { path: filePath, success: !!response })
        return response
      } catch (error) {
        console.error('[Preload] Canvas read file failed:', error)
        return null
      }
    },
    
    writeFile: async (filePath: string, content: string) => {
      try {
        await ipcRenderer.invoke('canvas:writeFile', filePath, content)
        console.log('[Preload] Canvas write file success:', filePath)
        return true
      } catch (error) {
        console.error('[Preload] Canvas write file failed:', error)
        return false
      }
    },
    
    createFile: async (filePath: string) => {
      try {
        await ipcRenderer.invoke('canvas:createFile', filePath)
        console.log('[Preload] Canvas create file success:', filePath)
        return true
      } catch (error) {
        console.error('[Preload] Canvas create file failed:', error)
        return false
      }
    },
    
    createFolder: async (folderPath: string) => {
      try {
        await ipcRenderer.invoke('canvas:createFolder', folderPath)
        console.log('[Preload] Canvas create folder success:', folderPath)
        return true
      } catch (error) {
        console.error('[Preload] Canvas create folder failed:', error)
        return false
      }
    },
    
    delete: async (itemPath: string) => {
      try {
        await ipcRenderer.invoke('canvas:delete', itemPath)
        console.log('[Preload] Canvas delete success:', itemPath)
        return true
      } catch (error) {
        console.error('[Preload] Canvas delete failed:', error)
        return false
      }
    },
    
    rename: async (oldPath: string, newName: string) => {
      try {
        await ipcRenderer.invoke('canvas:rename', oldPath, newName)
        console.log('[Preload] Canvas rename success:', { oldPath, newName })
        return true
      } catch (error) {
        console.error('[Preload] Canvas rename failed:', error)
        return false
      }
    },
    
    selectDirectory: async () => {
      try {
        const response = await ipcRenderer.invoke('canvas:selectDirectory')
        console.log('[Preload] Canvas select directory:', !!response)
        return response
      } catch (error) {
        console.error('[Preload] Canvas select directory failed:', error)
        return null
      }
    },
    
    uploadFiles: async () => {
      try {
        const response = await ipcRenderer.invoke('canvas:uploadFiles')
        console.log('[Preload] Canvas upload files:', response)
        return response
      } catch (error) {
        console.error('[Preload] Canvas upload files failed:', error)
        return null
      }
    }
  }
}

// Expose the complete API to the renderer process
try {
  contextBridge.exposeInMainWorld('api', electronAPI)
  
  // Also expose electronAPI for canvas functionality
  contextBridge.exposeInMainWorld('electronAPI', {
    canvas: electronAPI.canvas
  })
  
  console.log('[Preload] ✅ Complete API exposed successfully to renderer')
} catch (error) {
  console.error('[Preload] ❌ Failed to expose API:', error)
  
  // Fallback for development (if contextBridge fails)
  if (process.env.NODE_ENV === 'development') {
    ;(window as any).api = electronAPI
    ;(window as any).electronAPI = { canvas: electronAPI.canvas }
    console.warn('[Preload] Using fallback API exposure for development')
  }
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    api: ElectronAPI
    electronAPI: {
      canvas: ElectronAPI['canvas']
    }
  }
}

// Basic error handling
window.addEventListener('error', (event) => {
  console.error('[Preload] Window error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Preload] Unhandled promise rejection:', event.reason)
})

console.log('[Preload] ✅ Complete preload script loaded successfully')