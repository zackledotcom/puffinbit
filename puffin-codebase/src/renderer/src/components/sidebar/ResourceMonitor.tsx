import React, { useState, useEffect } from 'react'
import { Cpu, HardDrive, Lightning, TrendingUp, Activity, Memory } from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SystemMetrics {
  cpu: {
    usage: number
    temperature?: number
    cores: number
  }
  memory: {
    used: number
    total: number
    available: number
  }
  gpu?: {
    usage: number
    memory: number
    temperature?: number
  }
  disk: {
    used: number
    total: number
  }
}

interface ResourceMonitorProps {
  metrics: SystemMetrics
  showLiveChart?: boolean
  className?: string
}

export default function ResourceMonitor({
  metrics,
  showLiveChart = false,
  className
}: ResourceMonitorProps) {
  const [cpuHistory, setCpuHistory] = useState<number[]>([])

  useEffect(() => {
    if (showLiveChart) {
      setCpuHistory((prev) => [...prev.slice(-19), metrics.cpu.usage])
    }
  }, [metrics.cpu.usage, showLiveChart])

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getUsageVariant = (percentage: number) => {
    if (percentage < 50) return 'default'
    if (percentage < 80) return 'secondary'
    return 'destructive'
  }

  return (
    <Card className={cn('w-80', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          System Resources
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* CPU */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span className="text-sm font-medium">CPU</span>
            </div>
            <Badge variant={getUsageVariant(metrics.cpu.usage)} className="text-xs">
              {metrics.cpu.usage.toFixed(1)}%
            </Badge>
          </div>
          <Progress value={metrics.cpu.usage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{metrics.cpu.cores} cores</span>
            {metrics.cpu.temperature && <span>{metrics.cpu.temperature}°C</span>}
          </div>
        </div>

        {/* Memory */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Memory className="w-4 h-4" />
              <span className="text-sm font-medium">Memory</span>
            </div>
            <Badge
              variant={getUsageVariant((metrics.memory.used / metrics.memory.total) * 100)}
              className="text-xs"
            >
              {((metrics.memory.used / metrics.memory.total) * 100).toFixed(1)}%
            </Badge>
          </div>
          <Progress value={(metrics.memory.used / metrics.memory.total) * 100} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(metrics.memory.used)} used</span>
            <span>{formatBytes(metrics.memory.total)} total</span>
          </div>
        </div>

        {/* GPU (if available) */}
        {metrics.gpu && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightning className="w-4 h-4" />
                <span className="text-sm font-medium">GPU</span>
              </div>
              <Badge variant={getUsageVariant(metrics.gpu.usage)} className="text-xs">
                {metrics.gpu.usage.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={metrics.gpu.usage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatBytes(metrics.gpu.memory)} VRAM</span>
              {metrics.gpu.temperature && <span>{metrics.gpu.temperature}°C</span>}
            </div>
          </div>
        )}

        {/* Disk */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              <span className="text-sm font-medium">Storage</span>
            </div>
            <Badge
              variant={getUsageVariant((metrics.disk.used / metrics.disk.total) * 100)}
              className="text-xs"
            >
              {((metrics.disk.used / metrics.disk.total) * 100).toFixed(1)}%
            </Badge>
          </div>
          <Progress value={(metrics.disk.used / metrics.disk.total) * 100} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(metrics.disk.used)} used</span>
            <span>{formatBytes(metrics.disk.total)} total</span>
          </div>
        </div>

        {/* Live chart (if enabled) */}
        {showLiveChart && cpuHistory.length > 5 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs font-medium">CPU History</span>
            </div>
            <div className="h-12 flex items-end gap-0.5">
              {cpuHistory.map((usage, index) => (
                <div
                  key={index}
                  className={cn('w-3 rounded-t transition-all duration-200', getUsageColor(usage))}
                  style={{ height: `${(usage / 100) * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
