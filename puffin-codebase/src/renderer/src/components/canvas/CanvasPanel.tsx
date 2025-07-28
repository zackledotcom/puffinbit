import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FolderOpen,
  File,
  Plus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  FileText,
  Code,
  Image,
  Folder,
  Upload,
  Download,
  Trash,
  Edit,
  Save,
  Play
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import MonacoCanvasEditor from './MonacoCanvasEditor'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
}

interface CanvasPanelProps {
  className?: string
}

const FileIcon = ({ fileName, type }: { fileName: string; type: 'file' | 'folder' }) => {
  if (type === 'folder') return <Folder size={16} className="text-blue-500" />
  
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <Code size={16} className="text-yellow-500" />
    case 'json':
      return <FileText size={16} className="text-green-500" />
    case 'md':
      return <FileText size={16} className="text-blue-500" />
    case 'py':
      return <Code size={16} className="text-blue-600" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <Image size={16} className="text-purple-500" />
    default:
      return <File size={16} className="text-gray-500" />
  }
}

const FileTreeNode = ({ node, level = 0 }: { node: FileNode; level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { currentFile, setCurrentFile, setLoading } = useCanvasStore()
  
  const handleFileClick = async (filePath: string) => {
    if (node.type === 'file') {
      setLoading(true)
      try {
        const content = await window.electronAPI?.canvas?.readFile(filePath)
        const language = getLanguageFromExtension(filePath)
        setCurrentFile({
          path: filePath,
          content: content || '',
          language
        })
      } catch (error) {
        console.error('Failed to read file:', error)
      } finally {
        setLoading(false)
      }
    } else {
      setIsExpanded(!isExpanded)
    }
  }
  
  const getLanguageFromExtension = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'ts': return 'typescript'
      case 'tsx': return 'typescript'
      case 'js': return 'javascript'
      case 'jsx': return 'javascript'
      case 'json': return 'json'
      case 'md': return 'markdown'
      case 'py': return 'python'
      case 'css': return 'css'
      case 'html': return 'html'
      default: return 'plaintext'
    }
  }
  
  const isSelected = currentFile?.path === node.path
  
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 hover:bg-accent/50 cursor-pointer rounded-sm transition-colors",
          isSelected && "bg-accent text-accent-foreground",
          "group"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => handleFileClick(node.path)}
      >
        {node.type === 'folder' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        )}
        
        <FileIcon fileName={node.name} type={node.type} />
        
        <span className="text-sm truncate flex-1">{node.name}</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={12} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit size={14} className="mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download size={14} className="mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const CanvasPanel: React.FC<CanvasPanelProps> = ({ className }) => {
  const {
    canvasOpen,
    setCanvasOpen,
    fileTree,
    setFileTree,
    currentFile,
    setCurrentFile,
    currentDirectory,
    setCurrentDirectory,
    isLoading,
    setLoading
  } = useCanvasStore()
  
  const [newFileName, setNewFileName] = useState('')
  const [showNewFileInput, setShowNewFileInput] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (canvasOpen && !currentDirectory) {
      // Load default directory or prompt user to select
      loadDirectory()
    }
  }, [canvasOpen])
  
  const loadDirectory = async (path?: string) => {
    setLoading(true)
    try {
      const dirPath = path || await selectDirectory()
      if (dirPath) {
        setCurrentDirectory(dirPath)
        const files = await window.electronAPI?.canvas?.listFiles(dirPath)
        setFileTree(files || [])
      }
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const selectDirectory = async (): Promise<string | null> => {
    // This would typically open a directory picker
    // For now, return a default path
    return '/Users' // Placeholder - implement proper directory selection
  }
  
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
      loadDirectory(currentDirectory) // Refresh file tree
    } catch (error) {
      console.error('Failed to create file:', error)
    }
  }
  
  if (!canvasOpen) return null
  
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "flex flex-col bg-background border-l border-border h-full overflow-hidden",
        className
      )}
      ref={resizeRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Code size={16} className="text-primary" />
          <span className="font-medium text-sm">Canvas</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCanvasOpen(false)}
          className="h-6 w-6 p-0"
        >
          <X size={14} />
        </Button>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* File Explorer */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between p-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Explorer
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewFileInput(true)}
                className="h-6 w-6 p-0"
              >
                <Plus size={12} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadDirectory()}
                className="h-6 w-6 p-0"
              >
                <FolderOpen size={12} />
              </Button>
            </div>
          </div>
          
          {showNewFileInput && (
            <div className="p-2 border-b border-border">
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.ext"
                className="h-7 text-xs"
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
          
          <ScrollArea className="flex-1">
            <div className="p-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : fileTree.length > 0 ? (
                fileTree.map((node) => (
                  <FileTreeNode key={node.path} node={node} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No files found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Editor */}
        {currentFile && (
          <div className="flex-1 flex flex-col min-h-0 border-t border-border">
            <div className="flex items-center justify-between p-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <FileIcon fileName={currentFile.path.split('/').pop() || ''} type="file" />
                <span className="text-xs font-medium truncate">
                  {currentFile.path.split('/').pop()}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveFile}
                  className="h-6 w-6 p-0"
                >
                  <Save size={12} />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <MonacoCanvasEditor
                filename={currentFile.path.split('/').pop() || ''}
                content={currentFile.content}
                onContentChange={(content) => 
                  setCurrentFile({ ...currentFile, content })
                }
                height="100%"
                theme="auto"
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default CanvasPanel