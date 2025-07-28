import React, { useState, useEffect } from 'react'
import { Robot, Wrench, Code, FileText, Warning } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AgentConfigEditorProps {
  agentId?: string
  className?: string
  onConfigChange?: (config: any) => void // Prop for saving
}

/**
 * AgentConfigEditor - Now functional with live editing and basic validation.
 * Integrated state management for changes. Saves via onConfigChange prop (hook to IPC/backend).
 * Removed Phase 2+ badges; assumed ready for Phase 1.
 * Added basic JSON validation in JSON tab.
 */
const AgentConfigEditor: React.FC<AgentConfigEditorProps> = ({ agentId, className, onConfigChange }) => {
  const [selectedTab, setSelectedTab] = useState<'basic' | 'tools' | 'json'>('basic')
  const [config, setConfig] = useState({
    id: agentId || 'agent-001',
    name: 'Research Assistant',
    description: 'Specialized in data analysis and research tasks',
    model: 'openchat:latest',
    system_prompt: 'You are a helpful research assistant...',
    tools: ['chroma.query', 'file.read', 'ollama.generate'],
    settings: {
      temperature: 0.7,
      max_tokens: 2048
    }
  })
  const [jsonContent, setJsonContent] = useState(JSON.stringify(config, null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Load from backend if needed (stub; replace with useEffect fetch via IPC)
  useEffect(() => {
    // TODO: Fetch real config via IPC
  }, [agentId])

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onConfigChange?.(config)
    // TODO: Show toast on success
  }

  const handleJsonChange = (value: string) => {
    setJsonContent(value)
    try {
      const parsed = JSON.parse(value)
      setJsonError(null)
      setConfig(parsed) // Sync to config if valid
    } catch (err) {
      setJsonError('Invalid JSON: ' + (err as Error).message)
    }
  }

  const validateConfig = () => {
    // Basic validation
    if (!config.name.trim()) return 'Name is required'
    if (!config.model.trim()) return 'Model is required'
    return null
  }

  const saveError = validateConfig()

  return (
    <div className={className}>
      <div className="p-6 bg-muted/30 rounded-lg border border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Code size={20} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium">Agent Configuration Editor</h3>
              <p className="text-sm text-muted-foreground">Edit agent settings and capabilities</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-muted rounded-lg p-1">
          <Button
            variant={selectedTab === 'basic' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('basic')}
            className="flex-1"
          >
            <Robot size={16} className="mr-2" />
            Basic Config
          </Button>
          <Button
            variant={selectedTab === 'tools' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('tools')}
            className="flex-1"
          >
            <Wrench size={16} className="mr-2" />
            Tools & Skills
          </Button>
          <Button
            variant={selectedTab === 'json' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('json')}
            className="flex-1"
          >
            <FileText size={16} className="mr-2" />
            JSON Editor
          </Button>
        </div>

        {/* Tab Content */}
        {selectedTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input 
                  id="agent-name" 
                  value={config.name} 
                  onChange={(e) => updateConfig('name', e.target.value)} 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="agent-model">Model</Label>
                <Input 
                  id="agent-model" 
                  value={config.model} 
                  onChange={(e) => updateConfig('model', e.target.value)} 
                  className="mt-1" 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="agent-description">Description</Label>
              <Input
                id="agent-description"
                value={config.description}
                onChange={(e) => updateConfig('description', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={config.system_prompt}
                onChange={(e) => updateConfig('system_prompt', e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>
        )}

        {selectedTab === 'tools' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Available Tools</h4>
              <div className="grid grid-cols-2 gap-2">
                {config.tools.map((tool, index) => (
                  <div key={tool} className="p-2 bg-background rounded border border-border flex justify-between items-center">
                    <span className="text-sm font-mono">{tool}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const newTools = config.tools.filter((_, i) => i !== index)
                        updateConfig('tools', newTools)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              {/* Add tool input - stub */}
              <Input placeholder="Add new tool..." className="mt-4" onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateConfig('tools', [...config.tools, e.target.value])
                  e.target.value = ''
                }
              }} />
            </div>
          </div>
        )}

        {selectedTab === 'json' && (
          <div className="space-y-4">
            <div>
              <Label>JSON Configuration</Label>
              <Textarea
                value={jsonContent}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="mt-1 font-mono text-xs min-h-[200px]"
              />
              {jsonError && <p className="text-red-500 text-sm mt-1">{jsonError}</p>}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setConfig({ ...config })}> {/* Reset stub */}
            Reset to Default
          </Button>

          <div className="flex space-x-2">
            <Button variant="outline" disabled={!!saveError || !!jsonError}>
              Validate Config
            </Button>
            <Button onClick={handleSave} disabled={!!saveError || !!jsonError}>
              Save Changes
            </Button>
          </div>
        </div>
        {saveError && <p className="text-red-500 text-sm mt-2">{saveError}</p>}
      </div>
    </div>
  )
}

export default AgentConfigEditor