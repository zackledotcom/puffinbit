import React, { useState, useEffect, useRef } from 'react'
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar'
import NumberTicker from '@/components/ui/number-ticker'
import { Ripple } from '@/components/ui/ripple'
import { AnimatedBeam } from '@/components/ui/animated-beam'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Activity,
  Lightning,
  Thermometer,
  HardDrive,
  Cpu,
  Warning,
  CheckCircle,
  Plus,
  Star,
  User,
  Activity as TrendIcon,
  Activity as Clock,
  Database,
  Activity as Wifi,
  Info,
  Gear
} from 'phosphor-react'

interface ModelHealth {
  overall: number
  performance: number
  memory: number
  temperature: number
  uptime: number
  responseTime: number
  tokensPerSecond: number
  errors: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
  networkLatency: number
  diskUsage: number
  cpuUsage: number
  connections: number
  throughput: number
}

interface CompleteModelHealthDashboardProps {
  modelName: string
  className?: string
  onRefresh?: () => void
  compact?: boolean
  showAdvanced?: boolean
}

export default function CompleteModelHealthDashboard({
  modelName = 'llama3.1:8b',
  className,
  onRefresh,
  compact = false,
  showAdvanced = false
}: CompleteModelHealthDashboardProps) {
  const [health, setHealth] = useState<ModelHealth>({
    overall: 87,
    performance: 92,
    memory: 78,
    temperature: 65,
    uptime: 24.7,
    responseTime: 245,
    tokensPerSecond: 15.8,
    errors: 2,
    status: 'good',
    trend: 'stable',
    networkLatency: 45,
    diskUsage: 67,
    cpuUsage: 43,
    connections: 12,
    throughput: 1247
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [showDetails, setShowDetails] = useState(false)

  // Refs for AnimatedBeam
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHealth((prev) => {
        const newOverall = Math.max(60, Math.min(100, prev.overall + (Math.random() - 0.5) * 4))
        const newPerformance = Math.max(
          60,
          Math.min(100, prev.performance + (Math.random() - 0.5) * 6)
        )

        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (newPerformance > prev.performance + 2) trend = 'up'
        else if (newPerformance < prev.performance - 2) trend = 'down'

        return {
          ...prev,
          overall: newOverall,
          performance: newPerformance,
          memory: Math.max(40, Math.min(95, prev.memory + (Math.random() - 0.5) * 8)),
          temperature: Math.max(35, Math.min(85, prev.temperature + (Math.random() - 0.5) * 5)),
          responseTime: Math.max(
            100,
            Math.min(600, prev.responseTime + (Math.random() - 0.5) * 50)
          ),
          tokensPerSecond: Math.max(
            5,
            Math.min(30, prev.tokensPerSecond + (Math.random() - 0.5) * 2)
          ),
          networkLatency: Math.max(
            10,
            Math.min(200, prev.networkLatency + (Math.random() - 0.5) * 20)
          ),
          diskUsage: Math.max(30, Math.min(90, prev.diskUsage + (Math.random() - 0.5) * 5)),
          cpuUsage: Math.max(20, Math.min(80, prev.cpuUsage + (Math.random() - 0.5) * 15)),
          connections: Math.max(
            1,
            Math.min(50, prev.connections + Math.floor((Math.random() - 0.5) * 6))
          ),
          throughput: Math.max(500, Math.min(2000, prev.throughput + (Math.random() - 0.5) * 200)),
          uptime: prev.uptime + 0.01,
          trend,
          status:
            newOverall > 85
              ? 'excellent'
              : newOverall > 75
                ? 'good'
                : newOverall > 60
                  ? 'warning'
                  : 'critical'
        }
      })
      setLastUpdate(new Date())
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: ModelHealth['status']) => {
    switch (status) {
      case 'excellent':
        return '#10b981'
      case 'good':
        return '#3b82f6'
      case 'warning':
        return '#f59e0b'
      case 'critical':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getStatusIcon = (status: ModelHealth['status']) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4" />
      case 'good':
        return <Star className="w-4 h-4" />
      case 'warning':
        return <Warning className="w-4 h-4" />
      case 'critical':
        return <Warning className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getTrendIcon = (trend: ModelHealth['trend']) => {
    switch (trend) {
      case 'up':
        return <Lightning className="w-4 h-4 text-green-400" />
      case 'down':
        return <Lightning className="w-4 h-4 text-red-400 rotate-180" />
      case 'stable':
        return <div className="w-4 h-0.5 bg-gray-400 rounded" />
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)

    setTimeout(() => {
      setHealth((prev) => ({
        ...prev,
        overall: Math.floor(Math.random() * 40) + 60,
        performance: Math.floor(Math.random() * 40) + 60,
        memory: Math.floor(Math.random() * 45) + 50,
        temperature: Math.floor(Math.random() * 40) + 45,
        responseTime: Math.floor(Math.random() * 300) + 200,
        tokensPerSecond: Math.floor(Math.random() * 15) + 10,
        errors: Math.floor(Math.random() * 5),
        networkLatency: Math.floor(Math.random() * 100) + 20,
        diskUsage: Math.floor(Math.random() * 40) + 40,
        cpuUsage: Math.floor(Math.random() * 50) + 30,
        connections: Math.floor(Math.random() * 30) + 5,
        throughput: Math.floor(Math.random() * 1000) + 800
      }))
      setIsRefreshing(false)
      setLastUpdate(new Date())
      onRefresh?.()
    }, 1500)
  }

  // Compact version for sidebar
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'relative p-4 rounded-xl glass-panel border-0 overflow-hidden',
                className
              )}
            >
              <div className="relative z-10 flex items-center gap-3">
                <div className="relative">
                  <AnimatedCircularProgressBar
                    max={100}
                    value={health.overall}
                    gaugePrimaryColor={getStatusColor(health.status)}
                    gaugeSecondaryColor="#374151"
                    className="scale-75 -m-2"
                  />
                  {health.status === 'excellent' && (
                    <Ripple
                      className="absolute inset-0 opacity-30"
                      mainCircleSize={45}
                      mainCircleOpacity={0.1}
                      numCircles={3}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: getStatusColor(health.status) }}
                    />
                    <span className="text-sm font-medium text-white truncate">{modelName}</span>
                    {getTrendIcon(health.trend)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Lightning className="w-3 h-3" />
                      <NumberTicker value={health.overall} />%
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <NumberTicker value={health.responseTime} />
                      ms
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <NumberTicker value={health.connections} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="w-80">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.status)}
                <span className="font-medium capitalize">{health.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Performance: {health.performance}%</div>
                <div>Memory: {health.memory}%</div>
                <div>Temperature: {health.temperature}°C</div>
                <div>Tokens/s: {health.tokensPerSecond}</div>
                <div>CPU: {health.cpuUsage}%</div>
                <div>Network: {health.networkLatency}ms</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full dashboard version
  return (
    <TooltipProvider>
      <Card className={cn('glass-panel border-0 relative overflow-hidden', className)}>
        {health.status === 'excellent' && (
          <Ripple
            className="absolute inset-0 opacity-15"
            mainCircleSize={200}
            mainCircleOpacity={0.1}
            numCircles={6}
          />
        )}

        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full animate-pulse"
                style={{ backgroundColor: getStatusColor(health.status) }}
              />
              <div>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                  Model Health Monitor
                  {getTrendIcon(health.trend)}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-400">{modelName}</span>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${getStatusColor(health.status)}20`,
                      color: getStatusColor(health.status),
                      border: `1px solid ${getStatusColor(health.status)}40`
                    }}
                  >
                    {getStatusIcon(health.status)}
                    <span className="ml-1 capitalize">{health.status}</span>
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{lastUpdate.toLocaleTimeString()}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last updated</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle details</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  >
                    <Lightning className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh metrics</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 relative z-10">
          {/* Main Health Circle */}
          <div className="flex justify-center relative">
            <div className="relative">
              <AnimatedCircularProgressBar
                max={100}
                value={health.overall}
                gaugePrimaryColor={getStatusColor(health.status)}
                gaugeSecondaryColor="#374151"
                className="scale-110"
              />
              {health.status === 'excellent' && (
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: `radial-gradient(circle, ${getStatusColor(health.status)}20 0%, transparent 70%)`,
                    filter: 'blur(10px)'
                  }}
                />
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Lightning className="w-4 h-4" />
                Performance
              </div>
              <div className="flex items-center gap-3">
                <Progress value={health.performance} className="flex-1 h-3 bg-gray-700" />
                <span className="text-sm font-medium text-white w-10">
                  <NumberTicker value={health.performance} />%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <HardDrive className="w-4 h-4" />
                Memory Usage
              </div>
              <div className="flex items-center gap-3">
                <Progress value={health.memory} className="flex-1 h-3 bg-gray-700" />
                <span className="text-sm font-medium text-white w-10">
                  <NumberTicker value={health.memory} />%
                </span>
              </div>
            </div>
          </div>

          {/* Connection Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-800/20 border border-gray-700/30">
              <div className="text-2xl font-bold text-white">
                <NumberTicker value={health.connections} />
              </div>
              <div className="text-xs text-gray-400">Connections</div>
            </div>

            <div className="text-center p-3 rounded-lg bg-gray-800/20 border border-gray-700/30">
              <div className="text-2xl font-bold text-white">
                <NumberTicker value={health.uptime} />h
              </div>
              <div className="text-xs text-gray-400">Uptime</div>
            </div>

            <div className="text-center p-3 rounded-lg bg-gray-800/20 border border-gray-700/30">
              <div className="text-2xl font-bold text-white">
                <NumberTicker value={health.tokensPerSecond} />
              </div>
              <div className="text-xs text-gray-400">Tokens/s</div>
            </div>
          </div>

          {/* Health Summary */}
          <div className="mt-4 p-4 rounded-lg bg-gray-800/20 border border-gray-700/20">
            <div className="text-xs text-gray-400 mb-2">Health Summary</div>
            <div className="text-sm text-gray-300 leading-relaxed">
              {health.status === 'excellent' &&
                '🎉 Your model is performing exceptionally well with optimal metrics.'}
              {health.status === 'good' &&
                '✅ Model is operating normally with good performance metrics.'}
              {health.status === 'warning' &&
                '⚠️ Some metrics are showing suboptimal values. Monitor closely.'}
              {health.status === 'critical' &&
                '🚨 Critical issues detected. Immediate attention required.'}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
