import React, { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { TreeViewElement } from './ui/file-tree'
import { FileTree } from './FileTree'
import { convertFileSystemToTree, getFileIcon, getLanguageFromExtension, FileSystemItem } from '../utils/file-tree-utils'
import {
  Terminal,
  FloppyDisk,
  Folder,
  File,
  Plus,
  X,
  Play,
  FolderOpen,
  Trash,
  Copy,
  ArrowClockwise,
  ChevronRight,
  FileText
} from 'phosphor-react'

// Declare the window.api type
declare global {
  interface Window {
    api: {
      fsReadFile: (
        filePath: string
      ) => Promise<{ success: boolean; content?: string; error?: string }>
      fsWriteFile: (
        filePath: string,
        content: string
      ) => Promise<{ success: boolean; error?: string }>
      fsListDirectory: (
        dirPath: string
      ) => Promise<{ success: boolean; files?: any[]; error?: string }>
      fsCreateFile: (
        filePath: string,
        content?: string
      ) => Promise<{ success: boolean; error?: string }>
      fsCreateDirectory: (
        dirPath: string
      ) => Promise<{ success: boolean; error?: string }>
      fsDeleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
      fsDeleteDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>
      fsRenameFile: (
        oldPath: string,
        newPath: string
      ) => Promise<{ success: boolean; error?: string }>
      fsExecuteCommand: (
        command: string,
        cwd?: string
      ) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
      fsOpenFileDialog: () => Promise<{ success: boolean; filePath?: string; error?: string }>
      fsSaveFileDialog: (
        defaultName?: string,
        content?: string
      ) => Promise<{ success: boolean; filePath?: string; error?: string }>
      fsGetFileInfo: (filePath: string) => Promise<{ success: boolean; info?: any; error?: string }>
    }
  }
}

interface FileTab {
  id: string
  name: string
  path: string
  content: string
  isModified: boolean
  language: string
}

interface FileItem {
  name: string
  isDirectory: boolean
  isFile: boolean
  path: string
}

interface TerminalOutput {
  id: string
  command: string
  output: string
  error?: string
  timestamp: Date
}

const DeveloperPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [tabs, setTabs] = useState<FileTab[]>([])
  const [currentDirectory, setCurrentDirectory] = useState<string>('')
  const [directoryContents, setDirectoryContents] = useState<FileItem[]>([])
  const [treeElements, setTreeElements] = useState<TreeViewElement[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string>('')
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [terminalHistory, setTerminalHistory] = useState<TerminalOutput[]>([])
  const [currentCommand, setCurrentCommand] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Initialize with home directory
  useEffect(() => {
    const initHomeDirectory = async () => {
      try {
        // Try to get user's home directory by executing pwd or echo %USERPROFILE%
        const result = await window.api.fsExecuteCommand(
          process.platform === 'win32' ? 'echo %USERPROFILE%' : 'echo $HOME'
        )
        if (result.success && result.stdout) {
          const homeDir = result.stdout.trim()
          setCurrentDirectory(homeDir)
          await loadDirectory(homeDir)
        } else {
          // Fallback to a default directory
          const fallbackDir = process.platform === 'win32' ? 'C:\\' : '/'
          setCurrentDirectory(fallbackDir)
          await loadDirectory(fallbackDir)
        }
      } catch (error) {
        console.error('Error initializing directory:', error)
        // Set a safe fallback
        const fallbackDir = process.platform === 'win32' ? 'C:\\' : '/'
        setCurrentDirectory(fallbackDir)
        await loadDirectory(fallbackDir)
      }
    }

    initHomeDirectory()
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalHistory])

  const loadDirectory = async (dirPath: string) => {
    setIsLoading(true)
    try {
      const result = await window.api.fsListDirectory(dirPath)
      if (result.success && result.files) {
        setDirectoryContents(result.files)
        setCurrentDirectory(dirPath)
        
        // Convert directory contents to tree elements
        const fileSystemItems: FileSystemItem[] = result.files.map((file: any) => ({
          name: file.name,
          path: file.path,
          isDirectory: file.isDirectory,
          size: file.size,
          lastModified: file.lastModified ? new Date(file.lastModified) : undefined
        }))
        
        const treeElements = convertFileSystemToTree(fileSystemItems, dirPath)
        setTreeElements(treeElements)
      } else {
        console.error('Failed to load directory:', result.error)
        addTerminalOutput(`Error loading directory: ${result.error}`, true)
      }
    } catch (error) {
      console.error('Error loading directory:', error)
      addTerminalOutput(`Error loading directory: ${error}`, true)
    } finally {
      setIsLoading(false)
    }
  }

  const openFile = async (filePath: string) => {
    try {
      const result = await window.api.fsReadFile(filePath)
      if (result.success && result.content !== undefined) {
        const fileName = filePath.split(/[\\/]/).pop() || 'unknown'
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''

        // Check if file is already open
        const existingTab = tabs.find((tab) => tab.path === filePath)
        if (existingTab) {
          setActiveTab(existingTab.id)
          return
        }

        const newTab: FileTab = {
          id: `tab-${Date.now()}`,
          name: fileName,
          path: filePath,
          content: result.content,
          isModified: false,
          language: getLanguageFromExtension(fileExtension)
        }

        setTabs((prev) => [...prev, newTab])
        setActiveTab(newTab.id)
        addTerminalOutput(`Opened file: ${filePath}`)
      } else {
        console.error('Failed to read file:', result.error)
        addTerminalOutput(`Error reading file: ${result.error}`, true)
      }
    } catch (error) {
      console.error('Error opening file:', error)
      addTerminalOutput(`Error opening file: ${error}`, true)
    }
  }

  const saveFile = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return

    try {
      const result = await window.api.fsWriteFile(tab.path, tab.content)
      if (result.success) {
        setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isModified: false } : t)))
        addTerminalOutput(`Saved file: ${tab.path}`)
      } else {
        console.error('Failed to save file:', result.error)
        addTerminalOutput(`Error saving file: ${result.error}`, true)
      }
    } catch (error) {
      console.error('Error saving file:', error)
      addTerminalOutput(`Error saving file: ${error}`, true)
    }
  }

  const createNewFile = async () => {
    try {
      const result = await window.api.fsSaveFileDialog('untitled.txt', '')
      if (result.success && result.filePath) {
        await openFile(result.filePath)
        addTerminalOutput(`Created new file: ${result.filePath}`)
        // Refresh directory if the new file is in current directory
        if (result.filePath.includes(currentDirectory)) {
          await loadDirectory(currentDirectory)
        }
      }
    } catch (error) {
      console.error('Error creating file:', error)
      addTerminalOutput(`Error creating file: ${error}`, true)
    }
  }

  const openFileDialog = async () => {
    try {
      const result = await window.api.fsOpenFileDialog()
      if (result.success && result.filePath) {
        await openFile(result.filePath)
      }
    } catch (error) {
      console.error('Error opening file dialog:', error)
      addTerminalOutput(`Error opening file dialog: ${error}`, true)
    }
  }

  const closeTab = (tabId: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== tabId))
    if (activeTab === tabId) {
      const remainingTabs = tabs.filter((t) => t.id !== tabId)
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : null)
    }
  }

  const updateTabContent = (tabId: string, content: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, content, isModified: true } : t)))
  }

  const executeCommand = async () => {
    if (!currentCommand.trim()) return

    const command = currentCommand.trim()
    setCurrentCommand('')

    addTerminalOutput(`$ ${command}`)

    try {
      const result = await window.api.fsExecuteCommand(command, currentDirectory)

      if (result.success) {
        if (result.stdout) addTerminalOutput(result.stdout)
        if (result.stderr) addTerminalOutput(result.stderr, true)

        // Check if command might have changed directory
        if (command.startsWith('cd ')) {
          // Refresh current directory listing
          await loadDirectory(currentDirectory)
        }
      } else {
        addTerminalOutput(result.error || 'Command failed', true)
      }
    } catch (error) {
      addTerminalOutput(`Error executing command: ${error}`, true)
    }
  }

  const addTerminalOutput = (output: string, isError: boolean = false) => {
    const newOutput: TerminalOutput = {
      id: `output-${Date.now()}-${Math.random()}`,
      command: isError ? 'ERROR' : 'INFO',
      output,
      error: isError ? output : undefined,
      timestamp: new Date()
    }
    setTerminalHistory((prev) => [...prev, newOutput])
  }

  const clearTerminal = () => {
    setTerminalHistory([])
  }

  const navigateToParentDirectory = async () => {
    const parentDir = currentDirectory
      .split(/[\\/]/)
      .slice(0, -1)
      .join(process.platform === 'win32' ? '\\' : '/')
    if (parentDir && parentDir !== currentDirectory) {
      await loadDirectory(parentDir || (process.platform === 'win32' ? 'C:\\' : '/'))
    }
  }

  const handleTreeItemSelect = async (selectedId: string, isDirectory: boolean) => {
    setSelectedFileId(selectedId)
    
    if (isDirectory) {
      // Navigate to directory
      await loadDirectory(selectedId)
    } else {
      // Open file
      await openFile(selectedId)
    }
  }

  const handleTreeExpand = async (expandedId: string) => {
    // Toggle expanded state
    setExpandedItems(prev => 
      prev.includes(expandedId) 
        ? prev.filter(id => id !== expandedId)
        : [...prev, expandedId]
    )
  }

  const handleRenameFile = async (oldPath: string, newName: string) => {
    const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
    try {
      const result = await window.api.fsRenameFile(oldPath, newPath);
      if (result.success) {
        addTerminalOutput(`Renamed: ${oldPath} to ${newPath}`);
        await loadDirectory(currentDirectory); // Refresh tree
      } else {
        addTerminalOutput(`Error renaming: ${result.error}`, true);
      }
    } catch (error) {
      addTerminalOutput(`Error renaming file: ${error}`, true);
    }
  };

  const handleDeleteFile = async (path: string, isDirectory: boolean) => {
    try {
      const result = isDirectory
        ? await window.api.fsDeleteDirectory(path)
        : await window.api.fsDeleteFile(path);
      if (result.success) {
        addTerminalOutput(`Deleted: ${path}`);
        await loadDirectory(currentDirectory); // Refresh tree
      } else {
        addTerminalOutput(`Error deleting: ${result.error}`, true);
      }
    } catch (error) {
      addTerminalOutput(`Error deleting: ${error}`, true);
    }
  };

  const handleCreateFile = async (path: string) => {
    try {
      const result = await window.api.fsCreateFile(path, '');
      if (result.success) {
        addTerminalOutput(`Created file: ${path}`);
        await loadDirectory(currentDirectory); // Refresh tree
        await openFile(path);
      } else {
        addTerminalOutput(`Error creating file: ${result.error}`, true);
      }
    } catch (error) {
      addTerminalOutput(`Error creating file: ${error}`, true);
    }
  };

  const handleCreateFolder = async (path: string) => {
    try {
      const result = await window.api.fsCreateDirectory(path);
      if (result.success) {
        addTerminalOutput(`Created folder: ${path}`);
        await loadDirectory(currentDirectory); // Refresh tree
      } else {
        addTerminalOutput(`Error creating folder: ${result.error}`, true);
      }
    } catch (error) {
      addTerminalOutput(`Error creating folder: ${error}`, true);
    }
  };

  const getLanguageFromExtension = (extension: string): string => {
    const languageMap: { [key: string]: string } = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      txt: 'text',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sh: 'bash',
      bat: 'batch'
    }
    return languageMap[extension] || 'text'
  }

  const currentTab = activeTab ? tabs.find((t) => t.id === activeTab) : null

  return (
    <div className="w-2/5 bg-gray-900 text-white flex flex-col h-full">
      {/* Developer Panel Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Terminal size={18} />
            Developer Mode
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={createNewFile}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-xs"
            >
              <Plus size={14} />
              New
            </Button>
            <Button
              onClick={openFileDialog}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-xs"
            >
              <FolderOpen size={14} />
              Open
            </Button>
          </div>
        </div>
      </div>

      {/* File Tabs */}
      {tabs.length > 0 && (
        <div className="bg-gray-800 border-b border-gray-700 flex overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-gray-700 min-w-0 ${
                activeTab === tab.id ? 'bg-gray-700' : 'hover:bg-gray-750'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <File size={14} />
              <span className="truncate text-sm">
                {tab.name}
                {tab.isModified && '*'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex">
        {/* File Explorer with Magic UI File Tree */}
        <div className="w-1/3 bg-gray-850 border-r border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Folder size={16} />
              <span className="text-sm font-medium">Explorer</span>
              <Button
                onClick={() => loadDirectory(currentDirectory)}
                size="sm"
                className="ml-auto bg-transparent hover:bg-gray-700 p-1"
              >
                <ArrowClockwise size={12} />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={navigateToParentDirectory}
                size="sm"
                className="bg-transparent hover:bg-gray-700 p-1"
                disabled={
                  !currentDirectory ||
                  currentDirectory === '/' ||
                  currentDirectory === 'C:\\'
                }
              >
                ↑
              </Button>
              <div className="text-xs text-gray-400 truncate flex-1">{currentDirectory}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-gray-400 text-sm">Loading...</div>
            ) : treeElements.length > 0 ? (
              <div className="p-2">
                <FileTree
                  elements={treeElements}
                  onSelect={handleTreeItemSelect}
                  onExpand={handleTreeExpand}
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                  selectedId={selectedFileId}
                  className="text-sm"
                />
              </div>
            ) : (
              <div className="p-4 text-gray-400 text-sm">No files in directory</div>
            )}
          </div>
        </div>

        {/* Code Editor / Terminal */}
        <div className="flex-1 flex flex-col">
          {/* Code Editor */}
          {currentTab && (
            <div className="flex-1 flex flex-col">
              <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center justify-between">
                <span className="text-sm text-gray-300">{currentTab.name}</span>
                <Button
                  onClick={() => saveFile(currentTab.id)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-xs"
                  disabled={!currentTab.isModified}
                >
                  <FloppyDisk size={14} />
                  Save
                </Button>
              </div>
              <Textarea
                value={currentTab.content}
                onChange={(e) => updateTabContent(currentTab.id, e.target.value)}
                className="flex-1 bg-gray-900 text-white font-mono text-sm border-none resize-none focus:ring-0 rounded-none"
                placeholder="Start coding..."
              />
            </div>
          )}

          {/* Terminal */}
          <div className="h-64 bg-black border-t border-gray-700 flex flex-col">
            <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center justify-between">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <Terminal size={14} />
                Terminal
              </span>
              <Button
                onClick={clearTerminal}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-xs"
              >
                <Trash size={12} />
                Clear
              </Button>
            </div>

            <div ref={terminalRef} className="flex-1 overflow-y-auto p-3 font-mono text-sm">
              {terminalHistory.map((output) => (
                <div
                  key={output.id}
                  className={`mb-1 ${output.error ? 'text-red-400' : 'text-green-400'}`}
                >
                  {output.output}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-700 p-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400">$</span>
                <Input
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
                  className="flex-1 bg-transparent border-none text-white font-mono text-sm focus:ring-0 p-0"
                  placeholder="Enter command..."
                />
                <Button
                  onClick={executeCommand}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!currentCommand.trim()}
                >
                  <Play size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeveloperPanel
