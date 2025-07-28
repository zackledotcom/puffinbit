import React from 'react'
import CompleteModelHealthDashboard from './CompleteModelHealthDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface HealthDemoPageProps {
  className?: string
}

export default function HealthDemoPage({ className }: HealthDemoPageProps) {
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-100 p-6 ${className}`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Complete Magic UI Model Health Dashboard
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Comprehensive real-time monitoring and analytics for your AI models featuring Magic UI
            components, animated circular progress bars, number tickers, ripple effects, and
            advanced metrics visualization.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-blue-500/20 text-blue-600 bg-blue-50">
              Magic UI Components
            </Badge>
            <Badge variant="outline" className="border-purple-500/20 text-purple-600 bg-purple-50">
              Animated Progress Bars
            </Badge>
            <Badge variant="outline" className="border-green-500/20 text-green-600 bg-green-50">
              Real-time Updates
            </Badge>
            <Badge variant="outline" className="border-orange-500/20 text-orange-600 bg-orange-50">
              Ripple Effects
            </Badge>
            <Badge variant="outline" className="border-red-500/20 text-red-600 bg-red-50">
              Number Tickers
            </Badge>
          </div>
        </div>

        {/* Demo Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard">Full Dashboard</TabsTrigger>
            <TabsTrigger value="compact">Compact View</TabsTrigger>
            <TabsTrigger value="detailed">Detailed View</TabsTrigger>
            <TabsTrigger value="multiple">Multiple Models</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CompleteModelHealthDashboard
                modelName="llama3.1:8b"
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="mistral:7b"
                onRefresh={() => console.log('Refreshed!')}
              />
            </div>
          </TabsContent>

          <TabsContent value="compact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <CompleteModelHealthDashboard
                modelName="llama3.1:8b"
                compact={true}
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="mistral:7b"
                compact={true}
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="codellama:13b"
                compact={true}
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="neural-chat:7b"
                compact={true}
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="phi:3b"
                compact={true}
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="orca-mini:3b"
                compact={true}
                onRefresh={() => console.log('Refreshed!')}
              />
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <CompleteModelHealthDashboard
                modelName="llama3.1:8b"
                showDetails={true}
                onRefresh={() => console.log('Refreshed!')}
              />
            </div>
          </TabsContent>

          <TabsContent value="multiple" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <CompleteModelHealthDashboard
                modelName="llama3.1:8b"
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="mistral:7b"
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="codellama:13b"
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="neural-chat:7b"
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="phi:3b"
                onRefresh={() => console.log('Refreshed!')}
              />
              <CompleteModelHealthDashboard
                modelName="orca-mini:3b"
                onRefresh={() => console.log('Refreshed!')}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Features showcase */}
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 text-xl">
              🚀 Complete Features Implemented
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-600">Magic UI Components</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>✅ AnimatedCircularProgressBar</li>
                  <li>✅ NumberTicker for live stats</li>
                  <li>✅ Ripple effects for status</li>
                  <li>✅ Animated progress bars</li>
                  <li>✅ Tooltip interactions</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-green-600">Real-time Metrics</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>✅ Overall health percentage</li>
                  <li>✅ Performance monitoring</li>
                  <li>✅ Memory usage tracking</li>
                  <li>✅ Temperature monitoring</li>
                  <li>✅ Response time metrics</li>
                  <li>✅ Token generation speed</li>
                  <li>✅ Accuracy tracking</li>
                  <li>✅ Throughput monitoring</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-purple-600">Interactive Features</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>✅ Status indicators with trends</li>
                  <li>✅ Hover tooltips</li>
                  <li>✅ Refresh functionality</li>
                  <li>✅ Detailed view toggle</li>
                  <li>✅ Error alerts</li>
                  <li>✅ Compact & full views</li>
                  <li>✅ Dynamic color coding</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-orange-600">Advanced Features</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>✅ Multi-model support</li>
                  <li>✅ Status-based theming</li>
                  <li>✅ Advanced metrics panel</li>
                  <li>✅ Performance insights</li>
                  <li>✅ Trend analysis</li>
                  <li>✅ Health summaries</li>
                  <li>✅ Responsive design</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
