import React, { useState, useEffect } from 'react'
import {
  Brain,
  Plus,
  MagnifyingGlass as Search, // Fixed: Search → MagnifyingGlass
  Funnel as Filter, // Fixed: Filter → Funnel
  Trash,
  PencilSimple as Edit, // Fixed: Edit → PencilSimple
  Eye,
  Clock,
  Hash,
  Tag,
  BookOpen,
  Database,
  Warning as AlertTriangle, // Fixed: AlertTriangle → Warning
  CheckCircle,
  X,
  Calendar,
  ChartBar as BarChart // Fixed: BarChart → ChartBar
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface MemoryChunk {
  id: string
  summary: string
  content: string
  topics: string[]
  keyFacts: string[]
  source: 'chat' | 'file' | 'manual' | 'import'
  created_at: string
  last_accessed: string
  access_count: number
  relevance_score: number
  metadata: {
    model?: string
    conversation_id?: string
    file_name?: string
    tags?: string[]
    size: number
  }
}

interface MemoryStats {
  total_chunks: number
  total_size: number
  avg_relevance: number
  most_accessed: MemoryChunk | null
  recent_activity: Array<{
    action: 'created' | 'accessed' | 'updated' | 'deleted'
    chunk_id: string
    timestamp: string
  }>
}

interface MemoryManagerPanelProps {
  className?: string
}

const MemoryManagerPanel: React.FC<MemoryManagerPanelProps> = ({ className }) => {
  const [memoryChunks, setMemoryChunks] = useState<MemoryChunk[]>([])
  const [filteredChunks, setFilteredChunks] = useState<MemoryChunk[]>([])
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [selectedChunk, setSelectedChunk] = useState<MemoryChunk | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingChunk, setEditingChunk] = useState<MemoryChunk | null>(null)

  // New memory form state
  const [newMemory, setNewMemory] = useState({
    summary: '',
    content: '',
    topics: [] as string[],
    keyFacts: [] as string[],
    tags: [] as string[]
  })

  // Load real memory data from backend
  useEffect(() => {
    loadMemoryData()
  }, [])

  const loadMemoryData = async () => {
    setLoading(true)
    try {
      // BACKEND EXISTS - activate these calls
      const chunks = await window.api.getMemoryChunks()
      setMemoryChunks(chunks)
      setFilteredChunks(chunks)

      const stats = await window.api.getMemoryStats()
      setMemoryStats(stats)

      console.log('✅ Loaded memory data:', chunks.length, 'chunks')
    } catch (error) {
      console.error('❌ Failed to load memory data:', error)
      // Fallback to empty state
      setMemoryChunks([])
      setFilteredChunks([])
    } finally {
      setLoading(false)
    }
  }

  // Load mock data for demo
  useEffect(() => {
    const mockChunks: MemoryChunk[] = [
      {
        id: 'mem-001',
        summary: 'React component architecture discussion',
        content:
          'Detailed conversation about implementing React components with TypeScript, focusing on proper typing and state management patterns.',
        topics: ['React', 'TypeScript', 'Components', 'State Management'],
        keyFacts: [
          'Use TypeScript interfaces for prop types',
          'Prefer functional components with hooks',
          'Implement proper error boundaries'
        ],
        source: 'chat',
        created_at: '2024-01-20T10:30:00Z',
        last_accessed: '2024-01-20T14:22:00Z',
        access_count: 8,
        relevance_score: 0.92,
        metadata: {
          model: 'openchat:latest',
          conversation_id: 'conv-123',
          tags: ['development', 'frontend'],
          size: 1250
        }
      },
      {
        id: 'mem-002',
        summary: 'API integration best practices',
        content:
          'Documentation and examples for integrating external APIs with error handling, retry logic, and proper authentication.',
        topics: ['API', 'Integration', 'Error Handling', 'Authentication'],
        keyFacts: [
          'Always implement retry logic with exponential backoff',
          'Use secure token storage',
          'Validate all API responses'
        ],
        source: 'file',
        created_at: '2024-01-19T16:45:00Z',
        last_accessed: '2024-01-20T12:15:00Z',
        access_count: 15,
        relevance_score: 0.88,
        metadata: {
          file_name: 'api-guide.md',
          tags: ['backend', 'security'],
          size: 2800
        }
      },
      {
        id: 'mem-003',
        summary: 'Database optimization techniques',
        content:
          'Collection of database optimization strategies including indexing, query optimization, and performance monitoring.',
        topics: ['Database', 'Performance', 'Optimization', 'Indexing'],
        keyFacts: [
          'Index frequently queried columns',
          'Use EXPLAIN to analyze query plans',
          'Monitor slow query logs'
        ],
        source: 'manual',
        created_at: '2024-01-18T09:20:00Z',
        last_accessed: '2024-01-19T11:30:00Z',
        access_count: 23,
        relevance_score: 0.95,
        metadata: {
          tags: ['database', 'performance'],
          size: 3400
        }
      },
      {
        id: 'mem-004',
        summary: 'UI/UX design principles',
        content:
          'Core principles for designing user interfaces including accessibility, usability, and visual hierarchy.',
        topics: ['UI', 'UX', 'Design', 'Accessibility'],
        keyFacts: [
          'Follow WCAG accessibility guidelines',
          'Maintain consistent visual hierarchy',
          'Use color purposefully'
        ],
        source: 'import',
        created_at: '2024-01-17T14:10:00Z',
        last_accessed: '2024-01-18T16:45:00Z',
        access_count: 12,
        relevance_score: 0.76,
        metadata: {
          tags: ['design', 'frontend'],
          size: 1890
        }
      }
    ]

    const mockStats: MemoryStats = {
      total_chunks: mockChunks.length,
      total_size: mockChunks.reduce((sum, chunk) => sum + chunk.metadata.size, 0),
      avg_relevance:
        mockChunks.reduce((sum, chunk) => sum + chunk.relevance_score, 0) / mockChunks.length,
      most_accessed: mockChunks.reduce((prev, current) =>
        current.access_count > prev.access_count ? current : prev
      ),
      recent_activity: [
        { action: 'accessed', chunk_id: 'mem-001', timestamp: '2024-01-20T14:22:00Z' },
        { action: 'created', chunk_id: 'mem-001', timestamp: '2024-01-20T10:30:00Z' },
        { action: 'accessed', chunk_id: 'mem-002', timestamp: '2024-01-20T12:15:00Z' },
        { action: 'updated', chunk_id: 'mem-003', timestamp: '2024-01-19T11:30:00Z' }
      ]
    }

    setMemoryChunks(mockChunks)
    setFilteredChunks(mockChunks)
    setMemoryStats(mockStats)
  }, [])

  // Filter logic
  useEffect(() => {
    let filtered = memoryChunks

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (chunk) =>
          chunk.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chunk.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chunk.topics.some((topic) => topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
          chunk.keyFacts.some((fact) => fact.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((chunk) => chunk.source === sourceFilter)
    }

    // Topic filter
    if (topicFilter !== 'all') {
      filtered = filtered.filter((chunk) =>
        chunk.topics.some((topic) => topic.toLowerCase() === topicFilter.toLowerCase())
      )
    }

    setFilteredChunks(filtered)
  }, [memoryChunks, searchQuery, sourceFilter, topicFilter])

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Recently'
  }

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)}${units[unitIndex]}`
  }

  const getSourceIcon = (source: MemoryChunk['source']) => {
    switch (source) {
      case 'chat':
        return <Brain size={14} className="text-blue-500" />
      case 'file':
        return <BookOpen size={14} className="text-green-500" />
      case 'manual':
        return <Edit size={14} className="text-purple-500" />
      case 'import':
        return <Database size={14} className="text-orange-500" />
    }
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleCreateMemory = async () => {
    try {
      const newChunk: MemoryChunk = {
        id: `mem-${Date.now()}`,
        summary: newMemory.summary,
        content: newMemory.content,
        topics: newMemory.topics,
        keyFacts: newMemory.keyFacts,
        source: 'manual',
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 0,
        relevance_score: 1.0,
        metadata: {
          tags: newMemory.tags,
          size: newMemory.content.length
        }
      }

      setMemoryChunks((prev) => [newChunk, ...prev])
      setIsCreateDialogOpen(false)

      // Reset form
      setNewMemory({
        summary: '',
        content: '',
        topics: [],
        keyFacts: [],
        tags: []
      })
    } catch (error) {
      console.error('Failed to create memory:', error)
    }
  }

  const handleEditMemory = async () => {
    if (!editingChunk) return

    try {
      const updatedChunk: MemoryChunk = {
        ...editingChunk,
        summary: newMemory.summary,
        content: newMemory.content,
        topics: newMemory.topics,
        keyFacts: newMemory.keyFacts,
        metadata: {
          ...editingChunk.metadata,
          tags: newMemory.tags,
          size: newMemory.content.length
        }
      }

      setMemoryChunks((prev) =>
        prev.map((chunk) => (chunk.id === editingChunk.id ? updatedChunk : chunk))
      )

      setIsEditDialogOpen(false)
      setEditingChunk(null)
    } catch (error) {
      console.error('Failed to update memory:', error)
    }
  }

  const handleDeleteMemory = (chunkId: string) => {
    setMemoryChunks((prev) => prev.filter((chunk) => chunk.id !== chunkId))
  }

  const openEditDialog = (chunk: MemoryChunk) => {
    setEditingChunk(chunk)
    setNewMemory({
      summary: chunk.summary,
      content: chunk.content,
      topics: chunk.topics,
      keyFacts: chunk.keyFacts,
      tags: chunk.metadata.tags || []
    })
    setIsEditDialogOpen(true)
  }

  const allTopics = Array.from(new Set(memoryChunks.flatMap((chunk) => chunk.topics)))

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center">
            <Brain size={20} className="mr-2" />
            Memory Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage AI memory chunks and knowledge base
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Add Memory
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Stats Overview */}
      {memoryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Hash size={16} className="text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{memoryStats.total_chunks}</div>
                  <div className="text-xs text-muted-foreground">Memory Chunks</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database size={16} className="text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{formatSize(memoryStats.total_size)}</div>
                  <div className="text-xs text-muted-foreground">Total Size</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart size={16} className="text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">
                    {(memoryStats.avg_relevance * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Relevance</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{memoryStats.recent_activity.length}</div>
                  <div className="text-xs text-muted-foreground">Recent Actions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search memories, topics, or key facts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="file">File</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="import">Import</SelectItem>
            </SelectContent>
          </Select>

          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {allTopics.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Memory List */}
      {filteredChunks.length === 0 ? (
        <div className="text-center py-12">
          <Brain size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-muted-foreground">No memories found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || sourceFilter !== 'all' || topicFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first memory entry'}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {filteredChunks.map((chunk) => (
              <Card key={chunk.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getSourceIcon(chunk.source)}
                        <CardTitle className="text-base">{chunk.summary}</CardTitle>
                        <Badge
                          variant="outline"
                          className={getRelevanceColor(chunk.relevance_score)}
                        >
                          {(chunk.relevance_score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{chunk.content}</p>
                    </div>

                    <div className="flex space-x-1 ml-4">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedChunk(chunk)}>
                        <Eye size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(chunk)}>
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMemory(chunk.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Topics */}
                  <div className="flex flex-wrap gap-1">
                    {chunk.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        <Tag size={10} className="mr-1" />
                        {topic}
                      </Badge>
                    ))}
                  </div>

                  {/* Key Facts */}
                  {chunk.keyFacts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Key Facts</h4>
                      <ul className="text-xs space-y-1">
                        {chunk.keyFacts.slice(0, 2).map((fact, index) => (
                          <li key={index} className="flex items-start space-x-1">
                            <CheckCircle
                              size={10}
                              className="text-green-500 mt-0.5 flex-shrink-0"
                            />
                            <span className="text-muted-foreground">{fact}</span>
                          </li>
                        ))}
                        {chunk.keyFacts.length > 2 && (
                          <li className="text-xs text-muted-foreground">
                            +{chunk.keyFacts.length - 2} more facts
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      <span>Created {formatRelativeTime(chunk.created_at)}</span>
                      <span>Accessed {chunk.access_count} times</span>
                      <span>{formatSize(chunk.metadata.size)}</span>
                    </div>
                    <span>Last accessed {formatRelativeTime(chunk.last_accessed)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Create/Edit Memory Dialog */}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreateDialogOpen ? 'Create New Memory' : 'Edit Memory'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="memory-summary">Summary</Label>
            <Input
              id="memory-summary"
              value={newMemory.summary}
              onChange={(e) => setNewMemory((prev) => ({ ...prev, summary: e.target.value }))}
              placeholder="Brief description of the memory"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="memory-content">Content</Label>
            <Textarea
              id="memory-content"
              value={newMemory.content}
              onChange={(e) => setNewMemory((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Detailed content of the memory"
              className="mt-1 min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Topics (comma-separated)</Label>
              <Input
                value={newMemory.topics.join(', ')}
                onChange={(e) =>
                  setNewMemory((prev) => ({
                    ...prev,
                    topics: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                  }))
                }
                placeholder="React, TypeScript, Components"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={newMemory.tags.join(', ')}
                onChange={(e) =>
                  setNewMemory((prev) => ({
                    ...prev,
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                  }))
                }
                placeholder="development, frontend, guide"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Key Facts (one per line)</Label>
            <Textarea
              value={newMemory.keyFacts.join('\n')}
              onChange={(e) =>
                setNewMemory((prev) => ({
                  ...prev,
                  keyFacts: e.target.value.split('\n').filter(Boolean)
                }))
              }
              placeholder="Important facts or takeaways (one per line)"
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setIsEditDialogOpen(false)
                setEditingChunk(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isCreateDialogOpen ? handleCreateMemory : handleEditMemory}
              disabled={!newMemory.summary || !newMemory.content}
            >
              {isCreateDialogOpen ? 'Create Memory' : 'Update Memory'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Memory Detail Dialog */}
      {selectedChunk && (
        <Dialog open={!!selectedChunk} onOpenChange={() => setSelectedChunk(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getSourceIcon(selectedChunk.source)}
                <span>{selectedChunk.summary}</span>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Full Content</h4>
                  <div className="p-4 bg-muted/30 rounded-lg text-sm">{selectedChunk.content}</div>
                </div>

                {selectedChunk.keyFacts.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Key Facts</h4>
                    <ul className="space-y-1">
                      {selectedChunk.keyFacts.map((fact, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Source:</span>
                    <span className="ml-2 capitalize">{selectedChunk.source}</span>
                  </div>
                  <div>
                    <span className="font-medium">Size:</span>
                    <span className="ml-2">{formatSize(selectedChunk.metadata.size)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <span className="ml-2">
                      {new Date(selectedChunk.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Last Accessed:</span>
                    <span className="ml-2">
                      {new Date(selectedChunk.last_accessed).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Topics</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedChunk.topics.map((topic) => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedChunk.metadata.tags && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedChunk.metadata.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{selectedChunk.access_count}</div>
                        <div className="text-xs text-muted-foreground">Times Accessed</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {(selectedChunk.relevance_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Relevance Score</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Relevance Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Content Quality</span>
                      <span>{(selectedChunk.relevance_score * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={selectedChunk.relevance_score * 100} className="h-2" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default MemoryManagerPanel
