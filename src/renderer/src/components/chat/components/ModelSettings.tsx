import React, { useState, useEffect } from 'react'
import {
  Thermometer,
  Shuffle,
  ListNumbers,
  Hash,
  ArrowsClockwise,
  FloppyDisk
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface ModelConfig {
  temperature: number
  top_p: number
  top_k: number
  max_tokens: number
  repeat_penalty: number
  context_length: number
  seed?: number
}

interface ModelSettingsProps {
  model: string
  className?: string
}

const ModelSettings: React.FC<ModelSettingsProps> = ({ model, className }) => {
  const [config, setConfig] = useState<ModelConfig>({
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    max_tokens: 2048,
    repeat_penalty: 1.1,
    context_length: 4096,
    seed: undefined
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load model-specific defaults
  useEffect(() => {
    const modelDefaults: Record<string, Partial<ModelConfig>> = {
      'tinydolphin:latest': { temperature: 0.8, top_p: 0.95, max_tokens: 1024 },
      'openchat:latest': { temperature: 0.7, top_p: 0.9, max_tokens: 2048 },
      'phi4-mini-reasoning:latest': { temperature: 0.6, top_p: 0.85, max_tokens: 1536 },
      'deepseek-coder:1.3b': { temperature: 0.5, top_p: 0.8, max_tokens: 2048 }
    }

    const defaults = modelDefaults[model] || {}
    setConfig((prev) => ({ ...prev, ...defaults }))
    setHasChanges(false)
  }, [model])

  const updateConfig = (key: keyof ModelConfig, value: number | undefined) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const resetToDefaults = () => {
    setConfig({
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      max_tokens: 2048,
      repeat_penalty: 1.1,
      context_length: 4096,
      seed: undefined
    })
    setHasChanges(true)
  }

  const generateRandomSeed = () => {
    const seed = Math.floor(Math.random() * 1000000)
    updateConfig('seed', seed)
  }

  const saveSettings = async () => {
    setIsLoading(true)
    try {
      // TODO: Save to backend via IPC
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate save
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save model settings:', error)
    }
    setIsLoading(false)
  }

  const getTemperatureDescription = (temp: number) => {
    if (temp < 0.3) return 'Very focused, deterministic'
    if (temp < 0.6) return 'Focused, consistent'
    if (temp < 0.8) return 'Balanced creativity'
    if (temp < 1.0) return 'Creative, varied'
    return 'Very creative, unpredictable'
  }

  return (
    <div className={cn('p-4 bg-muted/30 rounded-lg border border-border', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">Model Settings</h3>
          <p className="text-sm text-muted-foreground">Configure {model} parameters</p>
        </div>

        <div className="flex items-center space-x-2">
          {hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}

          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <ArrowsClockwise size={14} className="mr-1" />
            Reset
          </Button>

          <Button size="sm" onClick={saveSettings} disabled={!hasChanges || isLoading}>
            <FloppyDisk size={14} className="mr-1" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generation Parameters */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center">
            <Thermometer size={16} className="mr-2" />
            Generation
          </h4>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">{config.temperature.toFixed(2)}</span>
            </div>
            <Slider
              value={[config.temperature]}
              onValueChange={([value]) => updateConfig('temperature', value)}
              min={0}
              max={2}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {getTemperatureDescription(config.temperature)}
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Top P (Nucleus Sampling)</Label>
              <span className="text-sm text-muted-foreground">{config.top_p.toFixed(2)}</span>
            </div>
            <Slider
              value={[config.top_p]}
              onValueChange={([value]) => updateConfig('top_p', value)}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Controls diversity via nucleus sampling</p>
          </div>

          {/* Top K */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Top K</Label>
              <Input
                type="number"
                value={config.top_k}
                onChange={(e) => updateConfig('top_k', parseInt(e.target.value) || 0)}
                className="w-20 h-8"
                min={1}
                max={100}
              />
            </div>
            <p className="text-xs text-muted-foreground">Limits vocab to top K tokens</p>
          </div>
        </div>

        {/* Output Parameters */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center">
            <Hash size={16} className="mr-2" />
            Output
          </h4>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={config.max_tokens}
                onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value) || 0)}
                className="w-24 h-8"
                min={1}
                max={8192}
              />
            </div>
            <p className="text-xs text-muted-foreground">Maximum response length</p>
          </div>

          {/* Context Length */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Context Length</Label>
              <Input
                type="number"
                value={config.context_length}
                onChange={(e) => updateConfig('context_length', parseInt(e.target.value) || 0)}
                className="w-24 h-8"
                min={512}
                max={8192}
              />
            </div>
            <p className="text-xs text-muted-foreground">Total context window size</p>
          </div>

          {/* Repeat Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Repeat Penalty</Label>
              <span className="text-sm text-muted-foreground">
                {config.repeat_penalty.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[config.repeat_penalty]}
              onValueChange={([value]) => updateConfig('repeat_penalty', value)}
              min={0.5}
              max={2}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Penalizes repetitive text</p>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Advanced Settings */}
      <div className="space-y-4">
        <h4 className="font-medium flex items-center">
          <Shuffle size={16} className="mr-2" />
          Advanced
        </h4>

        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Label>Random Seed (optional)</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                type="number"
                value={config.seed || ''}
                onChange={(e) => updateConfig('seed', parseInt(e.target.value) || undefined)}
                placeholder="Auto-generated"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={generateRandomSeed}>
                <Shuffle size={14} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For reproducible outputs (leave empty for random)
            </p>
          </div>
        </div>
      </div>

      {/* Performance Info */}
      <div className="mt-4 p-3 bg-background rounded border border-border">
        <div className="text-sm font-medium mb-2">Performance Impact</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            Estimated Speed:{' '}
            {config.max_tokens < 1000 ? 'Fast' : config.max_tokens < 2000 ? 'Medium' : 'Slow'}
          </div>
          <div>
            Memory Usage:{' '}
            {config.context_length < 2000
              ? 'Low'
              : config.context_length < 4000
                ? 'Medium'
                : 'High'}
          </div>
          <div>
            Quality:{' '}
            {config.temperature < 0.5
              ? 'Consistent'
              : config.temperature < 0.8
                ? 'Balanced'
                : 'Creative'}
          </div>
          <div>Context Window: {config.context_length} tokens</div>
        </div>
      </div>
    </div>
  )
}

export default ModelSettings
