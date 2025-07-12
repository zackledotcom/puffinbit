import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChatCircle, 
  Gear, 
  Code, 
  Sidebar, 
  X, 
  Activity,
  User,
  Headphones,
  SlidersHorizontal,
  Brain,
  WifiHigh,
  Globe,
  Paperclip,
  ArrowsClockwise,
  LayoutGrid,
  Lightning,
  BatteryFull,
  Moon,
  Sun,
  UploadSimple,
  Heart,
  ThumbsDown,
  BookmarkSimple,
  Flag,
  Copy,
  PaperPlaneTilt,
  CheckCircle,
  Warning,
  XCircle
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Textarea } from '@/components/ui/textarea'
import { Toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

// Import MagicUI components we'll need
import { NumberTicker } from '@/components/ui/number-ticker'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { DotPattern } from '@/components/ui/dot-pattern'

// Framer Motion variants for cognitive choreography
const slideInLeft = {
  hidden: { x: -300, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

const fadeInUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 20 } }
}

const scaleIn = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 150, damping: 20 } }
}

const pulseGlow = {
  initial: { boxShadow: "0 0 0 0 rgba(255, 119, 85, 0.4)" },
  animate: { 
    boxShadow: ["0 0 0 0 rgba(255, 119, 85, 0.4)", "0 0 0 8px rgba(255, 119, 85, 0)", "0 0 0 0 rgba(255, 119, 85, 0.4)"],
    transition: { duration: 2, repeat: Infinity }
  }
}

interface AppLayoutProps {
  children?: React.ReactNode
  className?: string
}

// Mock data for Phase 2 features
const mockAgents = [
  { id: 'assistant', name: 'Assistant', icon: '🤖', active: true },
  { id: 'researcher', name: 'Researcher', icon: '🔬', active: false },
  { id: 'writer', name: 'Writer', icon: '✍️', active: false },
  { id: 'analyst', name: 'Analyst', icon: '📊', active: false },
]

const mockChats = [
  { id: '1', title: 'Project Planning', timestamp: '2 min ago', current: true },
  { id: '2', title: 'Code Review Discussion', timestamp: '1 hour ago', current: false },
  { id: '3', title: 'Architecture Design', timestamp: '3 hours ago', current: false },
]

const mockMessages = [
  { 
    id: '1', 
    role: 'user', 
    content: 'Help me plan the Phase 2 implementation for Puffer UI components.',
    timestamp: new Date(Date.now() - 120000)
  },
  { 
    id: '2', 
    role: 'assistant', 
    content: `I'll help you plan the Phase 2 implementation. Let's focus on enhancing the existing AppLayout.tsx with semantic hierarchy and cognitive affordance.

## Key Areas:
1. **Identity Section** - User avatar, model selection, health status
2. **Navigation** - Agents grid, memory access, chat threads  
3. **Global Controls** - Status indicators and settings
4. **Message Flow** - Clean, no-bubble interface
5. **Input Engine** - Multi-modal input with toggles

This approach maintains architectural integrity while adding powerful functionality.`,
    timestamp: new Date(Date.now() - 60000)
  }
]

export default function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeModel, setActiveModel] = useState('llama3.2:latest')
  const [activeAgent, setActiveAgent] = useState('assistant')
  const [messageCount, setMessageCount] = useState(47)
  const [responseTime, setResponseTime] = useState(1247)
  const [modelHealth, setModelHealth] = useState<'healthy' | 'warning' | 'error'>('healthy')
  const [currentInput, setCurrentInput] = useState('')
  const [isInternetEnabled, setIsInternetEnabled] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  
  // Cognitive state management
  const [isModelSwitching, setIsModelSwitching] = useState(false)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [contextualMode, setContextualMode] = useState<'chat' | 'canvas' | 'train'>('chat')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isInputFocused, setIsInputFocused] = useState(false)

  const getHealthColor = () => {
    switch (modelHealth) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-amber-500'  
      case 'error': return 'text-red-500'
      default: return 'text-green-500'
    }
  }

  const getHealthIcon = () => {
    switch (modelHealth) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <Warning className="w-4 h-4" />
      case 'error': return <XCircle className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  // Cognitive feedback system
  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Progressive disclosure logic
  const shouldShowAgent = (agent: any) => {
    if (contextualMode === 'chat') return agent.id === 'assistant' || agent.id === 'researcher'
    if (contextualMode === 'canvas') return agent.id === 'writer' || agent.id === 'analyst'
    return true
  }

  // Smart model switching with feedback
  const handleModelSwitch = async (newModel: string) => {
    setIsModelSwitching(true)
    showToast(`Switching to ${newModel}...`)
    
    // Simulate model switch
    setTimeout(() => {
      setActiveModel(newModel)
      setIsModelSwitching(false)
      showToast(`Now using ${newModel}`)
    }, 1500)
  }

  return (
    <TooltipProvider>
      <div className={cn(
        'flex h-screen bg-[#0c0c0d] text-white relative overflow-hidden',
        className
      )}>
        {/* Subtle dot pattern background */}
        <DotPattern 
          className="absolute inset-0 opacity-20" 
          cr={1}
          cy={50}
          cx={50}
        />
        
        {/* 🔳 ZONE 1: LEFT SIDEBAR - Cognitive Enhancement */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="w-80 bg-[#1a1a1c]/80 backdrop-blur-xl border-r border-white/10 flex flex-col z-10"
            >
              {/* TOP: Identity Section with Breathing Animation */}
              <motion.div 
                variants={fadeInUp}
                className="p-6 border-b border-white/10 space-y-4"
              >
                {/* Puffer Logo with Pulse */}
                <motion.div 
                  className="flex items-center gap-3"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div 
                    className="w-6 h-6 bg-[#ff7755] rounded-md flex items-center justify-center"
                    variants={pulseGlow}
                    initial="initial"
                    animate="animate"
                  >
                    <span className="text-xs font-bold text-white">P</span>
                  </motion.div>
                  <span className="font-medium text-white">Puffer</span>
                </motion.div>

                {/* User Avatar with Hover Growth */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-10 h-10 p-0 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <User className="w-5 h-5 text-white/70" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Click to upload avatar</p>
                  </TooltipContent>
                </Tooltip>

                {/* Model Avatar & Health with Smart Indicators */}
                <motion.div 
                  className="flex items-center gap-3"
                  layout
                  transition={{ type: "spring", stiffness: 100 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <motion.div
                          whileHover={{ rotate: 15 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Headphones className="w-5 h-5 text-white/70" />
                        </motion.div>
                        <motion.div 
                          className={cn('w-2 h-2 rounded-full', getHealthColor())}
                          animate={modelHealth === 'healthy' ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="flex items-center gap-2">
                        {getHealthIcon()}
                        <span>Model: {activeModel} ({modelHealth})</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  <AnimatePresence>
                    {(isModelSwitching || showAdvancedControls) && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ type: "spring", stiffness: 150 }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isModelSwitching}
                              className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
                            >
                              {isModelSwitching ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <ArrowsClockwise className="w-4 h-4" />
                                </motion.div>
                              ) : (
                                <SlidersHorizontal className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{isModelSwitching ? 'Switching model...' : 'Model selector'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>

              {/* Smart Agents Grid - Progressive Disclosure */}
              <motion.div 
                variants={fadeInUp}
                className="p-6 border-b border-white/10"
              >
                <motion.h3 
                  className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3"
                  whileHover={{ color: "rgba(255, 255, 255, 0.8)" }}
                >
                  Agents • {contextualMode}
                </motion.h3>
                <motion.div 
                  className="grid grid-cols-2 gap-2"
                  layout
                  transition={{ type: "spring", stiffness: 100 }}
                >
                  <AnimatePresence mode="popLayout">
                    {mockAgents
                      .filter(shouldShowAgent)
                      .map((agent, index) => (
                      <motion.div
                        key={agent.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 150, 
                          delay: index * 0.1 
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveAgent(agent.id)
                                showToast(`Switched to ${agent.name} agent`)
                              }}
                              className={cn(
                                'h-12 flex flex-col items-center gap-1 relative w-full',
                                'text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200',
                                activeAgent === agent.id && 'text-[#ff7755] bg-[#ff7755]/20',
                                activeAgent === agent.id && 'border-l-2 border-[#ff7755]'
                              )}
                            >
                              <motion.span 
                                className="text-lg"
                                animate={activeAgent === agent.id ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ duration: 0.3 }}
                              >
                                {agent.icon}
                              </motion.span>
                              <span className="text-xs">{agent.name}</span>
                              {activeAgent === agent.id && (
                                <motion.div 
                                  className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#ff7755]"
                                  layoutId="activeAgentBar"
                                  transition={{ type: "spring", stiffness: 300 }}
                                />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{agent.name} Agent</p>
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>

            {/* Context Memory */}
            <div className="p-6 border-b border-white/10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Brain className="w-4 h-4 mr-3" />
                    Context Memory
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Open memory overlay</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Chat Threads */}
            <div className="flex-1 overflow-auto">
              <Accordion type="single" collapsible className="w-full" defaultValue="chats">
                <AccordionItem value="chats" className="border-none">
                  <AccordionTrigger className="px-6 py-3 text-xs font-medium text-white/50 uppercase tracking-wider hover:no-underline">
                    Chat Threads
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-2">
                    <div className="space-y-1">
                      {mockChats.map((chat) => (
                        <Button
                          key={chat.id}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'w-full justify-start text-left h-auto p-3 relative',
                            'text-white/60 hover:text-white hover:bg-white/10',
                            chat.current && 'text-white bg-white/10 border-l-2 border-[#ff7755]'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{chat.title}</p>
                            <p className="text-xs text-white/40">{chat.timestamp}</p>
                          </div>
                          {chat.current && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#ff7755]" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Bottom: Status */}
            <div className="p-6 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <WifiHigh className="w-4 h-4" />
                <span>Connected</span>
              </div>
              <div className="text-xs text-white/40">v1.0.0</div>
            </div>
          </div>
        )}
      
      {/* 🔳 ZONE 2: MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* TOP HEADER - Enhanced with Phase 2 */}
        <div className="h-16 bg-[#1a1a1c]/80 backdrop-blur-xl border-b border-white/10 px-6 flex items-center justify-between z-10">
          {/* Left: Status Indicators */}
          <div className="flex items-center gap-6">
            {!sidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSidebarOpen(true)}
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Sidebar className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open sidebar</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-[#ff7755] rounded-md flex items-center justify-center">
                <span className="text-xs font-bold text-white">P</span>
              </div>
              <h1 className="text-lg font-medium text-white">Puffer</h1>
            </div>

            {/* Memory Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <BatteryFull className={cn('w-4 h-4', getHealthColor())} />
                  <span className="text-xs text-white/60">Memory</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Memory status: {modelHealth}</p>
              </TooltipContent>
            </Tooltip>

            {/* Connection Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <WifiHigh className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-white/60">Connected</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Local connection active</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Right: Controls + Live Stats */}
          <div className="flex items-center gap-6">
            {/* Live Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-white/50">Messages:</span>
                <NumberTicker 
                  value={messageCount} 
                  className="text-[#ff7755] font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/50">Response:</span>
                <NumberTicker 
                  value={responseTime} 
                  className="text-[#ff7755] font-medium"
                />
                <span className="text-white/50">ms</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <UploadSimple className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export conversation</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Model settings</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle theme</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        
        {/* 🔳 ZONE 3: CENTER PANEL - Enhanced with Phase 2 */}
        <div className="flex-1 flex flex-col">
          {/* Chat Message List */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {mockMessages.length === 0 ? (
              /* Welcome State */
              <div className="flex items-center justify-center h-full">
                <div className="max-w-2xl mx-auto text-center space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-light text-white">
                      Ready to assist
                    </h2>
                    <p className="text-white/60">
                      Your local AI operating layer is active and ready for your queries.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Messages */
              mockMessages.map((message) => (
                <div key={message.id} className="space-y-4">
                  {message.role === 'user' ? (
                    /* User Message - No Bubble, Left Aligned */
                    <div className="max-w-4xl">
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                        <p className="text-white/90">{message.content}</p>
                        <div className="flex justify-between items-center mt-2 text-xs text-white/40">
                          <span>You</span>
                          <span>
                            {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime()) 
                              ? message.timestamp.toLocaleTimeString() 
                              : new Date().toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message - Full Width, No Bubble */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Headphones className="w-4 h-4 text-[#ff7755]" />
                        <span className="text-sm font-medium text-[#ff7755]">{activeModel}</span>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        <div className="text-white/90 leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                              >
                                <Heart className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Like response</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Dislike response</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                              >
                                <BookmarkSimple className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Save response</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy response</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-xs text-white/40">
                          {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime()) 
                            ? message.timestamp.toLocaleTimeString() 
                            : new Date().toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat Input - Sticky Bottom */}
          <div className="border-t border-white/10 bg-[#1a1a1c]/80 backdrop-blur-xl p-6">
            <div className="max-w-4xl space-y-4">
              {/* Input Area */}
              <div className="relative">
                <Textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Ask Puffer anything..."
                  className="min-h-[60px] max-h-[180px] bg-white/10 border-white/20 text-white placeholder-white/40 resize-none pr-16"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      // Handle send message
                    }
                  }}
                />
                
                {/* Send Button */}
                <Button
                  size="sm"
                  disabled={!currentInput.trim() || isStreaming}
                  className="absolute bottom-3 right-3 h-8 w-8 p-0 bg-[#ff7755] hover:bg-[#ff7755]/80 text-white"
                >
                  <PaperPlaneTilt className="w-4 h-4" />
                </Button>

                {/* Streaming Indicator */}
                {isStreaming && (
                  <div className="absolute bottom-3 right-14">
                    <TextShimmer className="text-xs text-[#ff7755]">
                      Thinking...
                    </TextShimmer>
                  </div>
                )}
              </div>

              {/* Input Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload file</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsInternetEnabled(!isInternetEnabled)}
                        className={cn(
                          'h-8 w-8 p-0 hover:bg-white/10',
                          isInternetEnabled ? 'text-[#ff7755]' : 'text-white/60 hover:text-white'
                        )}
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isInternetEnabled ? 'Disable' : 'Enable'} internet access</p>
                    </TooltipContent>
                  </Tooltip>
                  
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{contextualMode === 'canvas' ? 'Exit canvas mode' : 'Canvas mode'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </motion.div>
                          
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: -10 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setContextualMode(contextualMode === 'train' ? 'chat' : 'train')}
                                  className={cn(
                                    'h-8 w-8 p-0 hover:bg-white/10 transition-all duration-200',
                                    contextualMode === 'train' ? 'text-[#ff7755] bg-[#ff7755]/20' : 'text-white/60 hover:text-white'
                                  )}
                                >
                                  <Lightning className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{contextualMode === 'train' ? 'Exit train mode' : 'Train mode'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  
                  {/* Smart keyboard hint */}
                  <motion.div 
                    className="text-xs text-white/40"
                    animate={isInputFocused ? { opacity: 1 } : { opacity: 0.6 }}
                  >
                    Press ⌘+Enter to send
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>

        {/* System Feedback - Toast Notifications */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <div className="bg-[#1a1a1c]/90 backdrop-blur-xl border border-white/20 rounded-lg px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.3 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </motion.div>
                  <span className="text-sm text-white">{toastMessage}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  )
}