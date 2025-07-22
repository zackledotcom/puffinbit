import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PaperPlaneTilt,
  Stop,
  Copy,
  ArrowClockwise,
  Plus,
  CaretDown,
  Sidebar,
  Trash,
  Gear,
  Sun,
  Moon,
  Sliders,
  Brain,
  Export,
  Eraser,
  Code,
  Lightning,
  Robot,
  Sparkle,
  MagicWand,
  Download,
  Upload
} from 'phosphor-react'

// Magic UI Components for enhanced experience
import { DotPattern } from '../ui/dot-pattern'
import { AnimatedShinyText } from '../ui/animated-shiny-text'
import MouseMoveEffect from '../ui/mouse-move-effect'

import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Textarea } from '../ui/textarea'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from '../ui/dropdown-menu'
import { cn } from '../../lib/utils'

interface Message {
  id: string | number
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  responseTime?: number
}interface Thread {
  id: string
  title: string
  timestamp: string
  messages: Message[]
}

interface PremiumChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onSendMessage: (content: string) => void
  messages: Message[]
  isLoading: boolean
  stats?: {
    responseTime?: number
    tokens?: number
    modelLoad?: number
  }
}

const PremiumChatInterface: React.FC<PremiumChatInterfaceProps> = ({
  selectedModel,
  onModelChange,
  onSendMessage,
  messages,
  isLoading,
  stats
}) => {
  const [inputValue, setInputValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentThreadId, setCurrentThreadId] = useState('thread-1')
  const [darkMode, setDarkMode] = useState(true)
  const [selectedContext, setSelectedContext] = useState('General')
  
  // Apple-style dropdown states
  const [customModelDropdownOpen, setCustomModelDropdownOpen] = useState(false)
  const [lightningDropdownOpen, setLightningDropdownOpen] = useState(false)
  
  const availableModels = [
    'llama3.2:latest',
    'qwen2.5:latest', 
    'deepseek-coder:latest',
    'phi3.5:latest',
    'tinydolphin:latest',
    'openchat:latest'
  ]

  const availableContexts = [
    'General',
    'Code',
    'Document',
    'Analysis',
    'Creative'
  ]  
  const [threads, setThreads] = useState<Thread[]>([
    {
      id: 'thread-1',
      title: 'New conversation',
      timestamp: 'Just now',
      messages: []
    }
  ])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [inputValue])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customModelDropdownOpen || lightningDropdownOpen) {
        const target = event.target as Element
        if (!target.closest('.relative')) {
          setCustomModelDropdownOpen(false)
          setLightningDropdownOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [customModelDropdownOpen, lightningDropdownOpen])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return
    
    onSendMessage(inputValue.trim())
    setInputValue('')
    
    // Update thread title based on first message
    if (messages.length === 0) {
      const threadTitle = inputValue.trim().slice(0, 30) + (inputValue.trim().length > 30 ? '...' : '')
      setThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? { ...thread, title: threadTitle }
          : thread
      ))
    }
  }
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startNewChat = () => {
    const newThread: Thread = {
      id: `thread-${Date.now()}`,
      title: 'New conversation',
      timestamp: 'Just now',
      messages: []
    }
    setThreads(prev => [newThread, ...prev])
    setCurrentThreadId(newThread.id)
  }

  const deleteThread = (threadId: string) => {
    setThreads(prev => prev.filter(thread => thread.id !== threadId))
    if (currentThreadId === threadId && threads.length > 1) {
      const remainingThreads = threads.filter(thread => thread.id !== threadId)
      setCurrentThreadId(remainingThreads[0]?.id || 'thread-1')
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const getModelDisplayName = (model: string) => {
    return model
      .replace(':latest', '')
      .replace('deepseek-coder', 'DeepSeek Coder')
      .replace('qwen2.5', 'Qwen 2.5')
      .replace('phi3.5', 'Phi 3.5')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('llama3.2', 'Llama 3.2')
  }

  // Apple-style Dropdown Overlay Component
  const AppleDropdownOverlay = ({ 
    isOpen, 
    onClose, 
    children, 
    className = "" 
  }: { 
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string 
  }) => (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Dropdown Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 30,
              duration: 0.2 
            }}
            className={cn(
              "absolute top-12 right-0 z-50 w-80 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 shadow-2xl overflow-hidden",
              className
            )}
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Custom Model Creation Panel
  const CustomModelPanel = () => (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Robot size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Create Custom Model</h3>
          <p className="text-sm text-zinc-400">Build and tune your own AI model</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <button className="w-full p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all duration-200 text-left group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MagicWand size={18} className="text-blue-400" />
              <div>
                <div className="text-white font-medium">Quick Setup</div>
                <div className="text-xs text-zinc-400">Use templates and presets</div>
              </div>
            </div>
            <CaretDown size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
          </div>
        </button>
        
        <button className="w-full p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all duration-200 text-left group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code size={18} className="text-green-400" />
              <div>
                <div className="text-white font-medium">Advanced Editor</div>
                <div className="text-xs text-zinc-400">Custom Modelfile creation</div>
              </div>
            </div>
            <CaretDown size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
          </div>
        </button>
        
        <button className="w-full p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all duration-200 text-left group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload size={18} className="text-purple-400" />
              <div>
                <div className="text-white font-medium">Import Model</div>
                <div className="text-xs text-zinc-400">Load from file or URL</div>
              </div>
            </div>
            <CaretDown size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
          </div>
        </button>
      </div>
    </div>
  )

  // Lightning Performance Panel
  const LightningPanel = () => (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
          <Lightning size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Performance</h3>
          <p className="text-sm text-zinc-400">Optimize speed and quality</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Performance Mode */}
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-medium">Performance Mode</span>
            <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
            </div>
          </div>
          <div className="text-xs text-zinc-400">Optimize for speed on Apple Silicon</div>
        </div>
        
        {/* GPU Acceleration */}
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-medium">GPU Acceleration</span>
            <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
            </div>
          </div>
          <div className="text-xs text-zinc-400">Use Metal Performance Shaders</div>
        </div>
        
        {/* Temperature Slider */}
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-medium">Creativity</span>
            <span className="text-xs text-zinc-400">0.7</span>
          </div>
          <div className="w-full h-2 bg-zinc-700 rounded-full">
            <div className="w-3/4 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <button className="flex-1 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all duration-200 text-center">
            <Sparkle size={16} className="text-yellow-400 mx-auto mb-1" />
            <div className="text-xs text-white">Optimize</div>
          </button>
          <button className="flex-1 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all duration-200 text-center">
            <Download size={16} className="text-blue-400 mx-auto mb-1" />
            <div className="text-xs text-white">Export</div>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="premium-chat-container flex h-screen relative bg-black text-white font-inter">
      <style>
        {`
          .premium-chat-container textarea:focus,
          .premium-chat-container textarea:focus-visible,
          .premium-chat-container div:focus-within {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
            ring: none !important;
          }
        `}
      </style>
      {/* Background Effects Layer */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Dot pattern overlay */}
        <div className="fixed inset-0 bg-dot-white/[0.2] bg-[size:20px_20px]" />
        
        {/* Subtle red blur effects in corners */}
        <div className="absolute right-0 top-0 h-[500px] w-[500px] bg-red-500/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-500/5 blur-[100px]" />
      </div>
      
      {/* Mouse Move Effect */}
      <MouseMoveEffect />
      
      {/* Content Layer */}
      <div className="relative z-10 flex w-full h-full">{/* SIDEBAR - DARK THEME */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="premium-sidebar w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col"
          >            {/* Sidebar Header */}
            <div className="p-3 bg-zinc-950">
              <div className="text-lg font-semibold text-white mb-4">
                Puffin AI
              </div>
            </div>
            
            <div className="p-3 border-b border-zinc-900 bg-zinc-950">
              <Button
                onClick={startNewChat}
                className="w-full justify-start gap-3 h-11 bg-zinc-900 border border-zinc-900 text-white hover:bg-zinc-800 transition-colors text-sm mb-4"
              >
                <Plus size={16} />
                New chat
              </Button>

              {/* Model Selector */}
              <div className="mb-4">
                <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                  Choose Model
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="w-full flex items-center justify-between h-11 px-3 rounded-md bg-transparent text-white hover:bg-zinc-800 border border-zinc-700 hover:border-blue-300/50 transition-colors text-sm cursor-pointer">
                      <span className="truncate text-sm">{getModelDisplayName(selectedModel)}</span>
                      <CaretDown size={12} className="text-zinc-400" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-zinc-950 border-zinc-900">
                    {availableModels.map((model) => (
                      <DropdownMenuItem 
                        key={model}
                        onClick={() => onModelChange(model)}
                        className="text-white hover:bg-zinc-900 focus:bg-zinc-900"
                      >
                        {getModelDisplayName(model)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Thread List */}
            <ScrollArea className="flex-1 px-3 py-2 bg-zinc-950">
              {/* Recent Chats Title */}
              <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider px-3">
                Recent Chats
              </div>
              {threads.map((thread) => (
                <motion.div
                  key={thread.id}
                  whileHover={{ backgroundColor: 'rgb(20, 20, 23)' }}
                  className={cn(
                    "group p-3 rounded-md cursor-pointer mb-1 transition-colors flex items-center justify-between",
                    thread.id === currentThreadId ? 'bg-zinc-900' : 'hover:bg-zinc-900'
                  )}
                >
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => setCurrentThreadId(thread.id)}
                  >
                    <div className="text-sm truncate text-white">
                      {thread.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {thread.timestamp}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteThread(thread.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 text-white hover:text-red-400 hover:bg-red-500/20"
                  >
                    <Trash size={14} />
                  </Button>
                </motion.div>
              ))}
            </ScrollArea>

            {/* Memory Manager Section */}
            <div className="px-3 py-2 bg-zinc-950 border-t border-zinc-900">
              <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                Memory Manager
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-white hover:text-blue-400 hover:bg-blue-500/20 p-2 h-8"
                  title="View Memory"
                >
                  <Brain size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-white hover:text-blue-400 hover:bg-blue-500/20 p-2 h-8"
                  title="Export Memory"
                >
                  <Export size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-white hover:text-red-400 hover:bg-red-500/20 p-2 h-8"
                  title="Clear Memory"
                >
                  <Eraser size={14} />
                </Button>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-zinc-900 bg-zinc-950">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDarkMode(!darkMode)}
                  className="flex-1 justify-center h-10 text-white hover:text-blue-400 hover:bg-blue-500/20 border border-zinc-800"
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 justify-center h-10 text-white hover:text-blue-400 hover:bg-blue-500/20 border border-zinc-800"
                >
                  <Gear size={16} />
                </Button>
              </div>
              
              {/* Stats Display */}
              {stats && (
                <div className="text-xs text-zinc-500 mt-2 space-y-1">
                  {stats.responseTime && <div>Response: {stats.responseTime}ms</div>}
                  {stats.tokens && <div>Tokens: {stats.tokens}</div>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA - BLACK BACKGROUND */}
      <div className="premium-main-area flex-1 flex flex-col bg-black">
        <div className="h-16 bg-black flex items-center justify-between px-4 border-b border-zinc-900">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-blue-400 hover:bg-blue-500/20 p-2 mr-4"
              title="Tools & Navigation"
            >
              <Sidebar size={20} />
            </Button>
            
            <AnimatedShinyText className="bg-transparent text-white">
              <div className="flex items-center gap-2 text-white border border-zinc-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {getModelDisplayName(selectedModel)}
              </div>
            </AnimatedShinyText>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-blue-400 hover:bg-blue-500/20 p-2 ml-2"
              title="Model Tuning"
            >
              <Sliders size={16} />
            </Button>
          </div>
          
          {/* Right Side - Apple-style Dropdowns */}
          <div className="flex items-center gap-2 relative">
            {/* Lightning Performance Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLightningDropdownOpen(!lightningDropdownOpen)
                  setCustomModelDropdownOpen(false)
                }}
                className="text-white hover:text-yellow-400 hover:bg-yellow-500/20 p-2 transition-all duration-200"
                title="Performance Settings"
              >
                <Lightning size={18} />
              </Button>
              
              <AppleDropdownOverlay
                isOpen={lightningDropdownOpen}
                onClose={() => setLightningDropdownOpen(false)}
              >
                <LightningPanel />
              </AppleDropdownOverlay>
            </div>
            
            {/* Custom Model Creation Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomModelDropdownOpen(!customModelDropdownOpen)
                  setLightningDropdownOpen(false)
                }}
                className="text-white hover:text-purple-400 hover:bg-purple-500/20 p-2 transition-all duration-200"
                title="Create Custom Model"
              >
                <Plus size={18} />
              </Button>
              
              <AppleDropdownOverlay
                isOpen={customModelDropdownOpen}
                onClose={() => setCustomModelDropdownOpen(false)}
              >
                <CustomModelPanel />
              </AppleDropdownOverlay>
            </div>
          </div>
        </div>
        {/* Messages Area - BLACK BACKGROUND */}
        <ScrollArea className="flex-1 bg-black">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="mb-8"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">AI</span>
                  </div>
                  
                  {/* Enhanced branding with Aurora Text */}
                  <h1 className="text-3xl font-semibold mb-4">
                    <span className="relative inline-block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-aurora bg-[length:200%_auto]">
                      How can I help you today?
                    </span>
                  </h1>
                  
                  <div className="text-zinc-500 animate-pulse">
                    Start a conversation with {getModelDisplayName(selectedModel)}
                  </div>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "mb-6 flex",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >                  <div className={cn(
                    "group max-w-[70%] flex gap-3",
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
                      message.type === 'assistant' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    )}>
                      {message.type === 'assistant' ? 'AI' : 'U'}
                    </div>

                    {/* Message Content */}
                    <div className={cn(
                      "flex-1 min-w-0",
                      message.type === 'user' ? 'text-right' : 'text-left'
                    )}>
                      <div className={cn(
                        "inline-block p-4 rounded-2xl text-white leading-6 text-[15px]",
                        message.type === 'user' 
                          ? 'bg-blue-500/30 border-blue-500/30 rounded-br-md' 
                          : 'bg-transparent rounded-bl-md'
                      )}>
                        {message.content}
                        {isLoading && index === messages.length - 1 && message.type === 'assistant' && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block w-2 h-5 bg-white ml-1"
                          />
                        )}
                      </div>

                      {/* Timestamp and Response Time */}
                      <div className={cn(
                        "flex items-center gap-2 mt-2 text-xs text-zinc-500",
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      )}>
                        <span>
                          {message.timestamp instanceof Date 
                            ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        </span>
                        {message.responseTime && (
                          <span className="text-green-400">
                            {message.responseTime}ms
                          </span>
                        )}
                      </div>

                      {/* Message Actions - Only for AI messages */}
                      {message.type === 'assistant' && !isLoading && (
                        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(message.content)}
                            className="h-8 px-2 text-xs text-white hover:text-blue-400 hover:bg-blue-500/20 rounded"
                          >
                            <Copy size={14} className="mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-white hover:text-blue-400 hover:bg-blue-500/20 rounded"
                          >
                            <ArrowClockwise size={14} className="mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-zinc-900 bg-black p-4 relative">
          {/* Dot pattern background layer behind entire footer - RESTORED */}
          <DotPattern 
            glow={true}
            className="absolute inset-0 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]"
            width={16}
            height={16}
            cx={1}
            cy={1}
            cr={1}
          />
          <div className="max-w-4xl mx-auto relative">
            <div 
              className="relative bg-zinc-950 backdrop-blur-xl rounded-2xl shadow-lg [&:focus-within]:border-0 [&:focus-within]:outline-0 [&:focus-within]:ring-0 [&:focus-within]:shadow-none" 
              style={{ 
                outline: 'none !important', 
                border: 'none !important', 
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1) !important' 
              }}
            >
              <div className="flex items-center gap-2 p-2">
                {/* Context Selector - Far Left */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      className="inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 px-2 h-8 text-xs cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                      title="Select Context"
                    >
                      {selectedContext}
                      <CaretDown size={10} className="ml-1" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-32 bg-zinc-950 border-zinc-900">
                    {availableContexts.map((context) => (
                      <DropdownMenuItem 
                        key={context}
                        onClick={() => setSelectedContext(context)}
                        className="text-white hover:bg-zinc-900 focus:bg-zinc-900 text-xs"
                      >
                        {context}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Code Icon - Next to Context Selector */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 h-8 w-8"
                  title="Code Mode"
                >
                  <Code size={16} />
                </Button>

                {/* Textarea */}
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message Puffin..."
                  className="flex-1 resize-none bg-transparent border-0 py-2 px-2 min-h-[40px] max-h-[200px] text-white placeholder:text-zinc-500 outline-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 [&:focus]:border-0 [&:focus]:outline-0 [&:focus]:ring-0 [&:focus]:shadow-none"
                  style={{ 
                    outline: 'none !important', 
                    border: 'none !important', 
                    boxShadow: 'none !important',
                    borderRadius: '0 !important'
                  }}
                  disabled={isLoading}
                />

                {/* Send Button - Far Right */}
                <div className="flex items-center">
                  {inputValue.trim() && !isLoading ? (
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="h-8 w-8 p-0 rounded-lg bg-white hover:bg-gray-100 text-black flex items-center justify-center transition-all duration-300 shadow-lg"
                    >
                      <PaperPlaneTilt size={14} />
                    </button>
                  ) : (
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg transition-all",
                        "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? (
                        <Stop size={16} />
                      ) : (
                        <PaperPlaneTilt size={16} />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-center mt-3 text-zinc-500">
              Puffin can make mistakes. Check important info.
            </div>
          </div>
        </div>
      </div>
      </div> {/* Close content layer */}
    </div>
  )
}

export default PremiumChatInterface