import React from 'react'
import { User, Robot, Calendar, Play, Pause, Gear } from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type AgentMode = 'manual' | 'autonomous' | 'scheduled' | 'collaborative'

interface AgentModeProps {
  currentMode: AgentMode
  onModeChange: (mode: AgentMode) => void
  isActive: boolean
  onToggleActive: () => void
  nextScheduledTask?: Date
  className?: string
}

export default function AgentModeSelector({
  currentMode,
  onModeChange,
  isActive,
  onToggleActive,
  nextScheduledTask,
  className
}: AgentModeProps) {
  const modes = [
    {
      value: 'manual' as const,
      label: 'Manual',
      icon: <User className="w-4 h-4" />,
      description: 'User-controlled interactions'
    },
    {
      value: 'autonomous' as const,
      label: 'Autonomous',
      icon: <Robot className="w-4 h-4" />,
      description: 'AI acts independently'
    },
    {
      value: 'scheduled' as const,
      label: 'Scheduled',
      icon: <Calendar className="w-4 h-4" />,
      description: 'Time-based automation'
    },
    {
      value: 'collaborative' as const,
      label: 'Collaborative',
      icon: <Gear className="w-4 h-4" />,
      description: 'AI + user cooperation'
    }
  ]

  const currentModeData = modes.find((m) => m.value === currentMode)

  return (
    <Card className={cn('w-80', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {currentModeData?.icon}
            Agent Mode
          </CardTitle>
          <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Idle'}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mode selector */}
        <div className="space-y-2">
          <Select value={currentMode} onValueChange={onModeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select agent mode" />
            </SelectTrigger>
            <SelectContent>
              {modes.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div className="flex items-center gap-2">
                    {mode.icon}
                    <div>
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-xs text-muted-foreground">{mode.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current mode description */}
        <div className="p-3 rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">{currentModeData?.description}</p>

          {currentMode === 'scheduled' && nextScheduledTask && (
            <p className="text-xs text-muted-foreground mt-2">
              Next task: {nextScheduledTask.toLocaleString()}
            </p>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isActive ? 'destructive' : 'default'}
            onClick={onToggleActive}
            className="flex-1"
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause Agent
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Agent
              </>
            )}
          </Button>

          <Button size="sm" variant="outline" className="px-3">
            <Gear className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
