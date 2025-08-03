import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CaretRight, Folder, File as FileIcon } from 'phosphor-react'
import { TreeViewElement } from './ui/file-tree'
import { getFileIcon } from '../utils/file-tree-utils'

interface FileTreeProps {
  elements: TreeViewElement[]
  onSelect?: (id: string, isDirectory: boolean) => void
  onExpand?: (id: string) => void
  selectedId?: string
  className?: string
}

interface FileTreeItemProps {
  element: TreeViewElement
  level?: number
  onSelect?: (id: string, isDirectory: boolean) => void
  onExpand?: (id: string) => void
  selectedId?: string
  isExpanded?: boolean
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  element,
  level = 0,
  onSelect,
  onExpand,
  selectedId,
  isExpanded = false
}) => {
  const [expanded, setExpanded] = useState(isExpanded)
  const isDirectory = element.children && element.children.length >= 0
  const isSelected = selectedId === element.id
  const hasChildren = element.children && element.children.length > 0

  const handleClick = useCallback(() => {
    if (isDirectory && onExpand) {
      setExpanded(!expanded)
      onExpand(element.id)
    }
    if (onSelect) {
      onSelect(element.id, !!isDirectory)
    }
  }, [element.id, isDirectory, expanded, onSelect, onExpand])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Send IPC message to main process to show context menu
    if (window.api?.showContextMenu) {
      window.api.showContextMenu({
        x: e.clientX,
        y: e.clientY,
        filePath: element.id,
        isDirectory: !!isDirectory,
        fileName: element.name
      })
    }
  }, [element.id, element.name, isDirectory])

  const getFileIconForElement = (name: string) => {
    const icon = getFileIcon(name)
    return <span className="text-sm mr-1">{icon}</span>
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center py-1 px-2 text-sm cursor-pointer rounded transition-colors',
          'hover:bg-gray-700/50',
          isSelected && 'bg-gray-600/50 text-white',
          level > 0 && `ml-${level * 4}`
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {isDirectory ? (
          <>
            <CaretRight 
              className={cn(
                'h-4 w-4 mr-1 transition-transform text-gray-400',
                expanded && 'rotate-90'
              )}
            />
            <Folder className="h-4 w-4 mr-2 text-blue-400" />
          </>
        ) : (
          <>
            <span className="w-4 mr-1" />
            {getFileIconForElement(element.name)}
          </>
        )}
        <span className="truncate flex-1 text-gray-200">
          {element.name}
        </span>
      </div>
      
      {isDirectory && expanded && hasChildren && (
        <div>
          {element.children?.map((child) => (
            <FileTreeItem
              key={child.id}
              element={child}
              level={level + 1}
              onSelect={onSelect}
              onExpand={onExpand}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const FileTree: React.FC<FileTreeProps> = ({
  elements,
  onSelect,
  onExpand,
  selectedId,
  className
}) => {
  // Listen for context menu commands from main process
  useEffect(() => {
    const handleContextMenuCommand = (event: any, command: string, data: any) => {
      console.log('Context menu command received:', command, data)
      // Handle context menu commands here
      // This will be processed by the DeveloperPanel component
    }

    if (window.api?.onContextMenuCommand) {
      window.api.onContextMenuCommand(handleContextMenuCommand)
    }

    return () => {
      if (window.api?.removeContextMenuListener) {
        window.api.removeContextMenuListener(handleContextMenuCommand)
      }
    }
  }, [])

  return (
    <div className={cn('w-full', className)}>
      {elements.map((element) => (
        <FileTreeItem
          key={element.id}
          element={element}
          onSelect={onSelect}
          onExpand={onExpand}
          selectedId={selectedId}
        />
      ))}
    </div>
  )
}
