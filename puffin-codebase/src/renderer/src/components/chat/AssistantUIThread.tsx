import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

// Simple icons for the chat interface
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m22 2-7 20-4-9-9-4Z"/>
    <path d="M22 2 11 13"/>
  </svg>
)

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
)

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M3 21v-5h5"/>
  </svg>
)

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
)

const StopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="10" height="10" x="7" y="7" rx="2"/>
  </svg>
)

// Message Types
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
}

interface AssistantUIThreadProps {
  messages: Message[]
  onSendMessage: (content: string) => Promise<void>
  isLoading?: boolean
  selectedModel?: string
  onModelChange?: (model: string) => void
}

// Tooltip component
const Tooltip: React.FC<{ children: React.ReactNode; content: string }> = ({ children, content }) => {
  const [visible, setVisible] = useState(false)
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
          {content}
        </div>
      )}
    </div>
  )
}

// Action Button Component
const ActionButton: React.FC<{
  onClick: () => void
  icon: React.ReactNode
  tooltip: string
  className?: string
}> = ({ onClick, icon, tooltip, className }) => (
  <Tooltip content={tooltip}>
    <button
      onClick={onClick}
      className={cn(
        "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
        className
      )}
    >
      {icon}
    </button>
  </Tooltip>
)

// Welcome Component
const ThreadWelcome: React.FC = () => (
  <div className="flex w-full max-w-2xl flex-grow flex-col">
    <div className="flex w-full flex-grow flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Puffin AI Assistant
        </h1>
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          How can I help you today?
        </p>
      </motion.div>
    </div>
    <WelcomeSuggestions />
  </div>
)

// Welcome Suggestions
const WelcomeSuggestions: React.FC<{ onSuggestionClick?: (prompt: string) => void }> = ({ 
  onSuggestionClick = () => {} 
}) => {
  const suggestions = [
    "What is Puffin AI?",
    "Help me write a creative story",
    "Explain quantum computing simply",
    "Plan a healthy meal for today"
  ]

  return (
    <div className="grid grid-cols-2 gap-3 mt-6">
      {suggestions.map((prompt, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          onClick={() => onSuggestionClick(prompt)}
          className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {prompt}
          </span>
        </motion.button>
      ))}
    </div>
  )
}

// User Message Component
const UserMessage: React.FC<{ message: Message; onEdit?: () => void }> = ({ message, onEdit }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="w-full max-w-2xl grid grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4"
  >
    {/* Action Bar */}
    <div className="col-start-1 row-start-2 mr-3 mt-2.5 flex flex-col items-end">
      {onEdit && (
        <ActionButton
          onClick={onEdit}
          icon={<EditIcon />}
          tooltip="Edit"
        />
      )}
    </div>

    {/* Message Content */}
    <div className="col-start-2 row-start-2 max-w-[calc(100%-72px)] break-words rounded-3xl bg-gray-100 dark:bg-gray-700 px-5 py-2.5 text-gray-900 dark:text-gray-100">
      {message.content}
    </div>
  </motion.div>
)

// Assistant Message Component  
const AssistantMessage: React.FC<{ 
  message: Message
  onCopy?: () => void
  onRegenerate?: () => void 
}> = ({ message, onCopy, onRegenerate }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full max-w-2xl grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4"
    >
      {/* Message Content */}
      <div className="col-span-2 col-start-2 row-start-1 my-1.5 max-w-[calc(100%-auto)] break-words leading-7 text-gray-900 dark:text-gray-100">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          {message.content}
        </div>
      </div>

      {/* Action Bar */}
      <div className="col-start-3 row-start-2 -ml-1 flex gap-1 text-gray-500">
        <ActionButton
          onClick={handleCopy}
          icon={copied ? "✓" : <CopyIcon />}
          tooltip={copied ? "Copied!" : "Copy"}
        />
        {onRegenerate && (
          <ActionButton
            onClick={onRegenerate}
            icon={<RefreshIcon />}
            tooltip="Regenerate"
          />
        )}
      </div>
    </motion.div>
  )
}

// Composer Component
const Composer: React.FC<{
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onCancel?: () => void
  isLoading?: boolean
  placeholder?: string
}> = ({ 
  value, 
  onChange, 
  onSend, 
  onCancel, 
  isLoading = false,
  placeholder = "Type a message..." 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) {
        onSend()
      }
    }
  }

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-end rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-grow resize-none border-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
          rows={1}
          style={{ minHeight: '20px', maxHeight: '160px' }}
        />
        
        {isLoading ? (
          <button
            onClick={onCancel}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-600 text-white transition-colors hover:bg-gray-700"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className={cn(
              "ml-2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              value.trim()
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
            )}
          >
            <SendIcon />
          </button>
        )}
      </div>
    </div>
  )
}

// Loading Component
const LoadingMessage: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex gap-4 justify-start w-full max-w-2xl py-4"
  >
    <div className="flex items-center space-x-1">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
    <span className="text-gray-500 text-sm">AI is thinking...</span>
  </motion.div>
)

// Main Thread Component
export const AssistantUIThread: React.FC<AssistantUIThreadProps> = ({
  messages = [],
  onSendMessage,
  isLoading = false,
  selectedModel = '',
  onModelChange
}) => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    
    try {
      await onSendMessage(inputValue)
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleCancel = () => {
    // TODO: Implement message cancellation
    console.log('Cancel message generation')
  }

  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Messages Viewport */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-4 pt-8">
          <div className="flex flex-col items-center">
            {isEmpty ? (
              <ThreadWelcome />
            ) : (
              <div className="w-full max-w-2xl space-y-0">
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => (
                    <div key={message.id}>
                      {message.role === 'user' ? (
                        <UserMessage 
                          message={message}
                          onEdit={() => console.log('Edit message:', message.id)}
                        />
                      ) : (
                        <AssistantMessage
                          message={message}
                          onCopy={() => console.log('Copy message:', message.id)}
                          onRegenerate={() => console.log('Regenerate message:', message.id)}
                        />
                      )}
                    </div>
                  ))}
                </AnimatePresence>
                
                {isLoading && <LoadingMessage />}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="flex justify-center">
          <Composer
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            onCancel={handleCancel}
            isLoading={isLoading}
            placeholder="Type a message..."
          />
        </div>
      </div>
    </div>
  )
}

export default AssistantUIThread