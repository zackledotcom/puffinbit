import React, { useState } from 'react'
import {
  MagnifyingGlass,
  Funnel,
  Calendar,
  WarningCircle,
  CheckCircle,
  Info,
  Eye,
  Download
} from 'phosphor-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warning' | 'error' | 'debug'
  category: string
  message: string
  details?: any
}

interface LogsViewerProps {
  logs: LogEntry[]
  onExport?: () => void
  className?: string
}

export default function LogsViewer({ logs, onExport, className }: LogsViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <WarningCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <WarningCircle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      case 'debug':
        return <CheckCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getLogBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        )
      case 'warning':
        return (
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
            Warning
          </Badge>
        )
      case 'info':
        return (
          <Badge variant="default" className="text-xs">
            Info
          </Badge>
        )
      case 'debug':
        return (
          <Badge variant="outline" className="text-xs">
            Debug
          </Badge>
        )
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter

    return matchesSearch && matchesLevel && matchesCategory
  })

  const categories = Array.from(new Set(logs.map((log) => log.category)))

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <Eye className="w-4 h-4" />
          View Logs
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              System Logs & Audit Trail
            </DialogTitle>
            {onExport && (
              <Button size="sm" variant="outline" onClick={onExport} className="gap-1">
                <Download className="w-3 h-3" />
                Export
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex gap-4 h-[70vh]">
          {/* Logs List */}
          <div className="flex-1 space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Logs List */}
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      'p-3 rounded-md border cursor-pointer transition-colors',
                      'hover:bg-muted/50',
                      selectedLog?.id === log.id && 'bg-muted border-primary'
                    )}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {getLogIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getLogBadge(log.level)}
                            <Badge variant="outline" className="text-xs">
                              {log.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.timestamp.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm truncate">{log.message}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No logs match your filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Log Details */}
          {selectedLog && (
            <div className="w-80 border-l pl-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Log Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level:</span>
                      {getLogBadge(selectedLog.level)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedLog.category}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="text-xs">{selectedLog.timestamp.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Message</h4>
                  <div className="p-3 bg-muted/50 rounded text-sm">{selectedLog.message}</div>
                </div>

                {selectedLog.details && (
                  <div>
                    <h4 className="font-medium mb-2">Details</h4>
                    <ScrollArea className="h-32">
                      <pre className="p-3 bg-muted/50 rounded text-xs font-mono overflow-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
