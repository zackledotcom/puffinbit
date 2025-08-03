import React, { useState } from 'react'
import {
  FloppyDisk
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import MonacoCanvasEditor from './MonacoCanvasEditor'
import MagicFileTree from '@/components/ui/magic-file-tree'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
}

interface CodeCanvasViewProps {
  fileTree?: FileNode[]
  currentFile?: {
    path: string
    content: string
    language: string
  } | null
  currentDirectory?: string
  isLoading?: boolean
  onFileTreeChange?: (tree: FileNode[]) => void
  onCurrentFileChange?: (file: { path: string; content: string; language: string } | null) => void
  onDirectoryChange?: (path: string) => void
  onLoadDirectory?: (path?: string) => void
  onSetLoading?: (loading: boolean) => void
}

const CodeCanvasView: React.FC<CodeCanvasViewProps> = ({
  fileTree = [],
  currentFile,
  currentDirectory,
  isLoading = false,
  onFileTreeChange,
  onCurrentFileChange,
  onDirectoryChange,
  onLoadDirectory,
  onSetLoading
}) => {
  const [newFileName, setNewFileName] = useState('')
  const [showNewFileInput, setShowNewFileInput] = useState(false)

  const handleSaveFile = async () => {
    if (!currentFile) return
    
    try {
      await window.electronAPI?.canvas?.writeFile(currentFile.path, currentFile.content)
      // Show success toast
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }
  
  const handleCreateFile = async () => {
    if (!newFileName.trim() || !currentDirectory) return
    
    const filePath = `${currentDirectory}/${newFileName}`
    try {
      await window.electronAPI?.canvas?.createFile(filePath)
      setNewFileName('')
      setShowNewFileInput(false)
      onLoadDirectory?.(currentDirectory) // Refresh file tree
    } catch (error) {
      console.error('Failed to create file:', error)
    }
  }

  return (
    <div className="h-full flex">
      {/* Magic UI File Explorer */}
      <MagicFileTree
        fileTree={fileTree}
        currentFile={currentFile}
        currentDirectory={currentDirectory}
        isLoading={isLoading}
        onCurrentFileChange={onCurrentFileChange}
        onSetLoading={onSetLoading}
        onLoadDirectory={onLoadDirectory}
        onCreateFile={() => setShowNewFileInput(true)}
      />
      
      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {showNewFileInput && (
          <div className="p-3 border-b border-border bg-muted/20">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter filename (e.g., app.tsx)"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile()
                if (e.key === 'Escape') {
                  setShowNewFileInput(false)
                  setNewFileName('')
                }
              }}
              autoFocus
            />
          </div>
        )}
        
        {currentFile ? (
          <>
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-background via-muted/10 to-background border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {currentFile.path.split('/').pop()}
                </span>
                <span className="text-xs text-muted-foreground">
                  • {currentFile.language}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveFile}
                className="h-7 px-3 text-xs"
              >
                <FloppyDisk size={14} className="mr-2" />
                Save
              </Button>
            </div>
            
            <div className="flex-1">
              <MonacoCanvasEditor
                filename={currentFile.path.split('/').pop() || ''}
                content={currentFile.content}
                onContentChange={(content) => 
                  onCurrentFileChange?.({ ...currentFile, content })
                }
                height="100%"
                theme="auto"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-muted/5 to-background">
            <div className="text-center space-y-4 max-w-sm">
              <div className="text-6xl opacity-20">💻</div>
              <div>
                <h3 className="font-semibold text-lg">Welcome to Canvas</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Select a directory to explore files, or create a new file to start coding
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeCanvasView