import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { Slider } from '../ui/slider'
import { Textarea } from '../ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  Brain,
  Clock,
  Shield,
  Users,
  MessageSquare,
  Filter,
  Zap,
  Target,
  Settings,
  Code,
  Database,
  Activity,
  Save,
  RotateCcw,
  TestTube
} from 'phosphor-react'

const RedditBotConfig = () => {
  const [config, setConfig] = useState({
    // AI Configuration
    model: 'llama3.2:latest',
    temperature: 0.7,
    maxTokens: 500,
    systemPrompt: `You are a helpful Reddit assistant. You receive direct messages and should respond helpfully and concisely.

Guidelines:
- Be friendly and professional
- Keep responses under 500 characters
- Don't share personal information
- If unsure, politely decline to help
- Maintain Reddit etiquette`,
    
    // Behavior Settings
    autoReply: true,
    responseDelay: [30],
    pollInterval: [5],
    maxResponseLength: 500,
    
    // Rate Limiting
    maxMessagesPerHour: 10,
    maxMessagesPerDay: 50,
    cooldownPeriod: 60,
    
    // Content Filtering
    enableContentFilter: true,
    triggerKeywords: ['help', 'question', 'support', 'assistance'],
    ignoreKeywords: ['spam', 'advertisement', 'promotion', 'buy', 'sell'],
    
    // User Management
    blacklistedUsers: [],
    whitelistedUsers: [],
    autoBlacklist: false,
    
    // Security
    enableLogging: true,
    requireConfirmation: false,
    restrictToSubreddits: [],
    minAccountAge: 30,
    minKarma: 10,
    
    // Advanced
    enableMemory: true,
    contextLength: 3,
    enableAnalytics: true,
    debugMode: false
  })

  const [activeTab, setActiveTab] = useState('ai')
  const [testMode, setTestMode] = useState(false)

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      await window.api.redditAgentUpdateConfig(config)
      alert('Configuration saved successfully!')
    } catch (error) {
      alert('Failed to save configuration: ' + error.message)
    }
  }

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      location.reload()
    }
  }

  const handleTest = async () => {
    setTestMode(true)
    try {
      const result = await window.api.redditAgentTestConnection()
      alert(result.success ? 'Test successful!' : 'Test failed: ' + result.message)
    } catch (error) {
      alert('Test failed: ' + error.message)
    } finally {
      setTimeout(() => setTestMode(false), 3000)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Bot Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">Advanced settings for Reddit DM automation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" onClick={handleTest} disabled={testMode}>
                <TestTube className="h-4 w-4 mr-2" />
                {testMode ? 'Testing...' : 'Test'}
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Engine
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Model Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Model Selection</Label>
                  <Select value={config.model} onValueChange={(value) => updateConfig('model', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama3.2:latest">Llama 3.2 (Latest)</SelectItem>
                      <SelectItem value="llama3.1:latest">Llama 3.1 (Stable)</SelectItem>
                      <SelectItem value="mistral:latest">Mistral 7B</SelectItem>
                      <SelectItem value="codellama:latest">Code Llama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Temperature: {config.temperature}</Label>
                  <Slider
                    value={[config.temperature]}
                    onValueChange={(value) => updateConfig('temperature', value[0])}
                    max={2}
                    min={0}
                    step={0.1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                <div>
                  <Label>Max Response Length</Label>
                  <Input
                    type="number"
                    value={config.maxResponseLength}
                    onChange={(e) => updateConfig('maxResponseLength', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  System Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) => updateConfig('systemPrompt', e.target.value)}
                  rows={12}
                  className="resize-none"
                  placeholder="Define how the AI should behave..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This prompt defines the AI's personality and behavior guidelines
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timing & Rate Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Reply Enabled</Label>
                    <p className="text-xs text-muted-foreground">Automatically respond to DMs</p>
                  </div>
                  <Switch
                    checked={config.autoReply}
                    onCheckedChange={(checked) => updateConfig('autoReply', checked)}
                  />
                </div>

                <div>
                  <Label>Response Delay: {config.responseDelay[0]}s</Label>
                  <Slider
                    value={config.responseDelay}
                    onValueChange={(value) => updateConfig('responseDelay', value)}
                    max={300}
                    min={5}
                    step={5}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max/Hour</Label>
                    <Input
                      type="number"
                      value={config.maxMessagesPerHour}
                      onChange={(e) => updateConfig('maxMessagesPerHour', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Max/Day</Label>
                    <Input
                      type="number"
                      value={config.maxMessagesPerDay}
                      onChange={(e) => updateConfig('maxMessagesPerDay', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Response Behavior
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Memory</Label>
                    <p className="text-xs text-muted-foreground">Remember conversation context</p>
                  </div>
                  <Switch
                    checked={config.enableMemory}
                    onCheckedChange={(checked) => updateConfig('enableMemory', checked)}
                  />
                </div>

                {config.enableMemory && (
                  <div>
                    <Label>Context Length: {config.contextLength} messages</Label>
                    <Slider
                      value={[config.contextLength]}
                      onValueChange={(value) => updateConfig('contextLength', value[0])}
                      max={10}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Content Filtering
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Content Filter</Label>
                    <p className="text-xs text-muted-foreground">Filter messages based on keywords</p>
                  </div>
                  <Switch
                    checked={config.enableContentFilter}
                    onCheckedChange={(checked) => updateConfig('enableContentFilter', checked)}
                  />
                </div>

                <div>
                  <Label>Trigger Keywords</Label>
                  <Textarea
                    value={config.triggerKeywords.join(', ')}
                    onChange={(e) => updateConfig('triggerKeywords', e.target.value.split(', ').filter(k => k.trim()))}
                    rows={3}
                    placeholder="help, question, support..."
                  />
                </div>

                <div>
                  <Label>Ignore Keywords</Label>
                  <Textarea
                    value={config.ignoreKeywords.join(', ')}
                    onChange={(e) => updateConfig('ignoreKeywords', e.target.value.split(', ').filter(k => k.trim()))}
                    rows={3}
                    placeholder="spam, advertisement, promotion..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Blacklisted Users</Label>
                  <Textarea
                    value={config.blacklistedUsers.join('\n')}
                    onChange={(e) => updateConfig('blacklistedUsers', e.target.value.split('\n').filter(u => u.trim()))}
                    rows={4}
                    placeholder="username1&#10;username2..."
                  />
                </div>

                <div>
                  <Label>Whitelisted Users</Label>
                  <Textarea
                    value={config.whitelistedUsers.join('\n')}
                    onChange={(e) => updateConfig('whitelistedUsers', e.target.value.split('\n').filter(u => u.trim()))}
                    rows={4}
                    placeholder="moderator1&#10;friend_user..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Developer Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Debug Mode</Label>
                    <p className="text-xs text-muted-foreground">Enable verbose logging</p>
                  </div>
                  <Switch
                    checked={config.debugMode}
                    onCheckedChange={(checked) => updateConfig('debugMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Analytics</Label>
                    <p className="text-xs text-muted-foreground">Track performance metrics</p>
                  </div>
                  <Switch
                    checked={config.enableAnalytics}
                    onCheckedChange={(checked) => updateConfig('enableAnalytics', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">
                  Export Configuration
                </Button>
                <Button variant="outline" className="w-full">
                  Import Configuration
                </Button>
                <Button variant="destructive" className="w-full">
                  Reset All Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RedditBotConfig