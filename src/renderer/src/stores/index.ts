// Zustand Stores for Puffin UI
// This file defines initial Zustand stores required for proper application state handling
// Stores included:
// - useAvatarStore
// - useCanvasModeStore
// - useMessageStore
// - useOllamaStore
// - useAnalyticsStore
// - useMemoryStore
// - useModelStore
import { create } from 'zustand'
// AI avatar store
export const useAvatarStore = create((set) => ({
  avatarUrl: undefined as string | undefined,
  setAvatarUrl: (url: string) => set({ avatarUrl: url })
}))
// Canvas mode toggle
export const useCanvasModeStore = create((set) => ({
  canvasMode: false,
  toggleCanvasMode: () => set((state) => ({ canvasMode: !state.canvasMode }))
}))
// Ollama interaction state (e.g., streaming status, error handling)
export const useOllamaStore = create((set) => ({
  respond: async (prompt: string) => {
    // Replace this with real logic
    return 'This is a simulated Ollama response.'
  }
}))
// Chat message thread store
export const useMessageStore = create((set, get) => ({
  messages: [] as any[],
  sendMessage: (msg: any) => set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] })
}))
// Optional analytics signal store (stub)
export const useAnalyticsStore = create(() => ({
  fireEvent: (event: string, payload?: any) => {
    console.log(`[analytics] ${event}`, payload)
  }
}))
// Memory status and health
export const useMemoryStore = create((set) => ({
  memoryHealth: 'unknown' as 'good' | 'warning' | 'full' | 'unknown',
  lastReset: null as number | null,
  setHealth: (health: 'good' | 'warning' | 'full' | 'unknown') => set({ memoryHealth: health }),
  resetMemory: () => {
    // Call service logic here if desired
    set({ memoryHealth: 'good', lastReset: Date.now() })
  }
}))
// Model selection and availability
export const useModelStore = create((set) => ({
  availableModels: [] as string[],
  activeModel: 'puffin-ai',
  setActiveModel: (name: string) => set({ activeModel: name }),
  refreshModels: async () => {
    try {
      // Replace with actual model listing service call
      const models = await Promise.resolve(['puffin-ai', 'llama3', 'gpt-4'])
      set({ availableModels: models })
    } catch (err) {
      console.error('Failed to load models', err)
    }
  }
}))
