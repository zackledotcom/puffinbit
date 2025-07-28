import React, { useState, useEffect } from 'react';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import NumberTicker from '@/components/ui/number-ticker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Lightning, Thermometer, HardDrive, Cpu, Warning, CheckCircle, Sparkle } from 'phosphor-react';

interface ModelHealth {
  overall: number;
  performance: number;
  memory: number;
  temperature: number;
  uptime: number;
  responseTime: number;
  tokensPerSecond: number;
  errors: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface ModelHealthMonitorProps {
  modelName: string;
  className?: string;
  onRefresh?: () => void;
}

export default function ModelHealthMonitor({ 
  modelName = "llama3.1:8b",
  className,
  onRefresh
}: ModelHealthMonitorProps) {
  const [health, setHealth] = useState<ModelHealth>({
    overall: 87,
    performance: 92,
    memory: 78,
    temperature: 65,
    uptime: 24.7,
    responseTime: 245,
    tokensPerSecond: 15.8,
    errors: 2,
    status: 'good'
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const metrics = await window.api.getServiceMetrics()
        if (metrics) {
          setHealth({
            overall: metrics.overall || 0,
            performance: metrics.performance || 0,
            memory: metrics.memory || 0,
            temperature: metrics.temperature || 0,
            uptime: metrics.uptime || 0,
            responseTime: metrics.responseTime || 0,
            tokensPerSecond: metrics.tokensPerSecond || 0,
            errors: metrics.errors || 0,
            status: metrics.status || 'critical'
          })
        }
      } catch (error) {
        console.error('Failed to fetch service metrics:', error)
        // Keep existing health values on error
      }
    }
    
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 3000)
    return () => clearInterval(interval)
  }, [modelName])

  const getStatusColor = (status: ModelHealth['status']) => {
    switch (status) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };
  
  const getStatusIcon = (status: ModelHealth['status']) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
      case 'critical':
        return <Warning className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Real refresh from backend
    const metrics = await ipcRenderer.invoke('get-service-metrics', modelName);
    setHealth(metrics || health);
    setIsRefreshing(false);
    onRefresh?.();
  };
  
  return (
    <TooltipProvider>
      <Card className={`glass-panel border-0 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: getStatusColor(health.status) }}
              />
              <CardTitle className="text-sm font-medium text-white">
                Model Health
              </CardTitle>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <Sparkle className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh health metrics</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="text-xs text-gray-400">{modelName}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Health Circle */}
          <div className="flex justify-center">
            <AnimatedCircularProgressBar
              max={100}
              value={health.overall}
              gaugePrimaryColor={getStatusColor(health.status)}
              gaugeSecondaryColor="#374151"
              className="scale-75"
            />
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Lightning className="w-3 h-3" />
                Performance
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={health.performance} 
                  className="flex-1 h-2 bg-gray-700"
                />
                <span className="text-xs font-medium text-white w-8">
                  {health.performance}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <HardDrive className="w-3 h-3" />
                Memory
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={health.memory} 
                  className="flex-1 h-2 bg-gray-700"
                />
                <span className="text-xs font-medium text-white w-8">
                  {health.memory}%
                </span>
              </div>
            </div>
          </div>
          <Separator className="my-3 bg-gray-700" />

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Thermometer className="w-3 h-3" />
                      Temp
                    </div>
                    <div className="text-white font-medium">
                      <NumberTicker value={health.temperature} />°C
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Model temperature</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Activity className="w-3 h-3" />
                      Response
                    </div>
                    <div className="text-white font-medium">
                      <NumberTicker value={health.responseTime} />ms
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Average response time</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Cpu className="w-3 h-3" />
                      Tokens/s
                    </div>
                    <div className="text-white font-medium">
                      <NumberTicker value={health.tokensPerSecond} className="tabular-nums" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tokens per second</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Activity className="w-3 h-3" />
                      Uptime
                    </div>
                    <div className="text-white font-medium">
                      <NumberTicker value={health.uptime} />h
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Model uptime in hours</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Error Count */}
          {health.errors > 0 && (
            <div className="mt-3 p-2 rounded bg-red-900/20 border border-red-700/30">
              <div className="flex items-center gap-2 text-xs">
                <Warning className="w-3 h-3 text-red-400" />
                <span className="text-red-400">
                  <NumberTicker value={health.errors} /> error{health.errors !== 1 ? 's' : ''} detected
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}