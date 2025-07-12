import React, { useState, useEffect } from 'react'
import {
  X,
  // Removed Draggable - not available in phosphor-react
  Activity,
  Warning,
  CheckCircle,
  XCircle,
  Database,
  Cpu,
  ClockCounterClockwise,
  Copy
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface OllamaDebugOverlayProps {
  onClose: () => void
}

interface ApiStatus {
  connected: boolean
  endpoint: string
  responseTime: number
  lastError?: string
}

interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  message: string
  details?: any
}

const OllamaDebugOverlay: React.FC<OllamaDebugOverlayProps> = ({ onClose }) => {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    connected: true,
    endpoint: 'http://localhost:11434',
    responseTime: 45
  })

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date(),
      level: 'info',
      message: 'Ollama service connected successfully',
      details: { endpoint: 'http://localhost:11434' }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000),
      level: 'info',
      message: 'Model "tinydolphin:latest" loaded',
      details: { size: '636MB', quantization: 'Q4_0' }
    }
  ])

  const [streamInfo, setStreamInfo] = useState({
    isStreaming: false,
    currentPrompt: '',
    tokensGenerated: 0,
    streamRate: 0,
    lastResponse: ''
  })

  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 23,
    memory: 45,
    gpu: 12,
    modelMemory: 636
  })

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      message,
      details
    }
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]) // Keep last 100 logs
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addLog('info', 'Copied to clipboard')
  }

  const getStatusIcon = () => {
    if (apiStatus.connected) {
      return <CheckCircle size={16} className="text-green-500" />
    }
    return <XCircle size={16} className="text-red-500" />
  }

  return (
    <div
      className="fixed bg-background border border-border rounded-lg shadow-xl z-50 w-96 h-96"
      style={{ left: position.x, top: position.y }}
    >
      {/* Header - Draggable */}
      <div
        className="p-3 border-b border-border bg-muted/50 rounded-t-lg cursor-move select-none flex items-center justify-between"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <Activity size={16} className="text-primary" />
          <span className="font-medium">Ollama Debug</span>
          {getStatusIcon()}
        </div>

        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-60px)]">
        <Tabs defaultValue="status" className="h-full">
          <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="stream">Stream</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          {/* API Status Tab */}
          <TabsContent value="status" className="p-3 h-[calc(100%-48px)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Connection</span>
                <Badge variant={apiStatus.connected ? 'default' : 'destructive'}>
                  {apiStatus.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Endpoint:</span>
                  <span className="font-mono">{apiStatus.endpoint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Time:</span>
                  <span>{apiStatus.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Check:</span>
                  <span>Just now</span>
                </div>
              </div>

              {apiStatus.lastError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                  <div className="flex items-center space-x-1 text-red-600 mb-1">
                    <Warning size={14} />
                    <span className="font-medium">Last Error</span>
                  </div>
                  <div className="text-red-700">{apiStatus.lastError}</div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => addLog('info', 'Manual API status check triggered')}
              >
                <Database size={14} className="mr-1" />
                Test Connection
              </Button>
            </div>
          </TabsContent>

          {/* Stream Info Tab */}
          <TabsContent value="stream" className="p-3 h-[calc(100%-48px)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Live Stream</span>
                <Badge variant={streamInfo.isStreaming ? 'default' : 'secondary'}>
                  {streamInfo.isStreaming ? 'Active' : 'Idle'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens Generated:</span>
                  <span>{streamInfo.tokensGenerated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stream Rate:</span>
                  <span>{streamInfo.streamRate} tok/s</span>
                </div>
              </div>

              {streamInfo.currentPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Prompt</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(streamInfo.currentPrompt)}
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                  <div className="p-2 bg-muted rounded text-xs font-mono max-h-20 overflow-y-auto">
                    {streamInfo.currentPrompt}
                  </div>
                </div>
              )}

              {streamInfo.lastResponse && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Response</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(streamInfo.lastResponse)}
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                  <ScrollArea className="h-20">
                    <div className="p-2 bg-muted rounded text-xs">{streamInfo.lastResponse}</div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="h-[calc(100%-48px)]">
            <ScrollArea className="h-full p-3">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      'p-2 rounded text-xs border-l-2',
                      log.level === 'error' && 'bg-red-50 border-red-500',
                      log.level === 'warn' && 'bg-yellow-50 border-yellow-500',
                      log.level === 'info' && 'bg-blue-50 border-blue-500'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{log.level.toUpperCase()}</span>
                      <span className="text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div>{log.message}</div>
                    {log.details && (
                      <pre className="mt-1 text-xs text-muted-foreground">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* System Metrics Tab */}
          <TabsContent value="metrics" className="p-3 h-[calc(100%-48px)]">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Cpu size={16} />
                <span className="text-sm font-medium">System Metrics</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>{systemMetrics.cpu}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${systemMetrics.cpu}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>{systemMetrics.memory}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${systemMetrics.memory}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>GPU VRAM</span>
                    <span>{systemMetrics.gpu}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${systemMetrics.gpu}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span>Model Memory</span>
                    <span>{systemMetrics.modelMemory}MB</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default OllamaDebugOverlay
