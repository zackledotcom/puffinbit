import React, { useState } from 'react'
import {
  Plus,
  ChatCircle,
  X,
  Trash,
  PencilSimple,
  Sun,
  Moon,
  Monitor,
  Circle,
  Robot,
  Lightning,
  Code,
  Gear
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ChatSession } from '@/types/chat'
import { useAllServices } from '@/hooks/useServices'
import { useToast } from '@/components/ui/toast'

interface OptimizedSidebarProps {
  onClose: () => void
  selectedModel: string
  onModelChange: (model: string) => void
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  onNewChat: () => void
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  modelStatus: 'connected' | 'disconnected' | 'loading'
}

const OptimizedSidebar: React.FC<OptimizedSidebarProps> = ({
  onClose,
  selectedModel,
  onModelChange,
  theme,
  onThemeChange,
  onNewChat,
  onOpenSettings,
  onOpenDeveloper,
  modelStatus
}) => {
  const services = useAllServices()
  const { addToast } = useToast()
  
  const [chatSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Python Data Analysis', timestamp: new Date(), messageCount: 15 },
    { id: '2', title: 'React Component Help', timestamp: new Date(Date.now() - 86400000), messageCount: 8 },
    { id: '3', title: 'API Documentation', timestamp: new Date(Date.now() - 172800000), messageCount: 23 },
  ])

  const availableModels = services.ollama.models || []
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  const formatModelName = (modelName: string) => {
    return modelName
      .replace(':latest', '')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('phi4-mini-reasoning', 'Phi4 Mini')
      .replace('deepseek-coder', 'DeepSeek Coder')
  }

  const getModelStats = (modelName: string) => {
    // Mock stats - replace with real data from analytics service
    return {
      conversations: Math.floor(Math.random() * 50) + 10,
      accuracy: Math.floor(Math.random() * 20) + 80,
      avgResponseTime: Math.floor(Math.random() * 1000) + 500
    }
  }

  const handleNewChat = async () => {
    setIsCreatingChat(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      onNewChat()
      addToast({
        type: 'success',
        title: 'New Chat Created',
        description: 'Ready for your next conversation',
        duration: 2000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Chat Creation Failed',
        description: 'Unable to create new chat session',
        duration: 3000
      })
    } finally {
      setIsCreatingChat(false)
    }
  }

  const handleChatAction = (action: string, chatId: string) => {
    addToast({
      type: 'info',
      title: `${action} Chat`,
      description: 'Feature coming soon',
      duration: 2000
    })
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500 fill-green-500'
      case 'loading': return 'text-yellow-500 fill-yellow-500'
      case 'disconnected': return 'text-red-500 fill-red-500'
      default: return 'text-gray-500 fill-gray-500'
    }
  }

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Chat Assistant</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
          title="Close sidebar"
        >
          <X className="w-4 h-4 text-gray-600" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Active Model Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Robot className="w-4 h-4" />
              Active Model
            </h3>
            
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Circle className={cn('w-2 h-2', getStatusColor(modelStatus))} />
                    <span className="text-sm font-medium text-gray-900">
                      {formatModelName(selectedModel)}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {modelStatus === 'connected' ? 'Ready' : 'Offline'}
                  </Badge>
                </div>
                
                {modelStatus === 'connected' && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">{getModelStats(selectedModel).conversations}</span>
                      <div>Conversations</div>
                    </div>
                    <div>
                      <span className="font-medium">{getModelStats(selectedModel).avgResponseTime}ms</span>
                      <div>Avg Response</div>
                    </div>
                  </div>
                )}
                
                <Select value={selectedModel} onValueChange={onModelChange}>
                  <SelectTrigger className="w-full mt-2 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model: string) => (
                      <SelectItem key={model} value={model}>
                        {formatModelName(model)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Recent Chats Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <ChatCircle className="w-4 h-4" />
                Recent Chats
              </h3>
              <Button
                onClick={handleNewChat}
                disabled={isCreatingChat}
                size="sm"
                className="h-7 px-3 text-xs bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isCreatingChat ? (
                  <>
                    <Circle className="w-3 h-3 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    New
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {chatSessions.map((session) => (
                <Card key={session.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {session.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{formatRelativeTime(session.timestamp)}</span>
                          <span>•</span>
                          <span>{session.messageCount} messages</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleChatAction('Edit', session.id)
                          }}
                          className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                          title="Edit Chat"
                        >
                          <PencilSimple className="w-3 h-3 text-gray-600" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleChatAction('Delete', session.id)
                          }}
                          className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                          title="Delete Chat"
                        >
                          <Trash className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Lightning className="w-4 h-4" />
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                className="h-8 text-xs justify-start"
              >
                <Gear className="w-3 h-3 mr-1.5" />
                Settings
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenDeveloper}
                className="h-8 text-xs justify-start"
              >
                <Code className="w-3 h-3 mr-1.5" />
                Developer
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer - Theme Toggle */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Theme</span>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Button
                key={t}
                variant="ghost"
                size="sm"
                onClick={() => onThemeChange(t)}
                className={cn(
                  "h-6 w-6 p-0 rounded transition-all",
                  theme === t
                    ? "bg-white shadow-sm"
                    : "hover:bg-gray-200"
                )}
                title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
              >
                {t === 'light' && <Sun className={cn("w-3 h-3", theme === t ? "text-orange-500" : "text-gray-600")} />}
                {t === 'dark' && <Moon className={cn("w-3 h-3", theme === t ? "text-blue-600" : "text-gray-600")} />}
                {t === 'system' && <Monitor className={cn("w-3 h-3", theme === t ? "text-purple-600" : "text-gray-600")} />}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          Puffer v1.0.0 • Privacy-first AI
        </div>
      </div>
    </div>
  )
}

export default OptimizedSidebar
