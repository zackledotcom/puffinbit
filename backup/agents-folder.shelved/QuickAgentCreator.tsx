import React, { useState, useEffect } from 'react'
import React, { useState, useEffect } from 'react'
import { Robot, Plus, FileText, Gear } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

interface QuickAgentCreatorProps {
  className?: string
}

const QuickAgentCreator: React.FC<QuickAgentCreatorProps> = ({ className }) => {
  const { addToast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeAgent, setActiveAgent] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    tools: [] as string[]
  })

  // Load active agent on mount
  useEffect(() => {
    const loadActiveAgent = async () => {
      try {
        const result = await window.api.getActiveAgent()
        if (result.success && result.agent) {
          setActiveAgent(result.agent)
        }
      } catch (error) {
        console.error('Failed to load active agent:', error)
      }
    }
    loadActiveAgent()
  }, [])

  const presetAgents = [
    {
      name: 'File Reader Assistant',
      description: 'AI with secure file system read access',
      systemPrompt:
        "You are a helpful AI assistant with read access to the user's file system. You can read files to help analyze code, answer questions, or provide insights. Always explain what files you're reading and why.",
      tools: ['file.read', 'chroma.query', 'ollama.generate']
    },
    {
      name: 'Code Analyzer',
      description: 'Specialized in code analysis and documentation',
      systemPrompt:
        'You are a code analysis expert. Help users understand their code, find issues, suggest improvements, and create documentation.',
      tools: ['file.read', 'file.search', 'ollama.generate', 'chroma.query']
    },
    {
      name: 'Research Assistant',
      description: 'Memory-focused assistant for research tasks',
      systemPrompt:
        'You are a research assistant that excels at organizing information, finding patterns, and maintaining context across conversations.',
      tools: ['chroma.query', 'chroma.add', 'ollama.generate', 'memory.search']
    }
  ]

  const createPresetAgent = async (preset: (typeof presetAgents)[0]) => {
    console.log('🚀 Creating preset agent:', preset.name)
    setLoading(true)
    try {
      console.log('📡 Calling window.api.createAgent...')
      console.log('window.api:', window.api)
      console.log('createAgent function:', window.api?.createAgent)

      const result = await window.api.createAgent({
        name: preset.name,
        description: preset.description,
        model: 'tinydolphin:latest',
        system_prompt: preset.systemPrompt,
        tools: preset.tools,
        settings: {
          temperature: 0.7,
          max_tokens: 2048
        }
      })

      console.log('✅ Agent creation result:', result)

      if (result.success) {
        // Set as active agent
        if (result.agent) {
          console.log('🎯 Setting as active agent:', result.agent.id)
          await window.api.setActiveAgent(result.agent.id)
          setActiveAgent(result.agent) // Update local state
        }

        addToast({
          type: 'success',
          title: 'Agent Created!',
          description: `${preset.name} is now active and ready to use`
        })

        console.log('🎉 Agent created successfully!')
      } else {
        throw new Error(result.error || 'Failed to create agent')
      }
    } catch (error: any) {
      console.error('❌ Agent creation failed:', error)
      addToast({
        type: 'error',
        title: 'Error',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const createCustomAgent = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an agent name',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const result = await window.api.createAgent({
        name: formData.name,
        description: formData.description,
        model: 'tinydolphin:latest',
        systemPrompt: formData.systemPrompt || 'You are a helpful AI assistant.',
        tools: formData.tools,
        settings: {
          temperature: 0.7,
          max_tokens: 2048
        }
      })

      if (result.success) {
        // Set as active agent
        if (result.agent) {
          await window.api.setActiveAgent(result.agent.id)
        }

        toast({
          title: 'Agent Created!',
          description: `${formData.name} is now active and ready to use`
        })

        setShowDialog(false)
        setFormData({ name: '', description: '', systemPrompt: '', tools: [] })
      } else {
        throw new Error(result.error || 'Failed to create agent')
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleTool = (toolKey: string) => {
    setFormData((prev) => ({
      ...prev,
      tools: prev.tools.includes(toolKey)
        ? prev.tools.filter((t) => t !== toolKey)
        : [...prev.tools, toolKey]
    }))
  }

  const availableTools = [
    { key: 'file.read', name: 'Read Files', safe: true },
    { key: 'file.search', name: 'Search Files', safe: true },
    { key: 'chroma.query', name: 'Query Memory', safe: true },
    { key: 'chroma.add', name: 'Save to Memory', safe: true },
    { key: 'ollama.generate', name: 'Generate Text', safe: true },
    { key: 'memory.search', name: 'Search Context', safe: true }
  ]

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 px-3 transition-colors ${
              activeAgent
                ? 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'
                : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
            }`}
            disabled={loading}
          >
            <Robot size={16} className="mr-1" />
            {loading ? 'Creating...' : activeAgent ? activeAgent.name : 'Agents'}
            {activeAgent && <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Active Agent Status */}
          {activeAgent && (
            <>
              <div className="p-2 bg-green-50 border-b border-green-200">
                <div className="flex items-center gap-2 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium">Active: {activeAgent.name}</span>
                </div>
                <p className="text-xs text-green-600 mt-1">{activeAgent.description}</p>
              </div>
            </>
          )}

          {/* Quick Presets */}
          <div className="p-2">
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Setup</p>
            {presetAgents.map((preset, index) => {
              const isActive = activeAgent?.name === preset.name
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={(e) => {
                    console.log('🖱️ Dropdown item clicked:', preset.name)
                    e.preventDefault()
                    e.stopPropagation()
                    if (!isActive) {
                      createPresetAgent(preset)
                    }
                  }}
                  className={`flex flex-col items-start p-3 cursor-pointer ${
                    isActive
                      ? 'bg-green-50 border border-green-200 opacity-60'
                      : 'hover:bg-purple-50'
                  }`}
                  disabled={loading || isActive}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Robot size={14} className={isActive ? 'text-green-600' : 'text-purple-600'} />
                    <span className="font-medium text-sm">{preset.name}</span>
                    {isActive && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-xs bg-green-100 text-green-700"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{preset.description}</p>
                  <div className="flex gap-1 mt-2">
                    {preset.tools.map((tool) => (
                      <Badge key={tool} variant="outline" className="text-xs">
                        {tool.split('.')[1]}
                      </Badge>
                    ))}
                  </div>
                </DropdownMenuItem>
              )
            })}
          </div>

          <DropdownMenuSeparator />

          {/* Custom Agent */}
          <DropdownMenuItem
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 p-3"
          >
            <Plus size={14} />
            <span>Custom Agent</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              // Open full agent manager if needed
              console.log('Open full agent manager')
            }}
            className="flex items-center gap-2 p-3"
          >
            <Gear size={14} />
            <span>Manage Agents</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Agent Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Robot size={20} />
              Create Custom Agent
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="My Assistant"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What does this agent do?"
              />
            </div>

            <div>
              <Label htmlFor="prompt">System Prompt (Optional)</Label>
              <Textarea
                id="prompt"
                value={formData.systemPrompt}
                onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="You are a helpful AI assistant..."
                rows={3}
              />
            </div>

            <div>
              <Label>Tools</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableTools.map((tool) => (
                  <div
                    key={tool.key}
                    onClick={() => toggleTool(tool.key)}
                    className={`p-2 border rounded cursor-pointer transition-colors ${
                      formData.tools.includes(tool.key)
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-sm font-medium">{tool.name}</div>
                    <div className="text-xs text-gray-500">{tool.key}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={createCustomAgent} disabled={loading || !formData.name.trim()}>
                {loading ? 'Creating...' : 'Create Agent'}
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default QuickAgentCreator
