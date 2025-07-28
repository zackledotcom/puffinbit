import { create } from 'zustand'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'  // Changed from 'type' to 'role'
  content: string
  createdAt: number  // Changed from 'timestamp: Date' to 'createdAt: number'
  model?: string
  latency?: number
  error?: boolean
  tokens?: number
}

interface EnhancedMessageState {
  messages: Message[]
  isTyping: boolean
  
  // Google-style session tracking
  sessionId: string
  sessionStartTime: Date
  totalMessages: number
  averageLatency: number
  
  // Actions
  sendMessage: (message: Message | string) => Promise<void>  // Enhanced to handle AI calls
  addAIResponse: (content: string, metadata?: { latency?: number, model?: string, tokens?: number }) => void
  addErrorMessage: (error: string) => void
  clearMessages: () => void
  setIsTyping: (typing: boolean) => void
  
  // Session management
  startNewSession: () => void
  getSessionMetrics: () => { duration: number, messageCount: number, avgLatency: number }
}

export const useEnhancedMessageStore = create<EnhancedMessageState>((set, get) => ({
  // State
  messages: [],
  isTyping: false,
  sessionId: `session_${Date.now()}`,
  sessionStartTime: new Date(),
  totalMessages: 0,
  averageLatency: 0,

  // Enhanced sendMessage - now handles AI calls
  sendMessage: async (messageInput: Message | string) => {
    // Handle both string and Message object input
    let userMessage: Message
    
    if (typeof messageInput === 'string') {
      // Legacy string input - create message object
      userMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageInput,
        createdAt: Date.now()
      }
    } else {
      // New Message object input
      userMessage = messageInput
    }

    // Add user message to state
    set((state) => ({
      messages: [...state.messages, userMessage],
      totalMessages: state.totalMessages + 1
    }))

    // If it's a user message, trigger AI response
    if (userMessage.role === 'user') {
      const { setIsTyping, addAIResponse, addErrorMessage } = get()
      
      try {
        setIsTyping(true)
        const startTime = Date.now()
        
        // Get current state for context
        const currentState = get()
        
        // Prepare conversation history for AI
        const history = currentState.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : msg.role, // Ensure compatibility
          content: msg.content
        }))

        // Call AI via IPC
        const response = await window.api.chatWithAI({
          message: userMessage.content,
          model: 'llama3.2:latest', // TODO: Get from model store
          history: history,
          mode: 'chat'
        })

        const latency = Date.now() - startTime

        if (response.success) {
          addAIResponse(response.message || response.response || 'No response generated', {
            latency,
            model: response.model || 'llama3.2:latest',
            tokens: response.tokens
          })
        } else {
          addErrorMessage(response.message || response.error || 'AI service error')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        get().addErrorMessage(`Failed to get AI response: ${errorMessage}`)
      } finally {
        setIsTyping(false)
      }
    }
  },

  addAIResponse: (content: string, metadata = {}) => {
    const message: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      createdAt: Date.now(),
      ...metadata
    }
    
    set((state) => {
      const newLatency = metadata.latency || 0
      const newAverage = state.averageLatency > 0 
        ? (state.averageLatency + newLatency) / 2 
        : newLatency

      return {
        messages: [...state.messages, message],
        isTyping: false,
        averageLatency: newAverage
      }
    })
  },

  addErrorMessage: (error: string) => {
    const message: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `Error: ${error}`,
      createdAt: Date.now(),
      error: true
    }
    
    set((state) => ({
      messages: [...state.messages, message],
      isTyping: false
    }))
  },

  clearMessages: () => set({
    messages: [],
    totalMessages: 0,
    averageLatency: 0
  }),

  setIsTyping: (typing: boolean) => set({ isTyping: typing }),

  startNewSession: () => set({
    sessionId: `session_${Date.now()}`,
    sessionStartTime: new Date(),
    messages: [],
    totalMessages: 0,
    averageLatency: 0
  }),

  getSessionMetrics: () => {
    const state = get()
    return {
      duration: Date.now() - state.sessionStartTime.getTime(),
      messageCount: state.totalMessages,
      avgLatency: state.averageLatency
    }
  }
}))