// src/renderer/src/stores/useModelStore.ts
import { create } from 'zustand'

interface ModelStore {
  activeModel: string
  availableModels: string[]
  isOnline: boolean
  modelStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  error: string | null
  
  // Actions
  setActiveModel: (model: string) => void
  refreshModels: () => Promise<void>
  checkConnection: () => Promise<void>
  setOnlineStatus: (status: boolean) => void
}

export const useModelStore = create<ModelStore>((set, get) => ({
  activeModel: 'llama3.2:latest',
  availableModels: [],
  isOnline: false,
  modelStatus: 'disconnected',
  error: null,

  setActiveModel: (model: string) => {
    set({ activeModel: model })
    // Optionally save to backend
    window.api?.setActiveModel?.(model)
  },

  refreshModels: async () => {
    try {
      set({ modelStatus: 'connecting' })
      
      const response = await window.api?.getOllamaModels?.()
      
      if (response?.success) {
        set({ 
          availableModels: response.models || [],
          modelStatus: 'connected',
          isOnline: true,
          error: null
        })
      } else {
        throw new Error(response?.error || 'Failed to fetch models')
      }
    } catch (error: any) {
      console.error('Failed to refresh models:', error)
      set({ 
        modelStatus: 'error',
        error: error.message,
        isOnline: false
      })
    }
  },

  checkConnection: async () => {
    try {
      const ollamaStatus = await window.api?.checkOllamaStatus?.()
      const isConnected = ollamaStatus?.success || false
      
      set({ 
        isOnline: isConnected,
        modelStatus: isConnected ? 'connected' : 'disconnected'
      })
      
      if (isConnected && get().availableModels.length === 0) {
        get().refreshModels()
      }
    } catch (error: any) {
      set({ 
        isOnline: false,
        modelStatus: 'error',
        error: error.message
      })
    }
  },

  setOnlineStatus: (status: boolean) => {
    set({ isOnline: status })
  }
}))