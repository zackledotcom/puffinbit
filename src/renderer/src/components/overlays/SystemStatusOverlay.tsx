import React, { useState, useEffect } from 'react'
import {
  X,
  Cpu,
  HardDrive,
  Activity,
  Warning,
  CheckCircle,
  Thermometer,
  Lightning,
  Database
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface SystemStatusOverlayProps {
  onClose: () => void
}

const SystemStatusOverlay: React.FC<SystemStatusOverlayProps> = ({ onClose }) => {
  // Service integration - TODO: Implement real system metrics backend
  const services = useAllServices()

  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: {
      usage: 23,
      temperature: 45,
      cores: 8,
      frequency: 3.2
    },
    memory: {
      used: 8.2,
      total: 16,
      percentage: 51
    },
    disk: {
      used: 245,
      total: 500,
      percentage: 49
    },
    gpu: {
      usage: 12,
      memory: 2.1,
      temperature: 38,
      available: true
    },
    network: {
      rx: 1.2,
      tx: 0.8
    },
    uptime: '2h 34m'
  })

  const [alerts, setAlerts] = useState<
    Array<{
      id: string
      level: 'warning' | 'error' | 'info'
      message: string
      timestamp: Date
    }>
  >([])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          usage: Math.max(0, Math.min(100, prev.cpu.usage + (Math.random() - 0.5) * 10))
        },
        memory: {
          ...prev.memory,
          percentage: Math.max(0, Math.min(100, prev.memory.percentage + (Math.random() - 0.5) * 5))
        },
        gpu: {
          ...prev.gpu,
          usage: Math.max(0, Math.min(100, prev.gpu.usage + (Math.random() - 0.5) * 8))
        }
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Monitor for threshold alerts
  useEffect(() => {
    const newAlerts: typeof alerts = []

    if (metrics.cpu.usage > 80) {
      newAlerts.push({
        id: 'cpu-high',
        level: 'warning',
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(0)}%`,
        timestamp: new Date()
      })
    }

    if (metrics.memory.percentage > 85) {
      newAlerts.push({
        id: 'memory-high',
        level: 'warning',
        message: `High memory usage: ${metrics.memory.percentage.toFixed(0)}%`,
        timestamp: new Date()
      })
    }

    if (metrics.cpu.temperature > 70) {
      newAlerts.push({
        id: 'cpu-temp',
        level: 'error',
        message: `CPU temperature critical: ${metrics.cpu.temperature}°C`,
        timestamp: new Date()
      })
    }

    setAlerts(newAlerts)
  }, [metrics])

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const getUsageColor = (percentage: number) => {
    if (percentage > 85) return 'bg-red-500'
    if (percentage > 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTemperatureColor = (temp: number) => {
    if (temp > 70) return 'text-red-500'
    if (temp > 60) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div className="fixed top-4 right-4 bg-background border border-border rounded-lg shadow-xl z-50 w-96">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/50 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity size={16} className="text-primary" />
          <span className="font-medium">System Status</span>
          <Badge variant="outline" className="text-xs">
            Live
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant={alert.level === 'error' ? 'destructive' : 'default'}>
                <Warning size={16} />
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* CPU Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu size={16} className="text-blue-500" />
              <span className="font-medium">CPU</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.cpu.cores} cores @ {metrics.cpu.frequency}GHz
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage</span>
              <span>{metrics.cpu.usage.toFixed(0)}%</span>
            </div>
            <Progress value={metrics.cpu.usage} className="h-2" />

            <div className="flex justify-between text-sm">
              <span>Temperature</span>
              <span className={getTemperatureColor(metrics.cpu.temperature)}>
                {metrics.cpu.temperature}°C
              </span>
            </div>
          </div>
        </div>

        {/* Memory Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database size={16} className="text-green-500" />
              <span className="font-medium">Memory</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.memory.used.toFixed(1)}GB / {metrics.memory.total}GB
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage</span>
              <span>{metrics.memory.percentage.toFixed(0)}%</span>
            </div>
            <Progress value={metrics.memory.percentage} className="h-2" />
          </div>
        </div>

        {/* Disk Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive size={16} className="text-purple-500" />
              <span className="font-medium">Disk</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.disk.used}GB / {metrics.disk.total}GB
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage</span>
              <span>{metrics.disk.percentage}%</span>
            </div>
            <Progress value={metrics.disk.percentage} className="h-2" />
          </div>
        </div>

        {/* GPU Metrics */}
        {metrics.gpu.available ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightning size={16} className="text-yellow-500" />
                <span className="font-medium">GPU</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {metrics.gpu.memory.toFixed(1)}GB VRAM
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span>{metrics.gpu.usage.toFixed(0)}%</span>
              </div>
              <Progress value={metrics.gpu.usage} className="h-2" />

              <div className="flex justify-between text-sm">
                <span>Temperature</span>
                <span className={getTemperatureColor(metrics.gpu.temperature)}>
                  {metrics.gpu.temperature}°C
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Lightning size={16} />
              <span className="text-sm">GPU not available or not detected</span>
            </div>
          </div>
        )}

        {/* Network & Uptime */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <div className="text-sm font-medium mb-1">Network</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>↓ {metrics.network.rx} MB/s</div>
              <div>↑ {metrics.network.tx} MB/s</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Uptime</div>
            <div className="text-xs text-muted-foreground">{metrics.uptime}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1">
            <Thermometer size={14} className="mr-1" />
            Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <CheckCircle size={14} className="mr-1" />
            Optimize
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SystemStatusOverlay
