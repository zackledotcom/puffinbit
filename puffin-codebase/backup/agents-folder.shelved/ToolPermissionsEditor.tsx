import React, { useState, useEffect } from 'react'
import { ShieldCheckmark, Wrench, Lock, LockOpen, Warning, CheckCircle, Robot, Info, Warning, Shield, X } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { useAgentService } from '../../hooks/useAgents'

interface ToolPermissionsEditorProps {
  agentId?: string
  className?: string
  onPermissionsChange?: (permissions: any) => void
}

interface ToolSecurityInfo {
  category: string
  operations: string[]
  riskLevel: 'safe' | 'moderate' | 'dangerous' | 'critical'
  requiresConfirmation: boolean
  description: string
}

interface SecurityConfig {
  allowCriticalTools: boolean
  allowDangerousTools: boolean
  requireUserConfirmation: boolean
  adminMode: boolean
}

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'safe':
      return 'text-green-600 bg-green-50'
    case 'moderate':
      return 'text-yellow-600 bg-yellow-50'
    case 'dangerous':
      return 'text-orange-600 bg-orange-50'
    case 'critical':
      return 'text-red-600 bg-red-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

const getRiskIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case 'safe':
      return <CheckCircle size={16} />
    case 'moderate':
      return <Info size={16} />
    case 'dangerous':
      return <Warning size={16} />
    case 'critical':
      return <X size={16} />
    default:
      return <Shield size={16} />
  }
}

const ToolPermissionsEditor: React.FC<ToolPermissionsEditorProps> = ({
  agentId,
  className,
  onPermissionsChange
}) => {
  const { toast } = useToast()
  const { getAgentById, updateAgent } = useAgentService()

  const [selectedAgent, setSelectedAgent] = useState(agentId || '')
  const [allTools, setAllTools] = useState<Record<string, ToolSecurityInfo>>({})
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const agent = selectedAgent ? getAgentById(selectedAgent) : null

  // Load tools and security config
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Load all tools with security info
        const toolsResult = await window.api.getAllToolsWithSecurity()
        if (toolsResult.success) {
          setAllTools(toolsResult.tools || {})
        } else {
          throw new Error(toolsResult.error || 'Failed to load tools')
        }

        // Load security config
        const configResult = await window.api.getSecurityConfig()
        if (configResult.success) {
          setSecurityConfig(configResult.config || null)
        } else {
          throw new Error(configResult.error || 'Failed to load security config')
        }
      } catch (err: any) {
        setError(err.message)
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  // Group tools by category
  const toolCategories = React.useMemo(() => {
    const categories: Record<string, Array<{ key: string; info: ToolSecurityInfo }>> = {}

    Object.entries(allTools).forEach(([key, info]) => {
      if (!categories[info.category]) {
        categories[info.category] = []
      }
      categories[info.category].push({ key, info })
    })

    return categories
  }, [allTools])

  const handleToolToggle = async (toolKey: string, enabled: boolean) => {
    if (!agent) return

    const currentTools = agent.tools || []
    const updatedTools = enabled
      ? [...currentTools, toolKey]
      : currentTools.filter((t) => t !== toolKey)

    try {
      const result = await updateAgent(agent.id, { tools: updatedTools })
      if (result.success) {
        toast({
          title: 'Success',
          description: `Tool ${toolKey} ${enabled ? 'enabled' : 'disabled'} for ${agent.name}`
        })
        onPermissionsChange?.(updatedTools)
      } else {
        throw new Error(result.error || 'Failed to update agent')
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      })
    }
  }

  const handleSecurityConfigUpdate = async (updates: Partial<SecurityConfig>) => {
    if (!securityConfig) return

    const updatedConfig = { ...securityConfig, ...updates }

    try {
      const result = await window.api.updateSecurityConfig(updatedConfig)
      if (result.success) {
        setSecurityConfig(updatedConfig)
        toast({
          title: 'Success',
          description: 'Security configuration updated'
        })
      } else {
        throw new Error(result.error || 'Failed to update security config')
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      })
    }
  }

  const isToolAllowed = (riskLevel: string) => {
    if (!securityConfig) return false

    switch (riskLevel) {
      case 'critical':
        return securityConfig.allowCriticalTools
      case 'dangerous':
        return securityConfig.allowDangerousTools
      case 'moderate':
      case 'safe':
      default:
        return true
    }
  }

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center h-64`}>
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-blue-500 animate-pulse" />
          <p>Loading security configuration...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <Warning size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheckmark size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Tool Permissions Editor</h3>
              <p className="text-sm text-muted-foreground">
                Manage agent tool access and security settings
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Live Security Control
            </Badge>
            {securityConfig?.adminMode && (
              <Badge variant="secondary" className="bg-red-50 text-red-700">
                Admin Mode
              </Badge>
            )}
          </div>
        </div>

        {/* Agent Selection */}
        {!agentId && (
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="agent-select">Select Agent</Label>
              <select
                id="agent-select"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">Choose an agent...</option>
                {/* This would be populated from agent registry */}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Security Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield size={20} />
              <span>Global Security Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="dangerous-tools"
                  checked={securityConfig?.allowDangerousTools || false}
                  onCheckedChange={(checked) =>
                    handleSecurityConfigUpdate({ allowDangerousTools: checked })
                  }
                />
                <Label htmlFor="dangerous-tools">Allow Dangerous Tools</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="critical-tools"
                  checked={securityConfig?.allowCriticalTools || false}
                  onCheckedChange={(checked) =>
                    handleSecurityConfigUpdate({ allowCriticalTools: checked })
                  }
                />
                <Label htmlFor="critical-tools">Allow Critical Tools</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="user-confirmation"
                  checked={securityConfig?.requireUserConfirmation || false}
                  onCheckedChange={(checked) =>
                    handleSecurityConfigUpdate({ requireUserConfirmation: checked })
                  }
                />
                <Label htmlFor="user-confirmation">Require User Confirmation</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="admin-mode"
                  checked={securityConfig?.adminMode || false}
                  onCheckedChange={(checked) => handleSecurityConfigUpdate({ adminMode: checked })}
                />
                <Label htmlFor="admin-mode">Admin Mode</Label>
              </div>
            </div>

            {/* Security Warnings */}
            {securityConfig?.allowCriticalTools && (
              <Alert variant="destructive">
                <Warning size={16} />
                <AlertDescription>
                  Critical tools are enabled. These tools can execute system commands and may pose
                  security risks.
                </AlertDescription>
              </Alert>
            )}

            {securityConfig?.adminMode && (
              <Alert>
                <Info size={16} />
                <AlertDescription>
                  Admin mode bypasses confirmation requirements. Use with caution.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Tool Categories */}
        {agent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Robot size={20} />
                <span>Tool Permissions for {agent.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(toolCategories)[0]} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  {Object.keys(toolCategories).map((category) => (
                    <TabsTrigger key={category} value={category} className="capitalize">
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(toolCategories).map(([category, tools]) => (
                  <TabsContent key={category} value={category} className="space-y-4">
                    <div className="space-y-3">
                      {tools.map(({ key, info }) => {
                        const isEnabled = agent.tools?.includes(key) || false
                        const isBlocked = !isToolAllowed(info.riskLevel)

                        return (
                          <div
                            key={key}
                            className={`p-4 border rounded-lg ${
                              isBlocked ? 'bg-gray-50 opacity-60' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-2">
                                    <Wrench size={16} className="text-gray-500" />
                                    <span className="font-medium">{key}</span>
                                  </div>

                                  <Badge
                                    variant="outline"
                                    className={`${getRiskColor(info.riskLevel)} border-0`}
                                  >
                                    {getRiskIcon(info.riskLevel)}
                                    <span className="ml-1 capitalize">{info.riskLevel}</span>
                                  </Badge>

                                  {info.requiresConfirmation && (
                                    <Badge variant="outline" className="text-xs">
                                      <Lock size={12} className="mr-1" />
                                      Confirmation Required
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-sm text-gray-600 mt-1">{info.description}</p>

                                {isBlocked && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Blocked by security policy. Enable {info.riskLevel} tools in
                                    security settings.
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={isEnabled && !isBlocked}
                                  disabled={isBlocked}
                                  onCheckedChange={(checked) => handleToolToggle(key, checked)}
                                />
                                {isEnabled && !isBlocked ? (
                                  <LockOpen size={16} className="text-green-500" />
                                ) : (
                                  <Lock size={16} className="text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {agent && (
          <Card>
            <CardHeader>
              <CardTitle>Permission Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {agent.tools?.filter((t) => allTools[t]?.riskLevel === 'safe').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Safe Tools</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {agent.tools?.filter((t) => allTools[t]?.riskLevel === 'moderate').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Moderate Tools</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {agent.tools?.filter((t) => allTools[t]?.riskLevel === 'dangerous').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Dangerous Tools</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {agent.tools?.filter((t) => allTools[t]?.riskLevel === 'critical').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Critical Tools</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ToolPermissionsEditor
