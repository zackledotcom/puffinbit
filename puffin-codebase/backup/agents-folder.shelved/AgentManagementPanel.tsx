import React, { useState } from 'react'
import { Robot, Plus, Wrench, Trash, Play } from 'phosphor-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { useAgentService } from '../../hooks/useAgents'

const AgentManagementPanel: React.FC = () => {
  const { registry, loading, error, createAgent, deleteAgent, executeAgentTool, getAllAgents } =
    useAgentService()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    model: 'tinydolphin:latest',
    system_prompt: 'You are a helpful AI assistant.',
    tools: ['chroma.query', 'ollama.generate']
  })

  const agents = getAllAgents()

  const handleCreateAgent = async () => {
    const result = await createAgent(newAgent)
    if (result.success) {
      setShowCreateForm(false)
      setNewAgent({
        name: '',
        description: '',
        model: 'tinydolphin:latest',
        system_prompt: 'You are a helpful AI assistant.',
        tools: ['chroma.query', 'ollama.generate']
      })
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await deleteAgent(agentId)
    }
  }

  const handleTestAgent = async (agentId: string) => {
    const result = await executeAgentTool(agentId, 'ollama.generate', {
      prompt: 'Hello! Can you introduce yourself?',
      model: 'tinydolphin:latest'
    })

    if (result.success) {
      alert(`Agent Response: ${result.result?.response || 'No response'}`)
    } else {
      alert(`Error: ${result.error}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Robot size={48} className="mx-auto mb-4 text-blue-500 animate-pulse" />
          <p>Loading agents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error loading agents: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Robot size={24} className="text-blue-600" />
          <h2 className="text-xl font-semibold">Agent Management</h2>
          <Badge variant="secondary">{agents.length} agents</Badge>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Create Agent
        </Button>
      </div>

      {/* Create Agent Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={newAgent.name}
                  onChange={(e) => setNewAgent((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Agent name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <Input
                  value={newAgent.model}
                  onChange={(e) => setNewAgent((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder="Model name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={newAgent.description}
                onChange={(e) => setNewAgent((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Agent description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">System Prompt</label>
              <Textarea
                value={newAgent.system_prompt}
                onChange={(e) =>
                  setNewAgent((prev) => ({ ...prev, system_prompt: e.target.value }))
                }
                placeholder="System prompt for the agent"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateAgent} disabled={!newAgent.name}>
                Create Agent
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents List */}
      <div className="grid gap-4">
        {agents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Robot size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
              <p className="text-gray-500 mb-4">Create your first AI agent to get started</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus size={16} className="mr-2" />
                Create Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => (
            <Card key={agent.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium">{agent.name}</h3>
                      <Badge variant="outline">{agent.model}</Badge>
                      <Badge variant="secondary">{agent.tools.length} tools</Badge>
                    </div>
                    <p className="text-gray-600 mb-3">{agent.description}</p>
                    <div className="text-sm text-gray-500">
                      <p>Usage: {agent.usageCount} times</p>
                      <p>Created: {new Date(agent.created).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestAgent(agent.id)}
                      className="flex items-center gap-1"
                    >
                      <Play size={14} />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>

                {/* Tools List */}
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Available Tools:</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.map((tool) => (
                      <Badge key={tool} variant="outline" className="text-xs">
                        <Wrench size={10} className="mr-1" />
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default AgentManagementPanel
