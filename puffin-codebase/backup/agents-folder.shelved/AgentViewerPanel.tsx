import React, { useState, useEffect } from 'react'
import { Robot, Play, Pause, Gear, // Changed from Settings
  Trash, Copy, Eye, Code, Database, Wrench, Circle, CheckCircle, Warning, X, Funnel, // Changed from Filter
  MagnifyingGlass, // Changed from Search
  Plus } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  description: string
  model: string
  status: 'active' | 'idle' | 'error' | 'disabled'
  skills: string[]
  tools: string[]
  created_at: string
  last_used: string
  usage_stats: {
    total_interactions: number
    success_rate: number
    avg_response_time: number
  }
  settings: {
    temperature: number
    max_tokens: number
  }
}

interface AgentViewerPanelProps {
  className?: string
  onAgentSelect?: (agent: Agent) => void
  onAgentEdit?: (agent: Agent) => void
  onAgentDelete?: (agentId: string) => void
  onAgentToggle?: (agentId: string, active: boolean) => void
}

const AgentViewerPanel: React.FC<AgentViewerPanelProps> = ({
  className,
  onAgentSelect,
  onAgentEdit,
  onAgentDelete,
  onAgentToggle
}) => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockAgents: Agent[] = [
      {
        id: 'agent-001',
        name: 'Code Helper',
        description: 'Specialized AI assistant for code review, debugging, and development tasks',
        model: 'deepseek-coder:1.3b',
        status: 'active',
        skills: ['Code Review', 'Debugging', 'Documentation', 'Testing'],
        tools: ['file.read', 'file.write', 'system.execute', 'chroma.query'],
        created_at: '2024-01-15T10:30:00Z',
        last_used: '2024-01-20T14:22:00Z',
        usage_stats: {
          total_interactions: 156,
          success_rate: 94.2,
          avg_response_time: 1250
        },
        settings: {
          temperature: 0.3,
          max_tokens: 2048
        }
      },
      {
        id: 'agent-002',
        name: 'Research Assistant',
        description: 'Data analysis and research specialist with advanced reasoning capabilities',
        model: 'phi4-mini-reasoning:latest',
        status: 'idle',
        skills: ['Data Analysis', 'Research', 'Summarization', 'Fact Checking'],
        tools: ['chroma.query', 'chroma.add', 'network.http', 'file.read'],
        created_at: '2024-01-10T09:15:00Z',
        last_used: '2024-01-19T16:45:00Z',
        usage_stats: {
          total_interactions: 89,
          success_rate: 97.8,
          avg_response_time: 1850
        },
        settings: {
          temperature: 0.7,
          max_tokens: 1536
        }
      },
      {
        id: 'agent-003',
        name: 'General Chat',
        description: 'Friendly conversational AI for general questions and creative tasks',
        model: 'openchat:latest',
        status: 'active',
        skills: ['Conversation', 'Creative Writing', 'Q&A', 'Brainstorming'],
        tools: ['chroma.query', 'network.http'],
        created_at: '2024-01-08T11:20:00Z',
        last_used: '2024-01-20T15:10:00Z',
        usage_stats: {
          total_interactions: 324,
          success_rate: 92.1,
          avg_response_time: 980
        },
        settings: {
          temperature: 0.8,
          max_tokens: 2048
        }
      },
      {
        id: 'agent-004',
        name: 'System Monitor',
        description: 'Specialized agent for system administration and monitoring tasks',
        model: 'tinydolphin:latest',
        status: 'error',
        skills: ['System Admin', 'Monitoring', 'Automation', 'Logs Analysis'],
        tools: ['system.execute', 'system.processes', 'file.read', 'network.ping'],
        created_at: '2024-01-12T13:45:00Z',
        last_used: '2024-01-18T12:30:00Z',
        usage_stats: {
          total_interactions: 45,
          success_rate: 88.9,
          avg_response_time: 750
        },
        settings: {
          temperature: 0.5,
          max_tokens: 1024
        }
      }
    ]

    setAgents(mockAgents)
    setFilteredAgents(mockAgents)
  }, [])

  // Filter and search logic
  useEffect(() => {
    let filtered = agents

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((agent) => agent.status === statusFilter)
    }

    // Model filter
    if (modelFilter !== 'all') {
      filtered = filtered.filter((agent) => agent.model === modelFilter)
    }

    setFilteredAgents(filtered)
  }, [agents, searchQuery, statusFilter, modelFilter])

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return <Circle size={8} className="fill-green-500 text-green-500" />
      case 'idle':
        return <Circle size={8} className="fill-yellow-500 text-yellow-500" />
      case 'error':
        return <Circle size={8} className="fill-red-500 text-red-500" />
      case 'disabled':
        return <Circle size={8} className="fill-gray-400 text-gray-400" />
    }
  }

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'idle':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'disabled':
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getSkillIcon = (skill: string) => {
    if (skill.toLowerCase().includes('code')) return <Code size={12} />
    if (skill.toLowerCase().includes('data')) return <Database size={12} />
    if (skill.toLowerCase().includes('system')) return <Wrench size={12} />
    return <Robot size={12} />
  }

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

  const handleAgentAction = (action: string, agent: Agent) => {
    switch (action) {
      case 'select':
        setSelectedAgent(agent.id)
        onAgentSelect?.(agent)
        break
      case 'edit':
        onAgentEdit?.(agent)
        break
      case 'delete':
        onAgentDelete?.(agent.id)
        break
      case 'toggle':
        const newStatus = agent.status === 'active' ? 'disabled' : 'active'
        onAgentToggle?.(agent.id, newStatus === 'active')
        // Update local state
        setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, status: newStatus } : a)))
        break
      case 'duplicate':
        // TODO: Implement agent duplication
        break
    }
  }

  const uniqueModels = Array.from(new Set(agents.map((agent) => agent.model)))

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agent Management</h2>
          <p className="text-sm text-muted-foreground">Manage and monitor your AI agents</p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {filteredAgents.length} of {agents.length} agents
          </Badge>
          <Button size="sm" variant="outline">
            <Plus size={16} className="mr-1" />
            New Agent
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search agents, skills, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {uniqueModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model.split(':')[0]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agents List */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <Robot size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-muted-foreground">No agents found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || statusFilter !== 'all' || modelFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first agent to get started'}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAgents.map((agent) => (
              <Card
                key={agent.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedAgent === agent.id && 'ring-2 ring-primary'
                )}
                onClick={() => handleAgentAction('select', agent)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Robot size={20} className="text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusIcon(agent.status)}
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getStatusColor(agent.status))}
                          >
                            {agent.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {agent.model.split(':')[0]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAgentAction('toggle', agent)
                        }}
                      >
                        {agent.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAgentAction('edit', agent)
                        }}
                      >
                        <Gear size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>

                  {/* Skills */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {agent.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {getSkillIcon(skill)}
                          <span className="ml-1">{skill}</span>
                        </Badge>
                      ))}
                      {agent.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{agent.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-medium">{agent.usage_stats.total_interactions}</div>
                      <div className="text-muted-foreground">Uses</div>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-medium">{agent.usage_stats.success_rate}%</div>
                      <div className="text-muted-foreground">Success</div>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-medium">{agent.usage_stats.avg_response_time}ms</div>
                      <div className="text-muted-foreground">Avg Time</div>
                    </div>
                  </div>

                  {/* Last Used */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last used {formatRelativeTime(agent.last_used)}</span>
                    <span>{agent.tools.length} tools</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Status Alert */}
      {agents.some((agent) => agent.status === 'error') && (
        <Alert>
          <Warning size={16} />
          <AlertDescription>
            Some agents have errors. Check their configurations and restart them if needed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default AgentViewerPanel
