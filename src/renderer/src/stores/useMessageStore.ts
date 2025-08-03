// src/renderer/src/stores/useMessageStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { runAgent, streamAgent } from '../services/directOllamaService'
import { detectCodeInMessage, shouldSuggestCanvas } from '../utils/codeDetection'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isVerified?: boolean
  title?: string
  isStreaming?: boolean
  model?: string
  memoryContext?: string[]
  metadata?: Record<string, any>
}

interface SendMessageOptions {
  content: string
  model: string
  files?: File[]
  memoryEnabled?: boolean
  options?: {
    temperature?: number
    maxTokens?: number
  }
}

interface MessageStore {
  messages: Message[]
  isLoading: boolean
  streamingMessage: Message | null
  error: string | null
  
  // Actions
  sendMessage: (options: SendMessageOptions) => Promise<void>
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  startStreaming: (message: Partial<Message>) => void
  updateStreamingMessage: (content: string) => void
  finishStreaming: () => void
}

export const useMessageStore = create<MessageStore>()(
  subscribeWithSelector((set, get) => ({
    messages: [],
    isLoading: false,
    streamingMessage: null,
    error: null,

    sendMessage: async (options: SendMessageOptions) => {
      const { content, model, files = [], memoryEnabled = false, options: chatOptions = {} } = options
      
      // Create user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        model,
        memoryContext: memoryEnabled ? [] : undefined
      }

      // Add user message immediately
      get().addMessage(userMessage)
      
      // Canvas Auto-Triggering System
      try {
        // Check if message contains code that should trigger Canvas mode
        if (shouldSuggestCanvas(content)) {
          const codeBlocks = detectCodeInMessage(content)
          if (codeBlocks.length > 0) {
            const bestCode = codeBlocks[0]
            
            // Import Canvas store dynamically to avoid circular deps
            const { useCanvasModeStore } = await import('./useCanvasModeStore')
            const canvasStore = useCanvasModeStore.getState()
            
            // Auto-trigger if confidence is high enough and auto-trigger is enabled
            if (bestCode.confidence >= canvasStore.autoTriggerThreshold && 
                canvasStore.autoTriggerEnabled && 
                !canvasStore.canvasMode) {
              
              console.log(`🎨 Auto-triggering Canvas for ${bestCode.language} code (confidence: ${(bestCode.confidence * 100).toFixed(0)}%)`)
              
              canvasStore.setCanvasMode(true, {
                type: 'auto',
                reason: `Auto-triggered by ${bestCode.language} code detection`,
                chatMessageId: userMessage.id,
                codeSnippet: bestCode.code.substring(0, 100) + '...',
                confidence: bestCode.confidence
              })
              
              // Add helpful AI message about Canvas activation
              setTimeout(() => {
                const canvasHelpMessage: Message = {
                  id: `canvas-help-${Date.now()}`,
                  role: 'assistant',
                  content: `🎨 I detected ${bestCode.language} code in your message and activated Canvas mode! You can now edit the code side-by-side with our conversation. The Canvas will help you iterate on your code while we chat.`,
                  timestamp: new Date(),
                  model: model,
                  metadata: { 
                    canvasTriggered: true, 
                    detectedLanguage: bestCode.language,
                    confidence: bestCode.confidence,
                    triggerType: 'auto'
                  }
                }
                get().addMessage(canvasHelpMessage)
              }, 500)
            }
          }
        }
      } catch (canvasError) {
        console.error('❌ Canvas auto-trigger failed:', canvasError)
        // Don't block message sending if Canvas triggering fails
      }
      
      set({ isLoading: true, error: null })

      try {
        console.log('[MessageStore] Using IPC to main process for Ollama...')
        
        // Start streaming response
        get().startStreaming({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          model,
          isStreaming: true
        })
        
        try {
          // Use IPC to call Ollama through main process
          const response = await window.api?.chatWithAI?.({
            message: content,
            model: 'llama3.2:latest',
            history: [],
            memoryOptions: { enabled: memoryEnabled },
            options: {}
          })

          if (response?.success && response.message) {
            // Simulate streaming by chunking the response
            const words = response.message.split(' ')
            let accumulated = ''
            
            for (const word of words) {
              accumulated += (accumulated ? ' ' : '') + word
              get().updateStreamingMessage(accumulated)
              await new Promise(resolve => setTimeout(resolve, 50))
            }
            
            // Update the streaming message with memory context
            const { streamingMessage } = get()
            if (streamingMessage && response.memoryContext) {
              set(state => ({
                streamingMessage: state.streamingMessage 
                  ? { ...state.streamingMessage, memoryContext: response.memoryContext }
                  : null
              }))
            }
          } else {
            get().updateStreamingMessage(response?.error || 'No response from Ollama')
          }
          
        } catch (ipcError) {
          console.error('[MessageStore] IPC failed, trying direct fetch fallback:', ipcError)
          
          // Last resort: try direct fetch anyway
          try {
            const streamGenerator = streamAgent(content)
            let lastContent = ''
            
            for await (const chunk of streamGenerator) {
              lastContent = chunk
              get().updateStreamingMessage(lastContent)
            }
          } catch (fetchError) {
            get().updateStreamingMessage(`Both IPC and direct fetch failed. IPC: ${ipcError.message}, Fetch: ${fetchError.message}`)
          }
        }
        
        get().finishStreaming()
        
      } catch (error: any) {
        console.error('[MessageStore] Direct Ollama agent failed:', error)
        set({ error: error.message })
        
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${error.message}\n\nThis is a basic test agent. If you see this error, there may be an issue with the core message system.\n\nNext steps:\n• Check browser console (F12) for details\n• Try refreshing the app\n• Then we can test Ollama connectivity`,
          timestamp: new Date()
        }
        get().addMessage(errorMessage)
      } finally {
        set({ isLoading: false })
      }
    },

    addMessage: (message: Message) => {
      set(state => ({
        messages: [...state.messages, message]
      }))
    },

    updateMessage: (id: string, updates: Partial<Message>) => {
      set(state => ({
        messages: state.messages.map(msg => 
          msg.id === id ? { ...msg, ...updates } : msg
        )
      }))
    },

    clearMessages: () => {
      set({ messages: [], streamingMessage: null, error: null })
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },

    setError: (error: string | null) => {
      set({ error })
    },

    startStreaming: (message: Partial<Message>) => {
      set({
        streamingMessage: {
          id: message.id || `streaming-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
          ...message
        } as Message
      })
    },

    updateStreamingMessage: (content: string) => {
      set(state => ({
        streamingMessage: state.streamingMessage 
          ? { ...state.streamingMessage, content }
          : null
      }))
    },

    finishStreaming: () => {
      const { streamingMessage } = get()
      if (streamingMessage) {
        const finalMessage: Message = {
          ...streamingMessage,
          isStreaming: false
        }
        get().addMessage(finalMessage)
        set({ streamingMessage: null })
      }
    }
  }))
)

// Initialize stores on app start
export const initializeStores = async () => {
  const modelStore = (await import('./useModelStore')).useModelStore.getState()
  const memoryStore = (await import('./useMemoryStore')).useMemoryStore.getState()
  
  // Check connections and load initial data
  await Promise.all([
    modelStore.checkConnection(),
    memoryStore.refreshMemoryStats()
  ])
  
  // Set up periodic health checks
  setInterval(() => {
    modelStore.checkConnection()
    memoryStore.refreshMemoryStats()
  }, 30000) // Every 30 seconds
}