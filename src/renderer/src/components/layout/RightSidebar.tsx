import React from 'react'
import {
  Gear,
  Cpu,
  HardDrive,
  Export,
  GraduationCap,
  Activity,
  Database,
  Brain,
  ChartBar
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RightSidebarProps {
  className?: string
  state: {
    showSystemStatus: boolean
    trainingMode: boolean
  }
  updateState: (updates: any) => void
}

const RightSidebar: React.FC<RightSidebarProps> = ({ className, state, updateState }) => {
  // Mock system metrics - will be replaced with real data
  const systemMetrics = {
    cpu: 23,
    memory: 45,
    disk: 67,
    gpu: 12,
    uptime: '2h 34m'
  }

  return (
    <aside className={cn('bg-background flex flex-col', className)}>
      {/* Icon-Only Top Section */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col space-y-3">
          {/* Settings */}
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Gear size={18} className="mr-3" />
            Settings
          </Button>

          {/* System Status Toggle */}
          <Button
            variant={state.showSystemStatus ? 'default' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={() => updateState({ showSystemStatus: !state.showSystemStatus })}
          >
            <Cpu size={18} className="mr-3" />
            System
          </Button>

          {/* Memory Status */}
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Brain size={18} className="mr-3" />
            Memory
          </Button>

          {/* Export */}
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Export size={18} className="mr-3" />
            Export
          </Button>

          {/* Training Mode */}
          <Button
            variant={state.trainingMode ? 'default' : 'ghost'}
            size="sm"
            className="w-full justify-start"
          >
            <GraduationCap size={18} className="mr-3" />
            Training
          </Button>
        </div>
      </div>

      {/* System Status Panel */}
      {state.showSystemStatus && (
        <div className="p-4 border-b border-border">
          <h3 className="font-medium mb-3 flex items-center">
            <Activity size={16} className="mr-2" />
            System Status
          </h3>

          <div className="space-y-3">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU</span>
                <span>{systemMetrics.cpu}%</span>
              </div>
              <Progress value={systemMetrics.cpu} className="h-2" />
            </div>

            {/* Memory */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory</span>
                <span>{systemMetrics.memory}%</span>
              </div>
              <Progress value={systemMetrics.memory} className="h-2" />
            </div>

            {/* Disk */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Disk</span>
                <span>{systemMetrics.disk}%</span>
              </div>
              <Progress value={systemMetrics.disk} className="h-2" />
            </div>

            {/* GPU (Placeholder) */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>GPU VRAM</span>
                <span>{systemMetrics.gpu}%</span>
              </div>
              <Progress value={systemMetrics.gpu} className="h-2" />
              <Badge variant="outline" className="text-xs mt-1">
                Placeholder
              </Badge>
            </div>

            {/* Threshold Warnings */}
            {systemMetrics.cpu > 80 && (
              <Badge variant="destructive" className="text-xs">
                CPU Warning: {systemMetrics.cpu}%
              </Badge>
            )}

            {systemMetrics.memory > 80 && (
              <Badge variant="destructive" className="text-xs">
                Memory Warning: {systemMetrics.memory}%
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Performance Panel Placeholder */}
      <div className="p-4 border-b border-border">
        <h3 className="font-medium mb-3 flex items-center">
          <ChartBar size={16} className="mr-2" />
          Performance
        </h3>

        <div className="text-center py-8 text-muted-foreground">
          <ChartBar size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Performance graphs</p>
          <p className="text-xs">TODO: GPU integration</p>
        </div>
      </div>

      {/* Service Status */}
      <div className="p-4">
        <h3 className="font-medium mb-3">Services</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database size={14} />
              <span className="text-sm">Ollama</span>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Connected
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain size={14} />
              <span className="text-sm">ChromaDB</span>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Connected
            </Badge>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </aside>
  )
}

export default RightSidebar
