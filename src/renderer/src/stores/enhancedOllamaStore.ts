import { create } from 'zustand'
import { useGoogleMonitoringStore } from './googleMonitoringStore'

interface EnhancedOllamaState {
  // Existing state
  currentModel: string
  availableModels: string[]
  isLoading: boolean
  lastError: string | null
  
  // Google-style metrics
  connectionStatus: 'connected' | 'disconnected' | 'degraded'
  lastLatency: number
  requestCount: number
  errorCount: number
  
  // Actions
  setCurrentModel: (model: string) => void
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'degraded') => void
  
  // Enhanced respond with monitoring
  respond: (prompt: string) => Promise<string>
  
  // Health monitoring
  checkHealth: () => Promise<void>
}

export const useEnhancedOllamaStore = create<EnhancedOllamaState>((set, get) => ({
  // State
  currentModel: 'tinydolphin:latest',
  availableModels: [],
  isLoading: false,
  lastError: null,
  connectionStatus: 'disconnected',
  lastLatency: 0,
  requestCount: 0,
  errorCount: 0,

  // Actions
  setCurrentModel: (model: string) => set({ currentModel: model }),
  
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // Enhanced respond with Google-style monitoring
  respond: async (prompt: string) => {
    const startTime = Date.now()
    const { currentModel } = get()
    
    set({ isLoading: true, lastError: null })
    
    try {
      // Track chat performance in backend
      await window.api.trackChatPerformance({
        model: currentModel,
        messageLength: prompt.length,
        timestamp: new Date().toISOString()
      })

      // Make the actual request (replace with your real Ollama logic)
      const response = await window.api.sendOllamaMessage({
        model: currentModel,
        prompt,
        stream: false
      })

      const latency = Date.now() - startTime
      
      // Update local metrics
      set((state) => ({
        lastLatency: latency,
        requestCount: state.requestCount + 1,
        connectionStatus: 'connected',
        isLoading: false
      }))

      // Record in monitoring store
      useGoogleMonitoringStore.getState().recordChatLatency(latency)

      console.log(`✅ Ollama response completed in ${latency}ms`)
      return response.content || 'No response received'

    } catch (error) {
      const latency = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update error state
      set((state) => ({
        lastError: errorMessage,
        errorCount: state.errorCount + 1,
        connectionStatus: 'degraded',
        isLoading: false,
        lastLatency: latency
      }))

      // Track error in backend
      await window.api.trackChatError({
        model: currentModel,
        error: errorMessage,
        latency
      })

      // Record in monitoring store
      useGoogleMonitoringStore.getState().recordChatError()

      console.error(`❌ Ollama error after ${latency}ms:`, errorMessage)
      throw error
    }
  },

  // Health monitoring
  checkHealth: async () => {
    try {
      const health = await window.api.checkOllamaStatus()
      set({
        connectionStatus: health.connected ? 'connected' : 'disconnected',
        availableModels: health.models || []
      })
    } catch (error) {
      set({ connectionStatus: 'disconnected' })
    }
  }
}))