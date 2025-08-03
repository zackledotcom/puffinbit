// src/renderer/src/types/ipc.ts
export interface ChatRequest {
  message: string
  model: string
  history?: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp?: Date
  }>
  memoryOptions?: {
    enabled: boolean
    contextLength?: number
    smartFilter?: boolean
    debugMode?: boolean
  }
  options?: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  }
}

export interface ChatResponse {
  success: boolean
  message?: string
  error?: string
  stream?: boolean
  memoryContext?: string[]
  metadata?: {
    model: string
    responseTime: number
    tokensUsed: number
    memoryUsed: boolean
  }
}

export interface ModelResponse {
  success: boolean
  models?: string[]
  error?: string
}

export interface StatusResponse {
  success: boolean
  status?: 'online' | 'offline' | 'error'
  error?: string
}

export interface MemoryStatsResponse {
  success: boolean
  stats?: {
    totalItems: number
    totalSize: number
    lastAccess: string
    health: 'good' | 'warning' | 'full' | 'unknown'
  }
  error?: string
}

// Extend window API
declare global {
  interface Window {
    api?: {
      // Chat operations
      chatWithAI?: (request: ChatRequest) => Promise<ChatResponse>
      
      // Model operations
      getOllamaModels?: () => Promise<ModelResponse>
      setActiveModel?: (model: string) => Promise<void>
      
      // Status checks
      checkOllamaStatus?: () => Promise<StatusResponse>
      checkChromaStatus?: () => Promise<StatusResponse>
      
      // Memory operations
      getMemoryStats?: () => Promise<MemoryStatsResponse>
      setMemoryEnabled?: (enabled: boolean) => Promise<void>
      resetMemory?: () => Promise<{ success: boolean; error?: string }>
      
      // Settings
      getSettings?: () => Promise<any>
      saveSettings?: (settings: any) => Promise<void>
    }
  }
}