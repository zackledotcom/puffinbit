import React, { useState, useEffect } from 'react'
import { MagnifyingGlass, Brain, X, Database, Clock, Tag } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface MemoryChunk {
  id: string
  summary: string
  content: string
  topics: string[]
  keyFacts: string[]
  relevance: number
  timestamp: string
  source: 'chat' | 'file' | 'manual'
  selected: boolean
}

interface MemoryContextPanelProps {
  isOpen: boolean
  onClose: () => void
  onMemorySelect: (chunks: MemoryChunk[]) => void
  selectedModel: string
}

const MemoryContextPanel: React.FC<MemoryContextPanelProps> = ({
  isOpen,
  onClose,
  onMemorySelect,
  selectedModel
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [memoryChunks, setMemoryChunks] = useState<MemoryChunk[]>([])
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [autoMemory, setAutoMemory] = useState(true)
  const [maxContextLength, setMaxContextLength] = useState(3)

  // Load memory chunks
  useEffect(() => {
    if (isOpen) {
      loadMemoryChunks()
    }
  }, [isOpen, searchQuery])

  const loadMemoryChunks = async () => {
    setIsSearching(true)
    try {
      // Search memory using existing API
      const response = await window.api.searchContext(searchQuery || '*')

      if (response.success && response.results) {
        const chunks: MemoryChunk[] = response.results.map((result: any, index: number) => ({
          id: result.id || `chunk-${index}`,
          summary: result.summary || extractSummary(result.content),
          content: result.content || result.text || '',
          topics: result.topics || extractTopics(result.content),
          keyFacts: result.keyFacts || [],
          relevance: result.relevance || result.score || 0.8,
          timestamp: result.timestamp || new Date().toISOString(),
          source: result.source || 'chat',
          selected: false
        }))

        setMemoryChunks(chunks)
      } else {
        // Fallback mock data for development
        setMemoryChunks(generateMockMemory())
      }
    } catch (error) {
      console.error('Memory search failed:', error)
      setMemoryChunks(generateMockMemory())
    } finally {
      setIsSearching(false)
    }
  }

  const extractSummary = (content: string): string => {
    return content.split('\n')[0].substring(0, 100) + '...'
  }

  const extractTopics = (content: string): string[] => {
    const topics = []
    if (content.includes('React') || content.includes('component')) topics.push('React')
    if (content.includes('Python') || content.includes('def ')) topics.push('Python')
    if (content.includes('API') || content.includes('endpoint')) topics.push('API')
    if (content.includes('database') || content.includes('SQL')) topics.push('Database')
    return topics.slice(0, 3)
  }

  const generateMockMemory = (): MemoryChunk[] => [
    {
      id: 'mem-1',
      summary: 'React component state management discussion',
      content: 'Detailed conversation about useState and useEffect patterns in React components...',
      topics: ['React', 'State Management', 'Hooks'],
      keyFacts: [
        'useState for local state',
        'useEffect for side effects',
        'Custom hooks for reusability'
      ],
      relevance: 0.95,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      source: 'chat',
      selected: false
    },
    {
      id: 'mem-2',
      summary: 'API integration best practices',
      content: 'Discussion about REST API patterns, error handling, and async/await usage...',
      topics: ['API', 'JavaScript', 'Error Handling'],
      keyFacts: [
        'Use try-catch for async operations',
        'Implement retry logic',
        'Handle network timeouts'
      ],
      relevance: 0.87,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      source: 'chat',
      selected: false
    },
    {
      id: 'mem-3',
      summary: 'Database optimization techniques',
      content: 'PostgreSQL indexing strategies and query optimization methods...',
      topics: ['Database', 'PostgreSQL', 'Performance'],
      keyFacts: [
        'B-tree indexes for equality queries',
        'EXPLAIN ANALYZE for debugging',
        'Connection pooling'
      ],
      relevance: 0.82,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      source: 'chat',
      selected: false
    }
  ]

  const toggleChunkSelection = (chunkId: string) => {
    const newSelected = new Set(selectedChunks)
    if (newSelected.has(chunkId)) {
      newSelected.delete(chunkId)
    } else {
      newSelected.add(chunkId)
    }
    setSelectedChunks(newSelected)
  }

  const handleApplyMemory = () => {
    const selected = memoryChunks.filter((chunk) => selectedChunks.has(chunk.id))
    onMemorySelect(selected)
    onClose()
  }

  const getRelevanceColor = (relevance: number) => {
    if (relevance > 0.9) return 'bg-green-100 text-green-800'
    if (relevance > 0.8) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Brain className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold">Memory Context</h2>
            <Badge variant="outline">{memoryChunks.length} chunks</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b space-y-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <Input
              placeholder="Search memory context..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={autoMemory} onCheckedChange={setAutoMemory} />
                <span className="text-sm">Auto-select relevant context</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Max context:</span>
                <select
                  value={maxContextLength}
                  onChange={(e) => setMaxContextLength(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={1}>1 chunk</option>
                  <option value={3}>3 chunks</option>
                  <option value={5}>5 chunks</option>
                  <option value={10}>10 chunks</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">{selectedChunks.size} selected</div>
          </div>
        </div>

        {/* Memory Chunks */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-600">Searching memory...</p>
                </div>
              ) : memoryChunks.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="mx-auto mb-2 text-gray-400" size={48} />
                  <p className="text-gray-600">No memory chunks found</p>
                </div>
              ) : (
                memoryChunks.map((chunk) => (
                  <Card
                    key={chunk.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedChunks.has(chunk.id)
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    )}
                    onClick={() => toggleChunkSelection(chunk.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm font-medium">{chunk.summary}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getRelevanceColor(chunk.relevance)}>
                              {Math.round(chunk.relevance * 100)}% match
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} />
                              {new Date(chunk.timestamp).toLocaleDateString()}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {chunk.source}
                            </Badge>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedChunks.has(chunk.id)}
                          onChange={() => toggleChunkSelection(chunk.id)}
                          className="ml-3"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {chunk.content.substring(0, 200)}...
                      </p>
                      <div className="flex items-center gap-2">
                        {chunk.topics.map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs">
                            <Tag size={10} className="mr-1" />
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Select memory chunks to enhance your conversation with context
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApplyMemory} disabled={selectedChunks.size === 0}>
              Apply Context ({selectedChunks.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemoryContextPanel
