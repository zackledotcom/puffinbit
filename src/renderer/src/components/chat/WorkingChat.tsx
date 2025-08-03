import React, { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface WorkingChatProps {
  selectedModel: string
}

export const WorkingChat: React.FC<WorkingChatProps> = ({ selectedModel }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await window.api?.chatWithAI?.({
        message: userMessage.content,
        model: selectedModel,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        mode: 'chat'
      })

      if (response?.success) {
        const assistantMessage: Message = {
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: response.message || response.response || 'I received your message but had trouble generating a response.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: '⚠️ I encountered an error processing your message. Please check that your AI services are running properly.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: `❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure Ollama is running.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
                Puffin AI Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                How can I help you today?
              </p>
              
              {/* Suggestion Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {[
                  "What is Puffin AI?",
                  "Help me write code",
                  "Explain a complex topic",
                  "Creative writing help"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(suggestion)}
                    className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${
                    message.role === 'user' 
                      ? 'bg-gray-100 dark:bg-gray-700 rounded-3xl px-5 py-2.5' 
                      : 'bg-transparent'
                  }`}>
                    {message.role === 'assistant' && (
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          AI
                        </div>
                        <div className="flex-1 prose prose-gray dark:prose-invert max-w-none">
                          {message.content}
                        </div>
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="text-gray-900 dark:text-gray-100">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      AI
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-gray-500/60 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-gray-500/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-gray-500/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus-within:border-blue-500">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Message Puffin..."
              className="flex-1 bg-transparent border-none outline-none text-sm resize-none min-h-[20px] max-h-32"
              rows={1}
              style={{ 
                height: 'auto',
                minHeight: '20px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 128) + 'px'
              }}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`p-2 rounded-lg transition-colors ${
                inputValue.trim() && !isLoading
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkingChat