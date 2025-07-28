import React from 'react'
import { Cpu, Globe, WifiSlash, Database, Brain, Activity, Gear } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Pulsating } from '@/components/ui/pulsating'
import { Ripple } from '@/components/ui/ripple'
import { cn } from '@/lib/utils'

interface TopHeaderProps {
  state: {
    onlineMode: boolean
    trainingMode: boolean
    selectedModel: string
    showOllamaDebug: boolean
    showSystemStatus: boolean
  }
  updateState: (updates: any) => void
}

const TopHeader: React.FC<TopHeaderProps> = ({ state, updateState }) => {
  return (
    <header className="h-[60px] bg-background border-b border-border flex items-center justify-between px-4">
      {/* Left Section - Model Selector */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Cpu size={20} className="text-primary" />
          <Select
            value={state.selectedModel}
            onValueChange={(model) => updateState({ selectedModel: model })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tinydolphin:latest">TinyDolphin (1B)</SelectItem>
              <SelectItem value="openchat:latest">OpenChat (7B)</SelectItem>
              <SelectItem value="phi4-mini-reasoning:latest">Phi4 Mini (3.8B)</SelectItem>
              <SelectItem value="deepseek-coder:1.3b">DeepSeek Coder (1B)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Center Section - Status Indicators */}
      <div className="flex items-center space-x-4">
        {/* Internet/WiFi Toggle */}
        <div className="flex items-center space-x-2">
          {state.onlineMode ? (
            <Globe size={18} className="text-green-500" />
          ) : (
            <WifiSlash size={18} className="text-gray-500" />
          )}
          <Switch
            checked={state.onlineMode}
            onCheckedChange={(checked) => updateState({ onlineMode: checked })}
          />
          <span className="text-sm">Online</span>
        </div>

        {/* Ollama Status */}
        <Badge variant="outline" className="flex items-center space-x-1">
          <Database size={14} />
          <span>Ollama</span>
        </Badge>

        {/* Memory Status */}
        <Badge variant="outline" className="flex items-center space-x-1">
          <Brain size={14} />
          <span>Memory</span>
        </Badge>

        {/* Training Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm">Training</span>
          <Switch
            checked={state.trainingMode}
            onCheckedChange={(checked) => updateState({ trainingMode: checked })}
          />
          {state.trainingMode && <Badge variant="secondary">Active</Badge>}
        </div>
      </div>

      {/* Right Section - Debug Controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant={state.showOllamaDebug ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateState({ showOllamaDebug: !state.showOllamaDebug })}
        >
          <Activity size={16} className="mr-1" />
          Debug
        </Button>

        <Button
          variant={state.showSystemStatus ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateState({ showSystemStatus: !state.showSystemStatus })}
        >
          <Cpu size={16} className="mr-1" />
          System
        </Button>

        <Button variant="outline" size="sm">
          <Gear size={16} />
        </Button>
      </div>
    </header>
  )
}

export default TopHeader
