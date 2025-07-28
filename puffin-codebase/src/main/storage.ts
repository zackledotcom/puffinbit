import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { AppSettings } from '../types/settings'
import type { Message, MemoryStore, MemorySummary } from '../types/chat'

const STORAGE_VERSION = '1.0.0'
const MEMORY_VERSION = '1.0.0'
const SETTINGS_FILE = 'settings.json'
const CHAT_HISTORY_FILE = 'chat-history.json'
const MEMORY_FILE = 'memory.json'

// Memory retention settings
const DEFAULT_RETENTION_DAYS = 30
const DEFAULT_AUTO_SUMMARIZE_THRESHOLD = 20

// Get secure user data directory
function getUserDataPath(): string {
  return app.getPath('userData')
}

function getSettingsPath(): string {
  return join(getUserDataPath(), SETTINGS_FILE)
}

function getChatHistoryPath(): string {
  return join(getUserDataPath(), CHAT_HISTORY_FILE)
}

function getMemoryPath(): string {
  return join(getUserDataPath(), MEMORY_FILE)
}

// Ensure storage directory exists
async function ensureStorageDirectory(): Promise<void> {
  const userDataPath = getUserDataPath()
  if (!existsSync(userDataPath)) {
    await mkdir(userDataPath, { recursive: true })
  }
}

// Default settings with versioned schema
function getDefaultSettings(): AppSettings {
  return {
    version: '1',
    theme: 'dark',
    selectedModel: 'tinydolphin:latest',
    chromaUrl: 'http://127.0.0.1:8000',
    ollamaUrl: 'http://127.0.0.1:11434',
    memory: {
      enabled: true,
      retentionDays: DEFAULT_RETENTION_DAYS,
      maxSummaries: 50,
      compressionLevel: 1
    },
    memorySettings: {
      enabled: true,
      retentionDays: DEFAULT_RETENTION_DAYS,
      maxSummaries: 50,
      compressionLevel: 1
    },
    telemetry: {
      enabled: false,
      collectUsage: true,
      collectErrors: true,
      collectPerformance: false,
      anonymizeData: true
    },
    telemetryEnabled: false,
    debugMode: false,
    autoSave: true
  }
}

// Default chat history structure
function getDefaultChatHistory(): { version: string; messages: Message[] } {
  return {
    version: '1',
    messages: []
  }
}

// Default memory store
function getDefaultMemoryStore(): MemoryStore {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000)

  return {
    version: '1',
    memoryVersion: MEMORY_VERSION,
    expiresAt: expiresAt.toISOString(),
    summaries: [],
    settings: {
      enabled: true,
      retentionDays: DEFAULT_RETENTION_DAYS,
      maxSummaries: 50,
      compressionLevel: 1
    },
    enabled: true,
    maxSummaries: 50
  }
}

// Validation functions
// Validation functions - handle legacy settings gracefully
function isValidSettings(data: any): data is AppSettings {
  const hasBasicFields =
    typeof data === 'object' &&
    data !== null &&
    typeof data.version === 'string' &&
    typeof data.theme === 'string' &&
    (data.theme === 'light' || data.theme === 'dark') &&
    typeof data.modelName === 'string' &&
    typeof data.chromaEndpoint === 'string' &&
    typeof data.ollamaPromptPreset === 'string'

  // Handle legacy settings without memory field
  if (hasBasicFields && !data.memory) {
    return true // Will be upgraded below
  }

  const hasValidMemory =
    typeof data.memory === 'object' &&
    data.memory !== null &&
    typeof data.memory.enabled === 'boolean' &&
    typeof data.memory.retentionDays === 'number' &&
    typeof data.memory.autoSummarizeThreshold === 'number' &&
    typeof data.memory.showInAdvancedPanel === 'boolean'

  // Validate telemetry settings if present
  const hasValidTelemetry =
    !data.telemetry ||
    (typeof data.telemetry === 'object' &&
      data.telemetry !== null &&
      typeof data.telemetry.enabled === 'boolean' &&
      typeof data.telemetry.collectUsageStats === 'boolean' &&
      typeof data.telemetry.collectErrorReports === 'boolean' &&
      typeof data.telemetry.collectFeatureUsage === 'boolean')

  return hasBasicFields && hasValidMemory && hasValidTelemetry
}

function isValidMessage(data: any): data is Message {
  const hasRequiredFields =
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.role === 'string' &&
    ['user', 'assistant', 'system', 'error'].includes(data.role) &&
    typeof data.content === 'string' &&
    typeof data.timestamp === 'string' &&
    !isNaN(Date.parse(data.timestamp))

  // Optional fields validation
  if (hasRequiredFields) {
    if (data.reasoning !== undefined && typeof data.reasoning !== 'string') return false
    if (
      data.confidence !== undefined &&
      (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 100)
    )
      return false
    if (
      data.clarifications !== undefined &&
      (!Array.isArray(data.clarifications) ||
        !data.clarifications.every((c: any) => typeof c === 'string'))
    )
      return false
  }

  return hasRequiredFields
}

function isValidChatHistory(data: any): data is { version: string; messages: Message[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.version === 'string' &&
    Array.isArray(data.messages) &&
    data.messages.every(isValidMessage)
  )
}

function isValidMemorySummary(data: any): data is MemorySummary {
  const hasRequiredFields =
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.summary === 'string' &&
    Array.isArray(data.topics) &&
    data.topics.every((t: any) => typeof t === 'string') &&
    Array.isArray(data.keyFacts) &&
    data.keyFacts.every((f: any) => typeof f === 'string') &&
    typeof data.createdAt === 'string' &&
    !isNaN(Date.parse(data.createdAt)) &&
    typeof data.messageCount === 'number'

  // Optional fields validation
  if (hasRequiredFields) {
    if (data.reasoningTrace !== undefined && typeof data.reasoningTrace !== 'string') return false
    if (
      data.confidence !== undefined &&
      (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 100)
    )
      return false
  }

  return hasRequiredFields
}

function isValidMemoryStore(data: any): data is MemoryStore {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.version === 'string' &&
    typeof data.memoryVersion === 'string' &&
    typeof data.expiresAt === 'string' &&
    !isNaN(Date.parse(data.expiresAt)) &&
    Array.isArray(data.summaries) &&
    data.summaries.every(isValidMemorySummary) &&
    typeof data.enabled === 'boolean' &&
    typeof data.maxSummaries === 'number'
  )
}

// Existing functions (loadSettings, saveSettings, loadChatHistory, appendChatMessage)
export async function loadSettings(): Promise<AppSettings> {
  try {
    await ensureStorageDirectory()
    const settingsPath = getSettingsPath()

    if (!existsSync(settingsPath)) {
      console.log('Settings file not found, creating default settings')
      const defaultSettings = getDefaultSettings()
      await saveSettings(defaultSettings)
      return defaultSettings
    }

    const fileContent = await readFile(settingsPath, 'utf-8')
    const parsedData = JSON.parse(fileContent)

    if (!isValidSettings(parsedData)) {
      console.warn('Invalid or legacy settings format detected, upgrading to current schema')

      // Upgrade legacy settings by merging with defaults
      const defaultSettings = getDefaultSettings()
      const upgradedSettings = {
        ...defaultSettings,
        ...parsedData,
        memory: parsedData.memory || defaultSettings.memory
      }

      await saveSettings(upgradedSettings)
      return upgradedSettings
    }

    // Ensure memory field exists for legacy compatibility
    if (!parsedData.memory) {
      const defaultSettings = getDefaultSettings()
      parsedData.memory = defaultSettings.memory
      await saveSettings(parsedData)
    }

    // Ensure telemetry field exists for legacy compatibility
    if (!parsedData.telemetry) {
      const defaultSettings = getDefaultSettings()
      parsedData.telemetry = defaultSettings.telemetry
      await saveSettings(parsedData)
    }

    return parsedData
  } catch (error) {
    console.error('Failed to load settings:', error)
    const defaultSettings = getDefaultSettings()
    await saveSettings(defaultSettings)
    return defaultSettings
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    if (!isValidSettings(settings)) {
      throw new Error('Invalid settings schema provided')
    }

    await ensureStorageDirectory()
    const settingsPath = getSettingsPath()

    const settingsWithVersion = {
      ...settings,
      version: STORAGE_VERSION
    }

    await writeFile(settingsPath, JSON.stringify(settingsWithVersion, null, 2), 'utf-8')
    console.log('Settings saved successfully')
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw error
  }
}

export async function loadChatHistory(): Promise<Message[]> {
  try {
    await ensureStorageDirectory()
    const chatHistoryPath = getChatHistoryPath()

    if (!existsSync(chatHistoryPath)) {
      console.log('Chat history file not found, creating empty history')
      const defaultHistory = getDefaultChatHistory()
      await writeFile(chatHistoryPath, JSON.stringify(defaultHistory, null, 2), 'utf-8')
      return []
    }

    const fileContent = await readFile(chatHistoryPath, 'utf-8')
    const parsedData = JSON.parse(fileContent)

    if (!isValidChatHistory(parsedData)) {
      console.warn('Invalid chat history format detected, resetting to empty')
      const defaultHistory = getDefaultChatHistory()
      await writeFile(chatHistoryPath, JSON.stringify(defaultHistory, null, 2), 'utf-8')
      return []
    }

    return parsedData.messages.slice(-100)
  } catch (error) {
    console.error('Failed to load chat history:', error)
    return []
  }
}

export async function appendChatMessage(message: Message): Promise<void> {
  try {
    if (!isValidMessage(message)) {
      throw new Error('Invalid message schema provided')
    }

    const currentMessages = await loadChatHistory()
    const updatedMessages = [...currentMessages, message]
    const trimmedMessages = updatedMessages.slice(-1000)

    const chatHistory = {
      version: STORAGE_VERSION,
      messages: trimmedMessages
    }

    await ensureStorageDirectory()
    const chatHistoryPath = getChatHistoryPath()
    await writeFile(chatHistoryPath, JSON.stringify(chatHistory, null, 2), 'utf-8')

    console.log('Chat message appended successfully')
  } catch (error) {
    console.error('Failed to append chat message:', error)
    throw error
  }
}

// Memory management functions
export async function loadMemoryStore(): Promise<MemoryStore> {
  try {
    await ensureStorageDirectory()
    const memoryPath = getMemoryPath()

    if (!existsSync(memoryPath)) {
      console.log('Memory file not found, creating default memory store')
      const defaultMemory = getDefaultMemoryStore()
      await saveMemoryStore(defaultMemory)
      return defaultMemory
    }

    const fileContent = await readFile(memoryPath, 'utf-8')
    const parsedData = JSON.parse(fileContent)

    if (!isValidMemoryStore(parsedData)) {
      console.warn('Invalid memory format detected, resetting to default')
      const defaultMemory = getDefaultMemoryStore()
      await saveMemoryStore(defaultMemory)
      return defaultMemory
    }

    // Check if memory has expired
    const now = new Date()
    const expiresAt = new Date(parsedData.expiresAt)

    if (now > expiresAt) {
      console.log('Memory has expired, prompting for reinitialization')
      // Mark as expired but don't auto-clear (let user decide)
      parsedData.expired = true
    }

    // Check version compatibility
    if (parsedData.memoryVersion !== MEMORY_VERSION) {
      console.log('Memory version mismatch, may need migration')
      parsedData.needsMigration = true
    }

    return parsedData
  } catch (error) {
    console.error('Failed to load memory store:', error)
    const defaultMemory = getDefaultMemoryStore()
    await saveMemoryStore(defaultMemory)
    return defaultMemory
  }
}

export async function saveMemoryStore(memoryStore: MemoryStore): Promise<void> {
  try {
    if (!isValidMemoryStore(memoryStore)) {
      throw new Error('Invalid memory store schema provided')
    }

    await ensureStorageDirectory()
    const memoryPath = getMemoryPath()

    // Ensure current versions and update timestamp
    const memoryWithVersion = {
      ...memoryStore,
      version: STORAGE_VERSION,
      memoryVersion: MEMORY_VERSION,
      lastUpdated: new Date().toISOString()
    }

    // Trim summaries to max limit
    if (memoryWithVersion.summaries.length > memoryWithVersion.maxSummaries) {
      memoryWithVersion.summaries = memoryWithVersion.summaries.slice(
        -memoryWithVersion.maxSummaries
      )
    }

    await writeFile(memoryPath, JSON.stringify(memoryWithVersion, null, 2), 'utf-8')
    console.log('Memory store saved successfully')
  } catch (error) {
    console.error('Failed to save memory store:', error)
    throw error
  }
}

export async function addMemorySummary(summary: MemorySummary): Promise<void> {
  try {
    const memoryStore = await loadMemoryStore()

    if (!memoryStore.enabled) {
      console.log('Memory is disabled, not adding summary')
      return
    }

    memoryStore.summaries.push(summary)
    await saveMemoryStore(memoryStore)

    console.log('Memory summary added successfully')
  } catch (error) {
    console.error('Failed to add memory summary:', error)
    throw error
  }
}

export async function clearMemoryStore(): Promise<void> {
  try {
    const defaultMemory = getDefaultMemoryStore()
    await saveMemoryStore(defaultMemory)
    console.log('Memory store cleared successfully')
  } catch (error) {
    console.error('Failed to clear memory store:', error)
    throw error
  }
}

export async function updateMemorySettings(
  enabled: boolean,
  retentionDays?: number
): Promise<void> {
  try {
    const memoryStore = await loadMemoryStore()
    memoryStore.enabled = enabled

    if (retentionDays) {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)
      memoryStore.expiresAt = expiresAt.toISOString()
    }

    await saveMemoryStore(memoryStore)
    console.log('Memory settings updated successfully')
  } catch (error) {
    console.error('Failed to update memory settings:', error)
    throw error
  }
}

export async function getMemorySummaries(): Promise<MemorySummary[]> {
  try {
    const memoryStore = await loadMemoryStore()
    return memoryStore.summaries
  } catch (error) {
    console.error('Failed to get memory summaries:', error)
    return []
  }
}
