// src/renderer/src/components/chat/SimpleChat.tsx
import React, { useState, useEffect, useRef } from 'react'
import { Send, User, Bot, AlertCircle, Loader2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  error?: boolean
}

interface SimpleChatProps {
  selectedModel?: string
  className?: string
}

const SimpleChat: React.FC<SimpleChatProps> = ({ 
  selectedModel = 'llama3.2:latest',
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      // Try to ping the service
      const result = await window.api.checkOllamaStatus?.()
      setConnectionStatus(result?.success ? 'connected' : 'disconnected')
    } catch (error) {
      setConnectionStatus('disconnected')
    }
  }

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim()
    if (!trimmedInput || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date()
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Call your existing chat API
      const response = await window.api.chatWithAI?.({
        message: trimmedInput,
        model: selectedModel,
        memoryOptions: { enabled: true },
        options: { temperature: 0.7 }
      })

      if (response?.success) {
        const aiMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant', 
          content: response.message || 'No response generated',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        setConnectionStatus('connected')
      } else {
        throw new Error(response?.error || response?.message || 'AI service error')
      }
    } catch (error) {
      console.error('Chat error:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that Ollama is running.`,
        timestamp: new Date(),
        error: true
      }
      
      setMessages(prev => [...prev, errorMessage])
      setConnectionStatus('disconnected')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.role === 'user'
    const bubbleClasses = isUser
      ? 'bg-[var(--chatgpt-bg-secondary)] text-[var(--chatgpt-text-primary)] rounded-2xl'
      : message.error
        ? 'bg-[var(--chatgpt-error)] text-[var(--chatgpt-text-error)] rounded-2xl'
        : 'bg-[var(--chatgpt-bg-tertiary)] text-[var(--chatgpt-text-secondary)] rounded-2xl'
    const isError = message.error

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-[var(--chatgpt-accent)]' : isError ? 'bg-[var(--chatgpt-error)]' : 'bg-[var(--chatgpt-border)]'}`}>
            {isUser ? (
              <User size={16} className="text-white" />
            ) : isError ? (
              <AlertCircle size={16} className="text-white" />
            ) : (
              <Bot size={16} className="text-white" />
            )}
          </div>

          {/* Message Content */}
          <div className={`px-4 py-2 ${bubbleClasses}`}>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
            <div className={`text-xs mt-1 opacity-70 ${
              isUser ? 'text-[var(--chatgpt-text-primary)]' : 'text-[var(--chatgpt-text-secondary)]'
            }`}>
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-[var(--chatgpt-bg-primary)] text-[var(--chatgpt-text-primary)] ${className}`}>
      {/* Header */}
      <div className="chatgpt-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Puffin AI</h1>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            connectionStatus === 'connected' 
               ? 'text-[var(--chatgpt-connected)]'
               : connectionStatus === 'disconnected'
                 ? 'text-[var(--chatgpt-disconnected)]'
                 : 'text-[var(--chatgpt-checking)]'
          }`}>
            {connectionStatus === 'connected' ? '● Online' : 
             connectionStatus === 'disconnected' ? '● Offline' : '● Checking'}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Model: {selectedModel}</span>
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot size={48} className="text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-gray-700 mb-2">
                Welcome to Puffin AI
              </h2>
              <p className="text-gray-500">
                Your local AI assistant is ready. Start a conversation below.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                height: Math.min(120, Math.max(44, inputValue.split('\n').length * 24))
              }}
              disabled={isLoading}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
            style={{ minHeight: '44px' }}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SimpleChat
