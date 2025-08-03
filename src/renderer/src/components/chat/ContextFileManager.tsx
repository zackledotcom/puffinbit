// src/renderer/src/components/chat/ContextFileManager.tsx
import React, { useState, useCallback, useRef, DragEvent } from 'react'
import { FileText, X, Eye, Upload, Check } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export interface ContextFile {
  id: string
  name: string
  content: string
  summary: string
  source: 'upload' | 'drop'
  size: number
}

interface ContextFileManagerProps {
  contextFiles: ContextFile[]
  selectedFileIds: Set<string>
  onFilesChange: (files: ContextFile[]) => void
  onSelectionChange: (selectedIds: Set<string>) => void
  className?: string
}

interface FilePreviewModalProps {
  file: ContextFile | null
  isOpen: boolean
  onClose: () => void
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  if (!isOpen || !file) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold">{file.name}</h3>
              <p className="text-sm text-gray-600">{file.summary}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
              {file.content}
            </pre>
          </ScrollArea>
        </div>
        
        <div className="p-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {file.content.length} characters • {Math.ceil(file.content.length / 4)} estimated tokens
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ContextFileManager({ 
  contextFiles, 
  selectedFileIds,
  onFilesChange, 
  onSelectionChange,
  className 
}: ContextFileManagerProps) {
  const [previewFile, setPreviewFile] = useState<ContextFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (files: FileList) => {
    const textExtensions = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.css', '.html', '.json', '.xml', '.yml', '.yaml', '.sh', '.sql', '.php', '.rb', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.java', '.kt', '.swift', '.dart', '.vue', '.svelte', '.scss', '.sass', '.less', '.conf', '.config', '.env', '.gitignore', '.dockerfile']
    
    const newFiles: ContextFile[] = []
    
    for (const file of Array.from(files)) {
      // Check if file is already added
      if (contextFiles.some(f => f.name === file.name && f.size === file.size)) {
        continue
      }

      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      
      if (!textExtensions.includes(fileExtension)) {
        alert(`File "${file.name}" is not a supported text file type`)
        continue
      }

      try {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsText(file)
        })

        const newFile: ContextFile = {
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          content,
          summary: `${file.name} (${Math.round(file.size / 1024)}KB)`,
          source: 'upload',
          size: file.size
        }

        newFiles.push(newFile)
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error)
        alert(`Failed to read file "${file.name}"`)
      }
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...contextFiles, ...newFiles]
      onFilesChange(updatedFiles)
      
      // Auto-select newly added files
      const newSelectedIds = new Set([...selectedFileIds, ...newFiles.map(f => f.id)])
      onSelectionChange(newSelectedIds)
    }
  }, [contextFiles, onFilesChange, selectedFileIds, onSelectionChange])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = useCallback((id: string) => {
    const updatedFiles = contextFiles.filter(f => f.id !== id)
    onFilesChange(updatedFiles)
    
    const newSelectedIds = new Set(selectedFileIds)
    newSelectedIds.delete(id)
    onSelectionChange(newSelectedIds)
  }, [contextFiles, onFilesChange, selectedFileIds, onSelectionChange])

  const toggleFileSelection = useCallback((id: string) => {
    const newSelectedIds = new Set(selectedFileIds)
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
    onSelectionChange(newSelectedIds)
  }, [selectedFileIds, onSelectionChange])

  const clearAllFiles = useCallback(() => {
    onFilesChange([])
    onSelectionChange(new Set())
  }, [onFilesChange, onSelectionChange])

  const selectAllFiles = useCallback(() => {
    const allIds = new Set(contextFiles.map(f => f.id))
    onSelectionChange(allIds)
  }, [contextFiles, onSelectionChange])

  const selectedFiles = contextFiles.filter(f => selectedFileIds.has(f.id))

  return (
    <div className={cn('space-y-3', className)}>
      {/* File Upload Area with Drag & Drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 transition-colors',
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.css,.html,.json,.xml,.yml,.yaml,.sh,.sql,.php,.rb,.go,.rs,.c,.cpp,.h,.hpp,.java,.kt,.swift,.dart,.vue,.svelte,.scss,.sass,.less,.conf,.config,.env,.gitignore,.dockerfile"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
        
        <div className="text-center">
          <Upload className={cn(
            'mx-auto mb-2', 
            isDragging ? 'text-blue-500' : 'text-gray-400'
          )} size={32} />
          <p className={cn(
            'text-sm font-medium mb-1',
            isDragging ? 'text-blue-700' : 'text-gray-700'
          )}>
            {isDragging ? 'Drop files here' : 'Add Context Files'}
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Drag & drop files or click to browse
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="mx-auto"
          >
            <Upload size={14} className="mr-2" />
            Browse Files
          </Button>
        </div>
      </div>

      {/* Context Files List */}
      {contextFiles.length > 0 && (
        <BlurFade>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <FileText size={14} />
                <span className="font-medium">
                  {contextFiles.length} Context File{contextFiles.length > 1 ? 's' : ''} 
                  {selectedFiles.length > 0 && (
                    <span className="ml-1">({selectedFiles.length} selected)</span>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                {contextFiles.length !== selectedFileIds.size && (
                  <button 
                    onClick={selectAllFiles}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Select All
                  </button>
                )}
                <button 
                  onClick={clearAllFiles}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {contextFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 text-xs bg-blue-100 rounded px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText size={12} className="text-blue-600 flex-shrink-0" />
                    <span className="font-medium truncate">{file.name}</span>
                    <span className="text-blue-600">({file.source})</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded"
                      title="Preview file"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-200 rounded"
                      title="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-3 pt-2 border-t border-blue-200">
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <Check size={12} />
                  <span>
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} will be included with your next message
                  </span>
                </div>
              </div>
            )}
          </div>
        </BlurFade>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal 
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  )
}