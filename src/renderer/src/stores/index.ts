// Zustand Stores for Puffin UI
// Updated with proper TypeScript integration and IPC communication

// Export the new properly typed stores
export { useMessageStore, initializeStores } from './useMessageStore'
export { useModelStore } from './useModelStore'
export { useMemoryStore } from './useMemoryStore'
export { useCanvasModeStore } from './useCanvasModeStore'
export { usePredictiveTextStore } from './usePredictiveTextStore'

// Legacy stores - keeping for compatibility
import { create } from 'zustand'

// AI avatar store
export const useAvatarStore = create((set) => ({
  avatarUrl: undefined as string | undefined,
  setAvatarUrl: (url: string) => set({ avatarUrl: url })
}))

// Optional analytics signal store (stub)
export const useAnalyticsStore = create(() => ({
  fireEvent: (event: string, payload?: any) => {
    console.log(`[analytics] ${event}`, payload)
  }
}))

// Legacy Ollama store - deprecated, use useModelStore instead
export const useOllamaStore = create((set) => ({
  respond: async (prompt: string) => {
    console.warn('useOllamaStore is deprecated, use useMessageStore.sendMessage instead')
    return 'Please use the new message store for chat functionality.'
  }
}))