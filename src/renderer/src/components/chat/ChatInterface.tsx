import React, { useState, useRef, useEffect } from 'react'
import {
  PaperPlaneTilt,
  ArrowsOut,
  ArrowsIn,
  Brain,
  Robot
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { getModelSettings, settingsToOllamaOptions } from '@/utils/modelSettings'
import { useAllServices } from '@/hooks/useServices'
import { Message } from '../../../types/chat'
import MessageComponent from './components/MessageComponent'
import { useAnalyticsTracking } from '../../services/modelAnalytics'
import { useToast } from '@/components/ui/toast'
import MemoryContextPanel from '../memory/MemoryContextPanel'

interface ChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  onOpenSystemStatus: () => void
  onOpenAgentManager: () => void
  onOpenAdvancedMemory: () => void
  onOpenModelTuning: () => void
  onOpenCodeGenerator: () => void
  onOpenWorkflowBuilder: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onSetSidebarOpen: (open: boolean) => void
  showLeftSidebar: boolean
  onToggleLeftSidebar: () => void
  onToggleCanvasMode?: () => void
  onNewChat?: () => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedModel,
  onModelChange,
  onOpenSettings,
  onOpenDeveloper,
  onOpenSystemStatus,
  onOpenAgentManager,
  onOpenAdvancedMemory,
  onOpenModelTuning,
  onOpenCodeGenerator,
  onOpenWorkflowBuilder,
  onToggleSidebar,
  sidebarOpen,
  onSetSidebarOpen,
  showLeftSidebar,
  onToggleLeftSidebar,
  onToggleCanvasMode,
  onNewChat
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [messageCount, setMessageCount] = useState(0)
  const [responseTime, setResponseTime] = useState(0)
  const [showMemoryPanel, setShowMemoryPanel] = useState(false)
  const [selectedMemoryContext, setSelectedMemoryContext] = useState<any[]>([])
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [showContextSelector, setShowContextSelector] = useState(false)
  const [selectedContext, setSelectedContext] = useState<any[]>([])
  const [customContextActive, setCustomContextActive] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendButtonRef = useRef<HTMLButtonElement>(null)
  const aiIconRef = useRef<HTMLDivElement>(null)
  
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

  // 🚀 ENHANCED MESSAGE HANDLER WITH ULTRA-WHITE PRECISION
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
      // Get model-specific settings
      const modelSettings = getModelSettings(selectedModel);
      const ollamaOptions = settingsToOllamaOptions(modelSettings);
      
      const response = await window.api.chatWithAI({
        message: content,
        model: selectedModel,
        history: messages.slice(-10),
        mode: 'manual',
        systemPrompt: modelSettings.system_prompt,
        ollamaOptions: ollamaOptions,
        memoryOptions: {
          enabled: memoryEnabled,
          contextLength: selectedMemoryContext.length > 0 ? selectedMemoryContext.length : 3,
          smartFilter: true,
          debugMode: false,
          selectedContext: selectedMemoryContext.map((chunk) => chunk.content).join('\n\n'),
          customContext:
            selectedContext.length > 0
              ? selectedContext.map((item) => item.content).join('\n\n')
              : undefined
        }
        }
      })

      const endTime = Date.now()
      const responseTimeMs = endTime - startTime
      setResponseTime(responseTimeMs)

      if (response.success && response.message) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.message,
          timestamp: new Date(),
          model: selectedModel,
          responseTime: responseTimeMs,
          memoryContext: response.memoryContext
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

        // Success feedback with Ultra-White style
        addToast({
          type: 'success',
          title: 'Response Generated',
          description: `${responseTimeMs}ms • ${selectedModel}`,
          duration: 2000
        })
      } else {
        let errorMsg = response.message || response.error || 'No response from AI model'
        
        if (response.error === 'Empty response from model') {
          errorMsg = 'The AI model returned an empty response. Please try again or use a different model.'
        }
        
        throw new Error(errorMsg)
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

  const clearChat = () => {
    setMessages([])
    setMessageCount(0)
    setResponseTime(0)
    setSelectedMemoryContext([])
    setSelectedContext([])
    setCustomContextActive(false)
    
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
    addToast({
      type: 'success',
      title: 'Memory Context Selected',
      description: `${chunks.length} chunks will enhance next messages`,
      duration: 3000
    })
  }

  const handleContextSelect = (context: any[]) => {
    setSelectedContext(context)
    setCustomContextActive(context.length > 0)
    addToast({
      type: 'success',
      title: 'Context Applied',
      description: `${context.length} items will enhance your message`,
      duration: 3000
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

  return (
    <div className="relative h-screen w-full bg-white overflow-hidden">
      
      {/* 🎯 ULTRA-WHITE GLASS CONTAINER */}
      <div className="h-full w-full bg-white/95 backdrop-blur-sm border-r border-[#EDEEF0]">
        
        {/* 🎨 SURGICAL PRECISION HEADER */}
        <div className="p-6 border-b border-[#EDEEF0] bg-[#FDFDFD]/90 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* AI Icon with Glow */}
              <div 
                ref={aiIconRef}
                className="relative p-3 rounded-xl bg-gradient-to-br from-[#7DEBFF]/20 to-[#FF3B47]/20 border border-[#EDEEF0]"
              >
                <Robot size={24} className="text-[#1A1A1A]" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7DEBFF]/10 to-[#FF3B47]/10 blur animate-pulse" />
              </div>
              
              {/* Title and Status */}
              <div>
                <h1 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">
                  Puffer Assistant
                </h1>
                <p className="text-sm text-[#63666A]">
                  Ultra-White Precision • {getModelDisplayName(selectedModel)} • {isLoading ? 'Thinking...' : 'Ready'}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMemoryPanel(true)}
                className={cn(
                  'h-8 px-3 rounded-lg transition-all duration-200',
                  selectedMemoryContext.length > 0
                    ? 'text-[#7DEBFF] bg-[#7DEBFF]/10 hover:bg-[#7DEBFF]/20 border border-[#7DEBFF]/20'
                    : 'text-[#63666A] hover:text-[#1A1A1A] hover:bg-[#F7F8FA]'
                )}
              >
                <Brain size={16} className="mr-1" />
                Memory {selectedMemoryContext.length > 0 && `(${selectedMemoryContext.length})`}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="h-8 px-3 text-[#63666A] hover:text-[#1A1A1A] hover:bg-[#F7F8FA] rounded-lg"
              >
                Clear
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-lg hover:bg-[#F7F8FA] border border-[#EDEEF0] h-8 w-8"
              >
                {isExpanded ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onOpenSettings} 
                className="h-8 w-8 rounded-lg hover:bg-[#F7F8FA]"
              >
                ⚙️
              </Button>
            </div>
          </div>
        </div>

        {/* 💬 MESSAGES AREA WITH FLOATING CARDS */}
        <ScrollArea className="flex-1 h-[calc(100vh-280px)]">
          <div className="p-6 space-y-6 relative">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Robot size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">Ready to assist</h3>
                <p className="text-[#63666A] max-w-md mx-auto">
                  Start a conversation with{' '}
                  <span className="font-medium text-[#7DEBFF]">{getModelDisplayName(selectedModel)}</span>
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start space-x-4",
                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.type === 'assistant' 
                      ? "bg-gradient-to-br from-[#7DEBFF]/20 to-[#FF3B47]/20 border border-[#EDEEF0]"
                      : "bg-[#F7F8FA] border border-[#EDEEF0]"
                  )}>
                    {message.type === 'assistant' ? (
                      <Robot size={16} className="text-[#1A1A1A]" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-[#7DEBFF]" />
                    )}
                  </div>
                  
                  {/* Message Card */}
                  <FloatingCard 
                    className={cn(
                      "max-w-[70%] p-4 transition-all duration-200",
                      message.type === 'user' 
                        ? "bg-gradient-to-r from-[#7DEBFF]/10 to-[#7DEBFF]/5 border-[#7DEBFF]/20"
                        : "bg-white/80 border-[#EDEEF0]"
                    )}
                    delay={index * 100}
                  >
                    <div className="text-[#1A1A1A] leading-relaxed text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-[#A0A2A5]">
                        {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime()) 
                          ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.responseTime && (
                        <span className="text-xs text-[#7DEBFF] font-medium">
                          {message.responseTime}ms
                        </span>
                      )}
                    </div>
                  </FloatingCard>
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7DEBFF]/20 to-[#FF3B47]/20 border border-[#EDEEF0] flex items-center justify-center">
                  <Robot size={16} className="text-[#1A1A1A]" />
                </div>
                <FloatingCard className="bg-white/80 border-[#EDEEF0] p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#7DEBFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#7DEBFF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#7DEBFF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </FloatingCard>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* ⌨️ SIMPLIFIED INPUT AREA */}
        <div className="p-6 border-t border-[#EDEEF0] bg-white">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(inputValue)
                  }
                }}
                placeholder="Message Puffer..."
                className="w-full max-h-32 min-h-[44px] px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                rows={1}
              />
            </div>
            
            <Button
              ref={sendButtonRef}
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="h-[44px] w-[44px] rounded-xl p-0 bg-blue-500 hover:bg-blue-600"
            >
              <PaperPlaneTilt size={18} className="text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* 🧠 MEMORY CONTEXT PANEL */}
      <MemoryContextPanel
        isOpen={showMemoryPanel}
        onClose={() => setShowMemoryPanel(false)}
        onMemorySelect={handleMemorySelect}
        selectedModel={selectedModel}
      />

      {/* ⚡ CONTEXT SELECTOR PANEL */}
      <ContextSelector
        isOpen={showContextSelector}
        onClose={() => setShowContextSelector(false)}
        onApplyContext={handleContextSelect}
        currentMessage={inputValue}
        conversationHistory={messages}
        selectedModel={selectedModel}
      />

      {/* 🎨 CUSTOM STYLES */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* 🎯 MAGIC UI DEMO INDICATOR */}
      <MagicUIDemo />
    </div>
  )
}

export default ChatInterface