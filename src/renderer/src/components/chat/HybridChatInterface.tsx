"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, ChevronDown, PanelLeft, Trash2, Settings, Sun, Moon, SlidersHorizontal, Upload, Monitor, Globe, ChevronRight, Code, Square, ArrowUp, BookOpen, Zap, Wifi, WifiOff, Brush, PlayCircle, X, Robot, Sparkle, Download, Wand2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { DotPattern } from "@/components/ui/dot-pattern"

// Simple Ollama icon component
const OllamaIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="8" r="3"/>
    <path d="M12 14c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z"/>
    <circle cx="8" cy="6" r="1"/>
    <circle cx="16" cy="6" r="1"/>
  </svg>
)

interface Message {
  id: string | number
  type: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  model?: string
  responseTime?: number
  codeOutput?: string; // Added for exec result
  codeError?: string; // Added for exec error
}

interface ThreadItem {
  id: string
  title: string
  timestamp: string
  messages: Message[]
}

interface MemoryItem {
  id: string
  title: string
  date: string
}

interface HybridChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  messages: Message[]
  isLoading: boolean
  onSendMessage: (content: string) => Promise<void>
  stats?: {
    responseTime?: number
    tokens?: number
    modelLoad?: number
  }
}

const HybridChatInterface: React.FC<HybridChatInterfaceProps> = ({
  selectedModel,
  onModelChange,
  messages,
  isLoading,
  onSendMessage,
  stats,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentThreadId, setCurrentThreadId] = useState("thread-1")
  const [systemHealthPercentage, setSystemHealthPercentage] = useState(80)
  const [modelHealthPercentage, setModelHealthPercentage] = useState(95)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark")
  const [isOnline, setIsOnline] = useState(false)
  
  // Input area state
  const [inputValue, setInputValue] = useState("")
  const [selectedContext, setSelectedContext] = useState("General")
  
  // Overlay state
  const [powerOverlayOpen, setPowerOverlayOpen] = useState(false)
  
  // Modelfile customization state
  const [modelfileContent, setModelfileContent] = useState('')
  const [isUpdatingModelfile, setIsUpdatingModelfile] = useState(false)
  const [modelfileError, setModelfileError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Dynamic model state instead of hardcoded array
  const [availableModels, setAvailableModels] = useState<string[]>([])

  const availableContexts = ["General", "Code", "Research", "Writing"]

  // Fetch available models on mount
  useEffect(() => {
    window.api.getOllamaModels().then((response: { success: boolean; models: string[] }) => {
      const models = response.success ? response.models : [];
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(selectedModel)) {
        onModelChange(models[0]); // Default to first available
      }
    }).catch((err) => {
      console.error('Failed to fetch models:', err);
      setAvailableModels([]); // Fallback empty
    });
  }, [selectedModel, onModelChange]);

  const [threads, setThreads] = useState<ThreadItem[]>([
    {
      id: "thread-1",
      title: "New conversation",
      timestamp: "Just now",
      messages: [],
    },
    {
      id: "thread-2",
      title: "Project Alpha Brainstorm",
      timestamp: "Yesterday",
      messages: [],
    },
    {
      id: "thread-3",
      title: "Marketing Strategy Q3",
      timestamp: "2 days ago",
      messages: [],
    },
  ])

  const memories: MemoryItem[] = [
    { id: "mem-1", title: "Meeting Notes - 2024-07-15", date: "July 15, 2024" },
    { id: "mem-2", title: "Research on Quantum Computing", date: "July 10, 2024" },
    { id: "mem-3", title: "Code Snippets - React Hooks", date: "June 28, 2024" },
  ]

  // Chat API integration with your existing Puffin backend - REMOVED BROKEN ASSISTANT UI
  // Using your working message system instead

  const startNewChat = () => {
    const newThread: ThreadItem = {
      id: `thread-${Date.now()}`,
      title: "New conversation",
      timestamp: "Just now",
      messages: [],
    }
    setThreads((prev) => [newThread, ...prev])
    setCurrentThreadId(newThread.id)
  }

  const deleteThread = (threadId: string) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId))
    if (currentThreadId === threadId) {
      const remainingThreads = threads.filter((thread) => thread.id !== threadId)
      if (remainingThreads.length > 0) {
        setCurrentThreadId(remainingThreads[0]?.id)
      } else {
        startNewChat()
      }
    }
  }

  const getModelDisplayName = (model: string) => {
    return model
      .replace(":latest", "")
      .replace("deepseek-coder", "DeepSeek Coder")
      .replace("qwen2.5", "Qwen 2.5")
      .replace("phi3.5", "Phi 3.5")
      .replace("tinydolphin", "TinyDolphin")
      .replace("openchat", "OpenChat")
      .replace("llama3.2", "Llama 3.2")
  }

  const onThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
  }

  const handleOnlineToggle = () => {
    const newOnlineState = !isOnline
    setIsOnline(newOnlineState)
    
    // Show toast explaining the mode
    if (newOnlineState) {
      // Switching to online
      console.log("Toast: Online mode - Access to cloud models enabled")
    } else {
      // Switching to offline
      console.log("Toast: Offline mode - Local Ollama models only")
    }
  }

  // Modelfile update handler with enhanced error handling
  const handleModelfileUpdate = async () => {
    if (!modelfileContent.trim()) {
      setModelfileError('Modelfile content cannot be empty');
      return;
    }

    // Check content size before sending
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (modelfileContent.length > maxSize) {
      setModelfileError(`Content too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setIsUpdatingModelfile(true);
    setModelfileError(null);

    try {
      const result = await window.api.updateModelfile({
        modelName: selectedModel,
        content: modelfileContent,
        options: {
          customName: `${selectedModel.replace(/[^a-zA-Z0-9\-_:.]/g, '')}-custom`,
          validate: true
        }
      });

      if (result.success) {
        console.log(`Toast: Custom model "${result.modelName}" created successfully (${result.responseTime}ms)`);
        // Clear the content on success
        setModelfileContent('');
        setModelfileError(null);
      } else {
        // Enhanced error handling for different security scenarios
        if (result.error?.includes('Rate limit')) {
          setModelfileError('⏱️ Rate limit: Maximum 3 updates per minute');
        } else if (result.error?.includes('Security violation')) {
          setModelfileError('🛡️ Security: Content contains banned patterns');
        } else if (result.error?.includes('exceeds maximum size')) {
          setModelfileError('📏 Size limit exceeded (10MB max)');
        } else if (result.error?.includes('invalid characters')) {
          setModelfileError('🔤 Model name contains invalid characters');
        } else {
          setModelfileError(result.error || 'Failed to update modelfile');
        }
      }
    } catch (error) {
      setModelfileError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsUpdatingModelfile(false);
    }
  };

  const onOpenSettings = () => {
    console.log("Opening settings...")
  }

  // Input handling functions with RAG integration
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const content = inputValue.trim()
    setInputValue("")
    
    // Create user message immediately
    const userMsg: Message = { 
      id: Date.now(), 
      type: 'user', 
      content, 
      timestamp: new Date() 
    }
    
    // Update messages state if available (fallback to onSendMessage if not)
    if (typeof messages !== 'undefined') {
      // Direct state update (if messages is a state variable)
      // This assumes messages is managed in parent and passed down
      // We'll need to call onSendMessage to update parent state
    }
    
    try {
      // Step 1: Search memory for relevant context (RAG)
      const context = await window.api.searchMemory(content, 3)
      
      // Step 2: Combine context with user message
      const prompt = `${context}\n${content}`
      
      // Step 3: Send enhanced prompt to AI
      const result = await window.api.chatWithAI({ 
        message: prompt, 
        model: selectedModel 
      })
      
      if (!result.success) {
        throw new Error(result.error || 'AI request failed')
      }
      
      // Step 4: Create AI response message  
      const aiMsg: Message = { 
        id: Date.now() + 1, 
        type: 'assistant', 
        content: result.response || result.message || 'No response', 
        timestamp: new Date() 
      }
      
      // Call the parent's message handler for both messages
      await onSendMessage(content) // This should handle both user and AI messages
      
    } catch (err) {
      console.error('Message send failed:', err)
      const errorMsg: Message = { 
        id: Date.now() + 2, 
        type: 'system', 
        content: `Error: ${err instanceof Error ? err.message : String(err)}`, 
        timestamp: new Date() 
      }
      // Handle error message through parent
      await onSendMessage(`System Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Code execution handler
  const handleRunCode = (messageId: string | number, code: string) => {
    window.api.execCode({ code, lang: 'js' }).then((output) => {
      // Update message with output
      // Assume you have a way to update messages state
      console.log('Code output:', output);
    }).catch((error) => {
      console.log('Code error:', error);
    });
  };

  // Code detection regex
  const codeRegex = /```(\w+)?\r?\n([\s\S]*?)\r?\n```/g;

  // Power Overlay Component - Simplified and Working
  const PowerOverlay = () => {
    if (!powerOverlayOpen) return null;
    
    return (
      <AnimatePresence>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setPowerOverlayOpen(false)}
        />
        
        {/* Half Screen Overlay */}
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.4 
          }}
          className="fixed top-0 right-0 h-full w-[600px] bg-neutral-900/95 backdrop-blur-xl border-l border-neutral-800/50 shadow-2xl z-50 overflow-y-auto"
          style={{
            boxShadow: '-25px 0 50px -12px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Power Center</h2>
                <p className="text-sm text-neutral-400">Performance & Model Creation</p>
              </div>
            </div>
            <button
              onClick={() => setPowerOverlayOpen(false)}
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Performance Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Performance Settings</h3>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Performance Mode</div>
                      <div className="text-xs text-neutral-400">Optimize for Apple Silicon</div>
                    </div>
                    <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">GPU Acceleration</div>
                      <div className="text-xs text-neutral-400">Metal Performance Shaders</div>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Model Creation Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Robot size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Create Custom Model</h3>
              </div>
              
              <div className="space-y-3">
                <button className="w-full p-4 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 transition-all duration-200 text-left group">
                  <div className="flex items-center gap-3">
                    <Wand2 size={18} className="text-blue-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Quick Setup</div>
                      <div className="text-xs text-neutral-400">Use templates and presets</div>
                    </div>
                    <ChevronRight size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                  </div>
                </button>
                
                <button className="w-full p-4 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 transition-all duration-200 text-left group">
                  <div className="flex items-center gap-3">
                    <Code size={18} className="text-green-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Advanced Editor</div>
                      <div className="text-xs text-neutral-400">Custom Modelfile creation</div>
                    </div>
                    <ChevronRight size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                  </div>
                </button>
                
                <button className="w-full p-4 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 transition-all duration-200 text-left group">
                  <div className="flex items-center gap-3">
                    <Upload size={18} className="text-purple-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Import Model</div>
                      <div className="text-xs text-neutral-400">Load from file or URL</div>
                    </div>
                    <ChevronRight size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white font-inter h-full">
      {/* Background Pattern for entire app */}
      <div className="fixed inset-0 bg-dot-white/[0.2] bg-[size:20px_20px] pointer-events-none" />
      <div className="relative z-10 flex flex-1 min-h-0">
        {/* ENHANCED SIDEBAR */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-72 bg-black border-r border-neutral-800 flex flex-col"
            >
              {/* Sidebar Header with Toggle */}
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="text-lg font-medium text-blue-400">Puffin AI</div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors"
                    title="Memories"
                  >
                    <BookOpen size={16} />
                  </button>
                  <button
                    className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors"
                    title="MCP"
                  >
                    <Zap size={16} />
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors"
                    title="Close Sidebar"
                  >
                    <PanelLeft size={19} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  {/* New Chat Icon Button */}
                  <button
                    onClick={startNewChat}
                    className="flex items-center justify-center h-11 w-11 rounded-md bg-black text-white border border-neutral-800 hover:border-blue-300/50 hover:bg-neutral-700 transition-colors"
                    title="New Chat"
                  >
                    <Plus size={19} />
                  </button>
                  
                  {/* Online/Offline Toggle */}
                  <button
                    onClick={handleOnlineToggle}
                    className={cn(
                      "flex items-center justify-center h-11 w-11 rounded-md transition-colors border",
                      isOnline 
                        ? "bg-white border-white text-black hover:bg-gray-100" 
                        : "bg-neutral-700/50 border-neutral-600 text-neutral-400 hover:bg-neutral-700"
                    )}
                    title={isOnline ? "Online - Cloud Models" : "Offline - Local Models Only"}
                  >
                    {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                  </button>

                  {/* Ollama Status Indicator */}
                  <div 
                    className="flex items-center justify-center h-11 w-11 rounded-md bg-neutral-700/50 border border-neutral-600 text-neutral-400"
                    title="Ollama Running"
                  >
                    <OllamaIcon size={16} />
                  </div>
                </div>
                {/* Model Selector */}
                <div className="mb-4">
                  <div className="text-sm font-bold text-neutral-400 mb-2 uppercase tracking-wider">Choose Model</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full flex items-center justify-between h-11 px-3 rounded-md bg-black text-neutral-300 hover:bg-neutral-700 border border-neutral-800 hover:border-blue-300/50 transition-colors text-sm">
                        <span className="truncate text-sm">{getModelDisplayName(selectedModel)}</span>
                        <ChevronDown size={19} className="text-neutral-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-black border border-neutral-800">
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => onModelChange(model)}
                          className="text-neutral-300 hover:bg-blue-400/30 focus:bg-blue-400/30 text-sm cursor-pointer"
                        >
                          {getModelDisplayName(model)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Modelfile Customization with Security Features */}
                <div className="mb-4">
                  <div className="text-sm font-bold text-neutral-400 mb-2 uppercase tracking-wider">Customize Model</div>
                  
                  {/* Security Info */}
                  <div className="mb-2 text-xs text-neutral-500">
                    🛡️ Secured: Max 10MB, 3/min rate limit, content validation
                  </div>
                  
                  <Textarea
                    value={modelfileContent}
                    onChange={(e) => setModelfileContent(e.target.value)}
                    placeholder="Example:
FROM llama2
SYSTEM You are a helpful assistant.
TEMPLATE {{ .Prompt }}"
                    className="w-full h-32 bg-neutral-900 border border-neutral-700 text-white p-2 rounded resize-none text-sm font-mono"
                  />
                  
                  {/* Content Size Indicator */}
                  <div className="flex justify-between items-center mt-1 text-xs text-neutral-500">
                    <span>
                      {(modelfileContent.length / 1024).toFixed(1)}KB / 10MB
                    </span>
                    <span>
                      Valid directives: FROM, SYSTEM, TEMPLATE, PARAMETER
                    </span>
                  </div>
                  
                  {/* Error Display with Enhanced Styling */}
                  {modelfileError && (
                    <div className="mt-2 p-2 bg-red-900/20 border border-red-700/50 rounded text-xs text-red-400">
                      {modelfileError}
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleModelfileUpdate}
                    disabled={isUpdatingModelfile || !modelfileContent.trim()}
                    className="w-full mt-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed h-9 text-sm"
                  >
                    {isUpdatingModelfile ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Custom Model...
                      </div>
                    ) : (
                      'Create Custom Model'
                    )}
                  </Button>
                </div>
              </div>
              {/* Thread List */}
              <ScrollArea className="flex-1 px-3 py-2 bg-black">
                <div className="mb-2 uppercase tracking-wider px-3 text-slate-300 font-black text-sm">Recent Chats</div>
                {threads.map((thread) => (
                  <motion.div
                    key={thread.id}
                    whileHover={{ backgroundColor: "rgb(20, 20, 23)" }}
                    className={cn(
                      "group p-3 rounded-md cursor-pointer mb-1 transition-colors flex items-center justify-between text-white",
                      thread.id === currentThreadId
                        ? "bg-neutral-900 border border-blue-300/50 shadow-md shadow-blue-300/10"
                        : "hover:bg-neutral-900",
                    )}
                  >
                    <div className="flex-1 min-w-0" onClick={() => setCurrentThreadId(thread.id)}>
                      <div className="text-sm truncate text-white">{thread.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">{thread.timestamp}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteThread(thread.id)
                      }}
                      className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity p-1 h-6 w-6 text-neutral-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </motion.div>
                ))}
              </ScrollArea>
              {/* Sidebar Footer with Theme Toggle */}
              <div className="px-4 py-3 border-t border-neutral-900">
                <div className="flex items-center justify-between">
                  <button
                    onClick={onOpenSettings}
                    className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-500 hover:text-neutral-300 transition-colors"
                    aria-label="Settings"
                  >
                    <Settings size={19} />
                  </button>
                  <div className="flex items-center gap-1 bg-black p-1 rounded-md border border-neutral-800">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => onThemeChange(t)}
                        className={cn(
                          "p-1.5 rounded-md transition-colors text-slate-50",
                          theme === t
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700",
                        )}
                        aria-label={`${t} theme`}
                      >
                        {t === "light" && <Sun size={14} />}
                        {t === "dark" && <Moon size={14} />}
                        {t === "system" && <Monitor className="text-slate-50" size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Stats Display */}
                {stats && (
                  <div className="text-xs text-neutral-500 mt-2 space-y-1">
                    {stats.responseTime && <div>Response: {stats.responseTime}ms</div>}
                    {stats.tokens && <div>Tokens: {stats.tokens}</div>}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Floating Sidebar Toggle - Visible when sidebar is closed */}
        <AnimatePresence>
          {!sidebarOpen && (
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-2 top-4 z-50"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="text-white hover:bg-neutral-700 p-1.5 border border-white/30 hover:border-blue-300/50 rounded-full bg-black backdrop-blur"
                title="Open Sidebar"
              >
                <PanelLeft size={19} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          {/* Chat Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="h-16 flex-shrink-0 bg-black flex items-center justify-between px-6 border-b border-neutral-800"
          >
            <div className="flex items-center">
              <div className="flex items-center gap-2 bg-neutral-950 text-neutral-200 px-3 py-1.5 rounded-md text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{getModelDisplayName(selectedModel)}</span>
              </div>
              <button
                className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors ml-2"
                title="Model Settings"
              >
                <SlidersHorizontal size={19} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPowerOverlayOpen(true)}
                className="text-neutral-400 hover:text-yellow-400 p-1.5 rounded-md hover:bg-yellow-500/20 transition-all duration-200"
                title="Power Center"
              >
                <Zap size={19} />
              </button>
              <button
                className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors"
                title="Export Chat"
              >
                <Upload size={19} />
              </button>
              <button
                className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors"
                title="Online Mode"
              >
                <Globe size={19} />
              </button>
            </div>
          </motion.div>

          {/* Chat Messages Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-black">
                {/* DotPattern glow behind messages */}
                <DotPattern
                  width={30}
                  height={30}
                  cx={1.5}
                  cy={1.5}
                  cr={1.5}
                  className={cn(
                    "absolute inset-0 z-0 opacity-30 [mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
                  )}
                  style={{
                    background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 30%, transparent 60%)'
                  }}
                />
              </div>
              <div className="relative h-full overflow-y-auto">
                {/* WORKING MESSAGE DISPLAY - Replaced broken Assistant UI */}
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-lg">AI</span>
                      </div>
                      <h1 className="text-3xl font-semibold mb-4">
                        <span className="relative inline-block bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                          How can I help you today?
                        </span>
                      </h1>
                      <div className="text-neutral-500">
                        Start a conversation with {getModelDisplayName(selectedModel)}
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <div className="px-4 py-6">
                    {messages.map((message, index) => {
                      const isCode = /```(\w+)?\n([\s\S]*?)\n```/.test(message.content); // Detect code block
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={cn(
                            "mb-6 flex",
                            message.type === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div className={cn(
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

                              {/* Timestamp */}
                              <div className={cn(
                                "flex items-center gap-2 mt-2 text-xs text-neutral-500",
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
                              {/* Code Run Button */}
                              {isCode && message.type === 'assistant' && (
                                <Button
                                  onClick={() => handleRunCode(message.id, message.content.match(codeRegex)[2])}
                                  className="mt-2 bg-green-500 hover:bg-green-600 text-white text-xs p-2 rounded"
                                >
                                  <PlayCircle size={14} /> Run Code
                                </Button>
                              )}
                              {message.codeOutput && (
                                <div className="mt-2 p-2 bg-neutral-800 rounded text-green-400 text-xs">
                                  Output: {message.codeOutput}
                                </div>
                              )}
                              {message.codeError && (
                                <div className="mt-2 p-2 bg-red-500/20 rounded text-red-400 text-xs">
                                  Error: {message.codeError}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* INPUT AREA - ADDED */}
            <div className="border-t border-neutral-800 bg-black p-4 pb-2 relative">
              <DotPattern 
                width={16}
                height={16}
                cx={1}
                cy={1}
                cr={1}
                className="absolute inset-0 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)] opacity-30"
                style={{
                  background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, transparent 50%)'
                }}
              />
              <div className="max-w-4xl mx-auto relative">
                <div className="relative bg-neutral-950 backdrop-blur-xl rounded-2xl">
                  <div className="flex items-center gap-2 p-2">
                    {/* Context Selector - Add Context */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-neutral-300 hover:text-white hover:bg-neutral-700 px-3 h-10 text-sm"
                      title="Add Context"
                    >
                      <Plus size={16} />
                    </Button>

                    {/* Code Icon */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-neutral-300 hover:text-white hover:bg-neutral-700 px-3 h-10 w-10"
                      title="Code Mode"
                    >
                      <Code size={16} />
                    </Button>

                    {/* Vertical Divider */}
                    <div className="w-px h-6 bg-neutral-600"></div>

                    {/* Textarea */}
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Message Puffin..."
                      className="flex-1 resize-none bg-transparent border-0 py-2 px-2 min-h-[40px] max-h-[200px] text-white placeholder:text-neutral-500 outline-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0"
                      disabled={isLoading}
                    />

                    {/* Send Button */}
                    <div className="flex items-center mr-2">
                      {inputValue.trim() && !isLoading ? (
                        <button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim() || isLoading}
                          className="h-8 w-8 p-0 rounded-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-all duration-300 shadow-lg"
                        >
                          <ArrowUp size={14} />
                        </button>
                      ) : (
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim() || isLoading}
                          size="sm"
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg transition-all",
                            isLoading ? "bg-red-500 text-white" : "bg-blue-500 text-white hover:bg-blue-600"
                          )}
                        >
                          {isLoading ? (
                            <Square size={16} />
                          ) : (
                            <ArrowUp size={16} />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-center mt-3 text-neutral-500">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Power Overlay */}
      <PowerOverlay />
    </div>
  )
}

export default HybridChatInterface