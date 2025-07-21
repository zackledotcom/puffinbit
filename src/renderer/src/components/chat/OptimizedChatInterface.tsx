import React, { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'
import { Message } from '../../../types/chat'
import MessageComponent from './components/MessageComponent'
import OptimizedInputBar from './OptimizedInputBar'
import OptimizedHeader from '../layout/OptimizedHeader'
import { useAnalyticsTracking } from '../../services/modelAnalytics'
import { useToast } from '@/components/ui/toast'
import { useCanvasStore } from '@/stores/canvasStore'
import CanvasPanel from '../canvas/CanvasPanel'

interface OptimizedChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  onOpenSystemStatus: () => void
  onOpenAgentManager: () => void
  onOpenAdvancedMemory: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onNewChat?: () => void
}

const OptimizedChatInterface: React.FC<OptimizedChatInterfaceProps> = ({
  selectedModel,
  onModelChange,
  onOpenSettings,
  onOpenDeveloper,
  onOpenSystemStatus,
  onOpenAgentManager,
  onOpenAdvancedMemory,
  onToggleSidebar,
  sidebarOpen,
  onNewChat
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [messageCount, setMessageCount] = useState(0)
  const [responseTime, setResponseTime] = useState(0)
  const [selectedMemoryContext, setSelectedMemoryContext] = useState<any[]>([])
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const { canvasOpen, setCanvasOpen } = useCanvasStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const services = useAllServices()
  
  // Generate session ID for analytics
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const analytics = useAnalyticsTracking()
  const { addToast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Enhanced message handler with proper error handling
  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!content.trim() || isLoading) return

    setInputValue('')
    const startTime = Date.now()

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      model: selectedModel
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await window.api.chatWithAI({
        message: content,
        model: selectedModel,
        history: messages.slice(-10),
        memoryOptions: {
          enabled: memoryEnabled,
          contextLength: selectedMemoryContext.length > 0 ? selectedMemoryContext.length : 3,
          smartFilter: true,
          selectedContext: selectedMemoryContext.map((chunk) => chunk.content).join('\n\n')
        }
      })

      const endTime = Date.now()
      const responseTimeMs = endTime - startTime
      setResponseTime(responseTimeMs)

      if (response.success && response.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.response,
          timestamp: new Date(),
          model: selectedModel,
          responseTime: responseTimeMs
        }

        setMessages((prev) => [...prev, assistantMessage])
        setMessageCount((prev) => prev + 1)

        // Analytics tracking
        try {
          await analytics.trackChatMessage({
            modelId: selectedModel,
            sessionId,
            prompt: content.trim(),
            response: response.message,
            responseTime: responseTimeMs,
            success: true
          })
        } catch (analyticsError) {
          console.warn('Analytics tracking failed:', analyticsError)
        }

        // Success feedback
        addToast({
          type: 'success',
          title: 'Response Generated',
          description: `${responseTimeMs}ms • ${selectedModel.replace(':latest', '')}`,
          duration: 2000
        })
      } else {
        throw new Error(response.message || response.error || 'No response from AI model')
      }
    } catch (error) {
      console.error('💥 Chat error:', error)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        model: selectedModel
      }

      setMessages((prev) => [...prev, errorMessage])

      // Error feedback
      addToast({
        type: 'error',
        title: 'Chat Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setMessageCount(0)
    setResponseTime(0)
    setSelectedMemoryContext([])
    
    if (onNewChat) {
      onNewChat()
    }
    
    addToast({
      type: 'info',
      title: 'Chat Cleared',
      description: 'All messages and context removed',
      duration: 2000
    })
  }

  const handleMemorySelect = (chunks: any[]) => {
    setSelectedMemoryContext(chunks)
    if (chunks.length > 0) {
      addToast({
        type: 'success',
        title: 'Memory Context Selected',
        description: `${chunks.length} chunks will enhance next messages`,
        duration: 3000
      })
    }
  }

  const handleMemoryToggle = () => {
    if (selectedMemoryContext.length > 0) {
      setSelectedMemoryContext([])
      addToast({
        type: 'info',
        title: 'Memory Context Cleared',
        description: 'Memory context removed',
        duration: 2000
      })
    } else {
      // Trigger memory search
      handleMemorySelect([])
    }
  }

  const handleExportChat = () => {
    if (messages.length === 0) {
      addToast({
        type: 'warning',
        title: 'Nothing to Export',
        description: 'No messages in current chat',
        duration: 2000
      })
      return
    }

    // Simple markdown export
    const markdown = messages
      .map((msg) => {
        const timestamp = msg.timestamp.toLocaleString()
        const role = msg.type === 'user' ? 'You' : 'Assistant'
        return `## ${role} (${timestamp})\n\n${msg.content}\n\n---\n`
      })
      .join('\n')

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `puffer-chat-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addToast({
      type: 'success',
      title: 'Chat Exported',
      description: 'Markdown file downloaded successfully',
      duration: 3000
    })
  }

  const handleOpenCanvas = () => {
    setCanvasOpen(!canvasOpen)
    addToast({
      type: 'info',
      title: canvasOpen ? 'Canvas Closed' : 'Canvas Opened',
      description: canvasOpen ? 'Returned to chat mode' : 'Code canvas activated',
      duration: 2000
    })
  }

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

  // Determine model status based on service connection
  const getModelStatus = () => {
    if (isLoading) return 'loading'
    return services.ollama.status?.connected ? 'connected' : 'disconnected'
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Optimized Header */}
        <OptimizedHeader
        selectedModel={selectedModel}
        modelStatus={getModelStatus()}
        messageCount={messageCount}
        responseTime={responseTime}
        memoryContextCount={selectedMemoryContext.length}
        memoryEnabled={memoryEnabled}
        onToggleSidebar={onToggleSidebar}
        onOpenSettings={onOpenSettings}
        onClearChat={handleClearChat}
        onToggleMemory={handleMemoryToggle}
        sidebarOpen={sidebarOpen}
        isLoading={isLoading}
        hasMessages={messages.length > 0}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 animate-bounce">🕊️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Puffer
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Your privacy-first AI assistant. Start a conversation with{' '}
                  <span className="font-medium text-blue-600">
                    {getModelDisplayName(selectedModel)}
                  </span>
                </p>
                
                {/* Quick starter suggestions */}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    'Help me write code',
                    'Explain a concept',
                    'Analyze data',
                    'Creative writing'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputValue(suggestion)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageComponent
                    key={message.id}
                    message={message}
                  />
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-3 text-gray-500">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                    <span className="text-sm">
                      {getModelDisplayName(selectedModel)} is thinking...
                    </span>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Optimized Input Bar */}
      <div className="border-t border-gray-200 p-4">
        <OptimizedInputBar
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          isLoading={isLoading}
          placeholder="Type a message..."
          onMemorySelect={handleMemorySelect}
          selectedMemoryContext={selectedMemoryContext}
          memoryEnabled={memoryEnabled}
          onOpenCanvas={handleOpenCanvas}
          canvasActive={canvasOpen}
          onExportChat={handleExportChat}
          hasMessages={messages.length > 0}
        />
        </div>
      </div>

      {/* Canvas Panel */}
      <CanvasPanel />
    </div>
  )
}

export default OptimizedChatInterface
