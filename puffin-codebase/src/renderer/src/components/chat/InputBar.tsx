import React, { useState, useRef, useEffect } from 'react'
import {
  PaperPlaneTilt,
  Paperclip,
  Terminal,
  Globe,
  Palette,
  GraduationCap,
  Plus,
  X,
  Code,
  File,
  Image,
  Upload,
  Share,
  ChartBar,
  FileText,
  FileCsv,
  Columns,
  ShareNetwork,
  FileArrowUp,
  Lightning,
  Sparkle,
  Brain,
  MagicWand,
  Stop,
  Play
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Toggle } from '@/components/ui/toggle'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string, attachments?: File[]) => void
  onFileUpload?: (files: File[]) => void
  onOpenCanvas?: () => void
  onOpenTerminal?: () => void
  onBrowseWeb?: (query: string) => void
  onExportChat?: (format: 'copy' | 'markdown' | 'file' | 'link') => void
  onOpenTraining?: () => void
  onAnalyzeCsv?: (file: File) => void
  isLoading?: boolean
  placeholder?: string
  devMode?: boolean
  onToggleDevMode?: () => void
  terminalOutput?: string[]
  className?: string
  onContextSelect?: (context: any[]) => void
  selectedContext?: any[]
}

interface AttachedFile {
  file: File
  preview?: string
  type: 'image' | 'document' | 'code' | 'csv' | 'other'
  uploadProgress?: number
}

export default function InputBar({
  value,
  onChange,
  onSend,
  onFileUpload,
  onOpenCanvas,
  onOpenTerminal,
  onBrowseWeb,
  onExportChat,
  onOpenTraining,
  onAnalyzeCsv,
  isLoading = false,
  placeholder = 'Type a message...',
  devMode = false,
  onToggleDevMode,
  terminalOutput = [],
  className,
  onContextSelect,
  selectedContext = []
}: InputBarProps) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [browseQuery, setBrowseQuery] = useState('')
  const [showBrowseDialog, setShowBrowseDialog] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const tools = [
    {
      icon: <Code className="w-4 h-4" />,
      label: 'Canvas',
      description: 'Open code canvas',
      onClick: onOpenCanvas,
      shortcut: 'Ctrl+K',
      color: 'hover:bg-purple-50 hover:text-purple-600',
      disabled: !onOpenCanvas
    },
    {
      icon: <Terminal className="w-4 h-4" />,
      label: 'Terminal',
      description: 'Open terminal',
      onClick: onOpenTerminal,
      shortcut: 'Ctrl+`',
      color: 'hover:bg-green-50 hover:text-green-600',
      disabled: !onOpenTerminal
    },
    {
      icon: <Globe className="w-4 h-4" />,
      label: 'Browse Web',
      description: 'Search the web',
      onClick: () => setShowBrowseDialog(true),
      shortcut: 'Ctrl+B',
      color: 'hover:bg-blue-50 hover:text-blue-600',
      disabled: !onBrowseWeb
    },
    {
      icon: <FileCsv className="w-4 h-4" />,
      label: 'Analyze CSV',
      description: 'Upload and analyze CSV data',
      onClick: () => csvInputRef.current?.click(),
      shortcut: 'Ctrl+D',
      color: 'hover:bg-orange-50 hover:text-orange-600',
      disabled: !onAnalyzeCsv
    },
    {
      icon: <GraduationCap className="w-4 h-4" />,
      label: 'Training',
      description: 'Open training mode',
      onClick: onOpenTraining,
      shortcut: 'Ctrl+T',
      color: 'hover:bg-indigo-50 hover:text-indigo-600',
      disabled: !onOpenTraining
    },
    {
      icon: <Share className="w-4 h-4" />,
      label: 'Export Chat',
      description: 'Export conversation',
      onClick: () => onExportChat?.('markdown'),
      shortcut: 'Ctrl+E',
      color: 'hover:bg-cyan-50 hover:text-cyan-600',
      disabled: !onExportChat
    }
  ]

  const handleSend = () => {
    if (value.trim() || attachedFiles.length > 0) {
      onSend(
        value,
        attachedFiles.map((af) => af.file)
      )
      onChange('')
      setAttachedFiles([])
      setShowTools(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }

    // Slash commands
    if (e.key === '/' && value === '') {
      e.preventDefault()
      setShowTools(true)
    }

    // Quick shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'u':
          e.preventDefault()
          fileInputRef.current?.click()
          break
        case 'b':
          e.preventDefault()
          setShowBrowseDialog(true)
          break
        case '`':
          e.preventDefault()
          onOpenTerminal?.()
          break
        case 'k':
          e.preventDefault()
          onOpenCanvas?.()
          break
      }
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
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploadProgress: 100
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
      case 'image':
        return <Image className="w-4 h-4" />
      case 'code':
        return <Code className="w-4 h-4" />
      case 'csv':
        return <ChartBar className="w-4 h-4" />
      case 'document':
        return <FileText className="w-4 h-4" />
      default:
        return <File className="w-4 h-4" />
    }
  }

  const getFileTypeColor = (type: AttachedFile['type']) => {
    switch (type) {
      case 'image':
        return 'bg-green-500'
      case 'code':
        return 'bg-blue-500'
      case 'csv':
        return 'bg-orange-500'
      case 'document':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
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

  return (
    <div className={cn('space-y-2', className)}>
      {/* Developer Mode Tools */}
      {devMode && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Developer Mode</span>
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={onOpenCanvas} className="h-6 px-2">
                  <Palette className="w-3 h-3 mr-1" />
                  Canvas
                </Button>
                <Button size="sm" variant="outline" onClick={onOpenTerminal} className="h-6 px-2">
                  <Terminal className="w-3 h-3 mr-1" />
                  Terminal
                </Button>
                {onToggleDevMode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onToggleDevMode}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Terminal Output Preview */}
            {terminalOutput.length > 0 && (
              <div className="bg-black/90 text-green-400 p-2 rounded font-mono text-xs max-h-20 overflow-auto">
                {terminalOutput.slice(-3).map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File attachments preview */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">
              Attachments ({attachedFiles.length})
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAttachedFiles([])}
              className="h-5 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
          <ScrollArea className="max-h-32">
            <div className="space-y-2">
              {attachedFiles.map((attachment, index) => (
                <Card key={index} className="p-2">
                  <div className="flex items-center gap-3">
                    {attachment.preview ? (
                      <img
                        src={attachment.preview}
                        alt={attachment.file.name}
                        className="w-10 h-10 object-cover rounded border"
                      />
                    ) : (
                      <div
                        className={cn(
                          'w-10 h-10 rounded border flex items-center justify-center text-white',
                          getFileTypeColor(attachment.type)
                        )}
                      >
                        {getFileIcon(attachment.type)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(attachment.file.size)}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {attachment.type}
                        </Badge>
                      </div>
                      {attachment.uploadProgress !== undefined &&
                        attachment.uploadProgress < 100 && (
                          <Progress value={attachment.uploadProgress} className="h-1 mt-1" />
                        )}
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main input area */}
      <Card
        className={cn(
          'transition-all duration-200',
          dragOver && 'border-primary bg-primary/5',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
        )}
      >
        <CardContent
          className="p-3"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Tools bar */}
          {showTools && (
            <div className="mb-3 pb-3 border-b">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {tools.map((tool, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'justify-start gap-2 h-auto p-2',
                      tool.color,
                      tool.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={tool.onClick}
                    disabled={tool.disabled}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {tool.icon}
                      <div className="text-left">
                        <div className="text-sm font-medium">{tool.label}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">{tool.shortcut}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex gap-2 items-end">
            {/* Tools toggle */}
            <Toggle
              pressed={showTools}
              onPressedChange={setShowTools}
              size="sm"
              className="h-8 w-8 p-0"
              title="Toggle tools"
            >
              {showTools ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Toggle>

            {/* Text input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={dragOver ? 'Drop files here...' : placeholder}
                disabled={isLoading}
                className={cn(
                  'min-h-[44px] max-h-32 resize-none pr-20',
                  'focus:ring-blue-500 focus:border-blue-500'
                )}
                rows={1}
              />

              {/* Context button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowContextMenu(!showContextMenu)}
                disabled={isLoading}
                className={cn(
                  'absolute right-12 bottom-2 h-8 w-8 p-0',
                  selectedContext.length > 0 && 'text-purple-600'
                )}
                title="Add context"
              >
                <Lightning className="w-4 h-4" />
              </Button>

              {/* Attachment button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute right-2 bottom-2 h-8 w-8 p-0"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>

            {/* Send/Stop button */}
            <Button
              onClick={isLoading ? undefined : handleSend}
              disabled={
                (!value.trim() && attachedFiles.length === 0) ||
                (!isLoading && !value.trim() && attachedFiles.length === 0)
              }
              className="h-11 px-4"
              title={isLoading ? 'Stop generation' : 'Send message'}
            >
              {isLoading ? <Stop className="w-4 h-4" /> : <PaperPlaneTilt className="w-4 h-4" />}
            </Button>
          </div>

          {/* Context selection menu */}
          {showContextMenu && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lightning className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Context Enhancement</span>
                  {selectedContext.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedContext.length} selected
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowContextMenu(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-600">
                  Add context to enhance your message with relevant information
                </p>

                {/* Quick context options */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // TODO: Implement context selection
                      onContextSelect?.([
                        { type: 'memory', content: 'Recent conversation context' }
                      ])
                    }}
                    className="h-7 text-xs"
                  >
                    <Brain className="w-3 h-3 mr-1" />
                    Memory Context
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // TODO: Implement file context
                      onContextSelect?.([{ type: 'file', content: 'Current file context' }])
                    }}
                    className="h-7 text-xs"
                  >
                    <File className="w-3 h-3 mr-1" />
                    File Context
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // TODO: Implement web context
                      onContextSelect?.([{ type: 'web', content: 'Web search results' }])
                    }}
                    className="h-7 text-xs"
                  >
                    <Globe className="w-3 h-3 mr-1" />
                    Web Context
                  </Button>
                </div>

                {selectedContext.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onContextSelect?.([])
                        setShowContextMenu(false)
                      }}
                      className="h-6 text-xs text-red-600 hover:text-red-700"
                    >
                      Clear all context
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
      />

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onAnalyzeCsv?.(e.target.files[0])}
      />

      {/* Browse web dialog */}
      <Dialog open={showBrowseDialog} onOpenChange={setShowBrowseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Browse Web</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="What would you like me to search for?"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onBrowseWeb?.(browseQuery)
                  setShowBrowseDialog(false)
                  setBrowseQuery('')
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBrowseDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onBrowseWeb?.(browseQuery)
                  setShowBrowseDialog(false)
                  setBrowseQuery('')
                }}
              >
                <Globe className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
