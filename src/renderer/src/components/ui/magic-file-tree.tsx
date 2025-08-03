/**
 * Magic UI Enhanced File Tree Component
 * Combines the functionality of the existing file tree with Magic UI styling and animations
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CaretRight,
  CaretDown,
  File,
  Folder,
  Code,
  FileText,
  Image,
  Plus,
  FolderOpen,
  DotsThreeOutline
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
}

interface MagicFileTreeProps {
  fileTree?: FileNode[]
  currentFile?: {
    path: string
    content: string
    language: string
  } | null
  currentDirectory?: string
  isLoading?: boolean
  onCurrentFileChange?: (file: { path: string; content: string; language: string } | null) => void
  onSetLoading?: (loading: boolean) => void
  onLoadDirectory?: (path?: string) => void
  onCreateFile?: () => void
}

const getFileIcon = (fileName: string, type: 'file' | 'folder') => {
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

const MagicFileTreeNode = ({ 
  node, 
  level = 0, 
  currentFile, 
  onCurrentFileChange, 
  onSetLoading 
}: { 
  node: FileNode
  level?: number
  currentFile?: { path: string; content: string; language: string } | null
  onCurrentFileChange?: (file: { path: string; content: string; language: string } | null) => void
  onSetLoading?: (loading: boolean) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const handleFileClick = async (filePath: string) => {
    if (node.type === 'file') {
      onSetLoading?.(true)
      try {
        const content = await window.electronAPI?.canvas?.readFile(filePath)
        const language = getLanguageFromExtension(filePath)
        onCurrentFileChange?.({
          path: filePath,
          content: content || '',
          language
        })
      } catch (error) {
        console.error('Failed to read file:', error)
      } finally {
        onSetLoading?.(false)
      }
    } else {
      setIsExpanded(!isExpanded)
    }
  }
  
  const isSelected = currentFile?.path === node.path
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: level * 0.05 }}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50 cursor-pointer rounded-md transition-all duration-200",
          "group relative",
          isSelected && "bg-accent text-accent-foreground shadow-sm",
          // Magic UI inspired gradient background for selected items
          isSelected && "bg-gradient-to-r from-accent/60 to-accent/40 border border-accent/20"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => handleFileClick(node.path)}
      >
        {/* Expandable indicator with smooth rotation */}
        {node.type === 'folder' && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-0.5 hover:bg-accent/70 rounded transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <CaretRight size={12} />
            </motion.div>
          </motion.button>
        )}
        
        {/* File/folder icon with Magic UI glow effect */}
        <motion.div
          className={cn(
            "relative",
            isSelected && "drop-shadow-sm"
          )}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.1 }}
        >
          {getFileIcon(node.name, node.type)}
          {/* Magic UI inspired glow effect for selected items */}
          {isSelected && (
            <motion.div
              className="absolute inset-0 bg-current opacity-20 rounded-full blur-sm -z-10"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.3 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.div>
        
        {/* File name with Magic UI typography */}
        <motion.span 
          className={cn(
            "text-sm truncate flex-1 font-medium",
            isSelected && "text-accent-foreground"
          )}
          layout
        >
          {node.name}
        </motion.span>
        
        {/* Action menu with Magic UI styling */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ opacity: 1, scale: 1 }}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-accent/70"
                onClick={(e) => e.stopPropagation()}
              >
                <DotsThreeOutline size={12} />
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Code size={14} className="mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText size={14} className="mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600">
              <FileText size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Animated children with Magic UI stagger effect */}
      <AnimatePresence>
        {node.type === 'folder' && isExpanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map((child, index) => (
              <motion.div
                key={child.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <MagicFileTreeNode
                  node={child}
                  level={level + 1}
                  currentFile={currentFile}
                  onCurrentFileChange={onCurrentFileChange}
                  onSetLoading={onSetLoading}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const MagicFileTree: React.FC<MagicFileTreeProps> = ({
  fileTree = [],
  currentFile,
  currentDirectory,
  isLoading = false,
  onCurrentFileChange,
  onSetLoading,
  onLoadDirectory,
  onCreateFile
}) => {
  return (
    <div className="w-64 flex flex-col border-r border-border/50 bg-gradient-to-b from-background to-muted/30">
      {/* Header with Magic UI gradient */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-gradient-to-r from-background via-muted/20 to-background">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <FolderOpen size={16} className="text-primary" />
          </motion.div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Explorer
          </span>
        </motion.div>
        
        <motion.div 
          className="flex gap-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateFile}
              className="h-6 w-6 p-0 hover:bg-accent/70"
              title="New File"
            >
              <Plus size={12} />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLoadDirectory?.()}
              className="h-6 w-6 p-0 hover:bg-accent/70"
              title="Select Directory"
            >
              <FolderOpen size={12} />
            </Button>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Current directory indicator */}
      {currentDirectory && (
        <motion.div 
          className="px-3 py-2 text-xs text-muted-foreground border-b border-border/30 bg-muted/20"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          <div className="truncate" title={currentDirectory}>
            📁 {currentDirectory.split('/').pop() || currentDirectory}
          </div>
        </motion.div>
      )}
      
      {/* File tree content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <motion.div 
            className="flex items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        ) : fileTree.length > 0 ? (
          <motion.div 
            className="p-2 space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {fileTree.map((node, index) => (
              <motion.div
                key={node.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <MagicFileTreeNode 
                  node={node} 
                  currentFile={currentFile}
                  onCurrentFileChange={onCurrentFileChange}
                  onSetLoading={onSetLoading}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            className="flex flex-col items-center justify-center py-8 text-center space-y-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <FolderOpen size={32} className="text-muted-foreground/50" />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">No directory selected</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Click the folder icon to browse</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default MagicFileTree
