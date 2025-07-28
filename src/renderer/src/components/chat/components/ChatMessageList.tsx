import React, { useState } from 'react'
import { User, Robot, ThumbsUp, ThumbsDown, Copy, Pencil, Check, X, Warning } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'  // Changed from 'type' to 'role'
  content: string
  createdAt: number  // Changed from 'timestamp: Date' to 'createdAt: number'
  isStreaming?: boolean
  metadata?: {
    model?: string
    tokens?: number
    corrected?: boolean
  }
}

interface ChatMessageListProps {
  messages: Message[]
  onMessageCorrection: (messageId: string, newContent: string) => void
  onMessageReaction: (messageId: string, reaction: string) => void
  isThinking?: boolean
  streamingMessage?: string
}

interface MessageBubbleProps {
  message: Message
  onCorrection: (messageId: string, newContent: string) => void
  onReaction: (messageId: string, reaction: string) => void
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-2 p-4">
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
      <Robot size={18} className="text-primary" />
    </div>
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
      <div
        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
        style={{ animationDelay: '0.1s' }}
      />
      <div
        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
        style={{ animationDelay: '0.2s' }}
      />
    </div>
    <span className="text-sm text-muted-foreground">AI is thinking...</span>
  </div>
)

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onCorrection, onReaction }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showActions, setShowActions] = useState(false)

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
    // TODO: Show toast notification
  }

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content) {
      onCorrection(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const formatMessageContent = (content: string) => {
    // Basic markdown-like formatting
    return (
      content
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
        // Code blocks
        .replace(
          /```([\s\S]*?)```/g,
          '<pre class="bg-muted p-3 rounded-lg overflow-x-auto"><code>$1</code></pre>'
        )
        // Line breaks
        .replace(/\n/g, '<br>')
    )
  }

  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <div
      className={cn(
        'group relative p-4 hover:bg-muted/30 transition-colors',
        isUser && 'bg-primary/5'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex space-x-3">
        {/* Avatar */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            isUser
              ? 'bg-primary text-primary-foreground'
              : isSystem
                ? 'bg-orange-100 text-orange-600'
                : 'bg-secondary'
          )}
        >
          {isUser ? <User size={18} /> : isSystem ? <Warning size={18} /> : <Robot size={18} />}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">
              {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
            </span>
            {message.metadata?.model && (
              <Badge variant="outline" className="text-xs">
                {message.metadata.model}
              </Badge>
            )}
            {message.metadata?.corrected && (
              <Badge variant="secondary" className="text-xs">
                Edited
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {message.createdAt 
                ? new Date(message.createdAt).toLocaleTimeString() 
                : new Date().toLocaleTimeString()}
            </span>
          </div>

          {/* Message Text */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  <Check size={14} className="mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
            />
          )}

          {/* Token count for AI messages */}
          {message.metadata?.tokens && (
            <div className="mt-2 text-xs text-muted-foreground">
              ~{message.metadata.tokens} tokens
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && !isEditing && (
          <div className="flex space-x-1 opacity-100 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" onClick={handleCopyToClipboard}>
              <Copy size={14} />
            </Button>

            {!isSystem && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Pencil size={14} />
                </Button>

                <Button size="sm" variant="ghost" onClick={() => onReaction(message.id, 'like')}>
                  <ThumbsUp size={14} />
                </Button>

                <Button size="sm" variant="ghost" onClick={() => onReaction(message.id, 'dislike')}>
                  <ThumbsDown size={14} />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  onMessageCorrection,
  onMessageReaction,
  isThinking,
  streamingMessage
}) => {
  return (
    <div className="flex flex-col">
      {/* Messages */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCorrection={onMessageCorrection}
          onReaction={onMessageReaction}
        />
      ))}

      {/* Typing Indicator */}
      {isThinking && <TypingIndicator />}

      {/* Streaming Message Preview */}
      {streamingMessage && (
        <div className="p-4 bg-muted/20">
          <div className="flex space-x-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Robot size={18} />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm mb-1">Assistant</div>
              <div className="text-foreground">
                {streamingMessage}
                <span className="animate-pulse">|</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatMessageList
