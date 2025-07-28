import React, { useState } from 'react'
import CompleteModelHealthDashboard from './CompleteModelHealthDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Activity as Gauge,
  Info as Eye,
  X as EyeOff,
  Lightning as Refresh,
  Gear as Settings,
  Star,
  Star as Heart,
  Lightning as Zap,
  CheckCircle as Shield,
  Activity
} from 'phosphor-react'

export default function MagicUIHealthDemoPage() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedModel, setSelectedModel] = useState('llama3.1:8b')
  const [refreshCount, setRefreshCount] = useState(0)

  const models = [
    { id: 'llama3.1:8b', name: 'Llama 3.1 8B', status: 'excellent' },
    { id: 'mistral:7b', name: 'Mistral 7B', status: 'good' },
    { id: 'codellama:13b', name: 'CodeLlama 13B', status: 'warning' },
    { id: 'gemma:2b', name: 'Gemma 2B', status: 'critical' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500'
      case 'good':
        return 'bg-blue-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Star className="w-4 h-4" />
      case 'good':
        return <Heart className="w-4 h-4" />
      case 'warning':
        return <Zap className="w-4 h-4" />
      case 'critical':
        return <Shield className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="glass-panel border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  <Gauge className="w-8 h-8 text-blue-400" />
                  Magic UI Health Dashboard Demo
                </CardTitle>
                <p className="text-gray-400 mt-1">
                  Complete model monitoring with advanced Magic UI components
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                  Live Demo
                </Badge>
                <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                  Magic UI
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Controls */}
        <Card className="glass-panel border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Model:</span>
                  <div className="flex gap-2">
                    {models.map((model) => (
                      <Button
                        key={model.id}
                        variant={selectedModel === model.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedModel(model.id)}
                        className="flex items-center gap-2"
                      >
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(model.status)}`} />
                        {model.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2"
                >
                  {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRefreshCount((prev) => prev + 1)}
                  className="flex items-center gap-2"
                >
                  <Refresh className="w-4 h-4" />
                  Refresh ({refreshCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="full" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-panel border-0">
            <TabsTrigger value="full" className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Full Dashboard
            </TabsTrigger>
            <TabsTrigger value="compact" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Compact View
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Multi-Model
            </TabsTrigger>
          </TabsList>

          <TabsContent value="full" className="space-y-6">
            <CompleteModelHealthDashboard
              modelName={selectedModel}
              showAdvanced={showAdvanced}
              onRefresh={() => setRefreshCount((prev) => prev + 1)}
              className="w-full"
            />
          </TabsContent>

          <TabsContent value="compact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <CompleteModelHealthDashboard
                  key={model.id}
                  modelName={model.name}
                  compact={true}
                  className="w-full"
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {models.slice(0, 2).map((model) => (
                <CompleteModelHealthDashboard
                  key={model.id}
                  modelName={model.name}
                  showAdvanced={showAdvanced}
                  className="w-full"
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Feature Showcase */}
        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">
              Magic UI Features Showcase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">
                    AnimatedCircularProgressBar
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Smooth animated progress circles with customizable colors
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/20 to-teal-500/20 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-green-300">NumberTicker</span>
                </div>
                <p className="text-xs text-gray-400">Numbers animate smoothly instead of jumping</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Ripple Effects</span>
                </div>
                <p className="text-xs text-gray-400">
                  Beautiful ripple animations for excellent status
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-300">AnimatedBeam</span>
                </div>
                <p className="text-xs text-gray-400">Data flow visualization with animated beams</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
