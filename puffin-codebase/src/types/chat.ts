// Chat-related type definitions
export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  streaming?: boolean
  responseTime?: number
  canvasPosition?: { x: number; y: number }
  isPinned?: boolean
  isHighlighted?: boolean
  attachments?: MessageAttachment[]
}

export interface MessageAttachment {
  type: 'file' | 'image' | 'text'
  name: string
  content?: string
  url?: string
  size?: number
}

export interface ChatSession {
  id: string
  title: string
  timestamp: Date
  messageCount: number
  lastMessage?: string
}

export interface ChatHistory {
  id: string
  messages: Message[]
  created_at: Date
  updated_at: Date
  title?: string
}

export interface MemorySummary {
  id: string
  content: string
  summary?: string
  timestamp: Date
  importance: number
  topics: string[]
  keyFacts?: string[]
  metadata?: Record<string, any>
}

export interface MemoryStore {
  summaries: MemorySummary[]
  settings: MemorySettings
  version: string
  expiresAt: string
  expired?: boolean
  memoryVersion: string
  needsMigration?: boolean
  enabled?: boolean
  maxSummaries?: number
}

export interface MemorySettings {
  enabled: boolean
  retentionDays: number
  maxSummaries: number
  compressionLevel: number
}
