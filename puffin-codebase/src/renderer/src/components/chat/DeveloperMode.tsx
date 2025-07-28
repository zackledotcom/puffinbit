import React, { useState, useEffect, useRef } from 'react'
import {
  GridFour,
  Terminal,
  Folder,
  Activity,
  Bug,
  Cpu,
  Lightning,
  FileText,
  ArrowsClockwise,
  Upload,
  FloppyDisk,
  Play,
  Stop,
  Clock,
  Gear,
  ChartLine,
  Code,
  Brain
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import EnhancedChatCanvas from './EnhancedChatCanvas'
import CodeGenerator from '../developer/CodeGenerator'
import TuningPanel from '../tuning/TuningPanel'

interface DeveloperModeProps {
  isOpen: boolean
  onClose: () => void
  messages: any[]
  selectedModel: string
  onUpdateMessage: (id: string, updates: any) => void
  onDeleteMessage: (id: string) => void
  onCorrectMessage: (id: string, newContent: string) => void
  onAddMessage: (message: any) => void
}
const DeveloperMode: React.FC<DeveloperModeProps> = ({
  isOpen,
  onClose,
  messages,
  selectedModel,
  onUpdateMessage,
  onDeleteMessage,
  onCorrectMessage,
  onAddMessage
}) => {
  // Canvas state
  const [canvasMessages, setCanvasMessages] = useState(messages)

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<
    Array<{
      id: string
      command: string
      output: string
      timestamp: Date
    }>
  >([])
  const [currentCommand, setCurrentCommand] = useState('')

  // Files state
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [projectFiles] = useState([
    { path: '/src/main.tsx', name: 'main.tsx', type: 'file', size: 2048 },
    { path: '/src/App.tsx', name: 'App.tsx', type: 'file', size: 4096 },
    { path: '/src/components', name: 'components', type: 'folder' },
    { path: '/package.json', name: 'package.json', type: 'file', size: 1024 }
  ])
  // Performance state
  const [systemStats, setSystemStats] = useState<{
    cpu: number
    memory: number
  }>({ cpu: 0, memory: 0 })
  const [codeExecutions, setCodeExecutions] = useState<
    Array<{
      id: string
      language: string
      status: 'running' | 'completed' | 'error'
      startTime: Date
      endTime?: Date
    }>
  >([])

  // Debug state
  const [debugMode, setDebugMode] = useState(false)

  // Update canvas messages when prop changes
  useEffect(() => {
    setCanvasMessages(messages)
  }, [messages])

  // Mock system stats update
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.random() * 100,
        memory: Math.random() * 100
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])
  const executeCode = async (code: string, language: string) => {
    const execution = {
      id: `exec-${Date.now()}`,
      language,
      status: 'running' as const,
      startTime: new Date()
    }

    setCodeExecutions((prev) => [...prev, execution])

    // Simulate execution
    setTimeout(
      () => {
        setCodeExecutions((prev) =>
          prev.map((exec) =>
            exec.id === execution.id
              ? { ...exec, status: 'completed' as const, endTime: new Date() }
              : exec
          )
        )
      },
      Math.random() * 2000 + 500
    )
  }

  // Helper for adding new messages
  const handleAddMessage = (message: any) => {
    const newMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date()
    }
    setCanvasMessages((prev) => [...prev, newMessage])
    onAddMessage(newMessage)
  }

  const executeTerminalCommand = (command: string) => {
    const output = `Executed: ${command}\nOutput would appear here...`
    const entry = {
      id: `cmd-${Date.now()}`,
      command,
      output,
      timestamp: new Date()
    }
    setTerminalHistory((prev) => [...prev, entry])
    setCurrentCommand('')
  }
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full max-w-7xl max-h-[90vh] bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <h2 className="text-xl font-bold text-white">Developer Mode</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="canvas" className="h-full flex flex-col">
            <div className="px-4 pt-4 bg-gray-800">
              <TabsList className="grid w-full max-w-2xl grid-cols-7 bg-gray-700">
                <TabsTrigger value="canvas" className="data-[state=active]:bg-gray-700">
                  <GridFour size={16} className="mr-2" />
                  Canvas
                </TabsTrigger>
                <TabsTrigger value="terminal" className="data-[state=active]:bg-gray-700">
                  <Terminal size={16} className="mr-2" />
                  Terminal
                </TabsTrigger>
                <TabsTrigger value="files" className="data-[state=active]:bg-gray-700">
                  <Folder size={16} className="mr-2" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-gray-700">
                  <Activity size={16} className="mr-2" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="code" className="data-[state=active]:bg-gray-700">
                  <Code size={16} className="mr-2" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="tuning" className="data-[state=active]:bg-gray-700">
                  <Brain size={16} className="mr-2" />
                  Tuning
                </TabsTrigger>
                <TabsTrigger value="debug" className="data-[state=active]:bg-gray-700">
                  <Bug size={16} className="mr-2" />
                  Debug
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Canvas Tab */}
            <TabsContent value="canvas" className="h-full m-0 p-0">
              <EnhancedChatCanvas
                messages={canvasMessages}
                onUpdateMessage={(id, updates) => {
                  setCanvasMessages((prev) =>
                    prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
                  )
                  onUpdateMessage(id, updates)
                }}
                onDeleteMessage={(id) => {
                  setCanvasMessages((prev) => prev.filter((msg) => msg.id !== id))
                  onDeleteMessage(id)
                }}
                onCorrectMessage={onCorrectMessage}
                onExecuteCode={executeCode}
                onAddMessage={(message) => {
                  const newMessage = {
                    ...message,
                    id: `msg-${Date.now()}`,
                    timestamp: new Date()
                  }
                  setCanvasMessages((prev) => [...prev, newMessage])
                  onAddMessage(message)
                }}
                className="h-full"
              />
            </TabsContent>

            {/* Terminal Tab */}
            <TabsContent value="terminal" className="h-full m-0 p-0">
              <div className="h-full bg-gray-900 font-mono text-sm flex flex-col">
                {/* Terminal Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-gray-400">Terminal - Puffer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTerminalHistory([])}
                      className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Terminal Output */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-2">
                    {terminalHistory.map((entry) => (
                      <div key={entry.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">➜</span>
                          <span className="text-blue-400">puffer</span>
                          <span className="text-gray-400">~</span>
                          <span className="text-white">{entry.command}</span>
                        </div>
                        {entry.output && (
                          <pre className="text-gray-300 whitespace-pre-wrap ml-4 pl-4 border-l border-gray-600">
                            {entry.output}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {/* Command Input */}
                <div className="p-4 border-t border-gray-700 bg-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">➜</span>
                    <span className="text-blue-400">puffer</span>
                    <span className="text-gray-400">~</span>
                    <Input
                      value={currentCommand}
                      onChange={(e) => setCurrentCommand(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && currentCommand.trim()) {
                          executeTerminalCommand(currentCommand.trim())
                        }
                      }}
                      placeholder="Enter command..."
                      className="flex-1 bg-transparent border-none text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="h-full m-0 p-0">
              <div className="h-full flex">
                {/* File Explorer */}
                <div className="w-80 border-r border-gray-700 bg-gray-800/50">
                  <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      {' '}
                      <h3 className="font-semibold">Project Files</h3>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <ArrowsClockwise size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Upload size={14} />
                        </Button>
                      </div>
                    </div>
                    <Input
                      placeholder="Search files..."
                      className="h-8 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    />
                  </div>

                  <ScrollArea className="h-[calc(100%-120px)]">
                    <div className="p-2">
                      {projectFiles.map((file) => (
                        <div
                          key={file.path}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-700',
                            selectedFile === file.path && 'bg-gray-700'
                          )}
                          onClick={() => {
                            setSelectedFile(file.path)
                            if (file.type === 'file') {
                              // Mock file content based on extension
                              const ext = file.name.split('.').pop()
                              let content = ''
                              switch (ext) {
                                case 'tsx':
                                case 'ts':
                                  content = `// ${file.name}\nimport React from 'react'\n\nconst Component: React.FC = () => {\n  return (\n    <div>\n      {/* Component content */}\n    </div>\n  )\n}\n\nexport default Component`
                                  break
                                case 'json':
                                  content = `{\n  "name": "puffer-os",\n  "version": "1.0.0",\n  "description": "AI Assistant"\n}`
                                  break
                                default:
                                  content = `Content of ${file.name}\n\nThis is a mock file viewer.\nIn a real implementation, this would show the actual file content.`
                              }
                              setFileContent(content)
                            }
                          }}
                        >
                          <div className="text-gray-400">
                            {file.type === 'folder' ? <Folder size={16} /> : <FileText size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{file.name}</div>
                            {file.size && (
                              <div className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                {/* File Content */}
                <div className="flex-1 bg-gray-900">
                  {selectedFile ? (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-blue-400" />
                          <span>{selectedFile}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <FloppyDisk size={14} className="mr-1" />
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <Play size={14} className="mr-1" />
                            Run
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 relative">
                        <Textarea
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          className="h-full resize-none border-none bg-transparent text-white font-mono text-sm p-4 focus-visible:ring-0"
                          placeholder="Select a file to view its content..."
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                          {' '}
                          Lines: {fileContent.split('\n').length}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Select a file to view its content</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="h-full m-0 p-4">
              <div className="h-full space-y-6">
                {/* System Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Cpu size={20} className="text-blue-400" />
                        CPU Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white mb-2">
                        {systemStats?.cpu?.toFixed(1) || '0.0'}%{' '}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemStats?.cpu || 0}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Cpu size={20} className="text-green-400" />
                        Memory Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white mb-2">
                        {systemStats?.memory?.toFixed(1) || '0.0'}%
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemStats?.memory || 0}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Activity size={20} className="text-purple-400" />
                        Model Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-white mb-2">{selectedModel}</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm text-gray-400">Active</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Code Executions */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Lightning size={20} className="text-yellow-400" />
                      Code Executions
                    </CardTitle>
                    <CardDescription>Recent code execution history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-40">
                      {' '}
                      <div className="space-y-2">
                        {codeExecutions.slice(-10).map((execution) => (
                          <div
                            key={execution.id}
                            className="flex items-center justify-between p-2 bg-gray-700 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  execution.status === 'running' && 'bg-yellow-400 animate-pulse',
                                  execution.status === 'completed' && 'bg-green-400',
                                  execution.status === 'error' && 'bg-red-400'
                                )}
                              />
                              <span className="text-sm text-white">{execution.language}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {execution.endTime
                                ? `${execution.endTime.getTime() - execution.startTime.getTime()}ms`
                                : 'Running...'}
                            </div>
                          </div>
                        ))}
                        {codeExecutions.length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No code executions yet
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                {/* Performance Metrics Chart Placeholder */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <ChartLine size={20} className="text-blue-400" />
                      Performance Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-400">Performance chart would render here</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Code Generator Tab */}
            <TabsContent value="code" className="h-full m-0 p-4 overflow-auto">
              <div className="h-full space-y-6">
                <CodeGenerator
                  onCodeGenerated={(code, language) => {
                    // Add the generated code as a new message in the canvas
                    handleAddMessage({
                      type: 'ai',
                      content: `Here's the code you requested:\n\n\`\`\`${language}\n${code}\n\`\`\``,
                      position: { x: 400, y: Math.random() * 200 + 100 },
                      attachments: [
                        {
                          type: 'code',
                          name: `generated.${language === 'javascript' ? 'js' : language}`,
                          content: code,
                          language,
                          executable: true
                        }
                      ],
                      connections: []
                    })
                  }}
                />

                <Card className="bg-gray-800/80 border-gray-700/50 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Lightning size={20} className="text-yellow-400" />
                      Code Generation Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-300">
                        The code generator automatically selects the best model for code generation
                        from your available Ollama models. For best results:
                      </p>

                      <div className="bg-gray-700/50 p-3 rounded text-sm">
                        <h4 className="font-medium text-white mb-2">Best Practices</h4>
                        <ul className="space-y-1 text-gray-300">
                          <li>• Be specific about what functionality you need</li>
                          <li>• Include details about error handling requirements</li>
                          <li>• Specify any libraries or frameworks to use</li>
                          <li>• For complex code, break into smaller components</li>
                          <li>
                            • Code-specialized models like Deepseek Coder or CodeLlama will produce
                            better results
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Model Tuning Tab */}
            <TabsContent value="tuning" className="h-full m-0 p-0 overflow-auto">
              <TuningPanel className="h-full" />
            </TabsContent>

            {/* Debug Tab */}
            <TabsContent value="debug" className="h-full m-0 p-4">
              <div className="h-full space-y-4">
                {/* Debug Controls */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Bug size={20} className="text-red-400" />
                      Debug Console
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      {' '}
                      <Button
                        variant={debugMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDebugMode(!debugMode)}
                        className={debugMode ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        {debugMode ? (
                          <Stop size={16} className="mr-2" />
                        ) : (
                          <Play size={16} className="mr-2" />
                        )}
                        {debugMode ? 'Stop Debug' : 'Start Debug'}
                      </Button>
                      <Select defaultValue="info">
                        <SelectTrigger className="w-32 bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="warn">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="debug">Debug</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      {/* Mock debug entries */}
                      <div className="flex items-start gap-2 p-2 bg-gray-700 rounded text-sm">
                        <Clock size={14} className="text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-green-400">INFO</span>{' '}
                            <span className="text-xs text-gray-400">12:34:56</span>
                          </div>
                          <div className="text-white">
                            Canvas initialized with {messages.length} messages
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-2 bg-gray-700 rounded text-sm">
                        <Clock size={14} className="text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">WARN</span>
                            <span className="text-xs text-gray-400">12:34:55</span>
                          </div>
                          <div className="text-white">
                            Large message detected, consider pagination
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-2 bg-gray-700 rounded text-sm">
                        <Clock size={14} className="text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400">DEBUG</span>
                            <span className="text-xs text-gray-400">12:34:54</span>
                          </div>
                          <div className="text-white">
                            Drag operation completed for message msg-123
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* System Information */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Gear size={20} className="text-gray-400" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400 mb-1">Platform</div>
                        <div className="text-white">Electron + React</div>
                      </div>
                      <div>
                        <div className="text-gray-400 mb-1">Version</div>
                        <div className="text-white">v1.0.0</div>
                      </div>
                      <div>
                        <div className="text-gray-400 mb-1">Node.js</div>
                        <div className="text-white">v18.17.0</div>
                      </div>
                      <div>
                        <div className="text-gray-400 mb-1">Ollama</div>
                        <div className="text-white">Connected</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>{' '}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default DeveloperMode
