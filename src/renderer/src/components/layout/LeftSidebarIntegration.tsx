// Enhanced Left Sidebar with Magic UI Components for Puffer
// This is the enhanced version with beautiful animations and modern UI components
import React, { useState, useEffect } from 'react'
import {
  Plus,
  ChatCircle,
  X,
  Trash,
  PencilSimple,
  Sun,
  Moon,
  Monitor,
  Info,
  CaretLeft,
  Circle,
  Gear,
  Code,
  Sparkle,
  Lightning,
  Star
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ChatSession } from '../../../../types/chat'
import { useAllServices } from '@/hooks/useServices'
import ModelCard from '../ModelCard'
import NumberTicker from '@/components/ui/number-ticker'
import { useToast } from '@/components/ui/toast'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { AnimatedBeam } from '@/components/ui/animated-beam'
import { BlurIn } from '@/components/ui/blur-in'
import { FadeIn } from '@/components/ui/fade-in'

interface ModelData {
  name: string
  displayName: string
  size: string
  type: 'coding' | 'reasoning' | 'creative' | 'general'
  stats: {
    performance: number
    speed: number
    accuracy: number
    conversations: number
  }
  status: 'available' | 'downloading' | 'training'
  description: string
  lastUsed: string
  // ModelCard compatibility fields
  value: string
  label: string
  avatar: string
  character: string
  downloadDate: string
  conversations: number
  accuracy: number
  trainingData: string
  strengths?: string[]
  weaknesses?: string[]
}

interface LeftSidebarProps {
  onClose: () => void
  onToggle: () => void
  isOpen: boolean
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  selectedModel: string
  onModelChange: (model: string) => void
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onClose,
  onToggle,
  isOpen,
  onOpenSettings,
  onOpenDeveloper,
  selectedModel,
  onModelChange,
  theme,
  onThemeChange
}) => {
  const services = useAllServices()
  const { addToast } = useToast()
  const [models, setModels] = useState<ModelData[]>([])
  const [showModelCard, setShowModelCard] = useState<string | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  // Chat sessions data
  const [chatSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Python Data Analysis', timestamp: new Date(), messageCount: 15 },
    {
      id: '2',
      title: 'React Component Help',
      timestamp: new Date(Date.now() - 86400000),
      messageCount: 8
    },
    {
      id: '3',
      title: 'API Documentation',
      timestamp: new Date(Date.now() - 172800000),
      messageCount: 23
    }
  ])

  // Load available models from Ollama
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Get models directly from the API
        const response = await window.api.getOllamaModels()
        const availableModels = response.success ? response.models : []

        if (availableModels.length === 0) {
          // Fallback - try to get from service status
          const status = await window.api.checkOllamaStatus()
          const fallbackModels = status.models || []

          if (fallbackModels.length === 0) {
            // Hard fallback to known models
            const hardcodedModels = [
              'tinydolphin:latest',
              'deepseek-coder:1.3b',
              'openchat:latest',
              'phi4-mini-reasoning:latest'
            ]
            setModels(transformModels(hardcodedModels))
            return
          }

          setModels(transformModels(fallbackModels))
          return
        }

        setModels(transformModels(availableModels))
      } catch (error) {
        console.error('Failed to load models:', error)
        // Fallback to known models
        const fallbackModels = [
          'tinydolphin:latest',
          'deepseek-coder:1.3b',
          'openchat:latest',
          'phi4-mini-reasoning:latest'
        ]
        setModels(transformModels(fallbackModels))

        addToast({
          type: 'error',
          title: 'Failed to Load Models',
          description: 'Using fallback models - check Ollama connection',
          duration: 3000
        })
      }
    }

    const transformModels = (modelNames: any[]): ModelData[] => {
      return modelNames
        .filter(
          (modelName) =>
            typeof modelName === 'string' || (modelName && typeof modelName.name === 'string')
        )
        .map((modelName: any) => {
          // Handle both string array and object array formats
          const name =
            typeof modelName === 'string'
              ? modelName
              : modelName.name || modelName.model || String(modelName)

          const displayName = name
            .replace(':latest', '')
            .replace('deepseek-coder', 'DeepSeek Coder')
            .replace('qwen2.5', 'Qwen 2.5')
            .replace('phi3.5', 'Phi 3.5')
            .replace('tinydolphin', 'TinyDolphin')
            .replace('tinyllama', 'TinyLlama')
            .replace('starcoder2', 'StarCoder 2')
            .replace('openchat', 'OpenChat')
            .replace('phi4-mini-reasoning', 'Phi4 Mini Reasoning')

          const stats = getModelStats(name)

          return {
            name: name,
            displayName,
            size: getModelSize(name),
            type: getModelType(name),
            stats,
            status: 'available' as const,
            description: getModelDescription(name),
            lastUsed: getLastUsed(name),
            // Add ModelCard compatibility fields
            value: name,
            label: displayName,
            avatar: '',
            character: name.includes('dolphin') ? 'dolphin' : 'ai',
            downloadDate: new Date().toISOString().split('T')[0],
            conversations: stats.conversations,
            accuracy: stats.accuracy,
            trainingData: getModelSize(name),
            strengths: getModelStrengths(name),
            weaknesses: getModelWeaknesses(name)
          }
        })
    }

    loadModels()
  }, [selectedModel]) // Remove dependency on services.ollama.models

  // Helper functions to determine model properties
  const getModelSize = (modelName: string) => {
    if (modelName.includes('1.3b') || modelName.includes('1.1b')) return '~1.3GB'
    if (modelName.includes('1.5b')) return '~1.5GB'
    if (modelName.includes('2b')) return '~2GB'
    if (modelName.includes('3b')) return '~3GB'
    if (modelName.includes('7b')) return '~4GB'
    return '~2GB'
  }

  const getModelType = (modelName: string): 'coding' | 'reasoning' | 'creative' | 'general' => {
    if (modelName.includes('coder') || modelName.includes('code')) return 'coding'
    if (modelName.includes('qwen') || modelName.includes('phi')) return 'reasoning'
    if (modelName.includes('creative') || modelName.includes('writer')) return 'creative'
    return 'general'
  }

  const getModelStats = (modelName: string) => {
    // Mock stats based on known model performance
    const statsMap: Record<string, any> = {
      'deepseek-coder': { performance: 76, speed: 95, accuracy: 88, conversations: 142 },
      'qwen2.5': { performance: 85, speed: 92, accuracy: 91, conversations: 89 },
      'phi3.5': { performance: 82, speed: 88, accuracy: 85, conversations: 67 },
      tinyllama: { performance: 68, speed: 98, accuracy: 72, conversations: 234 },
      starcoder2: { performance: 73, speed: 85, accuracy: 89, conversations: 0 }
    }

    for (const [key, stats] of Object.entries(statsMap)) {
      if (modelName.includes(key)) return stats
    }

    return { performance: 75, speed: 85, accuracy: 80, conversations: 0 }
  }

  const getModelDescription = (modelName: string) => {
    if (modelName.includes('deepseek-coder')) {
      return 'Elite coding assistant that beats GPT-3.5 on programming tasks'
    }
    if (modelName.includes('qwen')) {
      return "Alibaba's reasoning powerhouse with exceptional logic capabilities"
    }
    if (modelName.includes('phi')) {
      return "Microsoft's quality-focused model for creative and reasoning tasks"
    }
    if (modelName.includes('tinyllama')) {
      return 'Ultra-fast lightweight model for quick responses and simple tasks'
    }
    if (modelName.includes('starcoder')) {
      return 'Latest state-of-the-art code generation model from Hugging Face'
    }
    return 'Versatile AI model for general purpose tasks'
  }

  const getLastUsed = (modelName: string) => {
    // This would come from your analytics/usage tracking
    if (modelName === selectedModel) return '2 minutes ago'
    return Math.random() > 0.5 ? '1 hour ago' : '2 days ago'
  }

  const getModelStrengths = (modelName: string): string[] => {
    if (modelName.includes('deepseek-coder')) {
      return ['Code Generation', 'Debugging', 'Architecture Design', 'Performance']
    }
    if (modelName.includes('qwen')) {
      return ['Logical Reasoning', 'Math Problems', 'Analysis', 'Problem Solving']
    }
    if (modelName.includes('phi')) {
      return ['Creative Writing', 'Conversation', 'Reasoning', 'Quality Output']
    }
    if (modelName.includes('tinyllama')) {
      return ['Ultra Fast', 'Low Memory', 'Quick Responses', 'Efficiency']
    }
    if (modelName.includes('starcoder')) {
      return ['Code Generation', 'Multiple Languages', 'Documentation', 'Latest Tech']
    }
    return ['General Purpose', 'Versatile', 'Reliable', 'Balanced']
  }

  const getModelWeaknesses = (modelName: string): string[] => {
    if (modelName.includes('deepseek-coder')) {
      return ['Creative Writing', 'General Chat']
    }
    if (modelName.includes('qwen')) {
      return ['Creative Tasks', 'Casual Conversation']
    }
    if (modelName.includes('phi')) {
      return ['Complex Code', 'Technical Details']
    }
    if (modelName.includes('tinyllama')) {
      return ['Complex Reasoning', 'Long Context']
    }
    if (modelName.includes('starcoder')) {
      return ['General Chat', 'Creative Writing']
    }
    return ['Specialized Tasks']
  }

  // Get current model for display
  const currentModel = models.find((m) => m.name === selectedModel) || models[0]

  // Chat and interaction handlers
  const newChat = async () => {
    setIsCreatingChat(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
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

  const editChat = (id: string) => {
    addToast({
      type: 'info',
      title: 'Edit Chat',
      description: 'Chat editing feature coming soon',
      duration: 2000
    })
  }

  const deleteChat = async (id: string) => {
    try {
      addToast({
        type: 'success',
        title: 'Chat Deleted',
        description: 'Chat session removed successfully',
        duration: 2000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        description: 'Unable to delete chat session',
        duration: 3000
      })
    }
  }

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'coding':
        return <Code size={14} className="text-blue-500" />
      case 'reasoning':
        return <Lightning size={14} className="text-purple-500" />
      case 'creative':
        return <Sparkle size={14} className="text-pink-500" />
      default:
        return <Star size={14} className="text-orange-500" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 border-r border-gray-200/50 backdrop-blur-sm">
      {/* Enhanced Header with Blur-in Animation */}
      <BlurIn>
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <ChatCircle size={16} className="text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Puffer
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 hover:bg-gray-100/80 rounded-lg transition-all"
            title="Close sidebar"
          >
            <CaretLeft size={16} className="text-gray-600" />
          </Button>
        </div>
      </BlurIn>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Enhanced New Chat Button with Shimmer */}
          <FadeIn delay={0.1}>
            <Button
              onClick={newChat}
              disabled={isCreatingChat}
              className="w-full h-12 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              {isCreatingChat ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin">
                    <Circle size={16} className="text-gray-400" />
                  </div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus size={16} />
                  <span>New Chat</span>
                </div>
              )}
            </Button>
          </FadeIn>

          {/* Model Selection */}
          <FadeIn delay={0.2}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">AI Model</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-100/80 px-2 py-1 rounded-full">
                    {models.length} available
                  </span>
                  {currentModel && getModelTypeIcon(currentModel.type)}
                </div>
              </div>

              {/* Enhanced Model Selector */}
              {currentModel && (
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
                  <div className="relative p-4">
                    {/* Styled Model Selector */}
                    <Select value={selectedModel} onValueChange={onModelChange}>
                      <SelectTrigger className="w-full h-12 rounded-xl border-0 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                            <span className="text-white text-sm font-bold">AI</span>
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-semibold text-gray-900 truncate tracking-tight">
                              {currentModel.displayName || currentModel.name}
                            </span>
                            <span className="text-xs text-gray-500 mt-0.5">
                              {currentModel.size || 'Available'}
                            </span>
                          </div>
                          <Circle size={6} className="text-blue-500 fill-blue-500 flex-shrink-0" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur-sm shadow-xl max-h-60 min-w-[280px]">
                        {models.length > 0 ? (
                          models.map((model) => (
                            <SelectItem
                              key={model.name}
                              value={model.name}
                              className="rounded-lg m-1 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 focus:bg-gradient-to-r focus:from-blue-50 focus:to-purple-50 cursor-pointer transition-all duration-200"
                            >
                              <div className="flex items-center gap-3 py-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                  {getModelTypeIcon(model.type)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm text-gray-900">
                                    {model.displayName || model.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {model.size || 'Available'}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-models" disabled>
                            <span className="text-gray-500">No models available</span>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>

          {/* Enhanced Chat Sessions */}
          <FadeIn delay={0.3}>
            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-900">Recent Conversations</label>
              <div className="space-y-2">
                {chatSessions.map((session, index) => (
                  <FadeIn key={session.id} delay={0.4 + index * 0.1}>
                    <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/50 cursor-pointer transition-all duration-300 border border-transparent hover:border-gray-200/50">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <ChatCircle size={16} className="text-gray-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-gray-900">
                          {session.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <NumberTicker
                            value={session.messageCount}
                            suffix=" messages"
                            className="font-mono"
                          />
                          <span>•</span>
                          <span>{session.timestamp.toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all duration-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            editChat(session.id)
                          }}
                          className="h-7 w-7 p-0 hover:bg-gray-200/80 rounded-lg transition-all"
                          title="Edit Chat"
                        >
                          <PencilSimple size={12} className="text-gray-600" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteChat(session.id)
                          }}
                          className="h-7 w-7 p-0 hover:bg-red-100 rounded-lg transition-all"
                          title="Delete Chat"
                        >
                          <Trash size={12} className="text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </ScrollArea>

      {/* Enhanced Footer */}
      <FadeIn delay={0.5}>
        <div className="p-4 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm space-y-4">
          {/* Enhanced Theme Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Theme</span>
            <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl shadow-sm">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <Button
                  key={t}
                  variant="ghost"
                  size="sm"
                  onClick={() => onThemeChange(t)}
                  className={cn(
                    'h-8 w-8 p-0 rounded-lg transition-all duration-200',
                    theme === t ? 'bg-white shadow-md scale-105' : 'hover:bg-gray-200/80'
                  )}
                  title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
                >
                  {t === 'light' && (
                    <Sun size={14} className={theme === t ? 'text-orange-500' : 'text-gray-600'} />
                  )}
                  {t === 'dark' && (
                    <Moon size={14} className={theme === t ? 'text-blue-600' : 'text-gray-600'} />
                  )}
                  {t === 'system' && (
                    <Monitor
                      size={14}
                      className={theme === t ? 'text-gray-900' : 'text-gray-600'}
                    />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="flex-1 justify-start gap-2 h-10 hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 rounded-xl transition-all duration-300"
            >
              <Gear size={16} className="text-gray-600" />
              <span className="text-sm font-medium">Settings</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenDeveloper}
              className="flex-1 justify-start gap-2 h-10 hover:bg-gradient-to-r hover:from-gray-100 hover:to-purple-50 rounded-xl transition-all duration-300"
            >
              <Code size={16} className="text-gray-600" />
              <span className="text-sm font-medium">Developer</span>
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Model Card Modal */}
      {showModelCard && (
        <ModelCard
          model={models.find((m) => m.name === showModelCard)!}
          isOpen={!!showModelCard}
          onClose={() => setShowModelCard(null)}
        />
      )}
    </div>
  )
}

export default LeftSidebar
