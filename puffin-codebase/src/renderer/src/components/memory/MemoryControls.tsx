import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { Slider } from '../ui/slider'
import { Badge } from '../ui/badge'
import { Eye, EyeSlash, Brain, Lightning, Funnel, Info } from 'phosphor-react'

interface MemoryControlsProps {
  onMemoryOptionsChange: (options: MemoryOptions) => void
  currentOptions: MemoryOptions
}

export interface MemoryOptions {
  enabled: boolean
  maxSummaries: number
  maxKeyFacts: number
  includeTopics: boolean
  smartFilter: boolean
  debugMode: boolean
}

export const MemoryControls: React.FC<MemoryControlsProps> = ({
  onMemoryOptionsChange,
  currentOptions
}) => {
  const [options, setOptions] = useState<MemoryOptions>(currentOptions)
  const [isExpanded, setIsExpanded] = useState(false)

  const updateOption = (key: keyof MemoryOptions, value: any) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    onMemoryOptionsChange(newOptions)
  }

  return (
    <Card className="w-full bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Memory & Context</CardTitle>
            <Badge variant={options.enabled ? 'default' : 'secondary'} className="ml-2">
              {options.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={options.enabled}
              onCheckedChange={(enabled) => updateOption('enabled', enabled)}
              className="data-[state=checked]:bg-purple-600"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Summary Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Context Summaries</label>
              <span className="text-sm text-muted-foreground">{options.maxSummaries}</span>
            </div>
            <Slider
              value={[options.maxSummaries]}
              onValueChange={(value) => updateOption('maxSummaries', value[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
              disabled={!options.enabled}
            />
          </div>

          {/* Key Facts Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Key Facts</label>
              <span className="text-sm text-muted-foreground">{options.maxKeyFacts}</span>
            </div>
            <Slider
              value={[options.maxKeyFacts]}
              onValueChange={(value) => updateOption('maxKeyFacts', value[0])}
              min={5}
              max={20}
              step={1}
              className="w-full"
              disabled={!options.enabled}
            />
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Funnel className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Smart Context Filtering</span>
              </div>
              <Switch
                checked={options.smartFilter}
                onCheckedChange={(smartFilter) => updateOption('smartFilter', smartFilter)}
                disabled={!options.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightning className="h-4 w-4 text-green-500" />
                <span className="text-sm">Include Topic Context</span>
              </div>
              <Switch
                checked={options.includeTopics}
                onCheckedChange={(includeTopics) => updateOption('includeTopics', includeTopics)}
                disabled={!options.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Debug Mode</span>
              </div>
              <Switch
                checked={options.debugMode}
                onCheckedChange={(debugMode) => updateOption('debugMode', debugMode)}
                disabled={!options.enabled}
              />
            </div>
          </div>

          {/* Status Indicator */}
          {options.enabled && (
            <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Memory Active:</span>
                <span className="text-purple-700 dark:text-purple-300">
                  Using up to {options.maxSummaries} summaries and {options.maxKeyFacts} key facts
                  {options.smartFilter && ' with smart filtering'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
