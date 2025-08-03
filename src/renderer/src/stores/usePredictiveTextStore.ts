// src/renderer/src/stores/usePredictiveTextStore.ts
import { create } from 'zustand'
import { predictiveService } from '@/services/predictiveService'

interface PredictiveTextStore {
  suggestions: string[]
  isLoading: boolean
  cache: Map<string, string[]>
  
  // Actions
  fetchSuggestions: (input: string) => Promise<void>
  applySuggestion: (suggestion: string, setInput: (value: string) => void, currentInput: string) => void
  clearSuggestions: () => void
}

// Debounce helper
let debounceTimer: NodeJS.Timeout | null = null

// Simple cache key generator - uses first 3 words as key
const getCacheKey = (input: string): string => {
  return input.toLowerCase().split(' ').slice(0, 3).join(' ')
}

export const usePredictiveTextStore = create<PredictiveTextStore>((set, get) => ({
  suggestions: [],
  isLoading: false,
  cache: new Map(),

  fetchSuggestions: async (input: string) => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Clear suggestions if input is empty or too short
    if (!input.trim() || input.trim().length < 2) {
      set({ suggestions: [], isLoading: false })
      return
    }

    // Check cache first
    const cacheKey = getCacheKey(input)
    const cached = get().cache.get(cacheKey)
    if (cached && cached.length > 0) {
      set({ suggestions: cached, isLoading: false })
      return
    }

    // Set loading state
    set({ isLoading: true })

    // Debounce with 300ms delay
    debounceTimer = setTimeout(async () => {
      try {
        const suggestions = await predictiveService.getSuggestions(input)
        
        // Update cache
        const newCache = new Map(get().cache)
        newCache.set(cacheKey, suggestions)
        
        // Limit cache size to prevent memory leaks
        if (newCache.size > 50) {
          const firstKey = newCache.keys().next().value
          newCache.delete(firstKey)
        }
        
        set({ 
          suggestions, 
          isLoading: false,
          cache: newCache
        })
      } catch (error) {
        console.error('Failed to fetch predictive suggestions:', error)
        set({ suggestions: [], isLoading: false })
      }
    }, 300)
  },

  applySuggestion: (suggestion: string, setInput: (value: string) => void, currentInput: string) => {
    // Add suggestion to the end of current input with a space
    const newInput = currentInput.trim() + (currentInput.trim() ? ' ' : '') + suggestion
    setInput(newInput)
    
    // Clear suggestions after applying
    set({ suggestions: [] })
  },

  clearSuggestions: () => {
    set({ suggestions: [], isLoading: false })
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  }
}))
