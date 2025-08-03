import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  File,
  Image as ImageIcon,
  Code,
  FileText,
  FileCsv,
  MagnifyingGlass,
  X,
  Eye,
  Trash,
  Upload,
  Brain,
  Lightning
} from 'phosphor-react'
import { cn } from '@/lib/utils'

interface ContextFile {
  id: string
  file: File
  type: 'image' | 'document' | 'code' | 'csv' | 'other'
  addedAt: Date
  selected?: boolean
}

interface ContextFileSelectorProps {
  availableFiles: ContextFile[]
  selectedFileIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onFilePreview: (file: File) => void
  onFileRemove: (fileId: string) => void
  onFileUpload: (files: File[]) => void
  className?: string
  maxSelection?: number
}

const ContextFileSelector: React.FC<ContextFileSelectorProps> = ({
  availableFiles,
  selectedFileIds,
  onSelectionChange,
  onFilePreview,
  onFileRemove,
  onFileUpload,
  className,
  maxSelection = 10
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return availableFiles
    
    const query = searchQuery.toLowerCase()
    return availableFiles.filter(contextFile =>
      contextFile.file.name.toLowerCase().includes(query) ||
      contextFile.type.toLowerCase().includes(query)
    )
  }, [availableFiles, searchQuery])

  const handleFileSelection = (fileId: string, selected: boolean) => {
    let newSelection: string[]
    
    if (selected) {
      // Check max selection limit
      if (selectedFileIds.length >= maxSelection) {
        return // Don't add more than max
      }
      newSelection = [...selectedFileIds, fileId]
    } else {
      newSelection = selectedFileIds.filter(id => id !== fileId)
    }
    
    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    const allIds = filteredFiles.map(f => f.id)
    const limitedIds = allIds.slice(0, maxSelection)
    onSelectionChange(limitedIds)
  }

  const handleClearSelection = () => {
    onSelectionChange([])
  }

  const getFileIcon = (type: ContextFile['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />
      case 'code':
        return <Code className="w-4 h-4" />
      case 'csv':
        return <FileCsv className="w-4 h-4" />
      case 'document':
        return <FileText className="w-4 h-4" />
      default:
        return <File className="w-4 h-4" />
    }
  }

  const getFileTypeColor = (type: ContextFile['type']) => {
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
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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
    onFileUpload(files)
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightning className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">Context Files</CardTitle>
            {selectedFileIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedFileIds.length} selected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {filteredFiles.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  disabled={selectedFileIds.length >= maxSelection}
                  className="text-xs"
                >
                  Select All
                </Button>
                {selectedFileIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearSelection}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Upload area */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 mb-4 transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            'hover:border-primary/50 cursor-pointer'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.onchange = (e) => {
              const files = Array.from((e.target as HTMLInputElement).files || [])
              onFileUpload(files)
            }
            input.click()
          }}
        >
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {dragOver ? 'Drop files here' : 'Click to upload or drag files here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add files to use as context for your messages
            </p>
          </div>
        </div>

        {/* Files list */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No context files</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload files to enhance your conversations with relevant context
            </p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {filteredFiles.map((contextFile) => {
                const isSelected = selectedFileIds.includes(contextFile.id)
                const canSelect = !isSelected && selectedFileIds.length < maxSelection
                
                return (
                  <div
                    key={contextFile.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                    )}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => 
                        handleFileSelection(contextFile.id, checked as boolean)
                      }
                      disabled={!canSelect && !isSelected}
                      className="flex-shrink-0"
                    />

                    {/* File icon */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded flex items-center justify-center text-white flex-shrink-0',
                        getFileTypeColor(contextFile.type)
                      )}
                    >
                      {getFileIcon(contextFile.type)}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {contextFile.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(contextFile.file.size)}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {contextFile.type}
                        </Badge>
                        <span>•</span>
                        <span>{contextFile.addedAt.toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onFilePreview(contextFile.file)}
                        className="h-8 w-8 p-0"
                        title="Preview file"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onFileRemove(contextFile.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        title="Remove file"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {/* Selection info */}
        {selectedFileIds.length > 0 && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">
                {selectedFileIds.length} file{selectedFileIds.length > 1 ? 's' : ''} selected for context
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These files will be included as context to help the AI understand your message better
            </p>
          </div>
        )}

        {/* Max selection warning */}
        {selectedFileIds.length >= maxSelection && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            Maximum of {maxSelection} files can be selected as context
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ContextFileSelector