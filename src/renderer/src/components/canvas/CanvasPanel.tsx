// src/renderer/src/components/canvas/CanvasPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCanvasModeStore } from '@/stores/useCanvasModeStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useMessageStore } from '@/stores/useMessageStore'
import MonacoCanvasEditor from './MonacoCanvasEditor'
import ChatMessageList from '../chat/components/ChatMessageList'
import InputBar from '../chat/InputBar'
import { 
  Code2, 
  MessageSquare, 
  Save, 
  Undo2, 
  Redo2, 
  FileText, 
  Folder, 
  Play, 
  Eye, 
  EyeOff,
  Settings,
  ArrowLeft,
  Lock,
  Unlock
} from 'lucide-react'
import { detectCodeInMessage, shouldSuggestCanvas } from '@/utils/codeDetection'

interface CanvasMode {
  type: 'scratchpad' | 'project'
  projectPath?: string
  files: CanvasFile[]
  activeFileId?: string
}

interface CanvasFile {
  id: string
  name: string
  content: string
  language: string
  modified: boolean
  path?: string // undefined for scratchpad files
  created: Date
  lastModified: Date
}

interface EditAction {
  id: string
  type: 'create' | 'edit' | 'delete' | 'rename'
  fileId: string
  timestamp: Date
  before?: any
  after?: any
  description: string
}

interface CanvasPanelProps {
  className?: string
}

const CanvasPanel: React.FC<CanvasPanelProps> = ({ className }) => {
  // State management
  const [canvasMode, setCanvasMode] = useState<CanvasMode>({
    type: 'scratchpad',
    files: [],
    activeFileId: undefined
  })
  
  const [editHistory, setEditHistory] = useState<EditAction[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  
  // Refs for Monaco integration
  const editorRef = useRef<any>(null)
  const chatRef = useRef<any>(null)

  // Global canvas mode store
  const { setCanvasMode: setGlobalCanvasMode } = useCanvasModeStore()
  const canvasStore = useCanvasStore()
  
  // Message store integration
  const { messages, addMessage, isStreaming, sendMessage } = useMessageStore()
  const [inputValue, setInputValue] = useState('')

  // Initialize canvas mode
  useEffect(() => {
    setGlobalCanvasMode(true)
    return () => setGlobalCanvasMode(false)
  }, [setGlobalCanvasMode])

  // Security validation for all operations
  const validateCanvasOperation = useCallback((operation: string, data: any) => {
    // Implement comprehensive security checks
    if (canvasMode.type === 'project' && !data.path?.startsWith(canvasMode.projectPath || '')) {
      throw new Error('Security violation: Path outside project directory')
    }
    
    // Log all operations for security audit
    console.log(`🔒 Canvas Security Log: ${operation}`, {
      mode: canvasMode.type,
      timestamp: new Date().toISOString(),
      operation,
      data: { ...data, content: data.content ? '[CONTENT]' : undefined }
    })
    
    return true
  }, [canvasMode])

  // Safe, reversible edit actions with logging
  const executeEditAction = useCallback((action: Omit<EditAction, 'id' | 'timestamp'>) => {
    try {
      validateCanvasOperation(action.type, action)
      
      const editAction: EditAction = {
        ...action,
        id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      }
      
      // Apply the action
      switch (action.type) {
        case 'create':
          setCanvasMode(prev => ({
            ...prev,
            files: [...prev.files, action.after],
            activeFileId: action.after.id
          }))
          break
          
        case 'edit':
          setCanvasMode(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.id === action.fileId 
                ? { ...f, ...action.after, lastModified: new Date() }
                : f
            )
          }))
          break
          
        case 'delete':
          setCanvasMode(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== action.fileId),
            activeFileId: prev.activeFileId === action.fileId ? undefined : prev.activeFileId
          }))
          break
      }
      
      // Update edit history (truncate if we're not at the end)
      setEditHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1)
        return [...newHistory, editAction]
      })
      setHistoryIndex(prev => prev + 1)
      
      console.log(`✅ Edit action executed: ${action.description}`)
      
    } catch (error) {
      console.error('❌ Canvas edit action failed:', error)
      throw error
    }
  }, [validateCanvasOperation, historyIndex])

  // Undo functionality
  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      const action = editHistory[historyIndex]
      
      // Reverse the action
      switch (action.type) {
        case 'create':
          setCanvasMode(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== action.fileId),
            activeFileId: prev.activeFileId === action.fileId ? undefined : prev.activeFileId
          }))
          break
          
        case 'edit':
          setCanvasMode(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.id === action.fileId && action.before
                ? { ...f, ...action.before }
                : f
            )
          }))
          break
          
        case 'delete':
          if (action.before) {
            setCanvasMode(prev => ({
              ...prev,
              files: [...prev.files, action.before]
            }))
          }
          break
      }
      
      setHistoryIndex(prev => prev - 1)
      console.log(`↶ Undid: ${action.description}`)
    }
  }, [editHistory, historyIndex])

  // Redo functionality  
  const redo = useCallback(() => {
    if (historyIndex < editHistory.length - 1) {
      const nextIndex = historyIndex + 1
      const action = editHistory[nextIndex]
      
      // Re-apply the action
      switch (action.type) {
        case 'create':
          setCanvasMode(prev => ({
            ...prev,
            files: [...prev.files, action.after],
            activeFileId: action.after.id
          }))
          break
          
        case 'edit':
          setCanvasMode(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.id === action.fileId 
                ? { ...f, ...action.after, lastModified: new Date() }
                : f
            )
          }))
          break
          
        case 'delete':
          setCanvasMode(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== action.fileId)
          }))
          break
      }
      
      setHistoryIndex(nextIndex)
      console.log(`↷ Redid: ${action.description}`)
    }
  }, [editHistory, historyIndex])

  // Bidirectional chat-canvas integration
  const analyzeMessageForCode = useCallback((message: string) => {
    const detectedCode = detectCodeInMessage(message)
    
    if (detectedCode.length > 0 && shouldSuggestCanvas(message)) {
      // Auto-create canvas file from detected code
      const bestCode = detectedCode[0]
      const newFile: CanvasFile = {
        id: `file_${Date.now()}`,
        name: `generated.${bestCode.language === 'typescript' ? 'tsx' : bestCode.language}`,
        content: bestCode.code,
        language: bestCode.language,
        modified: false,
        created: new Date(),
        lastModified: new Date()
      }
      
      executeEditAction({
        type: 'create',
        fileId: newFile.id,
        after: newFile,
        description: `Auto-created file from chat: ${bestCode.language}`
      })
      
      // Add AI suggestion to chat
      setChatMessages(prev => [...prev, {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: `I detected ${bestCode.language} code in your message and created a new file. You can edit it in the Canvas!`,
        timestamp: new Date(),
        metadata: { trigger: 'code_detection', confidence: bestCode.confidence }
      }])
    }
  }, [executeEditAction])

  // Handle chat messages with Canvas integration
  const handleChatMessage = useCallback((content: string) => {
    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date()
    }
    
    setChatMessages(prev => [...prev, userMessage])
    
    // Analyze for code and auto-suggest Canvas
    analyzeMessageForCode(content)
    
    // TODO: Send to AI service with Canvas context
    setIsLoading(true)
    setTimeout(() => {
      const aiResponse = {
        id: `ai_${Date.now()}`,
        type: 'ai', 
        content: `I understand you want help with: "${content}". ${canvasMode.files.length > 0 ? 'I can see your Canvas files and will incorporate them in my response.' : ''}`,
        timestamp: new Date(),
        canvasContext: canvasMode.files.map(f => ({ name: f.name, language: f.language }))
      }
      setChatMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1000)
  }, [analyzeMessageForCode, canvasMode.files])

  // File operations
  const createNewFile = useCallback((name?: string, content?: string) => {
    const fileName = name || `untitled.tsx`
    const newFile: CanvasFile = {
      id: `file_${Date.now()}`,
      name: fileName,
      content: content || `// New ${canvasMode.type} file\n\n`,
      language: fileName.split('.').pop() || 'typescript',
      modified: false,
      path: canvasMode.type === 'project' ? `${canvasMode.projectPath}/${fileName}` : undefined,
      created: new Date(),
      lastModified: new Date()
    }
    
    executeEditAction({
      type: 'create',
      fileId: newFile.id,
      after: newFile,
      description: `Created new file: ${fileName}`
    })
  }, [canvasMode, executeEditAction])

  const handleFileContentChange = useCallback((content: string) => {
    const activeFile = canvasMode.files.find(f => f.id === canvasMode.activeFileId)
    if (!activeFile) return
    
    const before = { ...activeFile }
    const after = { ...activeFile, content, modified: true, lastModified: new Date() }
    
    executeEditAction({
      type: 'edit',
      fileId: activeFile.id,
      before,
      after,
      description: `Edited ${activeFile.name}`
    })
    
    // Auto-save if enabled
    if (autoSave && canvasMode.type === 'project' && activeFile.path) {
      saveFile(activeFile.id)
    }
  }, [canvasMode, executeEditAction, autoSave])

  // Save to real file system (project mode only)
  const saveFile = useCallback(async (fileId: string) => {
    const file = canvasMode.files.find(f => f.id === fileId)
    if (!file || canvasMode.type === 'scratchpad') return
    
    try {
      if (file.path && window.electronAPI?.writeFile) {
        await window.electronAPI.writeFile(file.path, file.content)
        
        // Mark as saved
        setCanvasMode(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === fileId ? { ...f, modified: false } : f
          )
        }))
        
        console.log(`💾 Saved file: ${file.name}`)
      }
    } catch (error) {
      console.error('❌ Failed to save file:', error)
    }
  }, [canvasMode])

  // Switch between scratchpad and project modes
  const switchMode = useCallback((newType: 'scratchpad' | 'project', projectPath?: string) => {
    validateCanvasOperation('mode_switch', { newType, projectPath })
    
    setCanvasMode(prev => ({
      type: newType,
      projectPath,
      files: newType === 'scratchpad' ? [] : prev.files, // Clear files when switching to scratchpad
      activeFileId: undefined
    }))
    
    console.log(`🔄 Switched to ${newType} mode`)
  }, [validateCanvasOperation])

  // Get active file
  const activeFile = canvasMode.files.find(f => f.id === canvasMode.activeFileId)

  // Chat handlers
  const handleSendMessage = useCallback(async (message: string, attachments?: File[]) => {
    if (!message.trim()) return
    
    setInputValue('')
    await sendMessage({
      content: message,
      model: 'llama3.1', // Default model, could be made configurable
      files: attachments,
      memoryEnabled: true
    })
  }, [sendMessage])

  const handleMessageCorrection = useCallback((messageId: string, newContent: string) => {
    // TODO: Implement message correction functionality
    console.log('Correcting message:', messageId, newContent)
  }, [])

  const handleMessageReaction = useCallback((messageId: string, reaction: string) => {
    // TODO: Implement message reaction functionality
    console.log('Reacting to message:', messageId, reaction)
  }, [])

  return (
    <div className={cn('h-full flex flex-col bg-[#1A1A1A] text-white', className)}>
      {/* Canvas Header - Mode controls */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGlobalCanvasMode(false)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Canvas
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-2">
            <Badge variant={canvasMode.type === 'scratchpad' ? 'default' : 'secondary'}>
              {canvasMode.type === 'scratchpad' ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
              {canvasMode.type === 'scratchpad' ? 'Scratchpad' : 'Project'}
            </Badge>
            
            {canvasMode.projectPath && (
              <span className="text-sm text-white/60">
                {canvasMode.projectPath}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Edit controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={historyIndex < 0}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= editHistory.length - 1}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          {/* File controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => createNewFile()}
            title="New File"
          >
            <FileText className="w-4 h-4" />
          </Button>
          
          {activeFile && canvasMode.type === 'project' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => saveFile(activeFile.id)}
              disabled={!activeFile.modified}
              title="Save"
            >
              <Save className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            title={showChat ? 'Hide Chat' : 'Show Chat'}
          >
            {showChat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Canvas Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel (left side) */}
        {showChat && (
          <div className="w-1/2 flex flex-col border-r border-white/10">
            <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-[#303030]/30">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">Chat</span>
              <Badge variant="outline" className="ml-auto border-white/20 text-white/70">
                {chatMessages.length} messages
              </Badge>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ChatMessageList
                messages={messages}
                onMessageCorrection={handleMessageCorrection}
                onMessageReaction={handleMessageReaction}
                isThinking={isStreaming}
              />
            </div>
            
            <div className="p-3 border-t border-white/10">
              <InputBar
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSendMessage}
                isLoading={isStreaming}
                placeholder="Ask about your code..."
                className="bg-[#303030]"
              />
            </div>
          </div>
        )}
        
        {/* Editor Panel (right side) */}
        <div className={cn('flex flex-col', showChat ? 'w-1/2' : 'w-full')}>
          {/* File tabs */}
          {canvasMode.files.length > 0 && (
            <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-[#303030]/20 overflow-x-auto">
              {canvasMode.files.map(file => (
                <Button
                  key={file.id}
                  variant={file.id === canvasMode.activeFileId ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCanvasMode(prev => ({ ...prev, activeFileId: file.id }))}
                  className="gap-2 min-w-fit"
                >
                  <span>{file.name}</span>
                  {file.modified && <span className="text-[#93b3f3]">•</span>}
                </Button>
              ))}
            </div>
          )}
          
          {/* Editor area */}
          <div className="flex-1">
            {activeFile ? (
              <MonacoCanvasEditor
                filename={activeFile.name}
                content={activeFile.content}
                onContentChange={handleFileContentChange}
                height="100%"
                theme="vs-dark"
                minimap={true}
                readOnly={false}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-white/60">
                <div className="text-center space-y-4">
                  <Code2 className="w-12 h-12 mx-auto opacity-50" />
                  <div>
                    <h3 className="font-medium mb-2 text-white">
                      {canvasMode.type === 'scratchpad' ? 'Scratchpad Mode' : 'Project Mode'}
                    </h3>
                    <p className="text-sm mb-4">
                      {canvasMode.type === 'scratchpad' 
                        ? 'Create ephemeral files for quick experiments'
                        : 'Work with real project files'
                      }
                    </p>
                    <Button onClick={() => createNewFile()} className="gap-2 bg-[#93b3f3] hover:bg-[#7da3f3] text-black">
                      <FileText className="w-4 h-4" />
                      Create New File
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Canvas Status Bar */}
      <div className="flex items-center justify-between p-2 text-xs text-white/60 border-t border-white/10 bg-[#303030]/10">
        <div className="flex items-center gap-4">
          <span>
            Mode: {canvasMode.type} | Files: {canvasMode.files.length} | 
            History: {editHistory.length} | Index: {historyIndex + 1}
          </span>
          
          {activeFile && (
            <span>
              {activeFile.name} ({activeFile.language}) 
              {activeFile.modified && ' • Modified'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchMode(canvasMode.type === 'scratchpad' ? 'project' : 'scratchpad')}
            className="text-xs h-6"
          >
            Switch to {canvasMode.type === 'scratchpad' ? 'Project' : 'Scratchpad'}
          </Button>
          
          <span>Auto-save: {autoSave ? 'On' : 'Off'}</span>
        </div>
      </div>
    </div>
  )
}

export default CanvasPanel
