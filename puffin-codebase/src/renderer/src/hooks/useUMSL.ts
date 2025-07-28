/**
 * UMSL React Hooks
 * Frontend integration for Unified Memory & Storage Layer
 * Phase 1 Agent Platform UI components
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Type definitions for UMSL operations
interface MemoryItem {
  id: string
  type: 'conversation' | 'document' | 'code' | 'task' | 'agent_state'
  content: string
  metadata: Record<string, any>
  timestamp: string
  tags: string[]
  similarity?: number
}

interface SemanticContext {
  primary: MemoryItem[]
  related: MemoryItem[]
  conversations: ConversationContext[]
  entities: string[]
  summary: string
  confidence: number
  retrievalTime: number
}

interface ConversationContext {
  id: string
  threadId: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
    metadata?: Record<string, any>
  }>
  summary?: string
  entities: string[]
  topics: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
  lastUpdated: string
}

interface ModelStats {
  modelId: string
  requestCount: number
  totalTokens: number
  averageResponseTime: number
  memoryUsage: number
  cpuUsage: number
  lastUsed: string
  errorCount: number
  successRate: number
}

interface ResourceUsage {
  memoryUsed: number
  modelsLoaded: number
  queueStatus: { waiting: number; processing: number }
  quota: {
    maxMemory: number
    maxModels: number
    maxConcurrentRequests: number
    memoryThreshold: number
    unloadTimeout: number
    priorityPreemption: boolean
  }
}

/**
 * Hook for semantic memory operations
 */
export function useSemanticMemory() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const storeMemory = useCallback(async (
    content: string, 
    type: MemoryItem['type'], 
    metadata: Record<string, any> = {}
  ): Promise<string | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslStoreMemory(content, type, metadata)
      if (!result.success) throw new Error(result.error)
      return result.memoryId
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const retrieveContext = useCallback(async (
    query: string, 
    options: Record<string, any> = {}
  ): Promise<SemanticContext | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslRetrieveContext(query, options)
      if (!result.success) throw new Error(result.error)
      return result.context
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const advancedSearch = useCallback(async (
    query: string, 
    filters: Record<string, any> = {}
  ): Promise<MemoryItem[]> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslAdvancedSearch(query, filters)
      if (!result.success) throw new Error(result.error)
      return result.results
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    storeMemory,
    retrieveContext,
    advancedSearch,
    isLoading,
    error
  }
}

/**
 * Hook for conversation thread management
 */
export function useConversationThread() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [thread, setThread] = useState<ConversationContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createThread = useCallback(async (
    message: string, 
    metadata: Record<string, any> = {}
  ): Promise<string | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslCreateThread(message, metadata)
      if (!result.success) throw new Error(result.error)
      
      setActiveThreadId(result.threadId)
      await loadThread(result.threadId)
      return result.threadId
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addToThread = useCallback(async (
    threadId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslAddToThread(threadId, role, content, metadata)
      if (!result.success) throw new Error(result.error)
      
      // Reload thread if it's the active one
      if (threadId === activeThreadId) {
        await loadThread(threadId)
      }
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [activeThreadId])

  const loadThread = useCallback(async (threadId: string): Promise<ConversationContext | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslGetThread(threadId)
      if (!result.success) throw new Error(result.error)
      
      setThread(result.thread)
      setActiveThreadId(threadId)
      return result.thread
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const switchThread = useCallback(async (threadId: string) => {
    await loadThread(threadId)
  }, [loadThread])

  return {
    activeThreadId,
    thread,
    createThread,
    addToThread,
    loadThread,
    switchThread,
    isLoading,
    error
  }
}

/**
 * Hook for model management operations
 */
export function useModelManager() {
  const [models, setModels] = useState<ModelStats[]>([])
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registerModel = useCallback(async (config: any): Promise<string | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslRegisterModel(config)
      if (!result.success) throw new Error(result.error)
      return result.modelId
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadModel = useCallback(async (
    modelId: string, 
    options: Record<string, any> = {}
  ): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslLoadModel(modelId, options)
      if (!result.success) throw new Error(result.error)
      
      // Refresh stats after loading
      await refreshStats()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unloadModel = useCallback(async (modelId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslUnloadModel(modelId)
      if (!result.success) throw new Error(result.error)
      
      // Refresh stats after unloading
      await refreshStats()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const executeModel = useCallback(async (
    modelId: string,
    prompt: string,
    options: Record<string, any> = {}
  ): Promise<any> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslExecuteModel(modelId, prompt, options)
      if (!result.success) throw new Error(result.error)
      
      // Refresh stats after execution
      await refreshStats()
      return result.result
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const prefetchModels = useCallback(async (modelIds: string[]): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslPrefetchModels(modelIds)
      if (!result.success) throw new Error(result.error)
      
      await refreshStats()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateResourceQuota = useCallback(async (quota: Partial<ResourceUsage['quota']>): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslUpdateResourceQuota(quota)
      if (!result.success) throw new Error(result.error)
      
      await refreshStats()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const [statsResult, usageResult] = await Promise.all([
        window.api.umslGetModelStats(),
        window.api.umslGetResourceUsage()
      ])
      
      if (statsResult.success) {
        setModels(Array.isArray(statsResult.stats) ? statsResult.stats : [statsResult.stats])
      }
      
      if (usageResult.success) {
        setResourceUsage(usageResult.usage)
      }
    } catch (err: any) {
      console.error('Failed to refresh model stats:', err)
    }
  }, [])

  // Auto-refresh stats periodically
  useEffect(() => {
    refreshStats()
    const interval = setInterval(refreshStats, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [refreshStats])

  return {
    models,
    resourceUsage,
    registerModel,
    loadModel,
    unloadModel,
    executeModel,
    prefetchModels,
    updateResourceQuota,
    refreshStats,
    isLoading,
    error
  }
}

/**
 * Hook for memory statistics and health monitoring
 */
export function useMemoryStats() {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.umslGetMemoryStats()
      if (!result.success) throw new Error(result.error)
      setStats(result.stats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-refresh stats
  useEffect(() => {
    refreshStats()
    const interval = setInterval(refreshStats, 30000)
    return () => clearInterval(interval)
  }, [refreshStats])

  return {
    stats,
    refreshStats,
    isLoading,
    error
  }
}

/**
 * Combined hook for all UMSL functionality
 */
export function useUMSL() {
  const memory = useSemanticMemory()
  const conversation = useConversationThread()
  const modelManager = useModelManager()
  const memoryStats = useMemoryStats()

  return {
    memory,
    conversation,
    modelManager,
    memoryStats,
    
    // Global loading state
    isLoading: memory.isLoading || conversation.isLoading || modelManager.isLoading || memoryStats.isLoading,
    
    // Combined error state
    error: memory.error || conversation.error || modelManager.error || memoryStats.error
  }
}
