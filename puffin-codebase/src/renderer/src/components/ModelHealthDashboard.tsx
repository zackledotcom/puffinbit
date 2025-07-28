import React, { useState, useEffect } from 'react'
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar'
import { NumberTicker } from '@/components/ui/number-ticker'
import { Ripple } from '@/components/ui/ripple'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Activity,
  Zap,
  Thermometer,
  MemoryStick,
  Cpu,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Heart,
  Shield,
  TrendUp,
  Clock
} from 'phosphor-react'

interface ModelHealth {
  overall: number // 0-100
  performance: number // 0-100
  memory: number // 0-100
  temperature: number // 0-100
  uptime: number // hours
  responseTime: number // ms
  tokensPerSecond: number
  errors: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
}

interface ModelHealthDashboardProps {
  modelName: string
  className?: string
  onRefresh?: () => void
  compact?: boolean
}

export default function ModelHealthDashboard({
  modelName = 'llama3.1:8b',
  className,
  onRefresh,
  compact = false
}: ModelHealthDashboardProps) {
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
    trend: 'stable'
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHealth((prev) => {
        const newOverall = Math.max(60, Math.min(100, prev.overall + (Math.random() - 0.5) * 4))
        const newPerformance = Math.max(
          60,
          Math.min(100, prev.performance + (Math.random() - 0.5) * 6)
        )

        // Determine trend based on performance change
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (newPerformance > prev.performance + 2) trend = 'up'
        else if (newPerformance < prev.performance - 2) trend = 'down'

        return {
          ...prev,
          overall: newOverall,
          performance: newPerformance,
          memory: Math.max(50, Math.min(95, prev.memory + (Math.random() - 0.5) * 8)),
          temperature: Math.max(45, Math.min(85, prev.temperature + (Math.random() - 0.5) * 5)),
          responseTime: Math.max(
            150,
            Math.min(500, prev.responseTime + (Math.random() - 0.5) * 50)
          ),
          tokensPerSecond: Math.max(
            8,
            Math.min(25, prev.tokensPerSecond + (Math.random() - 0.5) * 2)
          ),
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
    }, 3000)

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
        return <Heart className="w-4 h-4" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />
      case 'critical':
        return <Shield className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getTrendIcon = (trend: ModelHealth['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendUp className="w-3 h-3 text-green-400" />
      case 'down':
        return <TrendUp className="w-3 h-3 text-red-400 rotate-180" />
      case 'stable':
        return <div className="w-3 h-0.5 bg-gray-400 rounded" />
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
        errors: Math.floor(Math.random() * 5)
      }))
      setIsRefreshing(false)
      setLastUpdate(new Date())
      onRefresh?.()
    }, 1000)
  }

  // Compact version for sidebar
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('relative p-3 rounded-lg glass-panel border-0', className)}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <AnimatedCircularProgressBar
                    max={100}
                    value={health.overall}
                    gaugePrimaryColor={getStatusColor(health.status)}
                    gaugeSecondaryColor="#374151"
                    className="scale-50 -m-3"
                  />
                  {health.status === 'excellent' && (
                    <Ripple
                      className="absolute inset-0 opacity-30"
                      mainCircleSize={60}
                      mainCircleOpacity={0.1}
                      numCircles={3}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: getStatusColor(health.status) }}
                    />
                    <span className="text-xs font-medium text-white truncate">{modelName}</span>
                    {getTrendIcon(health.trend)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      <NumberTicker value={health.overall} />%
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400">
                      <NumberTicker value={health.responseTime} />
                      ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="w-64">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.status)}
                <span className="font-medium capitalize">{health.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Performance: {health.performance}%</div>
                <div>Memory: {health.memory}%</div>
                <div>Temperature: {health.temperature}°C</div>
                <div>Tokens/s: {health.tokensPerSecond}</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  } // Full dashboard version
  return (
    <TooltipProvider>
      <Card className={cn('glass-panel border-0 relative overflow-hidden', className)}>
        {/* Background Effects */}
        {health.status === 'excellent' && (
          <Ripple
            className="absolute inset-0 opacity-20"
            mainCircleSize={200}
            mainCircleOpacity={0.1}
            numCircles={5}
          />
        )}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: getStatusColor(health.status) }}
              />
              <div>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
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
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  >
                    <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh metrics</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>{' '}
        <CardContent className="space-y-6">
          {/* Main Health Circle with Enhanced Visual */}
          <div className="flex justify-center relative">
            <div className="relative">
              <AnimatedCircularProgressBar
                max={100}
                value={health.overall}
                gaugePrimaryColor={getStatusColor(health.status)}
                gaugeSecondaryColor="#374151"
                className="scale-90"
              />
              {/* Glow effect for excellent status */}
              {health.status === 'excellent' && (
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: `radial-gradient(circle, ${getStatusColor(health.status)}20 0%, transparent 70%)`,
                    filter: 'blur(8px)'
                  }}
                />
              )}
            </div>
          </div>
          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Zap className="w-4 h-4" />
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
                <MemoryStick className="w-4 h-4" />
                Memory Usage
              </div>
              <div className="flex items-center gap-3">
                <Progress value={health.memory} className="flex-1 h-3 bg-gray-700" />
                <span className="text-sm font-medium text-white w-10">
                  <NumberTicker value={health.memory} />%
                </span>
              </div>
            </div>
          </div>{' '}
          <Separator className="my-4 bg-gray-700/50" />
          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-500/20">
                        <Thermometer className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Temperature</div>
                        <div className="text-sm font-medium text-white">
                          <NumberTicker value={health.temperature} />
                          °C
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Normal</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Model operating temperature</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-500/20">
                        <Activity className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Response Time</div>
                        <div className="text-sm font-medium text-white">
                          <NumberTicker value={health.responseTime} />
                          ms
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {health.responseTime < 300
                          ? 'Fast'
                          : health.responseTime < 500
                            ? 'Good'
                            : 'Slow'}
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Average response time for queries</p>
                </TooltipContent>
              </Tooltip>
            </div>{' '}
            <div className="space-y-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-purple-500/20">
                        <Cpu className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Tokens/Second</div>
                        <div className="text-sm font-medium text-white">
                          <NumberTicker value={health.tokensPerSecond} className="tabular-nums" />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {health.tokensPerSecond > 20
                          ? 'Excellent'
                          : health.tokensPerSecond > 15
                            ? 'Good'
                            : 'Average'}
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Token generation speed</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-500/20">
                        <Clock className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Uptime</div>
                        <div className="text-sm font-medium text-white">
                          <NumberTicker value={health.uptime} />h
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Stable</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Model uptime in hours</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>{' '}
          {/* Error Alert */}
          {health.errors > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-700/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-300">
                    <NumberTicker value={health.errors} /> error{health.errors !== 1 ? 's' : ''}{' '}
                    detected
                  </div>
                  <div className="text-xs text-red-400 mt-1">Recent issues require attention</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-red-700/50 text-red-300 hover:bg-red-900/30"
                >
                  View Details
                </Button>
              </div>
            </div>
          )}
          {/* Health Summary */}
          <div className="mt-4 p-3 rounded-lg bg-gray-800/20 border border-gray-700/20">
            <div className="text-xs text-gray-400 mb-2">Health Summary</div>
            <div className="text-sm text-gray-300 leading-relaxed">
              {health.status === 'excellent' &&
                '🎉 Your model is performing exceptionally well with optimal metrics across all categories.'}
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
