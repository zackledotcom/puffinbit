import { ElectronAPI } from '@electron-toolkit/preload'
import type { AppSettings } from '../types/settings'
import type { Message, MemorySummary, MemoryStore } from '../types/chat'
import type { Agent, AgentRegistry, ToolRegistry } from '../types/agents'

interface AIAssistantAPI {
  // Ollama service functions
  checkOllamaStatus: () => Promise<{ connected: boolean; message: string; models?: string[] }>
  startOllama: () => Promise<{ success: boolean; message: string }>
  getOllamaModels: () => Promise<{ success: boolean; models: string[] }>
  pullModel: (modelName: string) => Promise<{ success: boolean }>
  deleteModel: (modelName: string) => Promise<{ success: boolean }>

  // ChromaDB service functions
  checkChromaStatus: () => Promise<{ connected: boolean; message: string; version?: string }>
  startChroma: () => Promise<{ success: boolean; message: string }>

  // Enhanced chat functions
  chatWithAI: (data: {
    message: string
    model: string
    history?: any[]
    mode?: string
    memoryOptions?: {
      enabled?: boolean
      contextLength?: number
      smartFilter?: boolean
      debugMode?: boolean
    }
  }) => Promise<{
    success: boolean
    message: string
    model?: string
    modelUsed?: string
    timestamp?: string
    memoryContext?: any
    error?: string
  }>

  // Streaming chat functions
  startChatStream: (data: {
    message: string
    model: string
    streamId: string
  }) => Promise<{ success: boolean; streamId: string; error?: string }>
  stopChatStream: (streamId: string) => Promise<{ success: boolean; error?: string }>

  // Memory service functions
  searchMemory: (
    query: string,
    limit?: number
  ) => Promise<{ success: boolean; results?: string[]; error?: string }>
  createMemorySummary: (
    messages: Message[]
  ) => Promise<{ success: boolean; summary?: MemorySummary; error?: string }>
  enrichWithMemory: (data: {
    prompt: string
    options?: any
  }) => Promise<{ success: boolean; result?: any; error?: string }>

  // Model avatar functions
  getModelAvatar: (modelName: string) => Promise<{ success: boolean; avatar?: any; error?: string }>

  // Agent management functions
  getAgentRegistry: () => Promise<{ success: boolean; registry?: any; error?: string }>
  createAgent: (agentData: any) => Promise<{ success: boolean; agent?: any; error?: string }>
  updateAgent: (
    agentId: string,
    updates: any
  ) => Promise<{ success: boolean; agent?: any; error?: string }>
  deleteAgent: (agentId: string) => Promise<{ success: boolean; error?: string }>
  executeAgentTool: (
    agentId: string,
    toolName: string,
    params: any
  ) => Promise<{ success: boolean; result?: any; error?: string }>
  getAvailableTools: () => Promise<{ success: boolean; tools?: any; error?: string }>

  // Streaming event listeners
  onChatStreamChunk: (callback: (data: any) => void) => () => void
  onChatStreamComplete: (callback: (data: any) => void) => () => void
  onChatStreamError: (callback: (data: any) => void) => () => void

  // Tool confirmation event listeners
  onToolConfirmationRequest: (callback: (data: any) => void) => () => void

  // Secure storage API
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<void>
  getChatHistory: () => Promise<Message[]>
  addMessageToHistory: (message: Message) => Promise<void>

  // Memory management API
  getMemoryStore: () => Promise<MemoryStore>
  addMemorySummary: (summary: MemorySummary) => Promise<void>
  clearMemory: () => Promise<void>
  updateMemorySettings: (enabled: boolean, retentionDays?: number) => Promise<void>
  getMemorySummaries: () => Promise<MemorySummary[]>
  summarizeMessages: (
    messages: Message[],
    model?: string
  ) => Promise<{ success: boolean; summary?: MemorySummary; error?: string }>

  // Agent management API
  agentRegistryLoad: () => Promise<AgentRegistry>
  agentCreate: (
    agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'metadata'>
  ) => Promise<Agent>
  agentUpdate: (id: string, updates: Partial<Agent>) => Promise<Agent>
  agentDelete: (id: string) => Promise<void>
  agentClone: (id: string, newName: string) => Promise<Agent>
  agentSetActive: (id: string | null) => Promise<void>
  agentGetActive: () => Promise<Agent | null>
  agentGetAll: () => Promise<Agent[]>
  agentGetAvailableTools: () => Promise<ToolRegistry>
  agentValidateTool: (toolKey: string) => Promise<boolean>

  // File System API
  fsReadFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  fsWriteFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  fsListDirectory: (dirPath: string) => Promise<{ success: boolean; files?: any[]; error?: string }>
  fsCreateFile: (filePath: string, content?: string) => Promise<{ success: boolean; error?: string }>
  fsCreateDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>
  fsDelete: (itemPath: string) => Promise<{ success: boolean; error?: string }>
  fsRename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>
  fsCopy: (source: string, destination: string) => Promise<{ success: boolean; error?: string }>
  fsExecuteCommand: (
    command: string,
    cwd?: string
  ) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
  fsOpenFileDialog: () => Promise<{ success: boolean; filePath?: string; error?: string }>
  fsSaveFileDialog: (
    defaultName?: string,
    content?: string
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>
  fsGetFileInfo: (filePath: string) => Promise<{ success: boolean; info?: any; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AIAssistantAPI
  }
}
