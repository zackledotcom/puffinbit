// Settings-related type definitions
export interface AppSettings {
  selectedModel: string
  theme: 'light' | 'dark' | 'system'
  ollamaUrl: string
  chromaUrl: string
  memory: MemorySettings
  telemetry: TelemetrySettings
  memorySettings: MemorySettings
  telemetryEnabled: boolean
  debugMode: boolean
  autoSave: boolean
  version: string
}

export interface TelemetrySettings {
  enabled: boolean
  collectUsage: boolean
  collectErrors: boolean
  collectPerformance: boolean
  anonymizeData: boolean
}

export interface ModelSettings {
  temperature: number
  maxTokens: number
  topP: number
  topK: number
  repeatPenalty: number
  contextLength: number
}

export interface MemorySettings {
  enabled: boolean
  retentionDays: number
  maxSummaries: number
  compressionLevel: number
}

export interface ServiceSettings {
  ollama: {
    url: string
    timeout: number
    models: string[]
  }
  chroma: {
    url: string
    timeout: number
    collection: string
  }
}

export interface SystemMetrics {
  cpu: {
    usage: number
    temperature: number
    cores: number
    frequency: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  gpu: {
    usage: number
    memory: number
    temperature: number
    available: boolean
  }
  network: {
    rx: number
    tx: number
  }
  uptime: string
}
