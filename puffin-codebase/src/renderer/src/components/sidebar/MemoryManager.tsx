import React from 'react'
import {
  Brain,
  Activity,
  WarningCircle,
  CheckCircle,
  Trash,
  ArrowsClockwise,
  TrendUp as TrendingUp, // Fixed: TrendingUp → TrendUp
  Database
} from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface MemoryStore {
  id: string
  type: 'conversation' | 'knowledge' | 'user_data'
  size: number
  lastAccessed: Date
  health: 'good' | 'degraded' | 'corrupted'
}

interface MemoryManagerProps {
  memoryStores: MemoryStore[]
  totalMemoryUsed: number
  maxMemory: number
  onClearMemory: (id: string) => void
  onRefreshMemory: () => void
  className?: string
}

export default function MemoryManager({
  memoryStores,
  totalMemoryUsed,
  maxMemory,
  onClearMemory,
  onRefreshMemory,
  className
}: MemoryManagerProps) {
  const memoryPercentage = (totalMemoryUsed / maxMemory) * 100

  const getHealthColor = (health: MemoryStore['health']) => {
    switch (health) {
      case 'good':
        return 'text-green-500'
      case 'degraded':
        return 'text-yellow-500'
      case 'corrupted':
        return 'text-red-500'
    }
  }

  const getHealthIcon = (health: MemoryStore['health']) => {
    switch (health) {
      case 'good':
        return <CheckCircle className="w-4 h-4" />
      case 'degraded':
        return <Activity className="w-4 h-4" />
      case 'corrupted':
        return <WarningCircle className="w-4 h-4" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <Card className={cn('w-80', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Memory Manager
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={onRefreshMemory} className="h-6 w-6 p-0">
            <ArrowsClockwise className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall memory usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Memory Usage</span>
            <span>
              {formatBytes(totalMemoryUsed)} / {formatBytes(maxMemory)}
            </span>
          </div>
          <Progress value={memoryPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{memoryPercentage.toFixed(1)}% used</span>
            <Badge
              variant={memoryPercentage > 80 ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {memoryPercentage > 80 ? 'High' : 'Normal'}
            </Badge>
          </div>
        </div>

        {/* Memory stores */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Memory Stores</h4>
          <div className="space-y-1">
            {memoryStores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn('flex items-center', getHealthColor(store.health))}>
                    {getHealthIcon(store.health)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{store.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(store.size)} •{' '}
                      {new Date(store.lastAccessed).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onClearMemory(store.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold">{memoryStores.length}</p>
            <p className="text-xs text-muted-foreground">Stores</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {memoryStores.filter((s) => s.health === 'good').length}
            </p>
            <p className="text-xs text-muted-foreground">Healthy</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
