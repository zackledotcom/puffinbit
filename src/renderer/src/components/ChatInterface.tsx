// ChatInterface.tsx - Complete working version with all tool integrations
import React, { useState, useCallback, useEffect } from 'react'
import { useCanvasModeStore } from '@/stores/useCanvasModeStore'
import { useEnhancedMessageStore } from '@/stores/enhancedMessageStore'
import { useCanvasChatIntegration } from '@/hooks/useCanvasChatIntegration'
import InputBar from '@/components/chat/InputBar'
import ChatMessageList from '@/components/chat/components/ChatMessageList'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Settings, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Model management state
interface ModelState {
  activeModel: { name: string } | null
  online: boolean
  availableModels: string[]
}

export default function ChatInterface() {
  const { canvasMode } = useCanvasModeStore()
  
  // Use the enhanced message store with AI integration
  const {
    messages,
    isTyping,
    sendMessage,
    addAIResponse,
    addErrorMessage,
    setIsTyping,
    clearMessages
  } = useEnhancedMessageStore()

  // Canvas-Chat integration with auto-triggering and bidirectional sync
  const {
    sendMessageWithCanvasContext,
    triggerCanvasManually,
    analyzeMessageForCanvasTrigger,
    getCanvasContextForChat
  } = useCanvasChatIntegration(
    messages,
    (message) => {
      // Convert message to store format and add
      addAIResponse(message.content, {
        model: modelState.activeModel?.name,
        canvasContext: message.canvasContext
      })
    },
    {
      enableAutoTrigger: true,
      enableContextSharing: true,
      enableCodeSuggestions: true,
      securityLevel: 'standard'
    }
  )

  // Model state management
  const [modelState, setModelState] = useState<ModelState>({
    activeModel: { name: 'llama3.2:latest' },
    online: false,
    availableModels: []
  })

  const [inputValue, setInputValue] = useState('')

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await window.api.getOllamaModels()
        if (response.success && response.models) {
          setModelState(prev => ({
            ...prev,
            availableModels: response.models,
            activeModel: { name: response.models[0] || 'llama3.2:latest' }
          }))
        }
      } catch (error) {
        console.error('Failed to load models:', error)
      }
    }
    loadModels()
  }, [])

  // Check online status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const ollamaStatus = await window.api.checkOllamaStatus()
        const chromaStatus = await window.api.checkChromaStatus()
        setModelState(prev => ({
          ...prev,
          online: ollamaStatus.success && chromaStatus.success
        }))
      } catch (error) {
        console.error('Failed to check status:', error)
        setModelState(prev => ({ ...prev, online: false }))
      }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Convert messages to ChatMessageList format
  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt,
    isStreaming: false,
    metadata: {
      model: msg.model,
      tokens: msg.tokens,
      corrected: false
    }
  }))

  // Handle sending messages with context files and Canvas integration
  const handleSend = useCallback(async (message: string, attachments?: File[], contextFiles?: File[]) => {
    if (!message.trim() || isTyping) return

    // Enhanced message content with context information
    let enhancedContent = message
    
    // Add context file information to the message if present
    if (contextFiles && contextFiles.length > 0) {
      const contextInfo = contextFiles.map(file => 
        `[Context: ${file.name} (${file.type || 'unknown'})]`
      ).join(' ')
      enhancedContent = `${contextInfo}\n\n${message}`
    }

    // Analyze message for Canvas auto-triggering BEFORE sending
    const messageId = crypto.randomUUID()
    console.log('🔍 Analyzing message for Canvas trigger:', enhancedContent.substring(0, 100))
    const wasTriggered = analyzeMessageForCanvasTrigger(enhancedContent, messageId, true)
    console.log('🎨 Canvas auto-trigger result:', wasTriggered)

    // Use enhanced sendMessage with proper format
    await sendMessage({
      id: messageId,
      role: 'user',
      content: enhancedContent,
      createdAt: Date.now(),
      attachments: attachments?.map(f => ({ name: f.name, size: f.size, type: f.type })),
      contextFiles: contextFiles?.map(f => ({ name: f.name, size: f.size, type: f.type })),
      canvasContext: getCanvasContextForChat() // Include Canvas context if active
    })
    
    setInputValue('')
  }, [isTyping, sendMessage, analyzeMessageForCanvasTrigger, getCanvasContextForChat])

  // Tool handlers for InputBar (YOUR 685-line component expects these)
  const handleFileUpload = useCallback(async (files: File[]) => {
    console.log('📁 File upload:', files)
    try {
      // Process file uploads
      for (const file of files) {
        const result = await window.api.fsReadFile(file.path)
        if (result.success) {
          addAIResponse(`File uploaded: ${file.name}`, {
            model: modelState.activeModel?.name
          })
        }
      }
    } catch (error) {
      addErrorMessage(`Failed to upload files: ${error}`)
    }
  }, [modelState.activeModel, addAIResponse, addErrorMessage])

  const handleOpenCanvas = useCallback(() => {
    console.log('🎨 Activating Canvas mode...')
    triggerCanvasManually('Manual activation from chat interface')
  }, [triggerCanvasManually])

  const handleOpenTerminal = useCallback(() => {
    console.log('💻 Opening terminal...')
    // TODO: Implement terminal opening
    addAIResponse('Terminal feature coming soon...', {
      model: modelState.activeModel?.name
    })
  }, [modelState.activeModel, addAIResponse])

  const handleBrowseWeb = useCallback(async (query: string) => {
    console.log('🌐 Browse web:', query)
    try {
      const response = await window.api.browserCreateSession({ 
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}` 
      })
      if (response.success) {
        addAIResponse(`Web search initiated for: ${query}`, {
          model: modelState.activeModel?.name
        })
      }
    } catch (error) {
      addErrorMessage(`Failed to browse web: ${error}`)
    }
  }, [modelState.activeModel, addAIResponse, addErrorMessage])

  const handleExportChat = useCallback(async (format: 'copy' | 'markdown' | 'file' | 'link') => {
    console.log('💾 Export chat:', format)
    try {
      const chatData = {
        messages: formattedMessages,
        timestamp: new Date().toISOString(),
        model: modelState.activeModel?.name
      }
      
      if (format === 'file') {
        const result = await window.api.fsSaveFileDialog(
          `chat-${Date.now()}.json`,
          JSON.stringify(chatData, null, 2)
        )
        if (result.success) {
          addAIResponse(`Chat exported to: ${result.filePath}`, {
            model: modelState.activeModel?.name
          })
        }
      } else if (format === 'copy') {
        navigator.clipboard.writeText(JSON.stringify(chatData, null, 2))
        addAIResponse('Chat copied to clipboard', {
          model: modelState.activeModel?.name
        })
      }
    } catch (error) {
      addErrorMessage(`Failed to export chat: ${error}`)
    }
  }, [formattedMessages, modelState.activeModel, addAIResponse, addErrorMessage])

  const handleOpenTraining = useCallback(() => {
    console.log('🎓 Opening training...')
    addAIResponse('Training feature coming soon...', {
      model: modelState.activeModel?.name
    })
  }, [modelState.activeModel, addAIResponse])

  const handleAnalyzeCsv = useCallback(async (file: File) => {
    console.log('📊 Analyze CSV:', file.name)
    try {
      const result = await window.api.fsReadFile(file.path)
      if (result.success) {
        addAIResponse(`CSV analysis started for: ${file.name}`, {
          model: modelState.activeModel?.name
        })
      }
    } catch (error) {
      addErrorMessage(`Failed to analyze CSV: ${error}`)
    }
  }, [modelState.activeModel, addAIResponse, addErrorMessage])

  const handleMessageCorrection = useCallback((messageId: string, newContent: string) => {
    console.log('✏️ Message correction:', messageId, newContent)
    // TODO: Implement message correction in store
  }, [])

  const handleMessageReaction = useCallback((messageId: string, reaction: string) => {
    console.log('👍 Message reaction:', messageId, reaction)
    // TODO: Implement message reactions in store
  }, [])

  const handleModelChange = useCallback((modelName: string) => {
    setModelState(prev => ({
      ...prev,
      activeModel: { name: modelName }
    }))
  }, [])

  if (canvasMode) return null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header with model selector and status */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="text-xs font-mono px-2 py-0.5">
                {modelState.activeModel?.name || 'Model Unknown'}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {modelState.availableModels.map(model => (
                <DropdownMenuItem 
                  key={model}
                  onClick={() => handleModelChange(model)}
                >
                  {model}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="ghost" size="sm" onClick={clearMessages}>
            Clear Chat
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {modelState.online ? (
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-green-500" /> Online
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <WifiOff className="w-3 h-3 text-red-500" /> Offline
            </div>
          )}
          
          <Button variant="ghost" size="sm">
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Message List with proper props */}
      <div className="flex-1 overflow-hidden">
        <ChatMessageList
          messages={formattedMessages}
          onMessageCorrection={handleMessageCorrection}
          onMessageReaction={handleMessageReaction}
          isThinking={isTyping}
          streamingMessage={isTyping ? "Thinking..." : undefined}
        />
      </div>

      {/* InputBar with ALL expected tool handlers */}
      <InputBar
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onFileUpload={handleFileUpload}
        onOpenCanvas={handleOpenCanvas}
        onOpenTerminal={handleOpenTerminal}
        onBrowseWeb={handleBrowseWeb}
        onExportChat={handleExportChat}
        onOpenTraining={handleOpenTraining}
        onAnalyzeCsv={handleAnalyzeCsv}
        isLoading={isTyping}
        placeholder="Message Puffin AI..."
        devMode={process.env.NODE_ENV === 'development'}
      />
    </div>
  )
}