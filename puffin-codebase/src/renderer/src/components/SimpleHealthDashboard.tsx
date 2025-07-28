import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Activity, Lightning, Thermometer, Clock } from 'phosphor-react'
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar'
import NumberTicker from '@/components/ui/number-ticker'
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
  trend: 'improving' | 'stable' | 'declining'
}

const SimpleHealthDashboard = () => {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    overall: 92,
    performance: 88,
    temperature: 45,
    responseTime: 234,
    tokensPerSecond: 45,
    memoryUsage: 67,
    accuracy: 94,
    uptime: 99.8,
    status: 'excellent',
    trend: 'stable'
  })

  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshMetrics = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setMetrics(prev => ({
        ...prev,
        overall: Math.floor(Math.random() * 20) + 80,
        performance: Math.floor(Math.random() * 20) + 75,
        temperature: Math.floor(Math.random() * 30) + 35,
        responseTime: Math.floor(Math.random() * 500) + 100
      }))
      setIsRefreshing(false)
    }, 1000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500'
      case 'good': return 'text-blue-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-lg border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
          <Button 
            onClick={refreshMetrics} 
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Overall</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-center gap-3">
              <AnimatedCircularProgressBar
                max={100}
                min={0}
                value={metrics.overall}
                gaugePrimaryColor="rgb(59 130 246)"
                gaugeSecondaryColor="rgba(0, 0, 0, 0.1)"
                className="w-8 h-8"
              />
              <div>
                <NumberTicker value={metrics.overall} className="text-2xl font-bold" />
                <span className="text-lg text-gray-500">%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Performance</span>
              <Lightning className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-center gap-3">
              <Progress value={metrics.performance} className="flex-1" />
              <NumberTicker value={metrics.performance} className="text-lg font-semibold" />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Temperature</span>
              <Thermometer className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-center gap-2">
              <NumberTicker value={metrics.temperature} className="text-lg font-semibold" />
              <span className="text-sm text-gray-500">°C</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Response Time</span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-center gap-2">
              <NumberTicker value={metrics.responseTime} className="text-lg font-semibold" />
              <span className="text-sm text-gray-500">ms</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-3 h-3 rounded-full', 
                metrics.status === 'excellent' ? 'bg-green-500' :
                metrics.status === 'good' ? 'bg-blue-500' :
                metrics.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              <span className={cn('font-medium', getStatusColor(metrics.status))}>
                {metrics.status.charAt(0).toUpperCase() + metrics.status.slice(1)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        <Ripple />
      </div>
    </TooltipProvider>
  )
}

export default SimpleHealthDashboard
