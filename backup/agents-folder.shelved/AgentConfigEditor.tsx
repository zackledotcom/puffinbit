import React, { useState } from 'react'
import { Robot, Wrench, Code, FileText, Warning } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AgentConfigEditorProps {
  agentId?: string
  className?: string
}

/**
 * TODO: AgentConfigEditor - Scaffolded Component
 *
 * This component is planned for Phase 2+ implementation.
 * Current state: UI shell with no live editing/validation
 *
 * Planned Features:
 * - In-canvas JSON editor with syntax highlighting
 * - Real-time validation of agent configuration
 * - Live preview of agent changes
 * - Skill/tool assignment interface
 * - Configuration templates and presets
 */
const AgentConfigEditor: React.FC<AgentConfigEditorProps> = ({ agentId, className }) => {
  const [selectedTab, setSelectedTab] = useState<'basic' | 'tools' | 'json'>('basic')

  const mockAgentConfig = {
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
  }

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

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-orange-50 text-orange-700">
              TODO: Planned Feature
            </Badge>
            <Badge variant="secondary">Phase 2+</Badge>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Warning size={20} className="text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Under Development</h4>
              <p className="text-sm text-yellow-700 mt-1">
                This is a scaffolded component. Live editing and validation features will be
                implemented in Phase 2+. Current display is for UI structure only.
              </p>
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
                <Input id="agent-name" value={mockAgentConfig.name} disabled className="mt-1" />
              </div>
              <div>
                <Label htmlFor="agent-model">Model</Label>
                <Input id="agent-model" value={mockAgentConfig.model} disabled className="mt-1" />
              </div>
            </div>

            <div>
              <Label htmlFor="agent-description">Description</Label>
              <Input
                id="agent-description"
                value={mockAgentConfig.description}
                disabled
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={mockAgentConfig.system_prompt}
                disabled
                className="mt-1 min-h-[100px]"
              />
            </div>

            <p className="text-sm text-muted-foreground italic">
              💡 TODO: Add live validation, auto-save, and template selection
            </p>
          </div>
        )}

        {selectedTab === 'tools' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Available Tools</h4>
              <div className="grid grid-cols-2 gap-2">
                {mockAgentConfig.tools.map((tool) => (
                  <div key={tool} className="p-2 bg-background rounded border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono">{tool}</span>
                      <Badge variant="outline" className="text-xs">
                        Enabled
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Planned Features:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Drag & drop tool assignment</li>
                <li>• Per-tool permission configuration</li>
                <li>• Tool dependency validation</li>
                <li>• Custom tool integration</li>
              </ul>
            </div>
          </div>
        )}

        {selectedTab === 'json' && (
          <div className="space-y-4">
            <div>
              <Label>JSON Configuration</Label>
              <Textarea
                value={JSON.stringify(mockAgentConfig, null, 2)}
                disabled
                className="mt-1 font-mono text-xs min-h-[200px]"
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Planned Features:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Syntax highlighting with Monaco Editor</li>
                <li>• Real-time JSON validation</li>
                <li>• Auto-completion for agent properties</li>
                <li>• Schema validation and error highlighting</li>
                <li>• Import/export configuration files</li>
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
          <Button variant="outline" disabled>
            Reset to Default
          </Button>

          <div className="flex space-x-2">
            <Button variant="outline" disabled>
              Validate Config
            </Button>
            <Button disabled>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentConfigEditor
