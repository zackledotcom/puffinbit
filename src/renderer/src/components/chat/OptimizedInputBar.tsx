import React, { useState, useRef, useEffect } from 'react'
import {
  PaperPlaneTilt,
  Paperclip,
  Stop,
  Brain,
  Lightning,
  Share,
  X,
  File,
  Image,
  Code,
  ChartBar,
  FileText,
  Plus
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'

interface OptimizedInputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string, attachments?: File[]) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
  
  // Memory integration
  onMemorySelect?: (chunks: any[]) => void
  selectedMemoryContext?: any[]
  memoryEnabled?: boolean
  
  // File handling
  onFileUpload?: (files: File[]) => void
  
  // Canvas integration
  onOpenCanvas?: () => void
  canvasActive?: boolean
  
  // Export functionality
  onExportChat?: () => void
  hasMessages?: boolean
}

interface AttachedFile {
  file: File
  preview?: string
  type: 'image' | 'document' | 'code' | 'csv' | 'other'
}

export default function OptimizedInputBar({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = 'Type a message...',
  className,
  onMemorySelect,
  selectedMemoryContext = [],
  memoryEnabled = true,
  onFileUpload,
  onOpenCanvas,
  canvasActive = false,
  onExportChat,
  hasMessages = false
}: OptimizedInputBarProps) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [showMemorySearch, setShowMemorySearch] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { canvasOpen } = useCanvasStore()

  // Smart tool detection
  const containsCode = (text: string) => {
    const codePatterns = [
      /```[\s\S]*```/,
      /`[^`]+`/,
      /\b(function|const|let|var|if|for|while|class|import|export)\b/,
      /\b(def|class|import|from|if|for|while|try|except)\b/,
      /\{[\s\S]*\}/,
      /\[[\s\S]*\]/
    ]
    return codePatterns.some(pattern => pattern.test(text))
  }

  const isAnalyticalQuery = (text: string) => {
    const analyticalPatterns = [
      /\b(analyze|analysis|data|chart|graph|visualization|csv|excel|table)\b/i,
      /\b(compare|trend|metric|statistics|stats|calculation)\b/i
    ]
    return analyticalPatterns.some(pattern => pattern.test(text))
  }

  // Determine which tools to show based on context
  const getRelevantTools = () => {
    const tools = []
    
    // Memory tool - always available if enabled
    if (memoryEnabled) {
      tools.push({
        id: 'memory',
        icon: Brain,
        label: selectedMemoryContext.length > 0 ? `Memory (${selectedMemoryContext.length})` : 'Memory',
        active: selectedMemoryContext.length > 0,
        onClick: handleMemoryToggle,
        color: selectedMemoryContext.length > 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
      })
    }
    
    // Canvas tool - show if code detected or already active
    if (containsCode(value) || canvasOpen) {
      tools.push({
        id: 'canvas',
        icon: Code,
        label: canvasOpen ? 'Canvas: Active' : 'Open Canvas',
        active: canvasOpen,
        onClick: onOpenCanvas,
        color: canvasOpen ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
      })
    }
    
    // Export tool - only if there are messages to export
    if (hasMessages && onExportChat) {
      tools.push({
        id: 'export',
        icon: Share,
        label: 'Export',
        active: false,
        onClick: onExportChat,
        color: 'text-gray-600'
      })
    }
    
    return tools
  }

  const handleSend = () => {
    if (value.trim() || attachedFiles.length > 0) {
      onSend(
        value,
        attachedFiles.map((af) => af.file)
      )
      onChange('')
      setAttachedFiles([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }

    // Quick shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'u':
          e.preventDefault()
          fileInputRef.current?.click()
          break
        case 'm':
          e.preventDefault()
          handleMemoryToggle()
          break
        case 'k':
          e.preventDefault()
          onOpenCanvas?.()
          break
        case 'e':
          e.preventDefault()
          if (hasMessages) onExportChat?.()
          break
      }
    }
  }

  const handleMemoryToggle = async () => {
    if (!memoryEnabled || !onMemorySelect) return
    
    if (selectedMemoryContext.length > 0) {
      // Clear existing memory context
      onMemorySelect([])
    } else {
      // Search for relevant memory
      setShowMemorySearch(true)
      try {
        // This would integrate with the actual memory service
        const relevantMemories = await window.api.searchMemory(value || 'recent context', 3)
        if (relevantMemories.success && relevantMemories.results) {
          onMemorySelect(relevantMemories.results)
        }
      } catch (error) {
        console.warn('Memory search failed:', error)
      }
      setShowMemorySearch(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    handleFileSelect(files)
  }

  const handleFileSelect = (files: File[]) => {
    const newFiles = files.map((file) => ({
      file,
      type: getFileType(file),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))

    setAttachedFiles((prev) => [...prev, ...newFiles])
    onFileUpload?.(files)
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => {
      const file = prev[index]
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const getFileType = (file: File): AttachedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.name.endsWith('.csv')) return 'csv'
    if (file.type.includes('text') || file.name.match(/\.(js|ts|py|html|css|json)$/)) return 'code'
    if (file.type.includes('document') || file.name.match(/\.(pdf|doc|docx)$/)) return 'document'
    return 'other'
  }

  const getFileIcon = (type: AttachedFile['type']) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />
      case 'code': return <Code className="w-4 h-4" />
      case 'csv': return <ChartBar className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      default: return <File className="w-4 h-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const relevantTools = getRelevantTools()

  return (
    <div className={cn('space-y-3', className)}>
      {/* File attachments preview */}
      {attachedFiles.length > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                Attachments ({attachedFiles.length})
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAttachedFiles([])}
                className="h-6 px-2 text-xs hover:bg-gray-200"
              >
                Clear all
              </Button>
            </div>
            <ScrollArea className="max-h-24">
              <div className="space-y-2">
                {attachedFiles.map((attachment, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                      {getFileIcon(attachment.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(attachment.file.size)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main input card */}
      <Card
        className={cn(
          'border-gray-200 transition-all duration-200',
          dragOver && 'border-blue-500 bg-blue-50',
          'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
        )}
      >
        <CardContent
          className="p-4"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Contextual tools */}
          {relevantTools.length > 0 && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
              {relevantTools.map((tool) => (
                <Button
                  key={tool.id}
                  size="sm"
                  variant="ghost"
                  onClick={tool.onClick}
                  disabled={!tool.onClick || (tool.id === 'memory' && showMemorySearch)}
                  className={cn(
                    'h-8 px-3 text-sm transition-all',
                    tool.color,
                    tool.active && 'border border-current'
                  )}
                  title={`${tool.label} (Ctrl+${tool.id.charAt(0).toUpperCase()})`}
                >
                  <tool.icon className="w-4 h-4 mr-1.5" />
                  {showMemorySearch && tool.id === 'memory' ? 'Searching...' : tool.label}
                </Button>
              ))}
              
              {/* Smart suggestions */}
              {containsCode(value) && !relevantTools.find(t => t.id === 'canvas') && (
                <Badge variant="secondary" className="text-xs">
                  💡 Code detected - Canvas available
                </Badge>
              )}
              
              {isAnalyticalQuery(value) && (
                <Badge variant="secondary" className="text-xs">
                  💡 Analysis query - Consider uploading data
                </Badge>
              )}
            </div>
          )}

          {/* Input area */}
          <div className="flex gap-3 items-end">
            {/* File upload button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="h-10 w-10 p-0 rounded-lg hover:bg-gray-100 border border-gray-200"
              title="Attach files (Ctrl+U)"
            >
              <Paperclip className="w-4 h-4 text-gray-600" />
            </Button>

            {/* Text input */}
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={dragOver ? 'Drop files here...' : placeholder}
                disabled={isLoading}
                className={cn(
                  'min-h-[40px] max-h-32 resize-none border-0 bg-transparent',
                  'focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500'
                )}
                rows={1}
              />
            </div>

            {/* Send/Stop button */}
            <Button
              onClick={isLoading ? undefined : handleSend}
              disabled={
                (!value.trim() && attachedFiles.length === 0) ||
                (!isLoading && !value.trim() && attachedFiles.length === 0)
              }
              className={cn(
                'h-10 px-4 rounded-lg transition-all duration-200',
                isLoading 
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title={isLoading ? 'Stop generation' : 'Send message (Enter)'}
            >
              {isLoading ? (
                <>
                  <Stop className="w-4 h-4 mr-1.5" />
                  Stop
                </>
              ) : (
                <>
                  <PaperPlaneTilt className="w-4 h-4 mr-1.5" />
                  Send
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
      />
    </div>
  )
}
