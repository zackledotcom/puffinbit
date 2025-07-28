import React from 'react'
import {
  Sidebar,
  Gear,
  Bug,
  Users,
  Brain,
  Code,
  FlowArrow,
  Activity,
  Robot,
  CaretDown
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'

interface AppHeaderProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onToggleSidebar: () => void
  sidebarOpen?: boolean
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  onOpenSystemStatus: () => void
  onOpenAgentManager: () => void
  onOpenAdvancedMemory: () => void
  onOpenModelTuning?: () => void
  onOpenCodeGenerator?: () => void
  onOpenWorkflowBuilder?: () => void
  onToggleCanvasMode?: () => void
  messageCount?: number
  isLoading?: boolean
  className?: string
}

const AppHeader: React.FC<AppHeaderProps> = ({
  selectedModel,
  onModelChange,
  onToggleSidebar,
  onOpenSettings,
  onOpenDeveloper,
  onOpenSystemStatus,
  onOpenAgentManager,
  onOpenAdvancedMemory,
  onOpenModelTuning,
  onOpenCodeGenerator,
  onOpenWorkflowBuilder,
  onToggleCanvasMode,
  messageCount = 0,
  isLoading = false,
  className
}) => {
  const services = useAllServices()
  const { ollama } = services

  const formatModelName = (model: string) => {
    return model
      .replace(':latest', '')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('phi4-mini-reasoning', 'Phi4 Mini')
      .replace('deepseek-coder', 'DeepSeek Coder')
  }

  return (
    <header
      className={cn(
        'flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200',
        className
      )}
    >
      {/* Left Section - Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <Sidebar size={16} />
        </Button>
      </div>

      {/* Center Section - Clean */}
      <div className="flex items-center gap-4">
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Thinking...</span>
          </div>
        )}
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Agent Manager Button - Direct Access */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAgentManager}
          className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
        >
          <Users size={16} />
          <span className="hidden sm:inline">Agents</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
              <Gear size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onOpenSettings}>
              <Gear size={14} className="mr-2" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onOpenSystemStatus}>
              <Activity size={14} className="mr-2" />
              System Status
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onOpenAgentManager}>
              <Users size={14} className="mr-2" />
              Agent Manager
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onOpenAdvancedMemory}>
              <Brain size={14} className="mr-2" />
              Memory
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {onOpenModelTuning && (
              <DropdownMenuItem onClick={onOpenModelTuning}>
                <Brain size={14} className="mr-2" />
                Model Tuning
              </DropdownMenuItem>
            )}

            {onOpenCodeGenerator && (
              <DropdownMenuItem onClick={onOpenCodeGenerator}>
                <Code size={14} className="mr-2" />
                Code Generator
              </DropdownMenuItem>
            )}

            {onOpenWorkflowBuilder && (
              <DropdownMenuItem onClick={onOpenWorkflowBuilder}>
                <FlowArrow size={14} className="mr-2" />
                Workflow Builder
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onOpenDeveloper}>
              <Bug size={14} className="mr-2" />
              Developer Tools
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default AppHeader
