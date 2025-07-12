import React, { useState, useRef, useEffect } from 'react'
import {
  MagnifyingGlass,
  Funnel,
  Check,
  GridFour,
  ArrowsOut,
  Tree,
  Eye,
  EyeSlash,
  Wrench,
  Upload,
  Download,
  Folder,
  Plus,
  Code,
  Link,
  PaintBucket,
  Export,
  Trash
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface EnhancedChatCanvasProps {
  messages: any[]
  onUpdateMessage: (id: string, updates: any) => void
  onDeleteMessage: (id: string) => void
  onCorrectMessage: (id: string, newContent: string) => void
  onExecuteCode?: (code: string, language: string) => void
  onAddMessage?: (message: any) => void
  className?: string
}

const EnhancedChatCanvas: React.FC<EnhancedChatCanvasProps> = ({
  messages,
  onUpdateMessage,
  onDeleteMessage,
  onCorrectMessage,
  onExecuteCode,
  onAddMessage,
  className = ''
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [canvasMode, setCanvasMode] = useState<'free' | 'grid' | 'flow'>('free')
  const [showConnections, setShowConnections] = useState(true)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [groups, setGroups] = useState<
    Array<{
      id: string
      name: string
      color: string
      messageIds: string[]
    }>
  >([])
  const [canvasSettings, setCanvasSettings] = useState({
    snapToGrid: false,
    showMetadata: true,
    showMinimap: true
  })

  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compute all tags from messages
  const allTags = [...new Set(messages.flatMap((msg) => msg.tags || []).filter(Boolean))]

  // Filter messages based on search and tags
  const filteredMessages = messages.filter((message) => {
    // Apply search filter
    const matchesSearch =
      searchTerm === '' ||
      (message.content && message.content.toLowerCase().includes(searchTerm.toLowerCase()))

    // Apply tag filter
    const matchesTags =
      filterTags.length === 0 ||
      (message.tags && filterTags.every((tag) => message.tags.includes(tag)))

    return matchesSearch && matchesTags
  })

  // Handle canvas drop for files
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Calculate drop position relative to canvas
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Process each dropped file
      Array.from(e.dataTransfer.files).forEach((file, index) => {
        // Create message for each file
        const message = {
          id: `file-${Date.now()}-${index}`,
          type: 'file',
          content: file.name,
          position: { x, y: y + index * 30 },
          fileType: file.type,
          fileName: file.name,
          timestamp: new Date()
        }

        // Add to messages
        onAddMessage?.(message)
      })
    }
  }

  // Auto-arrange in flow layout
  const autoArrangeFlow = () => {
    const newPositions = filteredMessages.map((message, index) => ({
      id: message.id,
      position: { x: 100, y: 100 + index * 250 }
    }))

    newPositions.forEach(({ id, position }) => {
      onUpdateMessage(id, { position })
    })
  }

  // Auto-arrange in hierarchical layout
  const autoArrangeHierarchy = () => {
    // Group by type
    const typeGroups: Record<string, typeof filteredMessages> = {}
    filteredMessages.forEach((message) => {
      const type = message.type || 'unknown'
      if (!typeGroups[type]) typeGroups[type] = []
      typeGroups[type].push(message)
    })

    // Position each group
    let yOffset = 100
    Object.entries(typeGroups).forEach(([type, messages], groupIndex) => {
      const xBase = 100 + groupIndex * 400

      messages.forEach((message, index) => {
        onUpdateMessage(message.id, {
          position: { x: xBase, y: yOffset + index * 200 }
        })
      })

      // Add vertical space between groups
      yOffset += messages.length * 200 + 50
    })
  }

  // Create a group from selected messages
  const createGroup = () => {
    if (selectedMessages.size === 0 || !newGroupName.trim()) return

    // Generate random color using theme colors
    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--accent))',
      'hsl(217 91% 60%)', // Blue
      'hsl(142 71% 45%)', // Green
      'hsl(38 92% 50%)' // Orange
    ]
    const color = colors[Math.floor(Math.random() * colors.length)]

    const group = {
      id: `group-${Date.now()}`,
      name: newGroupName,
      color,
      messageIds: Array.from(selectedMessages)
    }

    setGroups((prev) => [...prev, group])
    setIsCreatingGroup(false)
    setNewGroupName('')
  }

  // Export canvas as JSON
  const exportCanvas = () => {
    const exportData = {
      messages: filteredMessages,
      groups
    }

    // Create download link
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const fileName = `canvas-export-${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', fileName)
    linkElement.click()
  }

  // Render individual message with theme-aware styling
  const renderMessage = (message: any) => {
    if (!message.position) return null

    return (
      <div
        key={message.id}
        className={cn(
          'absolute rounded-xl shadow-lg border backdrop-blur-sm w-80 overflow-hidden select-none transition-all duration-200',
          'bg-card text-card-foreground border-border',
          selectedMessages.has(message.id) && 'ring-2 ring-primary shadow-xl scale-105'
        )}
        style={{
          left: message.position.x,
          top: message.position.y,
          zIndex: selectedMessages.has(message.id) ? 30 : 10
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (e.ctrlKey || e.metaKey) {
            // Toggle selection with Ctrl/Cmd key
            const newSelected = new Set(selectedMessages)
            if (newSelected.has(message.id)) {
              newSelected.delete(message.id)
            } else {
              newSelected.add(message.id)
            }
            setSelectedMessages(newSelected)
          } else {
            // Single selection
            setSelectedMessages(new Set([message.id]))
          }
        }}
        onMouseDown={(e) => {
          if (e.button !== 0 || !canvasRef.current) return

          // Start drag
          const startX = e.clientX
          const startY = e.clientY
          const startLeft = message.position.x
          const startTop = message.position.y

          const handleMouseMove = (moveEvent: MouseEvent) => {
            // Calculate new position
            let newX = startLeft + moveEvent.clientX - startX
            let newY = startTop + moveEvent.clientY - startY

            // Apply snap to grid if enabled
            if (canvasSettings.snapToGrid) {
              newX = Math.round(newX / 20) * 20
              newY = Math.round(newY / 20) * 20
            }

            // Update position
            onUpdateMessage(message.id, {
              position: { x: newX, y: newY }
            })
          }

          const handleMouseUp = () => {
            // Remove event listeners
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }

          // Add event listeners
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)

          e.stopPropagation()
        }}
      >
        {/* Message header with theme-aware colors */}
        <div
          className={cn(
            'p-3 text-sm font-medium flex items-center justify-between',
            message.type === 'user' && 'bg-primary text-primary-foreground',
            message.type === 'ai' && 'bg-accent text-accent-foreground',
            message.type === 'code' && 'bg-secondary text-secondary-foreground',
            message.type === 'file' && 'bg-muted text-muted-foreground',
            !message.type && 'bg-muted text-muted-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="capitalize">
              {message.type === 'user'
                ? 'User'
                : message.type === 'ai'
                  ? 'AI'
                  : message.type === 'code'
                    ? 'Code'
                    : message.type === 'file'
                      ? 'File'
                      : 'Message'}
            </span>
            {message.id && (
              <span className="text-xs opacity-70">#{message.id.split('-')[1] || '?'}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {selectedMessages.has(message.id) && <Check className="w-4 h-4" />}
          </div>
        </div>

        {/* Message content */}
        <div className="p-4">
          {message.type === 'file' ? (
            <div className="space-y-2">
              <div className="font-medium">{message.fileName || message.content}</div>
              <div className="text-xs text-muted-foreground">
                {message.fileType || 'Unknown file type'}
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed">{message.content || 'No content'}</div>
          )}
        </div>

        {/* Message metadata with theme-aware styling */}
        {canvasSettings.showMetadata && (
          <div className="p-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
            <div>{message.timestamp && new Date(message.timestamp).toLocaleTimeString()}</div>
            <div className="flex gap-1">
              {message.tags?.map((tag: string) => (
                <Badge key={tag} variant="outline" className="px-2 py-0 h-5 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Main render with seamless theming
  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      {/* Enhanced Canvas Controls with theme-aware styling */}
      <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Search with proper theming */}
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 h-9 bg-background/80 backdrop-blur-sm border-border"
            />
          </div>

          {/* Filter by tags with theme styling */}
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background/80 backdrop-blur-sm h-9"
                >
                  <Funnel size={16} className="mr-2" />
                  Filter ({filterTags.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover/95 backdrop-blur-sm border-border">
                {allTags.map((tag) => (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() => {
                      setFilterTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }}
                  >
                    {filterTags.includes(tag) ? (
                      <Check size={14} className="mr-2" />
                    ) : (
                      <div className="w-4" />
                    )}
                    {tag}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterTags([])}>Clear all</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Selection info with theme styling */}
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            {selectedMessages.size} / {filteredMessages.length} selected
          </Badge>

          {/* Canvas mode with theme styling */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm h-9">
                <GridFour size={16} className={canvasMode !== 'free' ? 'text-primary' : ''} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover/95 backdrop-blur-sm border-border">
              <DropdownMenuItem onClick={() => setCanvasMode('free')}>
                {canvasMode === 'free' ? (
                  <Check size={14} className="mr-2" />
                ) : (
                  <div className="w-4" />
                )}
                Free Layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCanvasMode('grid')}>
                {canvasMode === 'grid' ? (
                  <Check size={14} className="mr-2" />
                ) : (
                  <div className="w-4" />
                )}
                Grid Layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCanvasMode('flow')}>
                {canvasMode === 'flow' ? (
                  <Check size={14} className="mr-2" />
                ) : (
                  <div className="w-4" />
                )}
                Flow Layout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Layout options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm h-9">
                <ArrowsOut size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover/95 backdrop-blur-sm border-border">
              <DropdownMenuItem onClick={autoArrangeFlow}>
                <GridFour size={14} className="mr-2" />
                Auto Arrange Grid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={autoArrangeHierarchy}>
                <Tree size={14} className="mr-2" />
                Arrange by Type
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowConnections(!showConnections)}>
                {showConnections ? (
                  <EyeSlash size={14} className="mr-2" />
                ) : (
                  <Eye size={14} className="mr-2" />
                )}
                {showConnections ? 'Hide' : 'Show'} Connections
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tools */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm h-9">
                <Wrench size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover/95 backdrop-blur-sm border-border">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} className="mr-2" />
                Import Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCanvas}>
                <Download size={14} className="mr-2" />
                Export Canvas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsCreatingGroup(true)}>
                <Folder size={14} className="mr-2" />
                Create Group
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  setCanvasSettings((prev) => ({ ...prev, showMetadata: !prev.showMetadata }))
                }
              >
                {canvasSettings.showMetadata ? (
                  <EyeSlash size={14} className="mr-2" />
                ) : (
                  <Eye size={14} className="mr-2" />
                )}
                {canvasSettings.showMetadata ? 'Hide' : 'Show'} Metadata
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setCanvasSettings((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }))
                }
              >
                {canvasSettings.snapToGrid ? (
                  <Check size={14} className="mr-2" />
                ) : (
                  <div className="w-4" />
                )}
                Snap to Grid
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Canvas Area with seamless theming */}
      <div
        ref={canvasRef}
        className={cn(
          'w-full h-full relative pt-16 transition-all duration-200',
          // Grid background when enabled
          (canvasMode === 'grid' || canvasSettings.snapToGrid) &&
            'bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] [background-size:20px_20px]',
          // Theme-aware background with subtle pattern
          'bg-background',
          // Add subtle pattern overlay
          'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_2px_2px,hsl(var(--muted))_0.5px,transparent_0)] before:[background-size:40px_40px] before:opacity-30 before:pointer-events-none'
        )}
        onDrop={handleCanvasDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => setSelectedMessages(new Set())}
      >
        {/* Drop Zone Indicator with theme styling */}
        {filteredMessages.length === 0 && (
          <div className="absolute inset-16 pointer-events-none">
            <div className="w-full h-full border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Plus size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2 text-foreground">Enhanced Canvas Mode</p>
                <p className="text-sm mb-4">
                  Drag files here, arrange messages, create connections
                </p>
                <div className="flex justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Code size={16} />
                    Code Execution
                  </div>
                  <div className="flex items-center gap-1">
                    <Link size={16} />
                    Message Linking
                  </div>
                  <div className="flex items-center gap-1">
                    <Tree size={16} />
                    Auto Layout
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Render messages */}
        {filteredMessages.map(renderMessage)}

        {/* Render groups with theme-aware styling */}
        {groups.map((group) => {
          const groupMessages = filteredMessages.filter((msg) => group.messageIds.includes(msg.id))
          if (groupMessages.length === 0) return null

          const positions = groupMessages.map((msg) => msg.position || { x: 0, y: 0 })
          const minX = Math.min(...positions.map((p) => p.x))
          const maxX = Math.max(...positions.map((p) => p.x + 320))
          const minY = Math.min(...positions.map((p) => p.y))
          const maxY = Math.max(...positions.map((p) => p.y + 200))

          return (
            <div
              key={group.id}
              className="absolute border-2 border-dashed rounded-lg pointer-events-none"
              style={{
                left: minX - 10,
                top: minY - 30,
                width: maxX - minX + 20,
                height: maxY - minY + 40,
                borderColor: group.color,
                backgroundColor: group.color + '20'
              }}
            >
              <div
                className="absolute -top-6 left-2 px-2 py-1 rounded text-xs font-medium text-primary-foreground"
                style={{ backgroundColor: group.color }}
              >
                {group.name}
              </div>
            </div>
          )
        })}

        {/* Selection Tools with theme styling */}
        {selectedMessages.size > 0 && (
          <div className="absolute bottom-4 left-4 p-4 bg-card/90 backdrop-blur-sm rounded-lg border border-border shadow-lg">
            <div className="text-sm font-medium mb-3">
              {selectedMessages.size} message{selectedMessages.size > 1 ? 's' : ''} selected
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedMessages.size > 1 && (
                <Button size="sm" variant="outline" onClick={() => setIsCreatingGroup(true)}>
                  <Folder size={14} className="mr-1" />
                  Group
                </Button>
              )}
              <Button size="sm" variant="outline">
                <Link size={14} className="mr-1" />
                Connect
              </Button>
              <Button size="sm" variant="outline">
                <PaintBucket size={14} className="mr-1" />
                Color
              </Button>
              <Button size="sm" variant="outline">
                <Export size={14} className="mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  selectedMessages.forEach((id) => onDeleteMessage(id))
                  setSelectedMessages(new Set())
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash size={14} className="mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Minimap with theme styling */}
        {canvasSettings.showMinimap && filteredMessages.length > 0 && (
          <div className="absolute bottom-4 right-4 w-48 h-32 bg-card/90 backdrop-blur-sm rounded-lg border border-border shadow-lg p-2">
            <div className="text-xs font-medium mb-2">Minimap</div>
            <div className="relative w-full h-full bg-muted rounded overflow-hidden">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'absolute w-2 h-2 rounded',
                    selectedMessages.has(message.id) && 'ring-1 ring-primary',
                    message.type === 'user' && 'bg-primary',
                    message.type === 'ai' && 'bg-accent',
                    message.type === 'code' && 'bg-secondary',
                    message.type === 'file' && 'bg-muted-foreground',
                    !message.type && 'bg-muted-foreground'
                  )}
                  style={{
                    left: ((message.position?.x || 0) / 2000) * 100 + '%',
                    top: ((message.position?.y || 0) / 1000) * 100 + '%'
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Dialog with theme styling */}
      <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border-border">
          <DialogHeader>
            <DialogTitle>Create Message Group</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Group {selectedMessages.size} selected messages together
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>
                Cancel
              </Button>
              <Button onClick={createGroup} disabled={!newGroupName.trim()}>
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.ts,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.kt,.swift,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && canvasRef.current) {
            // Simulate drop in center of canvas
            const rect = canvasRef.current.getBoundingClientRect()
            const fakeEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
              dataTransfer: { files },
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height / 2
            } as React.DragEvent<HTMLDivElement>

            handleCanvasDrop(fakeEvent)
          }
          // Reset input
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default EnhancedChatCanvas
