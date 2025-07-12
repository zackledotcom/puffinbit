import React, { useState, useEffect } from 'react'
import {
  MagnifyingGlass,
  Funnel,
  Clock,
  Lightning,
  Brain,
  X,
  Check,
  ArrowRight,
  Star
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface ContextItem {
  id: string
  content: string
  summary: string
  relevance: number
  timestamp: string
  source: 'conversation' | 'memory' | 'file' | 'web'
  tokens: number
  selected: boolean
  type: 'recent' | 'relevant' | 'manual'
}

interface ContextSelectorProps {
  isOpen: boolean
  onClose: () => void
  onApplyContext: (context: ContextItem[]) => void
  currentMessage: string
  conversationHistory: any[]
  selectedModel: string
}

const ContextSelector: React.FC<ContextSelectorProps> = ({
  isOpen,
  onClose,
  onApplyContext,
  currentMessage,
  conversationHistory,
  selectedModel
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [filterSource, setFilterSource] = useState<string>('all')
  const [relevanceThreshold, setRelevanceThreshold] = useState([0.5])
  const [maxTokens, setMaxTokens] = useState([2000])
  const [smartMode, setSmartMode] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadContextItems()
    }
  }, [isOpen, currentMessage, searchQuery, filterSource])

  const loadContextItems = async () => {
    setIsSearching(true)
    try {
      const conversationContext = extractConversationContext()

      let memoryContext: ContextItem[] = []
      if (searchQuery || smartMode) {
        const searchTerm = searchQuery || currentMessage.substring(0, 100)
        try {
          const memoryResponse = await window.api.searchContext(searchTerm)

          if (memoryResponse.success) {
            memoryContext = memoryResponse.results.map((result: any, index: number) => ({
              id: `memory-${index}`,
              content: result.content || result.text || '',
              summary: result.summary || extractSummary(result.content || result.text || ''),
              relevance: result.relevance || result.score || 0.8,
              timestamp: result.timestamp || new Date().toISOString(),
              source: 'memory' as const,
              tokens: estimateTokens(result.content || result.text || ''),
              selected: false,
              type: 'relevant' as const
            }))
          }
        } catch (error) {
          console.warn('Memory search failed, using conversation only:', error)
        }
      }

      let allContext = [...conversationContext, ...memoryContext]

      if (filterSource !== 'all') {
        allContext = allContext.filter((item) => item.source === filterSource)
      }

      allContext = allContext.filter((item) => item.relevance >= relevanceThreshold[0])

      allContext.sort((a, b) => {
        if (a.type === 'recent' && b.type !== 'recent') return -1
        if (b.type === 'recent' && a.type !== 'recent') return 1
        return b.relevance - a.relevance
      })

      if (smartMode) {
        const autoSelected = new Set<string>()
        let totalTokens = 0

        for (const item of allContext) {
          if (totalTokens + item.tokens <= maxTokens[0] && autoSelected.size < 5) {
            autoSelected.add(item.id)
            totalTokens += item.tokens
          }
        }

        setSelectedItems(autoSelected)
      }

      setContextItems(allContext)
    } catch (error) {
      console.error('Context loading failed:', error)
      setContextItems(extractConversationContext())
    } finally {
      setIsSearching(false)
    }
  }

  const extractConversationContext = (): ContextItem[] => {
    return conversationHistory.slice(-10).map((msg, index) => ({
      id: `conv-${index}`,
      content: msg.content,
      summary: msg.content.substring(0, 100) + '...',
      relevance: 1.0 - index * 0.1,
      timestamp: msg.timestamp || new Date().toISOString(),
      source: 'conversation' as const,
      tokens: estimateTokens(msg.content),
      selected: false,
      type: index >= conversationHistory.length - 3 ? ('recent' as const) : ('relevant' as const)
    }))
  }

  const extractSummary = (content: string): string => {
    const sentences = content.split(/[.!?]+/)
    return sentences[0]?.substring(0, 120) + '...' || content.substring(0, 120) + '...'
  }

  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4)
  }

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const getSelectedTokenCount = () => {
    return contextItems
      .filter((item) => selectedItems.has(item.id))
      .reduce((total, item) => total + item.tokens, 0)
  }

  const handleApplyContext = () => {
    const selected = contextItems.filter((item) => selectedItems.has(item.id))
    onApplyContext(selected)
    onClose()
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'conversation':
        return '💬'
      case 'memory':
        return '🧠'
      case 'file':
        return '📄'
      case 'web':
        return '🌐'
      default:
        return '📝'
    }
  }

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.9) return 'text-green-600 bg-green-50'
    if (relevance >= 0.7) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Lightning className="text-purple-600" size={24} />
            <h2 className="text-xl font-semibold">Context Selector</h2>
            <Badge variant="outline">{contextItems.length} items</Badge>
            {selectedItems.size > 0 && (
              <Badge className="bg-blue-100 text-blue-800">
                {selectedItems.size} selected • {getSelectedTokenCount()} tokens
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 border-b space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                placeholder="Search context or let AI auto-select..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="conversation">Conversation</SelectItem>
                <SelectItem value="memory">Memory</SelectItem>
                <SelectItem value="file">Files</SelectItem>
                <SelectItem value="web">Web</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={smartMode} onCheckedChange={setSmartMode} />
                <span className="text-sm font-medium">Smart Auto-Select</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Relevance:</span>
                <div className="w-24">
                  <Slider
                    value={relevanceThreshold}
                    onValueChange={setRelevanceThreshold}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <span className="text-xs text-gray-500 w-12">
                  {Math.round(relevanceThreshold[0] * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Max Tokens:</span>
                <div className="w-24">
                  <Slider
                    value={maxTokens}
                    onValueChange={setMaxTokens}
                    max={4000}
                    min={500}
                    step={100}
                    className="w-full"
                  />
                </div>
                <span className="text-xs text-gray-500 w-12">{maxTokens[0]}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-3">
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-600">Finding relevant context...</p>
                </div>
              ) : contextItems.length === 0 ? (
                <div className="text-center py-12">
                  <Lightning className="mx-auto mb-2 text-gray-400" size={48} />
                  <p className="text-gray-600">No context items found</p>
                </div>
              ) : (
                contextItems.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedItems.has(item.id)
                        ? 'ring-2 ring-purple-500 bg-purple-50'
                        : 'hover:bg-gray-50',
                      item.type === 'recent' && 'border-blue-200 bg-blue-50/30'
                    )}
                    onClick={() => toggleItemSelection(item.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getSourceIcon(item.source)}</span>
                            <Badge
                              variant="secondary"
                              className={getRelevanceColor(item.relevance)}
                            >
                              {Math.round(item.relevance * 100)}% match
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {item.tokens} tokens
                            </Badge>
                            {item.type === 'recent' && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                <Clock size={10} className="mr-1" />
                                Recent
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500 capitalize">{item.source}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">{item.summary}</p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {item.content.substring(0, 150)}...
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          {selectedItems.has(item.id) && (
                            <Check className="text-purple-600" size={16} />
                          )}
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="rounded"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-6 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Select context to enhance your message. Smart mode auto-selects relevant items.
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyContext}
              disabled={selectedItems.size === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <ArrowRight size={16} className="mr-1" />
              Apply Context ({selectedItems.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContextSelector
