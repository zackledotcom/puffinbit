import React, { useState } from 'react'
import {
  MagnifyingGlass,
  GitBranch,
  Clock,
  User,
  Download,
  Funnel,
  ArrowsDownUp,
  Eye
} from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface TraceEvent {
  id: string
  timestamp: Date
  type: 'function_call' | 'api_request' | 'user_action' | 'system_event'
  source: string
  duration?: number
  status: 'success' | 'error' | 'pending'
  data: any
  parent?: string
  children: string[]
}

interface TraceExplorerProps {
  traces: TraceEvent[]
  onExport: () => void
  className?: string
}

export default function TraceExplorer({ traces, onExport, className }: TraceExplorerProps) {
  const [selectedTrace, setSelectedTrace] = useState<TraceEvent | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'timestamp' | 'duration'>('timestamp')

  const getTypeIcon = (type: TraceEvent['type']) => {
    switch (type) {
      case 'function_call':
        return <GitBranch className="w-4 h-4" />
      case 'api_request':
        return <Search className="w-4 h-4" />
      case 'user_action':
        return <User className="w-4 h-4" />
      case 'system_event':
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: TraceEvent['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="text-xs">Success</Badge>
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="text-xs">
            Pending
          </Badge>
        )
    }
  }

  const filteredTraces = traces
    .filter((trace) => {
      const matchesSearch = trace.source.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || trace.type === typeFilter
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      if (sortBy === 'timestamp') {
        return b.timestamp.getTime() - a.timestamp.getTime()
      } else {
        return (b.duration || 0) - (a.duration || 0)
      }
    })

  return (
    <Card className={cn('h-96', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Trace Explorer
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onExport} className="gap-1">
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search traces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="function_call">Functions</SelectItem>
              <SelectItem value="api_request">API</SelectItem>
              <SelectItem value="user_action">User</SelectItem>
              <SelectItem value="system_event">System</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSortBy(sortBy === 'timestamp' ? 'duration' : 'timestamp')}
            className="h-7 px-2"
          >
            <ArrowsDownUp className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex h-80">
        {/* Trace list */}
        <div className="flex-1 border-r">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {filteredTraces.map((trace) => (
                <div
                  key={trace.id}
                  className={cn(
                    'p-2 rounded-md cursor-pointer transition-colors',
                    'hover:bg-muted/50',
                    selectedTrace?.id === trace.id && 'bg-muted'
                  )}
                  onClick={() => setSelectedTrace(trace)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getTypeIcon(trace.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{trace.source}</span>
                          {getStatusBadge(trace.status)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {trace.timestamp.toLocaleTimeString()}
                          {trace.duration && <span className="ml-2">{trace.duration}ms</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Trace details */}
        {selectedTrace && (
          <div className="w-80 p-4 space-y-4">
            <div>
              <h3 className="font-medium mb-2">Trace Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedTrace.type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedTrace.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="text-xs">{selectedTrace.timestamp.toLocaleString()}</span>
                </div>
                {selectedTrace.duration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="text-xs">{selectedTrace.duration}ms</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Source</h4>
              <div className="p-2 bg-muted/50 rounded text-sm font-mono">
                {selectedTrace.source}
              </div>
            </div>

            {selectedTrace.data && (
              <div>
                <h4 className="font-medium mb-2">Data</h4>
                <ScrollArea className="h-32">
                  <pre className="p-2 bg-muted/50 rounded text-xs font-mono">
                    {JSON.stringify(selectedTrace.data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {selectedTrace.children.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Child Events</h4>
                <div className="space-y-1">
                  {selectedTrace.children.map((childId) => {
                    const child = traces.find((t) => t.id === childId)
                    return (
                      child && (
                        <div key={childId} className="text-xs p-1 bg-muted/30 rounded">
                          {child.source}
                        </div>
                      )
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
