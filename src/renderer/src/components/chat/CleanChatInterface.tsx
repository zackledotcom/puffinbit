import React, { useState, useRef, useEffect } from 'react'
import {
  PaperPlaneTilt,
  Paperclip,
  Sidebar,
  ArrowsClockwise,
  Gear,
  Circle
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'
import { Message } from '../../../types/chat'
import MessageComponent from './components/MessageComponent'
import { useToast } from '@/components/ui/toast'

interface CleanChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onOpenSettings: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onNewChat?: () => void
}

const CleanChatInterface: React.FC<CleanChatInterfaceProps> = ({
  selectedModel,
  onOpenSettings,
  onToggleSidebar,
  onNewChat
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [responseTime, setResponseTime] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const services = useAllServices()
  const { addToast } = useToast()

  const getModelDisplayName = (model: string) => {
    return model
      .replace(':latest', '')
      .replace('deepseek-coder', 'DeepSeek Coder')
      .replace('qwen2.5', 'Qwen 2.5')
      .replace('phi3.5', 'Phi 3.5')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('phi4-mini-reasoning', 'Phi4 Mini')
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
      model: selectedModel
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsThinking(true)

    const startTime = Date.now()

    try {
      const response = await window.api.chatWithAI({
        message: currentMessage.trim(),
        model: selectedModel,
        history: messages.slice(-5)
      })

      const endTime = Date.now()
      const responseTimeMs = endTime - startTime
      setResponseTime(responseTimeMs)

      if (response.success && response.response) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.response,
          timestamp: new Date(),
          model: selectedModel,
          responseTime: responseTimeMs
        }

        setMessages(prev => [...prev, aiMessage])
        setMessageCount(prev => prev + 1)

        addToast({
          type: 'success',
          title: 'Response Generated',
          description: `${responseTimeMs}ms • ${getModelDisplayName(selectedModel)}`,
          duration: 2000
        })
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'system',
          content: `Error: ${response.error || 'No response from AI model'}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])

        addToast({
          type: 'error',
          title: 'Generation Failed',
          description: response.message || 'Unknown error occurred',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addToast({
        type: 'error',
        title: 'Connection Error',
        description: 'Failed to connect to AI service',
        duration: 5000
      })
    } finally {
      setIsThinking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setMessageCount(0)
    setResponseTime(0)
    addToast({
      type: 'info',
      title: 'Chat Cleared',
      description: 'All messages have been removed',
      duration: 2000
    })
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Clean Professional Header */}
      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left: Logo and Model */}
          <div className="flex items-center gap-6">
            {/* Sidebar Toggle + Logo */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Sidebar size={16} className="text-gray-600" />
              </Button>
              
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">P</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">Puffer</span>
              </div>
            </div>

            {/* Model Info */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-gray-700">
                {getModelDisplayName(selectedModel)}
              </span>
              <div className="flex items-center gap-1">
                <Circle 
                  size={6} 
                  className={cn(
                    services.ollama.status?.connected ? "text-green-500 fill-green-500" : "text-red-500 fill-red-500"
                  )} 
                />
                <span className="text-xs text-gray-500">
                  {services.ollama.status?.connected ? "Ready" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              disabled={messages.length === 0}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Clear chat"
            >
              <ArrowsClockwise size={16} className="text-gray-600" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
              title="Settings"
            >
              <Gear size={16} className="text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-xl">AI</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to Puffer
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Your privacy-first AI assistant. Start a conversation with{' '}
                <span className="font-medium text-blue-600">
                  {getModelDisplayName(selectedModel)}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}

              {isThinking && (
                <div className="flex gap-4 max-w-4xl">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 inline-block">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Clean Input Area */}
      <div className="border-t border-gray-200 bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3 p-4 border border-gray-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 hover:bg-gray-100 rounded-lg"
              disabled={isThinking}
              title="Attach file"
            >
              <Paperclip size={16} className="text-gray-600" />
            </Button>

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${getModelDisplayName(selectedModel)}...`}
                className="min-h-[24px] max-h-[120px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm placeholder:text-gray-500 text-gray-900"
                disabled={isThinking}
              />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {currentMessage.trim() ? (
                <Button
                  onClick={handleSendMessage}
                  disabled={isThinking}
                  className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
                  title="Send message"
                >
                  {isThinking ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PaperPlaneTilt size={16} className="text-white" />
                  )}
                </Button>
              ) : (
                <div className="h-8 w-8" /> // Placeholder to maintain layout
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CleanChatInterface
