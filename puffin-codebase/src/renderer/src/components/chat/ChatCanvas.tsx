import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import {
  User,
  Robot,
  DotsThree,
  PushPin,
  Copy,
  Pencil,
  Trash,
  ArrowsOut,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Highlighter, // Fixed: Use Highlighter (it should exist)
  Check,
  X,
  Plus,
  GridFour // Changed from GridNine
} from 'phosphor-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isPinned?: boolean
  isHighlighted?: boolean
  position?: { x: number; y: number }
  attachments?: Array<{
    type: 'file' | 'image' | 'text'
    name: string
    content?: string
    url?: string
  }>
}

interface ChatCanvasProps {
  messages: Message[]
  onUpdateMessage: (id: string, updates: Partial<Message>) => void
  onDeleteMessage: (id: string) => void
  onCorrectMessage: (id: string, newContent: string) => void
  className?: string
}

const ChatCanvas: React.FC<ChatCanvasProps> = ({
  messages,
  onUpdateMessage,
  onDeleteMessage,
  onCorrectMessage,
  className = ''
}) => {
  const [draggedMessage, setDraggedMessage] = useState<string | null>(null)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [isEditingMessage, setIsEditingMessage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [canvasMode, setCanvasMode] = useState<'free' | 'grid'>('free')
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file drop on canvas
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    const rect = canvasRef.current?.getBoundingClientRect()

    if (files.length > 0 && rect) {
      const dropPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }

      // Create a new message with attachments
      const newMessage: Message = {
        id: `file-${Date.now()}`,
        type: 'user',
        content: `Uploaded ${files.length} file(s)`,
        timestamp: new Date(),
        position: dropPosition,
        attachments: files.map((file) => ({
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name,
          url: URL.createObjectURL(file)
        }))
      }

      console.log('Files dropped:', files, 'at position:', dropPosition)
    }
  }, [])

  // Handle message drag start
  const handleMessageDragStart = useCallback((e: React.DragEvent, messageId: string) => {
    setDraggedMessage(messageId)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })

    e.dataTransfer.effectAllowed = 'move'
  }, [])

  // Handle message drag end
  const handleMessageDragEnd = useCallback(
    (e: React.DragEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect && draggedMessage) {
        let newX = e.clientX - rect.left - dragOffset.x
        let newY = e.clientY - rect.top - dragOffset.y

        // Snap to grid if in grid mode
        if (canvasMode === 'grid') {
          const gridSize = 20
          newX = Math.round(newX / gridSize) * gridSize
          newY = Math.round(newY / gridSize) * gridSize
        }

        // Keep within canvas bounds
        newX = Math.max(0, Math.min(newX, rect.width - 300))
        newY = Math.max(0, Math.min(newY, rect.height - 200))

        onUpdateMessage(draggedMessage, { position: { x: newX, y: newY } })
      }

      setDraggedMessage(null)
      setDragOffset({ x: 0, y: 0 })
    },
    [draggedMessage, dragOffset, onUpdateMessage, canvasMode]
  )

  // Toggle message selection
  const toggleMessageSelection = useCallback((messageId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    setSelectedMessages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }, [])

  // Clear selection when clicking canvas
  const clearSelection = useCallback(() => {
    setSelectedMessages(new Set())
  }, [])

  // Start editing message
  const startEditing = useCallback((messageId: string, content: string) => {
    setIsEditingMessage(messageId)
    setEditContent(content)
  }, [])

  // Save message edit
  const saveEdit = useCallback(() => {
    if (isEditingMessage) {
      onCorrectMessage(isEditingMessage, editContent)
      setIsEditingMessage(null)
      setEditContent('')
    }
  }, [isEditingMessage, editContent, onCorrectMessage])

  // Cancel message edit
  const cancelEdit = useCallback(() => {
    setIsEditingMessage(null)
    setEditContent('')
  }, [])

  // Copy message content
  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  // Auto-arrange messages
  const autoArrange = useCallback(() => {
    const arranged = messages.map((message, index) => {
      const row = Math.floor(index / 3)
      const col = index % 3
      return {
        ...message,
        position: {
          x: 50 + col * 350,
          y: 50 + row * 250
        }
      }
    })

    arranged.forEach((message) => {
      onUpdateMessage(message.id, { position: message.position })
    })
  }, [messages, onUpdateMessage])

  // Render message card
  const renderMessage = useCallback(
    (message: Message) => {
      const isSelected = selectedMessages.has(message.id)
      const isDragging = draggedMessage === message.id
      const isEditing = isEditingMessage === message.id

      return (
        <Card
          key={message.id}
          draggable
          onDragStart={(e) => handleMessageDragStart(e, message.id)}
          onDragEnd={handleMessageDragEnd}
          onClick={(e) => toggleMessageSelection(message.id, e)}
          className={`
          absolute min-w-[300px] max-w-[500px] p-4 cursor-move transition-all duration-200
          bg-white/90 backdrop-blur-md border shadow-lg hover:shadow-xl
          ${message.isPinned ? 'ring-2 ring-yellow-400 bg-yellow-50/90' : ''}
          ${message.isHighlighted ? 'ring-2 ring-blue-400 bg-blue-50/90' : ''}
          ${isSelected ? 'ring-2 ring-purple-500 scale-105 shadow-2xl' : 'border-white/20'}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${message.type === 'user' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'}
          rounded-xl
        `}
          style={{
            left: message.position?.x || 50,
            top: message.position?.y || 50,
            zIndex: isSelected ? 20 : isDragging ? 30 : 10
          }}
        >
          {/* Message Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                  message.type === 'user' ? 'bg-blue-500' : 'bg-green-500'
                }`}
              >
                {message.type === 'user' ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Robot size={16} className="text-white" />
                )}
              </div>
              <div>
                <div className="font-medium text-sm">
                  {message.type === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="text-xs text-gray-500">
                  {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime()) 
                    ? message.timestamp.toLocaleTimeString() 
                    : new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Message Actions */}
            <div className="flex items-center gap-1">
              {message.isPinned && <PushPin size={16} className="text-yellow-500" />}
              {message.isHighlighted && <Highlighter size={16} className="text-blue-500" />}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/60">
                    <DotsThree size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white/95 backdrop-blur-sm border border-white/20">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(message.id, message.content)
                    }}
                  >
                    <Pencil size={14} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      copyMessage(message.content)
                    }}
                  >
                    <Copy size={14} className="mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateMessage(message.id, { isPinned: !message.isPinned })
                    }}
                  >
                    <PushPin size={14} className="mr-2" />
                    {message.isPinned ? 'Unpin' : 'Pin'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateMessage(message.id, { isHighlighted: !message.isHighlighted })
                    }}
                  >
                    <Highlighter size={14} className="mr-2" />
                    {message.isHighlighted ? 'Remove Highlight' : 'Highlight'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteMessage(message.id)
                    }}
                  >
                    <Trash size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Message Content */}
          {isEditing ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] bg-white/80 border-white/20"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700">
                  <Check size={14} className="mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="bg-white/60">
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Attachments:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {message.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-white/60 rounded border border-white/20 text-xs"
                      >
                        {attachment.type === 'image' ? (
                          <ImageIcon size={14} className="text-blue-500" />
                        ) : (
                          <FileText size={14} className="text-gray-500" />
                        )}
                        <span className="truncate flex-1">{attachment.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )
    },
    [
      selectedMessages,
      draggedMessage,
      isEditingMessage,
      editContent,
      handleMessageDragStart,
      handleMessageDragEnd,
      toggleMessageSelection,
      startEditing,
      saveEdit,
      cancelEdit,
      copyMessage,
      onUpdateMessage,
      onDeleteMessage
    ]
  )

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <Badge variant="outline" className="bg-white/80 backdrop-blur-sm">
          {selectedMessages.size} selected
        </Badge>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCanvasMode(canvasMode === 'free' ? 'grid' : 'free')}
          className="bg-white/80 backdrop-blur-sm"
        >
          <GridFour size={16} className={canvasMode === 'grid' ? 'text-blue-500' : ''} />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={autoArrange}
          className="bg-white/80 backdrop-blur-sm"
        >
          <ArrowsOut size={16} />
          Arrange
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="bg-white/80 backdrop-blur-sm"
        >
          <Paperclip size={16} />
          Attach
        </Button>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className={`
          w-full h-full relative
          ${canvasMode === 'grid' ? 'bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.1)_1px,transparent_0)] [background-size:20px_20px]' : ''}
          bg-gradient-to-br from-blue-50/50 via-white/30 to-purple-50/50
        `}
        onDrop={handleCanvasDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={clearSelection}
      >
        {/* Drop Zone Indicator */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full border-2 border-dashed border-gray-300/50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Plus size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Drag files here or drag messages to arrange</p>
              <p className="text-xs">Click messages to select, right-click for options</p>
            </div>
          </div>
        </div>

        {/* Render Messages */}
        {messages.map(renderMessage)}

        {/* Selection Area */}
        {selectedMessages.size > 1 && (
          <div className="absolute bottom-4 left-4 p-3 bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg">
            <div className="text-sm font-medium mb-2">
              {selectedMessages.size} messages selected
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="bg-white/60">
                Group
              </Button>
              <Button size="sm" variant="outline" className="bg-white/60">
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  selectedMessages.forEach((id) => onDeleteMessage(id))
                  setSelectedMessages(new Set())
                }}
                className="bg-white/60 text-red-600 hover:text-red-700"
              >
                Delete All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files) {
            // Handle file selection
            console.log('Files selected:', Array.from(files))
          }
        }}
      />
    </div>
  )
}

export default ChatCanvas
