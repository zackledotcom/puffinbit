import React from 'react'
import {
  Robot,
  Brain,
  Gear,
  ArrowsClockwise,
  Sidebar,
  Circle
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import NumberTicker from '@/components/ui/number-ticker'
import { cn } from '@/lib/utils'

interface OptimizedHeaderProps {
  // Model information
  selectedModel: string
  modelStatus: 'connected' | 'disconnected' | 'loading'
  
  // Chat statistics
  messageCount: number
  responseTime: number
  
  // Memory context
  memoryContextCount: number
  memoryEnabled: boolean
  
  // Actions
  onToggleSidebar: () => void
  onOpenSettings: () => void
  onClearChat: () => void
  onToggleMemory: () => void
  
  // State
  sidebarOpen: boolean
  isLoading: boolean
  hasMessages: boolean
  
  className?: string
}

export default function OptimizedHeader({
  selectedModel,
  modelStatus,
  messageCount,
  responseTime,
  memoryContextCount,
  memoryEnabled,
  onToggleSidebar,
  onOpenSettings,
  onClearChat,
  onToggleMemory,
  sidebarOpen,
  isLoading,
  hasMessages,
  className
}: OptimizedHeaderProps) {
  
  const getModelDisplayName = (model: string) => {
    return model
      .replace(':latest', '')
      .replace('deepseek-coder', 'DeepSeek Coder')
      .replace('qwen2.5', 'Qwen 2.5')
      .replace('phi3.5', 'Phi 3.5')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('phi4-mini-reasoning', 'Phi4 Mini')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500'
      case 'loading': return 'text-yellow-500'
      case 'disconnected': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusText = (status: string, loading: boolean) => {
    if (loading) return 'Thinking...'
    switch (status) {
      case 'connected': return 'Ready'
      case 'loading': return 'Loading...'
      case 'disconnected': return 'Offline'
      default: return 'Unknown'
    }
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-4 bg-white border-b border-gray-200',
      className
    )}>
      {/* Left side - Logo and Model Info */}
      <div className="flex items-center gap-4">
        {/* Sidebar toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <Sidebar className="w-4 h-4 text-gray-600" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
        </div>

        {/* Model Card */}
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Robot className="w-4 h-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {getModelDisplayName(selectedModel)}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Circle 
                  className={cn(
                    'w-2 h-2 fill-current',
                    getStatusColor(modelStatus)
                  )} 
                />
                <span className="text-gray-500">
                  {getStatusText(modelStatus, isLoading)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Stats and Actions */}
      <div className="flex items-center gap-6">
        {/* Chat Statistics */}
        {(messageCount > 0 || responseTime > 0) && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span>Messages:</span>
              <NumberTicker 
                value={messageCount} 
                className="font-mono text-blue-600 font-medium"
              />
            </div>
            {responseTime > 0 && (
              <div className="flex items-center gap-1">
                <span>Response:</span>
                <NumberTicker 
                  value={responseTime} 
                  suffix="ms"
                  className="font-mono text-blue-600 font-medium"
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Memory Toggle */}
          {memoryEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMemory}
              className={cn(
                'h-8 px-3 rounded-lg transition-all duration-200',
                memoryContextCount > 0
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
              title={
                memoryContextCount > 0 
                  ? `Memory active (${memoryContextCount} chunks)` 
                  : 'Enable memory context'
              }
            >
              <Brain className="w-4 h-4 mr-1.5" />
              {memoryContextCount > 0 ? (
                <>
                  Memory
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0.5">
                    {memoryContextCount}
                  </Badge>
                </>
              ) : (
                'Memory'
              )}
            </Button>
          )}

          {/* Clear Chat */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearChat}
            disabled={!hasMessages}
            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Clear chat history"
          >
            <ArrowsClockwise className="w-4 h-4 text-gray-600" />
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
            title="Open settings"
          >
            <Gear className="w-4 h-4 text-gray-600" />
          </Button>
        </div>
      </div>
    </div>
  )
}
