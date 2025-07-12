import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  Robot,
  Plus,
  Pencil,
  Trash,
  Copy,
  Brain,
  Gear,
  CheckCircle,
  Warning,
  Crown,
  Users,
  Shield,
  Database,
  Code,
  Globe
} from 'phosphor-react'
import { useAllServices } from '@/hooks/useServices'

interface AgentManagerOverlayProps {
  isOpen: boolean
  onClose: () => void
}

const AVAILABLE_TOOLS = {
  'chroma.query': { name: 'Query Database', icon: Database, color: 'blue' },
  'chroma.add': { name: 'Add to Database', icon: Database, color: 'green' },
  'file.read': { name: 'Read Files', icon: Code, color: 'purple' },
  'file.write': { name: 'Write Files', icon: Code, color: 'orange' },
  'ollama.generate': { name: 'Generate Text', icon: Brain, color: 'indigo' },
  'ollama.summarize': { name: 'Summarize Content', icon: Brain, color: 'cyan' },
  'system.execute': { name: 'Execute Commands', icon: Shield, color: 'red' },
  'memory.search': { name: 'Search Memory', icon: Brain, color: 'yellow' },
  'network.request': { name: 'HTTP Requests', icon: Globe, color: 'teal' }
}

const AgentManagerOverlay: React.FC<AgentManagerOverlayProps> = ({ isOpen, onClose }) => {
  // Service integration
  const services = useAllServices()

  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model: 'ollama' as const,
    systemPrompt: '',
    memoryEnabled: true,
    tools: [] as string[]
  })

  // Load agents from backend when component opens
  useEffect(() => {
    if (isOpen) {
      loadAgents()
    }
  }, [isOpen])

  const loadAgents = async () => {
    setLoading(true)
    try {
      // Use the new Agent System APIs
      const result = await window.api.getAgentRegistry()
      if (result.success && result.registry) {
        const agentArray = Object.values(result.registry.agents)
        setAgents(agentArray)

        // Load active agent
        const activeResult = await window.api.getActiveAgent()
        if (activeResult.success && activeResult.agent) {
          setSelectedAgent(activeResult.agent)
        }
      } else {
        console.error('Failed to load agent registry:', result.error)
        setAgents([])
      }

      console.log('✅ Loaded agents from new system')
    } catch (error) {
      console.error('❌ Failed to load agents:', error)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      model: 'ollama',
      systemPrompt: '',
      memoryEnabled: true,
      tools: []
    })
  }

  const startCreating = () => {
    resetForm()
    setIsCreating(true)
    setIsEditing(false)
    setSelectedAgent(null)
  }

  const startEditing = (agent: Agent) => {
    setFormData({
      name: agent.name,
      description: agent.description,
      model: agent.model,
      systemPrompt: agent.systemPrompt,
      memoryEnabled: agent.memoryEnabled,
      tools: agent.tools
    })
    setIsEditing(true)
    setIsCreating(false)
  }

  const handleSaveAgent = async () => {
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      if (isEditing && selectedAgent) {
        // Update existing agent
        const result = await window.api.updateAgent(selectedAgent.id, {
          name: formData.name,
          description: formData.description,
          model: formData.model,
          systemPrompt: formData.systemPrompt,
          tools: formData.tools,
          settings: {
            temperature: 0.7,
            max_tokens: 2048
          }
        })

        if (result.success) {
          console.log('✅ Updated agent:', selectedAgent.id)
          await loadAgents() // Refresh from backend
          setSelectedAgent(result.agent)
        } else {
          console.error('Failed to update agent:', result.error)
        }
      } else {
        // Create new agent
        const result = await window.api.createAgent({
          name: formData.name,
          description: formData.description,
          model: formData.model,
          systemPrompt: formData.systemPrompt,
          tools: formData.tools,
          settings: {
            temperature: 0.7,
            max_tokens: 2048
          }
        })

        if (result.success) {
          console.log('✅ Created agent:', result.agent?.id)
          await loadAgents() // Refresh from backend

          // Set as active agent
          if (result.agent) {
            await window.api.setActiveAgent(result.agent.id)
            setSelectedAgent(result.agent)
          }
        } else {
          console.error('Failed to create agent:', result.error)
        }
      }

      setIsCreating(false)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAgent = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      setLoading(true)
      try {
        const result = await window.api.deleteAgent(id)
        if (result.success) {
          console.log('✅ Deleted agent:', id)

          // If deleted agent was selected, clear selection
          if (selectedAgent?.id === id) {
            setSelectedAgent(null)
          }

          await loadAgents() // Refresh from backend
        } else {
          console.error('Failed to delete agent:', result.error)
        }
      } catch (error) {
        console.error('❌ Failed to delete agent:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCloneAgent = async (agent: any) => {
    try {
      const result = await window.api.cloneAgent(agent.id, `${agent.name} (Copy)`)
      if (result.success) {
        console.log('✅ Cloned agent:', result.agent?.id)
        await loadAgents() // Refresh from backend
      } else {
        console.error('Failed to clone agent:', result.error)
      }
    } catch (error) {
      console.error('❌ Failed to clone agent:', error)
    }
  }

  const handleSetActive = async (id: string) => {
    try {
      const result = await window.api.setActiveAgent(id)
      if (result.success) {
        console.log('✅ Set active agent:', id)
        await loadAgents() // Refresh from backend
      } else {
        console.error('Failed to set active agent:', result.error)
      }
    } catch (error) {
      console.error('❌ Failed to set active agent:', error)
    }
  }

  const toggleTool = (tool: string) => {
    setFormData((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter((t) => t !== tool)
        : [...prev.tools, tool]
    }))
  }

  const cancelEditing = () => {
    setIsCreating(false)
    setIsEditing(false)
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-lg border border-white/20">
        <DialogHeader className="bg-gradient-to-r from-purple-50 to-blue-50 -m-6 p-6 mb-6 rounded-t-lg border-b border-white/20">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl text-white">
              <Robot size={24} />
            </div>
            Agent Manager
            <Badge variant="outline" className="ml-auto">
              {agents.length} agents
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh] gap-6">
          {/* Agent List */}
          <div className="w-1/3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users size={20} />
                Your Agents
              </h3>
              <Button
                onClick={startCreating}
                className="bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                <Plus size={16} className="mr-1" />
                New Agent
              </Button>
            </div>

            <ScrollArea className="h-full pr-4">
              <div className="space-y-3">
                {agents.map((agent) => (
                  <Card
                    key={agent.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedAgent?.id === agent.id
                        ? 'ring-2 ring-purple-500 bg-purple-50/80'
                        : 'hover:bg-white/60 bg-white/40'
                    } ${agent.isActive ? 'border-l-4 border-l-green-500' : ''} backdrop-blur-sm`}
                    onClick={() => {
                      setSelectedAgent(agent)
                      setIsCreating(false)
                      setIsEditing(false)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{agent.name}</h4>
                            {agent.isActive && (
                              <Crown size={14} className="text-green-500" title="Active Agent" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {agent.description}
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                agent.model === 'ollama'
                                  ? 'border-blue-200 text-blue-700'
                                  : agent.model === 'claude'
                                    ? 'border-purple-200 text-purple-700'
                                    : 'border-orange-200 text-orange-700'
                              }`}
                            >
                              {agent.model}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {agent.tools.length} tools
                            </Badge>
                            {agent.memoryEnabled && (
                              <Brain size={12} className="text-blue-500" title="Memory Enabled" />
                            )}
                          </div>
                        </div>
                      </div>

                      {agent.metadata && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-500">
                            Used {agent.metadata.usageCount} times
                          </span>
                          {agent.metadata.lastUsed && (
                            <span className="text-xs text-gray-500">
                              {new Date(agent.metadata.lastUsed).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Agent Details/Editor */}
          <div className="flex-1">
            {isCreating || isEditing ? (
              <Card className="h-full bg-white/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isEditing ? <Pencil size={20} /> : <Plus size={20} />}
                      {isEditing ? 'Edit Agent' : 'Create New Agent'}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={cancelEditing} size="sm">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveAgent}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isEditing ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 overflow-y-auto max-h-[calc(100%-100px)]">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Agent Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter agent name"
                        className="bg-white/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select
                        value={formData.model}
                        onValueChange={(value: any) =>
                          setFormData((prev) => ({ ...prev, model: value }))
                        }
                      >
                        <SelectTrigger className="bg-white/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ollama">Ollama (Local)</SelectItem>
                          <SelectItem value="claude">Claude API</SelectItem>
                          <SelectItem value="hybrid">Hybrid Mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Brief description of the agent's purpose"
                      className="bg-white/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>System Prompt</Label>
                    <Textarea
                      value={formData.systemPrompt}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))
                      }
                      placeholder="Define the agent's role, personality, and behavior..."
                      className="h-32 bg-white/60"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Memory System</Label>
                      <p className="text-xs text-gray-500">
                        Enable conversation memory and context retention
                      </p>
                    </div>
                    <Switch
                      checked={formData.memoryEnabled}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, memoryEnabled: checked }))
                      }
                    />
                  </div>

                  <Separator />

                  {/* Tools Selection */}
                  <div className="space-y-3">
                    <Label>Available Tools</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(AVAILABLE_TOOLS).map(([key, tool]) => {
                        const Icon = tool.icon
                        const isSelected = formData.tools.includes(key)
                        return (
                          <div
                            key={key}
                            onClick={() => toggleTool(key)}
                            className={`
                              p-3 rounded-lg border cursor-pointer transition-all
                              ${
                                isSelected
                                  ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-300'
                                  : 'bg-white/40 border-gray-200 hover:bg-white/60'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={16} className={`text-${tool.color}-500`} />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{tool.name}</div>
                                <div className="text-xs text-gray-500">{key}</div>
                              </div>
                              {isSelected && <CheckCircle size={16} className="text-purple-500" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500">
                      Selected tools: {formData.tools.length} /{' '}
                      {Object.keys(AVAILABLE_TOOLS).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : selectedAgent ? (
              <Card className="h-full bg-white/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Robot size={24} className="text-purple-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          {selectedAgent.name}
                          {selectedAgent.isActive && <Crown size={16} className="text-green-500" />}
                        </div>
                        <p className="text-sm font-normal text-gray-600">
                          {selectedAgent.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCloneAgent(selectedAgent)}
                      >
                        <Copy size={14} className="mr-1" />
                        Clone
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(selectedAgent)}
                      >
                        <Pencil size={14} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAgent(selectedAgent.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash size={14} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 overflow-y-auto max-h-[calc(100%-100px)]">
                  {/* Agent Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedAgent.metadata?.usageCount || 0}
                      </div>
                      <div className="text-sm text-gray-600">Uses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedAgent.tools.length}
                      </div>
                      <div className="text-sm text-gray-600">Tools</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedAgent.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <div className="text-sm text-gray-600">Status</div>
                    </div>
                  </div>

                  <Separator />

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label>System Prompt</Label>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm leading-relaxed">
                      {selectedAgent.systemPrompt || 'No system prompt defined'}
                    </div>
                  </div>

                  {/* Tools */}
                  <div className="space-y-3">
                    <Label>Enabled Tools</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedAgent.tools.map((tool) => {
                        const toolInfo = AVAILABLE_TOOLS[tool as keyof typeof AVAILABLE_TOOLS]
                        if (!toolInfo) return null
                        const Icon = toolInfo.icon
                        return (
                          <div
                            key={tool}
                            className="flex items-center gap-2 p-2 bg-white/60 rounded border"
                          >
                            <Icon size={14} className={`text-${toolInfo.color}-500`} />
                            <span className="text-sm">{toolInfo.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t">
                    {!selectedAgent.isActive ? (
                      <Button
                        onClick={() => handleSetActive(selectedAgent.id)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Crown size={16} className="mr-2" />
                        Set as Active Agent
                      </Button>
                    ) : (
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />
                        <p className="text-green-700 font-medium">This is your active agent</p>
                        <p className="text-green-600 text-sm">
                          All new conversations will use this agent
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center bg-white/40 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="text-center">
                  <Robot size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Agent Selected</h3>
                  <p className="text-gray-500 mb-4">
                    Select an agent to view details or create a new one
                  </p>
                  <Button onClick={startCreating} className="bg-purple-600 hover:bg-purple-700">
                    <Plus size={16} className="mr-2" />
                    Create Your First Agent
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AgentManagerOverlay
