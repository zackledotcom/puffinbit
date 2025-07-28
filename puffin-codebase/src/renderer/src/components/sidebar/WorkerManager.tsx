import React from 'react'
import {
  Robot,
  Play,
  Pause,
  Square,
  Activity,
  WarningCircle,
  CheckCircle,
  FileText
} from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Worker {
  id: string
  name: string
  type: 'agent' | 'service' | 'task'
  status: 'running' | 'idle' | 'error' | 'stopped'
  uptime: number
  lastActivity?: Date
  logs: string[]
}

interface WorkerManagerProps {
  workers: Worker[]
  onStartWorker: (id: string) => void
  onStopWorker: (id: string) => void
  onViewLogs: (id: string) => void
  className?: string
}

export default function WorkerManager({
  workers,
  onStartWorker,
  onStopWorker,
  onViewLogs,
  className
}: WorkerManagerProps) {
  const getStatusIcon = (status: Worker['status']) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'idle':
        return <Activity className="w-3 h-3 text-blue-500" />
      case 'error':
        return <WarningCircle className="w-3 h-3 text-red-500" />
      case 'stopped':
        return <Square className="w-3 h-3 text-gray-500" />
    }
  }

  const getStatusBadge = (status: Worker['status']) => {
    switch (status) {
      case 'running':
        return <Badge className="text-xs">Running</Badge>
      case 'idle':
        return (
          <Badge variant="secondary" className="text-xs">
            Idle
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        )
      case 'stopped':
        return (
          <Badge variant="outline" className="text-xs">
            Stopped
          </Badge>
        )
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
  }

  const getTypeIcon = (type: Worker['type']) => {
    switch (type) {
      case 'agent':
        return <Robot className="w-4 h-4" />
      case 'service':
        return <Activity className="w-4 h-4" />
      case 'task':
        return <CheckCircle className="w-4 h-4" />
    }
  }

  const runningWorkers = workers.filter((w) => w.status === 'running').length
  const errorWorkers = workers.filter((w) => w.status === 'error').length

  return (
    <Card className={cn('w-80 h-96', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Robot className="w-4 h-4" />
            Workers & Agents
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="default" className="text-xs">
              {runningWorkers} Active
            </Badge>
            {errorWorkers > 0 && (
              <Badge variant="destructive" className="text-xs">
                {errorWorkers} Error
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-80 px-3">
          <div className="space-y-2">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">{getTypeIcon(worker.type)}</div>
                    <span className="font-medium text-sm">{worker.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(worker.status)}
                    {getStatusBadge(worker.status)}
                  </div>
                </div>

                {/* Details */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Type: {worker.type}</span>
                    <span>Uptime: {formatUptime(worker.uptime)}</span>
                  </div>

                  {worker.lastActivity && (
                    <div>Last activity: {worker.lastActivity.toLocaleTimeString()}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3">
                  {worker.status === 'running' || worker.status === 'idle' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStopWorker(worker.id)}
                      className="h-6 px-2 text-xs"
                    >
                      <Pause className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStartWorker(worker.id)}
                      className="h-6 px-2 text-xs"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewLogs(worker.id)}
                    className="h-6 px-2 text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Logs
                  </Button>
                </div>

                {/* Recent log preview */}
                {worker.logs.length > 0 && (
                  <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono">
                    <div className="text-muted-foreground truncate">
                      {worker.logs[worker.logs.length - 1]}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {workers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Robot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No workers configured</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
