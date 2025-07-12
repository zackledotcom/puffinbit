import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Activity, Zap, Thermometer, Clock, Eye, Gauge } from 'phosphor-react'
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar'
import { NumberTicker } from '@/components/ui/number-ticker'
import { Ripple } from '@/components/ui/ripple'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface HealthMetrics {
  overall: number
  performance: number
  temperature: number
  responseTime: number
  tokensPerSecond: number
  memoryUsage: number
  accuracy: number
  uptime: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
}

interface SimpleHealthDashboardProps {
  modelName?: string
  className?: string
  showDetails?: boolean
}

export default function SimpleHealthDashboard({ 
  modelName = "llama3.1:8b",
  className,
  showDetails = false
}: SimpleHealthDashboardProps) {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    overall: 87,
    performance: 92,
    temperature: 65,
    responseTime: 245,
    tokensPerSecond: 15.8,
    memoryUsage: 73,
    accuracy: 94.2,
    uptime: 24.7,
    status: 'good',
    trend: 'stable'
  })

  const [expanded, setExpanded] = useState(showDetails)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const newOverall = Math.max(60, Math.min(100, prev.overall + (Math.random() - 0.5) * 4))
        const newPerformance = Math.max(60, Math.min(100, prev.performance + (Math.random() - 0.5) * 6))
        
        // Determine trend
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (newPerformance > prev.performance + 2) trend = 'up'
        else if (newPerformance < prev.performance - 2) trend = 'down'
        
        return {
          ...prev,
          overall: newOverall,
          performance: newPerformance,
          temperature: Math.max(45, Math.min(85, prev.temperature + (Math.random() - 0.5) * 3)),
          responseTime: Math.max(150, Math.min(500, prev.responseTime + (Math.random() - 0.5) * 30)),
          tokensPerSecond: Math.max(8, Math.min(25, prev.tokensPerSecond + (Math.random() - 0.5) * 1.5)),
          memoryUsage: Math.max(40, Math.min(95, prev.memoryUsage + (Math.random() - 0.5) * 5)),
          accuracy: Math.max(85, Math.min(100, prev.accuracy + (Math.random() - 0.5) * 1)),
          uptime: prev.uptime + 0.001,
          trend,
          status: newOverall > 85 ? 'excellent' : newOverall > 75 ? 'good' : newOverall > 60 ? 'warning' : 'critical'
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#10b981'
      case 'good': return '#3b82f6'  
      case 'warning': return '#f59e0b'
      case 'critical': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      case 'stable': return '➡️'
      default: return '➡️'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-50 border-green-200'
      case 'good': return 'bg-blue-50 border-blue-200'  
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'critical': return 'bg-red-50 border-red-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "relative p-4 rounded-lg border-2 transition-all duration-500 hover:shadow-xl group cursor-pointer overflow-hidden", 
        getStatusBg(metrics.status), 
        className
      )}
      onClick={() => setExpanded(!expanded)}>
        
        {/* Background Effects for Excellent Status */}
        {metrics.status === 'excellent' && (
          <Ripple 
            className="absolute inset-0 opacity-15"
            mainCircleSize={120}
            mainCircleOpacity={0.08}
            numCircles={5}
          />
        )}
        
        {/* Status Glow Effect */}
        <div 
          className="absolute inset-0 opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${getStatusColor(metrics.status)}20 0%, transparent 70%)`
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1">
                <Gauge className="w-4 h-4" />
                Model Health
              </h3>
              <span className="text-xs">{getTrendIcon(metrics.trend)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={cn("text-xs font-bold capitalize flex items-center gap-1", 
                metrics.status === 'excellent' ? 'text-green-700' :
                metrics.status === 'good' ? 'text-blue-700' :
                metrics.status === 'warning' ? 'text-yellow-700' : 'text-red-700')}>
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: getStatusColor(metrics.status) }}
                />
                {metrics.status}
              </div>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpanded(!expanded)
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{expanded ? 'Hide details' : 'Show details'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Model Name */}
          <div className="text-xs text-gray-600 mb-4 font-mono bg-white/40 rounded px-2 py-1 backdrop-blur-sm">
            {modelName}
          </div>

          {/* Main Health Circle - Enhanced */}
          <div className="flex items-center justify-center mb-4 relative">
            <div className="relative transform transition-transform duration-300 group-hover:scale-105">
              <AnimatedCircularProgressBar
                max={100}
                value={metrics.overall}
                gaugePrimaryColor={getStatusColor(metrics.status)}
                gaugeSecondaryColor="#e5e7eb"
                className="scale-90"
              />
              
              {/* Floating metrics around the circle */}
              <div className="absolute -top-2 -right-2 text-xs bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 border shadow-sm">
                <NumberTicker value={metrics.accuracy} />%
              </div>
              
              <div className="absolute -bottom-2 -left-2 text-xs bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 border shadow-sm">
                <NumberTicker value={metrics.tokensPerSecond} />/s
              </div>
            </div>
          </div>

      {/* Metrics Grid with Magic UI Number Tickers */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-gray-500" />
          <span className="text-gray-600">Perf</span>
          <span className="font-medium text-gray-800">
            <NumberTicker value={metrics.performance} />%
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Thermometer className="w-3 h-3 text-gray-500" />
          <span className="text-gray-600">Temp</span>
          <span className="font-medium text-gray-800">
            <NumberTicker value={metrics.temperature} />°C
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-gray-600">Response</span>
          <span className="font-medium text-gray-800">
            <NumberTicker value={metrics.responseTime} />ms
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-gray-500" />
          <span className="text-gray-600">Status</span>
          <div className={cn("w-2 h-2 rounded-full animate-pulse", 
            metrics.status === 'excellent' ? 'bg-green-400' :
            metrics.status === 'good' ? 'bg-blue-400' :
            metrics.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
          )} />
        </div>
      </div>
    </div>
  )
}
          {/* Enhanced Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 hover:bg-white/70 transition-all duration-200">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <div className="flex-1">
                    <div className="text-gray-600">Performance</div>
                    <div className="font-bold text-gray-800">
                      <NumberTicker value={metrics.performance} />%
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Overall model performance rating</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 hover:bg-white/70 transition-all duration-200">
                  <Thermometer className="w-4 h-4 text-orange-500" />
                  <div className="flex-1">
                    <div className="text-gray-600">Temperature</div>
                    <div className="font-bold text-gray-800">
                      <NumberTicker value={metrics.temperature} />°C
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Model operating temperature</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 hover:bg-white/70 transition-all duration-200">
                  <Clock className="w-4 h-4 text-green-500" />
                  <div className="flex-1">
                    <div className="text-gray-600">Response</div>
                    <div className="font-bold text-gray-800">
                      <NumberTicker value={metrics.responseTime} />ms
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Average response time</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 hover:bg-white/70 transition-all duration-200">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <div className="flex-1">
                    <div className="text-gray-600">Memory</div>
                    <div className="font-bold text-gray-800">
                      <NumberTicker value={metrics.memoryUsage} />%
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Memory usage percentage</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-white/30 space-y-3 animate-in fade-in duration-300">
              <div className="text-xs font-semibold text-gray-700 mb-2">Advanced Metrics</div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Accuracy</span>
                  <span className="font-bold">
                    <NumberTicker value={metrics.accuracy} />%
                  </span>
                </div>
                <Progress 
                  value={metrics.accuracy} 
                  className="h-2"
                  style={{
                    '--progress-background': getStatusColor(metrics.status)
                  } as React.CSSProperties}
                />
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Uptime</span>
                  <span className="font-bold">
                    <NumberTicker value={metrics.uptime} />h
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, (metrics.uptime / 24) * 100)} 
                  className="h-2"
                  style={{
                    '--progress-background': getStatusColor(metrics.status)
                  } as React.CSSProperties}
                />
              </div>
              
              <div className="text-xs text-gray-600 text-center pt-2 border-t border-white/20">
                Trend: {getTrendIcon(metrics.trend)} {metrics.trend} • Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
