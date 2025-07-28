import React, { useState } from 'react'
import { Robot, Shield, Gear, Activity, Plus, UsersThree, Wrench, Clock } from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAgentService } from '../../hooks/useAgents'
import AgentManagementPanel from './AgentManagementPanel'
import AgentConfigEditor from './AgentConfigEditor'
import ToolPermissionsEditor from './ToolPermissionsEditor'

const AgentDashboard: React.FC = () => {
  const { toast } = useToast()
  const {
    registry,
    loading,
    error,
    securityConfig,
    auditLog,
    availableTools,
    getAllAgents,
    getActiveAgent
  } = useAgentService()

  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'agents' | 'permissions' | 'config' | 'audit'
  >('overview')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const agents = getAllAgents()
  const activeAgent = getActiveAgent()
  const totalAgents = agents.length
  const enabledAgents = agents.filter((a) => a.isActive).length
  const totalTools = Object.keys(availableTools).length
  const recentAuditEntries = auditLog.slice(0, 5)

  // Security metrics
  const criticalToolsEnabled = securityConfig?.allowCriticalTools || false
  const dangerousToolsEnabled = securityConfig?.allowDangerousTools || false
  const adminModeEnabled = securityConfig?.adminMode || false

  const getSecurityRiskLevel = () => {
    if (adminModeEnabled && criticalToolsEnabled) return 'High'
    if (dangerousToolsEnabled || criticalToolsEnabled) return 'Medium'
    return 'Low'
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High':
        return 'text-red-600 bg-red-50'
      case 'Medium':
        return 'text-orange-600 bg-orange-50'
      case 'Low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Robot size={48} className="mx-auto mb-4 text-blue-500 animate-pulse" />
          <p>Loading agent dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error loading agent dashboard: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Robot size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agent Dashboard</h1>
            <p className="text-gray-600">Manage your AI agents and security settings</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Puffer Agent System v1.0
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity size={16} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <UsersThree size={16} />
            Agents
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield size={16} />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Gear size={16} />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Clock size={16} />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded">
                    <UsersThree size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalAgents}</p>
                    <p className="text-sm text-gray-600">Total Agents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded">
                    <Activity size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{enabledAgents}</p>
                    <p className="text-sm text-gray-600">Active Agents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded">
                    <Wrench size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalTools}</p>
                    <p className="text-sm text-gray-600">Available Tools</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded">
                    <Shield size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      <Badge variant="outline" className={getRiskColor(getSecurityRiskLevel())}>
                        {getSecurityRiskLevel()}
                      </Badge>
                    </p>
                    <p className="text-sm text-gray-600">Security Risk</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Agent & Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Agent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Robot size={20} />
                  <span>Active Agent</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeAgent ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{activeAgent.name}</h3>
                      <Badge variant="outline">{activeAgent.model}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{activeAgent.description}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{activeAgent.tools.length} tools</Badge>
                      <Badge variant="outline">
                        Created {new Date(activeAgent.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAgentId(activeAgent.id)
                        setSelectedTab('config')
                      }}
                    >
                      Configure Agent
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Robot size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 mb-4">No active agent selected</p>
                    <Button onClick={() => setSelectedTab('agents')}>Select Agent</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock size={20} />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAuditEntries.length > 0 ? (
                  <div className="space-y-3">
                    {recentAuditEntries.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{entry.action.replace(/_/g, ' ')}</p>
                          <p className="text-gray-500">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            entry.severity === 'critical'
                              ? 'text-red-600'
                              : entry.severity === 'high'
                                ? 'text-orange-600'
                                : entry.severity === 'medium'
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                          }
                        >
                          {entry.severity}
                        </Badge>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTab('audit')}
                      className="w-full"
                    >
                      View Full Audit Log
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Security Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield size={20} />
                <span>Security Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div
                    className={`p-3 rounded-lg ${dangerousToolsEnabled ? 'bg-orange-50' : 'bg-green-50'}`}
                  >
                    <Shield
                      size={24}
                      className={`mx-auto ${dangerousToolsEnabled ? 'text-orange-600' : 'text-green-600'}`}
                    />
                  </div>
                  <p className="text-sm font-medium mt-2">Dangerous Tools</p>
                  <p className="text-xs text-gray-500">
                    {dangerousToolsEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>

                <div className="text-center">
                  <div
                    className={`p-3 rounded-lg ${criticalToolsEnabled ? 'bg-red-50' : 'bg-green-50'}`}
                  >
                    <Shield
                      size={24}
                      className={`mx-auto ${criticalToolsEnabled ? 'text-red-600' : 'text-green-600'}`}
                    />
                  </div>
                  <p className="text-sm font-medium mt-2">Critical Tools</p>
                  <p className="text-xs text-gray-500">
                    {criticalToolsEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>

                <div className="text-center">
                  <div
                    className={`p-3 rounded-lg ${securityConfig?.requireUserConfirmation ? 'bg-green-50' : 'bg-orange-50'}`}
                  >
                    <Shield
                      size={24}
                      className={`mx-auto ${securityConfig?.requireUserConfirmation ? 'text-green-600' : 'text-orange-600'}`}
                    />
                  </div>
                  <p className="text-sm font-medium mt-2">Confirmations</p>
                  <p className="text-xs text-gray-500">
                    {securityConfig?.requireUserConfirmation ? 'Required' : 'Disabled'}
                  </p>
                </div>

                <div className="text-center">
                  <div
                    className={`p-3 rounded-lg ${adminModeEnabled ? 'bg-red-50' : 'bg-green-50'}`}
                  >
                    <Shield
                      size={24}
                      className={`mx-auto ${adminModeEnabled ? 'text-red-600' : 'text-green-600'}`}
                    />
                  </div>
                  <p className="text-sm font-medium mt-2">Admin Mode</p>
                  <p className="text-xs text-gray-500">
                    {adminModeEnabled ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <AgentManagementPanel />
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <ToolPermissionsEditor
            agentId={selectedAgentId || undefined}
            onPermissionsChange={(permissions) => {
              toast({
                title: 'Success',
                description: 'Agent permissions updated'
              })
            }}
          />
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <AgentConfigEditor
            agentId={selectedAgentId || undefined}
            onConfigChange={(config) => {
              toast({
                title: 'Success',
                description: 'Agent configuration updated'
              })
            }}
          />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock size={20} />
                <span>Security Audit Log</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLog.length > 0 ? (
                <div className="space-y-3">
                  {auditLog.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{entry.action.replace(/_/g, ' ')}</p>
                          <Badge
                            variant="outline"
                            className={
                              entry.severity === 'critical'
                                ? 'text-red-600 bg-red-50'
                                : entry.severity === 'high'
                                  ? 'text-orange-600 bg-orange-50'
                                  : entry.severity === 'medium'
                                    ? 'text-yellow-600 bg-yellow-50'
                                    : 'text-green-600 bg-green-50'
                            }
                          >
                            {entry.severity}
                          </Badge>
                        </div>

                        {entry.details && (
                          <p className="text-sm text-gray-600 mt-1">{entry.details}</p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                          {entry.agentId && <span>Agent: {entry.agentId}</span>}
                          {entry.toolUsed && <span>Tool: {entry.toolUsed}</span>}
                          {entry.userConfirmed !== undefined && (
                            <span>User Confirmed: {entry.userConfirmed ? 'Yes' : 'No'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No audit entries found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AgentDashboard
