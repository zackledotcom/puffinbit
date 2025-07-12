import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

// Magic UI Text Animation Component
const TextAnimate = ({ children, animation = "blurInUp", by = "word", delay = 0, className = "" }) => {
  const words = children.split(' ')
  return (
    <motion.div 
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
            delayChildren: delay
          }
        }
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-1"
          variants={{
            hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
            show: { 
              opacity: 1, 
              y: 0, 
              filter: "blur(0px)",
              transition: { duration: 0.3 }
            }
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

// Number Ticker Component
const NumberTicker = ({ value, className = "" }) => {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value)
    }, 500)
    return () => clearTimeout(timer)
  }, [value])
  
  return (
    <motion.span 
      className={className}
      animate={{ opacity: [0, 1] }}
      transition={{ duration: 0.5 }}
    >
      {displayValue}
    </motion.span>
  )
}

// Enhanced Chat Interface Props
interface PremiumChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onSendMessage: (content: string) => Promise<void>
  messages: Array<{
    id: string | number
    type: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    model?: string
    responseTime?: number
  }>
  isLoading: boolean
  stats?: {
    responseTime: number
    tokens: number
    modelLoad: number
  }
}

export default function PremiumChatInterface({
  selectedModel = 'llama3.2:latest',
  onModelChange,
  onSendMessage,
  messages = [],
  isLoading = false,
  stats = { responseTime: 234, tokens: 1247, modelLoad: 89 }
}: PremiumChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return
    
    try {
      await onSendMessage(inputValue)
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col">
      {/* Enhanced Header */}
      <motion.div 
        className="bg-black/20 backdrop-blur-xl border-b border-white/10 p-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.h1 
                className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                animate={{ 
                  backgroundPosition: ["0%", "100%"],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                Puffin AI
              </motion.h1>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-0 left-0 w-1 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                  animate={{
                    x: [0, 50, 100, 150, 0],
                    y: [0, -20, 0, -10, 0],
                    opacity: [0, 1, 0.5, 1, 0],
                    scale: [0, 1, 0.5, 1, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeInOut"
                  }}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <motion.div 
                className="w-2 h-2 bg-green-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span>Local & Private</span>
            </div>
          </div>
          
          {/* Real-time Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-white/40">Response Time</div>
              <div className="text-white font-mono">
                <NumberTicker value={stats.responseTime} />ms
              </div>
            </div>
            <div className="text-center">
              <div className="text-white/40">Tokens</div>
              <div className="text-white font-mono">
                <NumberTicker value={stats.tokens} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-white/40">Model Load</div>
              <div className="text-white font-mono">
                <NumberTicker value={stats.modelLoad} />%
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                  className={cn(
                    'flex gap-4',
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* Avatar */}
                  {message.type !== 'user' && (
                    <motion.div 
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {message.type === 'system' ? '🤖' : '🧠'}
                    </motion.div>
                  )}
                  
                  {/* Message Bubble */}
                  <motion.div
                    className={cn(
                      'max-w-2xl rounded-2xl p-4 shadow-xl group',
                      message.type === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white ml-auto' 
                        : message.type === 'system'
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                        : 'bg-white/10 backdrop-blur-xl border border-white/20 text-white'
                    )}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium opacity-80">
                          {message.type === 'user' ? 'You' : 
                           message.type === 'system' ? 'System' : 
                           message.model?.replace(':latest', '') || 'Assistant'}
                        </span>
                        {message.type === 'assistant' && (
                          <motion.div 
                            className="px-2 py-1 bg-green-500/20 rounded-full text-xs text-green-300"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            Local AI
                          </motion.div>
                        )}
                      </div>
                      <span className="text-xs opacity-60">
                        {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime()) 
                          ? message.timestamp.toLocaleTimeString() 
                          : new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {/* Message Content */}
                    <div className="prose prose-invert max-w-none">
                      <TextAnimate 
                        animation="blurInUp" 
                        by="word"
                        delay={index * 0.1}
                        className="text-sm leading-relaxed"
                      >
                        {message.content}
                      </TextAnimate>
                    </div>
                    
                    {/* Message Actions */}
                    <motion.div 
                      className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button className="text-xs px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition-colors">
                        Copy
                      </button>
                      {message.type === 'assistant' && (
                        <>
                          <button className="text-xs px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition-colors">
                            Regenerate
                          </button>
                          <button className="text-xs px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition-colors">
                            Edit
                          </button>
                        </>
                      )}
                    </motion.div>
                  </motion.div>
                  
                  {/* User Avatar */}
                  {message.type === 'user' && (
                    <motion.div 
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      👤
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Loading Animation */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-4 justify-start"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  🧠
                </div>
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div 
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div 
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                    />
                    <span className="text-white/60 text-sm ml-2">AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      
      {/* Enhanced Input Area */}
      <motion.div 
        className="bg-black/20 backdrop-blur-xl border-t border-white/10 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <motion.div 
              className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
              whileFocus={{ 
                borderColor: "rgba(147, 51, 234, 0.5)",
                boxShadow: "0 0 30px rgba(147, 51, 234, 0.3)"
              }}
            >
              <div className="flex items-end gap-3 p-4">
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask Puffin anything... (Your data stays local)"
                    className="w-full bg-transparent text-white placeholder-white/40 resize-none border-none outline-none text-sm leading-relaxed min-h-[20px] max-h-32"
                    rows={1}
                    style={{ 
                      height: 'auto',
                      minHeight: '20px'
                    }}
                  />
                </div>
                
                <motion.button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                    inputValue.trim() && !isLoading
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/25"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  )}
                  whileHover={inputValue.trim() && !isLoading ? { 
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(147, 51, 234, 0.4)"
                  } : {}}
                  whileTap={inputValue.trim() && !isLoading ? { scale: 0.95 } : {}}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4"
                    >
                      ⟳
                    </motion.div>
                  ) : (
                    <span className="text-lg">→</span>
                  )}
                </motion.button>
              </div>
              
              <motion.div 
                className="px-4 pb-3 flex items-center justify-between text-xs text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-4">
                  <span>✨ Enhanced with Magic UI</span>
                  <span>🔒 Privacy-First</span>
                  <span>⚡ Local Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Press Enter to send</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">↵</kbd>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}