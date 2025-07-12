import { useState, useEffect, useCallback, useRef } from 'react'
import type { MemoryStore, MemorySummary } from '../../../types/chat'
import type { AppSettings } from '../../../types/settings'

// ===============================
// Service Status Types
// ===============================

interface ServiceStatus {
  connected: boolean
  message: string
  starting?: boolean
  models?: string[]
}

interface ChatResponse {
  success: boolean
  message: string
  modelUsed?: string
  routing?: string
}

// ===============================
// Ollama Service Hook
// ===============================

export const useOllamaService = () => {
  const [status, setStatus] = useState<ServiceStatus>({
    connected: false,
    message: 'Checking connection...',
    starting: false
  })
  const [models, setModels] = useState<string[]>([])

  const checkStatus = useCallback(async () => {
    try {
      const response = await window.api.checkOllamaStatus()
      setStatus({
        connected: response.connected,
        message: response.message,
        starting: false
      })
      if (response.models) {
        setModels(response.models)
      }
    } catch {
      setStatus({
        connected: false,
        message: 'Failed to check Ollama status',
        starting: false
      })
    }
  }, [])

  const startService = useCallback(async () => {
    setStatus((prev) => ({ ...prev, starting: true }))
    try {
      const response = await window.api.startOllama()
      await checkStatus()
      return response
    } catch (error) {
      setStatus((prev) => ({ ...prev, starting: false }))
      throw error
    }
  }, [checkStatus])

  const getModels = useCallback(async () => {
    try {
      const response = await window.api.getOllamaModels()
      if (response.success) {
        setModels(response.models)
      }
      return response
    } catch (error) {
      console.error('Failed to get models:', error)
      return { success: false, models: [] }
    }
  }, [])

  const pullModel = useCallback(
    async (modelName: string) => {
      try {
        const response = await window.api.pullModel(modelName)
        if (response) await getModels()
        return response
      } catch (error) {
        console.error('Failed to pull model:', error)
        return false
      }
    },
    [getModels]
  )

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [checkStatus])

  return {
    status,
    models,
    checkStatus,
    startService,
    getModels,
    pullModel
  }
}

// ===============================
// ChromaDB Service Hook
// ===============================

export const useChromaService = () => {
  const [status, setStatus] = useState<ServiceStatus>({
    connected: false,
    message: 'Checking connection...',
    starting: false
  })

  const checkStatus = useCallback(async () => {
    try {
      const response = await window.api.checkChromaStatus()
      setStatus({
        connected: response.connected,
        message: response.message,
        starting: false
      })
    } catch {
      setStatus({
        connected: false,
        message: 'Failed to check ChromaDB status',
        starting: false
      })
    }
  }, [])

  const startService = useCallback(async () => {
    setStatus((prev) => ({ ...prev, starting: true }))
    try {
      const response = await window.api.startChroma()
      await checkStatus()
      return response
    } catch (error) {
      setStatus((prev) => ({ ...prev, starting: false }))
      throw error
    }
  }, [checkStatus])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [checkStatus])

  return {
    status,
    checkStatus,
    startService
  }
}

// ===============================
// Chat Service Hook
// ===============================

export const useChatService = () => {
  const [isThinking, setIsThinking] = useState(false)

  const sendMessage = useCallback(
    async (
      message: string,
      model: string,
      history: any[] = [],
      options?: any
    ): Promise<ChatResponse> => {
      setIsThinking(true)
      try {
        const response = await window.api.chatWithAI({
          message,
          model,
          history,
          memoryOptions: options
        })
        return {
          success: response.success,
          message: response.message || '', // Use response.message, not response.response
          modelUsed: response.modelUsed
        }
      } catch (error) {
        console.error('Chat error:', error)
        return { success: false, message: 'Sorry, I encountered an error processing your request.' }
      } finally {
        setIsThinking(false)
      }
    },
    []
  )

  const searchContext = useCallback(async (query: string) => {
    try {
      return await window.api.searchMemory(query)
    } catch (error) {
      console.error('Search context error:', error)
      return { success: false, results: [] }
    }
  }, [])

  return {
    isThinking,
    sendMessage,
    searchContext
  }
}

// ===============================
// Streaming Chat Service Hook
// ===============================

export const useStreamingChatService = () => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null)
  const streamingTextRef = useRef('')

  const startStreamingChat = useCallback(
    async (
      message: string,
      model: string,
      onChunk?: (chunk: string) => void,
      onComplete?: (fullText: string) => void,
      onError?: (error: string) => void
    ) => {
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).slice(2)}`
      setCurrentStreamId(streamId)
      setIsStreaming(true)
      setStreamingText('')
      streamingTextRef.current = ''

      let removeChunkListener: () => void
      let removeCompleteListener: () => void
      let removeErrorListener: () => void

      try {
        removeChunkListener = window.api.onChatStreamChunk((data) => {
          if (data.id !== streamId) return
          setStreamingText((prev) => {
            const next = prev + data.chunk
            streamingTextRef.current = next
            return next
          })
          onChunk?.(data.chunk)
        })

        removeCompleteListener = window.api.onChatStreamComplete((data) => {
          if (data.id !== streamId) return
          setIsStreaming(false)
          setCurrentStreamId(null)
          onComplete?.(data.fullText || streamingTextRef.current)
          removeChunkListener?.()
          removeCompleteListener?.()
          removeErrorListener?.()
        })

        removeErrorListener = window.api.onChatStreamError((data) => {
          if (data.id !== streamId) return
          setIsStreaming(false)
          setCurrentStreamId(null)
          onError?.(data.error)
          removeChunkListener?.()
          removeCompleteListener?.()
          removeErrorListener?.()
        })

        const response = await window.api.startChatStream({ message, model, streamId })
        if (!response.success) throw new Error(response.error || 'Failed to start streaming')
        return response
      } catch (error: any) {
        setIsStreaming(false)
        setCurrentStreamId(null)
        onError?.(error.message)
        throw error
      }
    },
    []
  )

  const stopStreaming = useCallback(async () => {
    if (!currentStreamId) return
    try {
      await window.api.stopChatStream(currentStreamId)
    } catch (error) {
      console.error('Error stopping stream:', error)
    } finally {
      setIsStreaming(false)
      setCurrentStreamId(null)
      setStreamingText('')
    }
  }, [currentStreamId])

  return {
    isStreaming,
    streamingText,
    startStreamingChat,
    stopStreaming
  }
}

// ===============================
// Memory Service Hook
// ===============================

export const useMemoryService = () => {
  const [memoryStore, setMemoryStore] = useState<MemoryStore | null>(null)
  const [loading, setLoading] = useState(false)

  const loadMemoryStore = useCallback(async () => {
    setLoading(true)
    try {
      const store = await window.api.getMemoryStore()
      setMemoryStore(store)
      return store
    } catch (error) {
      console.error('Failed to load memory store:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const addSummary = useCallback(
    async (summary: MemorySummary) => {
      try {
        await window.api.addMemorySummary(summary)
        await loadMemoryStore()
        return true
      } catch (error) {
        console.error('Failed to add memory summary:', error)
        return false
      }
    },
    [loadMemoryStore]
  )

  const searchMemory = useCallback(async (query: string, limit?: number) => {
    try {
      return await window.api.searchMemory(query, limit)
    } catch (error) {
      console.error('Failed to search memory:', error)
      return { success: false, results: [] }
    }
  }, [])

  const createMemorySummary = useCallback(async (messages: any[]) => {
    try {
      return await window.api.createMemorySummary(messages)
    } catch (error) {
      console.error('Failed to create memory summary:', error)
      return { success: false, error: error.message }
    }
  }, [])

  const enrichWithMemory = useCallback(async (prompt: string, options?: any) => {
    try {
      return await window.api.enrichWithMemory({ prompt, options })
    } catch (error) {
      console.error('Failed to enrich with memory:', error)
      return { success: false, error: error.message }
    }
  }, [])

  const clearMemory = useCallback(async () => {
    try {
      await window.api.clearMemory()
      await loadMemoryStore()
      return true
    } catch (error) {
      console.error('Failed to clear memory:', error)
      return false
    }
  }, [loadMemoryStore])

  const updateSettings = useCallback(
    async (enabled: boolean, retentionDays?: number) => {
      try {
        await window.api.updateMemorySettings(enabled, retentionDays)
        await loadMemoryStore()
        return true
      } catch (error) {
        console.error('Failed to update memory settings:', error)
        return false
      }
    },
    [loadMemoryStore]
  )

  useEffect(() => {
    loadMemoryStore()
  }, [loadMemoryStore])

  return {
    memoryStore,
    loading,
    loadMemoryStore,
    addSummary,
    searchMemory,
    createMemorySummary,
    enrichWithMemory,
    clearMemory,
    updateSettings
  }
}

// ===============================
// Settings Service Hook
// ===============================

export const useSettingsService = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const appSettings = await window.api.getSettings()
      setSettings(appSettings)
      return appSettings
    } catch (error) {
      console.error('Failed to load settings:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    setLoading(true)
    try {
      await window.api.saveSettings(newSettings)
      setSettings(newSettings)
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    settings,
    loading,
    loadSettings,
    saveSettings
  }
}

// ===============================
// Combined Services Hook
// ===============================

export const useAllServices = () => {
  const ollama = useOllamaService()
  const chroma = useChromaService()
  const chat = useChatService()
  const memory = useMemoryService()
  const settings = useSettingsService()

  const allServicesConnected = ollama.status.connected && chroma.status.connected

  return {
    ollama,
    chroma,
    chat,
    memory,
    settings,
    allServicesConnected
  }
}
