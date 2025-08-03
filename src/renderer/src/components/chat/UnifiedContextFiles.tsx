// src/renderer/src/components/chat/UnifiedContextFiles.tsx
import React, { useState, useCallback } from 'react'
import { FileText, FolderOpen, X, Upload, Trash2, ChevronDown } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface ContextFile {
  id: string
  name: string
  content: string
  summary: string
  source: 'upload' | 'filesystem'
  size: number
}

interface UnifiedContextFilesProps {
  contextFiles: ContextFile[]
  onFilesChange: (files: ContextFile[]) => void
  className?: string
}

export default function UnifiedContextFiles({ 
  contextFiles, 
  onFilesChange, 
  className 
}: UnifiedContextFilesProps) {
  const [showFileBrowser, setShowFileBrowser] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [fileItems, setFileItems] = useState<any[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  // File upload handler
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

        newFiles.push({
          id: `upload-${Date.now()}-${Math.random()}`,
          name: file.name,
          content,
          summary: `${file.name} (${Math.round(file.size / 1024)}KB)`,
          source: 'upload',
          size: file.size
        })
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error)
        alert(`Failed to read file "${file.name}"`)
      }
    }

    if (newFiles.length > 0) {
      onFilesChange([...contextFiles, ...newFiles])
    }
  }, [contextFiles, onFilesChange])

  // Filesystem browser
  const loadFileItems = useCallback(async (path: string) => {
    setLoadingFiles(true)
    try {
      const response = await window.api?.listDirectory?.(path)
      if (response?.success && response.files) {
        setFileItems(response.files)
        setCurrentPath(path)
      }
    } catch (error) {
      console.error('Directory loading failed:', error)
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  const addFileFromFilesystem = useCallback(async (filePath: string, fileName: string) => {
    try {
      // Check if file is already added
      if (contextFiles.some(f => f.name === fileName)) {
        alert('File already added as context')
        return
      }

      const fileInfo = await window.api?.getFileInfo?.(filePath)
      if (!fileInfo?.success || !fileInfo.info?.isFile) {
        alert('Invalid file selected')
        return
      }

      const textExtensions = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.css', '.html', '.json', '.xml', '.yml', '.yaml', '.sh', '.sql', '.php', '.rb', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.java', '.kt', '.swift', '.dart', '.vue', '.svelte', '.scss', '.sass', '.less', '.conf', '.config', '.env', '.gitignore', '.dockerfile']
      
      if (!textExtensions.includes(fileInfo.info.extension.toLowerCase())) {
        alert('Only text files are supported for context')
        return
      }

      const contentResponse = await window.api?.readFile?.(filePath)
      if (contentResponse?.success && contentResponse.content) {
        const newFile: ContextFile = {
          id: `filesystem-${Date.now()}-${Math.random()}`,
          name: fileName,
          content: contentResponse.content,
          summary: `${fileName} (${Math.round(fileInfo.info.size / 1024)}KB)`,
          source: 'filesystem',
          size: fileInfo.info.size
        }

        onFilesChange([...contextFiles, newFile])
        setShowFileBrowser(false)
      } else {
        alert('Failed to read file content')
      }
    } catch (error) {
      console.error('Failed to add file from filesystem:', error)
      alert('Failed to add file from filesystem')
    }
  }, [contextFiles, onFilesChange])

  const removeFile = useCallback((id: string) => {
    onFilesChange(contextFiles.filter(f => f.id !== id))
  }, [contextFiles, onFilesChange])

  const clearAllFiles = useCallback(() => {
    onFilesChange([])
  }, [onFilesChange])

  const openFileBrowser = useCallback(() => {
    setShowFileBrowser(true)
    if (!currentPath) {
      const homePath = process.env.HOME || process.env.USERPROFILE || '/Users'
      setCurrentPath(homePath)
      loadFileItems(homePath)
    } else if (fileItems.length === 0) {
      loadFileItems(currentPath)
    }
  }, [currentPath, fileItems.length, loadFileItems])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Single unified "Add Context Files" interface */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          multiple
          accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.css,.html,.json,.xml,.yml,.yaml,.sh,.sql,.php,.rb,.go,.rs,.c,.cpp,.h,.hpp,.java,.kt,.swift,.dart,.vue,.svelte,.scss,.sass,.less,.conf,.config,.env,.gitignore,.dockerfile"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id="context-file-input"
        />
        
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFileBrowser(true)}
            className="flex items-center gap-2"
          >
            <FileText size={14} />
            Add Context Files
            <ChevronDown size={12} className="ml-1" />
          </Button>
        </div>

        {contextFiles.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFiles}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 size={14} />
            Clear All ({contextFiles.length})
          </Button>
        )}
      </div>

      {/* Context Files Display */}
      {contextFiles.length > 0 && (
        <BlurFade>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <FileText size={14} />
                <span className="font-medium">{contextFiles.length} Context File{contextFiles.length > 1 ? 's' : ''}</span>
              </div>
              <span className="text-xs text-blue-600">
                Will be included with your next message
              </span>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {contextFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between text-xs bg-blue-100 rounded px-2 py-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText size={12} className="text-blue-600 flex-shrink-0" />
                    <span className="font-medium truncate">{file.name}</span>
                    <span className="text-blue-600">({file.source})</span>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                    title="Remove file"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>
      )}

      {/* Unified Add Context Files Modal */}
      {showFileBrowser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-600" size={24} />
                <h3 className="text-lg font-semibold">Add Context Files</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowFileBrowser(false)}>
                <X size={20} />
              </Button>
            </div>

            {/* Two options in one interface */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => document.getElementById('context-file-input')?.click()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Upload size={16} />
                  Upload from Computer
                </Button>
                <span className="text-gray-500">or</span>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!currentPath) {
                      const homePath = process.env.HOME || process.env.USERPROFILE || '/Users'
                      setCurrentPath(homePath)
                      loadFileItems(homePath)
                    } else if (fileItems.length === 0) {
                      loadFileItems(currentPath)
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <FolderOpen size={16} />
                  Browse Filesystem
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Choose files from your computer or browse your filesystem
              </p>
            </div>

            {/* Filesystem browser (only show if browsing) */}
            {currentPath && (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Current path:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{currentPath}</code>
                    {currentPath && currentPath !== '/' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
                          loadFileItems(parentPath)
                        }}
                      >
                        ← Parent
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {loadingFiles ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-gray-600">Loading directory...</p>
                        </div>
                      ) : fileItems.length === 0 ? (
                        <div className="text-center py-8">
                          <FolderOpen className="mx-auto mb-2 text-gray-400" size={48} />
                          <p className="text-gray-600">Empty directory</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {fileItems.map((item, index) => (
                            <div
                              key={index}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer',
                                item.isDirectory ? 'border-blue-200' : 'border-gray-200'
                              )}
                              onClick={() => {
                                if (item.isDirectory) {
                                  loadFileItems(item.path)
                                } else {
                                  addFileFromFilesystem(item.path, item.name)
                                }
                              }}
                            >
                              {item.isDirectory ? (
                                <FolderOpen className="text-blue-500" size={20} />
                              ) : (
                                <FileText className="text-gray-500" size={20} />
                              )}
                              <span className="flex-1 text-sm font-medium">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Upload files or browse filesystem to add context
                </div>
                <Button variant="outline" onClick={() => setShowFileBrowser(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}