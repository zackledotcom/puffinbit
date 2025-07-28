import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import {
  Warning,
  Activity,
  Database,
  Cpu,
  Download,
  MagnifyingGlass,
  ArrowsClockwise,
  FileText,
  Bug
} from 'phosphor-react'

interface SystemDiagnosticsProps {
  onExport?: (type: 'telemetry' | 'audit', format: string) => void
}

export const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({ onExport }) => {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const loadDiagnostics = async () => {
    setLoading(true)
    try {
      const data = await window.api.getSystemDiagnostics()
      setDiagnostics(data)
    } catch (error) {
      console.error('Failed to load diagnostics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDiagnostics()
    const interval = setInterval(loadDiagnostics, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const results = await window.api.searchLogs({
        text: searchQuery,
        limit: 50
      })
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleExport = async (type: 'telemetry' | 'audit', format: 'json' | 'csv' | 'jsonl') => {
    try {
      const exportFunction =
        type === 'telemetry' ? window.api.exportTelemetry : window.api.exportAudit
      const filePath = await exportFunction({
        format,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      })

      onExport?.(type, format)
      alert(`${type} exported to: ${filePath}`)
    } catch (error) {
      console.error(`Export failed:`, error)
      alert(`Export failed: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-48">
          <ArrowsClockwise className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadDiagnostics}>
              <ArrowsClockwise className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded">
              <Cpu className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <div className="text-sm text-muted-foreground">Uptime</div>
              <div className="font-semibold">
                {Math.floor((diagnostics?.system?.uptime || 0) / 3600)}h
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded">
              <Database className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <div className="text-sm text-muted-foreground">Memory</div>
              <div className="font-semibold">
                {Math.round((diagnostics?.system?.memory?.heapUsed || 0) / 1024 / 1024)}MB
              </div>
            </div>

            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded">
              <Warning className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <div className="text-sm text-muted-foreground">Errors</div>
              <div className="font-semibold">{diagnostics?.crash?.totalErrors || 0}</div>
            </div>

            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded">
              <FileText className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <div className="text-sm text-muted-foreground">Events</div>
              <div className="font-semibold">{diagnostics?.telemetry?.totalEvents || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Telemetry Data</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('telemetry', 'json')}
                  className="w-full"
                >
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('telemetry', 'csv')}
                  className="w-full"
                >
                  Export CSV
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Audit Logs</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('audit', 'json')}
                  className="w-full"
                >
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('audit', 'csv')}
                  className="w-full"
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
