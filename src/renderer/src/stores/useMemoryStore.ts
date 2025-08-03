// src/renderer/src/stores/useMemoryStore.ts
import { create } from 'zustand'

interface MemoryStore {
  memoryHealth: 'good' | 'warning' | 'full' | 'unknown'
  memoryEnabled: boolean
  lastReset: number | null
  memoryStats: {
    totalItems: number
    totalSize: number
    lastAccess: Date | null
  }
  
  // Actions
  setMemoryEnabled: (enabled: boolean) => void
  setMemoryHealth: (health: 'good' | 'warning' | 'full' | 'unknown') => void
  resetMemory: () => Promise<void>
  refreshMemoryStats: () => Promise<void>
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  memoryHealth: 'unknown',
  memoryEnabled: true,
  lastReset: null,
  memoryStats: {
    totalItems: 0,
    totalSize: 0,
    lastAccess: null
  },

  setMemoryEnabled: (enabled: boolean) => {
    set({ memoryEnabled: enabled })
    // Save to backend
    window.api?.setMemoryEnabled?.(enabled)
  },

  setMemoryHealth: (health: 'good' | 'warning' | 'full' | 'unknown') => {
    set({ memoryHealth: health })
  },

  resetMemory: async () => {
    try {
      const response = await window.api?.resetMemory?.()
      
      if (response?.success) {
        set({ 
          memoryHealth: 'good',
          lastReset: Date.now(),
          memoryStats: {
            totalItems: 0,
            totalSize: 0,
            lastAccess: new Date()
          }
        })
      }
    } catch (error) {
      console.error('Failed to reset memory:', error)
    }
  },

  refreshMemoryStats: async () => {
    try {
      const response = await window.api?.getMemoryStats?.()
      
      if (response?.success) {
        set({
          memoryStats: {
            totalItems: response.stats.totalItems || 0,
            totalSize: response.stats.totalSize || 0,
            lastAccess: response.stats.lastAccess ? new Date(response.stats.lastAccess) : null
          },
          memoryHealth: response.stats.health || 'unknown'
        })
      }
    } catch (error) {
      console.error('Failed to refresh memory stats:', error)
    }
  }
}))