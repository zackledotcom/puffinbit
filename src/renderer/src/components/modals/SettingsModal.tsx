import React, { useState, useEffect } from 'react'
import { Gear, X } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { BlurIn } from '@/components/ui/blur-in'
import { Ripple } from '@/components/ui/ripple'
import { useAllServices } from '@/hooks/useServices'
import { ModelSettings } from '../../../../types/settings'

interface AgentPermissions {
  fileSystem: boolean
  network: boolean
  systemCommands: boolean
  memoryAccess: boolean
}

interface SettingsModalProps {
  modelConfig?: ModelConfig
  agentPermissions?: AgentPermissions
  onModelConfigChange?: (config: ModelConfig) => void
  onPermissionsChange?: (permissions: AgentPermissions) => void
  isOpen?: boolean
  onClose?: () => void
  selectedModel?: string
  onModelChange?: (model: string) => void
  theme?: 'light' | 'dark' | 'system'
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void
}

export default function SettingsModal({
  modelConfig = {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    systemPrompt: '',
    streaming: true
  },
  agentPermissions = {
    fileSystem: false,
    network: false,
    systemCommands: false,
    memoryAccess: true
  },
  onModelConfigChange = () => {},
  onPermissionsChange = () => {},
  isOpen,
  onClose,
  selectedModel,
  onModelChange,
  theme,
  onThemeChange
}: Partial<SettingsModalProps>) {
  // Service integration
  const services = useAllServices()

  const [tempConfig, setTempConfig] = useState<ModelConfig>(modelConfig)
  const [tempPermissions, setTempPermissions] = useState<AgentPermissions>(agentPermissions)
  const [loading, setLoading] = useState(false)

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings()
    }
  }, [isOpen])

  const loadCurrentSettings = async () => {
    setLoading(true)
    try {
      // TODO: Load settings from backend via settings service
      // const currentSettings = await services.settings.loadSettings()
      // setTempConfig(currentSettings.modelConfig)
      // setTempPermissions(currentSettings.agentPermissions)

      // For now, use the passed props as defaults
      setTempConfig(modelConfig)
      setTempPermissions(agentPermissions)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // TODO: Save settings to backend via settings service
      // await services.settings.saveSettings({
      //   modelConfig: tempConfig,
      //   agentPermissions: tempPermissions
      // })

      // For now, call the prop callbacks
      onModelConfigChange(tempConfig)
      onPermissionsChange(tempPermissions)

      onClose?.()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setTempConfig(modelConfig)
    setTempPermissions(agentPermissions)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {!isOpen && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 glass">
            <Gear size={16} />
            Settings
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="glass-strong max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-shimmer">System Configuration</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="model" className="w-full">
          <TabsList className="glass grid w-full grid-cols-2">
            <TabsTrigger value="model">Model Settings</TabsTrigger>
            <TabsTrigger value="permissions">Agent Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-6 mt-6">
            {/* Temperature */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Temperature: {tempConfig.temperature}</Label>
              <Slider
                value={[tempConfig.temperature]}
                onValueChange={([value]) =>
                  setTempConfig((prev) => ({ ...prev, temperature: value }))
                }
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness. Lower values make responses more focused and deterministic.
              </p>
            </div>

            <Separator className="opacity-20" />

            {/* Max Tokens */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Max Tokens</Label>
              <Input
                type="number"
                value={tempConfig.maxTokens}
                onChange={(e) =>
                  setTempConfig((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 0 }))
                }
                min={1}
                max={4096}
                className="glass"
              />
              <p className="text-xs text-muted-foreground">Maximum length of model response</p>
            </div>

            <Separator className="opacity-20" />

            {/* Top P */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Top P: {tempConfig.topP}</Label>
              <Slider
                value={[tempConfig.topP]}
                onValueChange={([value]) => setTempConfig((prev) => ({ ...prev, topP: value }))}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Nucleus sampling. Controls diversity of word choice
              </p>
            </div>

            <Separator className="opacity-20" />

            {/* System Prompt */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">System Prompt</Label>
              <Textarea
                value={tempConfig.systemPrompt}
                onChange={(e) =>
                  setTempConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))
                }
                placeholder="Enter system prompt..."
                rows={4}
                className="glass resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Instructions that define the AI's behavior and personality
              </p>
            </div>

            <Separator className="opacity-20" />

            {/* Streaming */}
            <div className="flex items-center justify-between p-4 glass-panel rounded-xl">
              <div>
                <Label className="text-sm font-medium">Enable Streaming</Label>
                <p className="text-xs text-muted-foreground">
                  Show responses as they are generated
                </p>
              </div>
              <Switch
                checked={tempConfig.streaming}
                onCheckedChange={(checked) =>
                  setTempConfig((prev) => ({ ...prev, streaming: checked }))
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6 mt-6">
            {/* File System Access */}
            <div className="flex items-center justify-between p-4 glass-panel rounded-xl">
              <div>
                <Label className="text-sm font-medium">File System Access</Label>
                <p className="text-xs text-muted-foreground">Allow agent to read and write files</p>
              </div>
              <Switch
                checked={tempPermissions.fileSystem}
                onCheckedChange={(checked) =>
                  setTempPermissions((prev) => ({ ...prev, fileSystem: checked }))
                }
              />
            </div>

            {/* Network Access */}
            <div className="flex items-center justify-between p-4 glass-panel rounded-xl">
              <div>
                <Label className="text-sm font-medium">Network Access</Label>
                <p className="text-xs text-muted-foreground">Allow agent to make HTTP requests</p>
              </div>
              <Switch
                checked={tempPermissions.network}
                onCheckedChange={(checked) =>
                  setTempPermissions((prev) => ({ ...prev, network: checked }))
                }
              />
            </div>

            {/* System Commands */}
            <div className="flex items-center justify-between p-4 glass-panel rounded-xl">
              <div>
                <Label className="text-sm font-medium">System Commands</Label>
                <p className="text-xs text-muted-foreground">
                  Allow agent to execute system commands
                </p>
              </div>
              <Switch
                checked={tempPermissions.systemCommands}
                onCheckedChange={(checked) =>
                  setTempPermissions((prev) => ({ ...prev, systemCommands: checked }))
                }
              />
            </div>

            {/* Memory Access */}
            <div className="flex items-center justify-between p-4 glass-panel rounded-xl">
              <div>
                <Label className="text-sm font-medium">Memory Access</Label>
                <p className="text-xs text-muted-foreground">
                  Allow agent to access conversation memory
                </p>
              </div>
              <Switch
                checked={tempPermissions.memoryAccess}
                onCheckedChange={(checked) =>
                  setTempPermissions((prev) => ({ ...prev, memoryAccess: checked }))
                }
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
          <Button variant="ghost" onClick={handleReset} className="glass">
            Reset
          </Button>
          <Button onClick={handleSave} className="bg-white text-black hover:bg-gray-100">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
