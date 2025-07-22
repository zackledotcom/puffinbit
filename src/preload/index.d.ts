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
  
  // NEW: Professional Modelfile update functionality
  updateModelfile: (data: { 
    modelName: string; 
    content: string;
    options?: {
      customName?: string;
      overwrite?: boolean;
      validate?: boolean;
    };
  }) => Promise<{ 
    success: boolean; 
    message?: string; 
    error?: string;
    modelName?: string;
    responseTime?: number;
  }>

  // NEW: Code execution (Desktop Commander)
  execCode: (data: {
    code: string;
    lang?: 'js';
  }) => Promise<{
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
    lang?: string;
  }>

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
    message?: string
    response?: string
    model?: string
    modelUsed?: string
    timestamp?: string
    memoryContext?: any
    error?: string
  }>

  // Service metrics
  getServiceMetrics: () => Promise<{
    overall: number
    performance: number
    memory: number
    temperature: number
    uptime: number
    responseTime: number
    tokensPerSecond: number
    errors: number
    status: 'excellent' | 'good' | 'warning' | 'critical'
    modelCount: number
    recommendations: string[]
    isM1Optimized: boolean
    platform: string
    serviceStatus: { ollama: boolean; chroma: boolean }
  }>

  // PHASE 2 FIX: Real-time performance metrics
  getPerformanceMetrics: () => Promise<{
    success: boolean
    metrics?: {
      cpu: {
        usage: number
        efficiency: number
        performance: number
        processes: {
          electron: number
          ollama: number
          chroma: number
          total: number
        }
      }
      memory: {
        total: number
        used: number
        free: number
        pressure: number
        swap: number
      }
      thermal: {
        cpu: number
        gpu: number
        battery: number
        powerMode: 'low' | 'balanced' | 'high'
      }
      processes: {
        active: number
        zombies: number
        unrefed: number
      }
      score: number
      timestamp: Date
    }
    recommendations?: string[]
    isM1?: boolean
    monitoring?: boolean
    error?: string
    message?: string
  }>

  // Memory functions
  searchMemory: (query: string, limit?: number) => Promise<{ success: boolean; results?: string[]; error?: string }>
  
  // File system functions
  fsReadFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  fsWriteFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  fsCreateDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>
  fsListDirectory: (dirPath: string) => Promise<{ success: boolean; items?: string[]; error?: string }>
  fsMoveFile: (source: string, destination: string) => Promise<{ success: boolean; error?: string }>
  fsSearchFiles: (path: string, pattern: string) => Promise<{ success: boolean; files?: string[]; error?: string }>
  fsSearchCode: (path: string, pattern: string) => Promise<{ success: boolean; results?: any[]; error?: string }>
  fsExecuteCommand: (command: string, args?: string[], cwd?: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
  fsOpenFileDialog: () => Promise<{ success: boolean; filePath?: string; error?: string }>
  fsSaveFileDialog: (defaultName?: string, content?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  fsGetFileInfo: (filePath: string) => Promise<{ success: boolean; info?: any; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AIAssistantAPI
  }
}
