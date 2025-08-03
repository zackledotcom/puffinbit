import React, { useState, useEffect, useCallback } from 'react'
import { AssistantUIThread } from './AssistantUIThread'

// Message interface compatible with existing system
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
}

interface ChatIntegrationProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

// Chat Integration Component - bridges AssistantUI with existing Puffin services
export const ChatIntegration: React.FC<ChatIntegrationProps> = ({
  selectedModel,
  onModelChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Initialize with a welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome-' + Date.now(),
      role: 'system',
      content: '👋 Welcome to Puffin AI! I\'m ready to help you with any questions or tasks. Your conversations stay completely private and are processed locally.',
      timestamp: new Date(),
      model: selectedModel
    }
    setMessages([welcomeMessage])
  }, [])

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Try to use the existing chat API
      const response = await window.api?.chatWithAI?.(content, selectedModel)
      
      if (response?.success && response.response) {
        const assistantMessage: ChatMessage = {
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          model: selectedModel
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Fallback response if API fails
        const errorMessage: ChatMessage = {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: '⚠️ I\'m having trouble connecting to the AI service right now. Please check that Ollama is running and try again. You can also try switching to a different model in the sidebar.',
          timestamp: new Date(),
          model: selectedModel
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      
      // Error response
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: `❌ Sorry, there was an error processing your message: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure your AI services are properly configured.`,
        timestamp: new Date(),
        model: selectedModel
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [selectedModel])

  return (
    <div className="h-full flex flex-col">
      {/* Model indicator */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Model: {selectedModel || 'No model selected'}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            🔒 Privacy-first • Local processing
          </div>
        </div>
      </div>

      {/* Main chat interface */}
      <div className="flex-1 min-h-0">
        <AssistantUIThread
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
        />
      </div>
    </div>
  )
}

export default ChatIntegration