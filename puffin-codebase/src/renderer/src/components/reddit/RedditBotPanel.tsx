import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Robot,
  ChatCircle,
  Gear,
  Play,
  Square,
  ArrowsClockwise,
  PaperPlaneTilt,
  Activity,
  Warning,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  Settings,
  Shield,
  Brain,
  Network
} from 'phosphor-react'
import { useRedditService } from '../../hooks/useAdditionalServices'

export const RedditBotPanel: React.FC = () => {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    userAgent: 'Puffer:v1.0.0 (by /u/your_username)'
  })

  // Use centralized Reddit service
  const {
    status,
    config,
    stats: serviceStats,
    loading,
    authenticated,
    authenticate,
    startAgent,
    stopAgent,
    updateConfig,
    disconnect
  } = useRedditService()
  
  const [localStats, setLocalStats] = useState<any>(null)

  const loadStatus = async () => {
    try {
      // Status is already managed by the hook, just update local stats if needed
      setLocalStats(serviceStats)
    } catch (error) {
      console.error('Failed to load Reddit status:', error)
    }
  }

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [serviceStats])

  const handleAuthenticate = async () => {
    try {
      const result = await authenticate(credentials)
      if (result.success) {
        alert('Successfully connected to Reddit!')
      } else {
        alert('Authentication failed. Please check your credentials.')
      }
    } catch (error) {
      alert(`Authentication error: ${error.message}`)
    }
  }

  const handleAgentToggle = async () => {
    try {
      if (status?.agentRunning) {
        await stopAgent()
      } else {
        const result = await startAgent()
        if (!result.success) {
          alert('Failed to start Reddit agent.')
          return
        }
      }
    } catch (error) {
      alert(`Agent toggle error: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Robot className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Reddit DM Bot
                </CardTitle>
                <p className="text-sm text-muted-foreground">AI-powered Reddit automation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={authenticated ? 'default' : 'secondary'}>
                {authenticated ? 'Connected' : 'Disconnected'}
              </Badge>
              {status?.agentRunning && (
                <Badge variant="default" className="bg-green-600">
                  <Activity className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={loadStatus} disabled={loading}>
                <ArrowsClockwise className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          {!authenticated ? (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Network className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Connect to Reddit</h3>
                <p className="text-sm text-muted-foreground">Enter your Reddit API credentials to get started</p>
              </div>
              <Input
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                placeholder="Reddit Client ID"
                className="transition-all duration-300 focus:ring-2 focus:ring-blue-500"
              />
              <Input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                placeholder="Reddit Client Secret"
                className="transition-all duration-300 focus:ring-2 focus:ring-blue-500"
              />
              <Input
                type="password"
                value={credentials.refreshToken}
                onChange={(e) => setCredentials({ ...credentials, refreshToken: e.target.value })}
                placeholder="Reddit Refresh Token"
                className="transition-all duration-300 focus:ring-2 focus:ring-blue-500"
              />
              <Button 
                onClick={handleAuthenticate} 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? 'Connecting...' : 'Connect to Reddit'}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
                <TabsTrigger value="logs">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                  <div>
                    <h4 className="font-medium">Auto-Reply Agent</h4>
                    <p className="text-sm text-muted-foreground">
                      {status?.agentRunning ? 'Actively monitoring and responding to DMs' : 'Standby mode - manual operation only'}
                    </p>
                  </div>
                  <Button
                    onClick={handleAgentToggle}
                    disabled={loading}
                    variant={status?.agentRunning ? 'destructive' : 'default'}
                    className="min-w-[100px]"
                  >
                    {status?.agentRunning ? (
                      <Square className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {status?.agentRunning ? 'Stop' : 'Start'}
                  </Button>
                </div>

                {(serviceStats || localStats) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <ChatCircle className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">{(serviceStats || localStats)?.totalDMsProcessed || 0}</div>
                      <div className="text-xs text-muted-foreground">Processed</div>
                    </div>

                    <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <PaperPlaneTilt className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold">{(serviceStats || localStats)?.totalRepliesSent || 0}</div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>

                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <Activity className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <div className="text-2xl font-bold">{status?.agentRunning ? 'Yes' : 'No'}</div>
                      <div className="text-xs text-muted-foreground">Running</div>
                    </div>

                    <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                      <Warning className="h-6 w-6 mx-auto mb-2 text-red-600" />
                      <div className="text-2xl font-bold">{(serviceStats || localStats)?.errors || 0}</div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="config" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">AI Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-xs font-medium">Model</label>
                        <Input
                          value={config?.model || 'llama3.2:latest'}
                          onChange={(e) => updateConfig({ model: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Response Delay (seconds)</label>
                        <Input
                          type="number"
                          value={config?.responseDelay || 30}
                          onChange={(e) => updateConfig({ responseDelay: parseInt(e.target.value) })}
                          className="text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Behavior</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-medium">Auto-Reply</label>
                          <p className="text-xs text-muted-foreground">Automatically respond to DMs</p>
                        </div>
                        <Switch
                          checked={config?.autoReply || false}
                          onCheckedChange={(checked) => updateConfig({ autoReply: checked })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Rate Limit (per hour)</label>
                        <Input
                          type="number"
                          value={config?.maxMessagesPerHour || 10}
                          onChange={(e) => updateConfig({ maxMessagesPerHour: parseInt(e.target.value) })}
                          className="text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>System initialized</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                        {status?.agentRunning && (
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <span>Agent started</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date().toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>Ready for DMs</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
