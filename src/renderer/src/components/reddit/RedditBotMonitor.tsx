              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">{isLive ? 'Live' : 'Offline'}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-3xl font-bold">{metrics.totalMessages.toLocaleString()}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500">+12% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold">{metrics.successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={metrics.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-3xl font-bold">{metrics.avgResponseTime}s</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-sm text-muted-foreground">Target: &lt;60s</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-3xl font-bold">{metrics.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500">+8 new today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {metrics.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Response Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Immediate (&lt;30s)</span>
                    <span>{metrics.responseDistribution.immediate}%</span>
                  </div>
                  <Progress value={metrics.responseDistribution.immediate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Delayed (30s-2m)</span>
                    <span>{metrics.responseDistribution.delayed}%</span>
                  </div>
                  <Progress value={metrics.responseDistribution.delayed} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Failed/Timeout</span>
                    <span>{metrics.responseDistribution.failed}%</span>
                  </div>
                  <Progress value={metrics.responseDistribution.failed} className="h-2 bg-red-100" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Memory Usage</span>
                    <span className={getPerformanceColor(metrics.performance.memoryUsage)}>
                      {metrics.performance.memoryUsage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.performance.memoryUsage} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>CPU Usage</span>
                    <span className={getPerformanceColor(metrics.performance.cpuUsage)}>
                      {metrics.performance.cpuUsage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.performance.cpuUsage} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>AI Model Load</span>
                    <span className={getPerformanceColor(metrics.performance.aiModelLoad, 95)}>
                      {metrics.performance.aiModelLoad.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.performance.aiModelLoad} className="h-3" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Network & API Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm font-medium">Reddit API</span>
                  <Badge variant="default" className="bg-green-600">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm font-medium">Ollama Service</span>
                  <Badge variant="default" className="bg-green-600">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm font-medium">Database</span>
                  <Badge variant="default" className="bg-green-600">Online</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm font-medium">Network Latency</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(metrics.performance.networkLatency, 200)}`}>
                    {metrics.performance.networkLatency}ms
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Volume (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-end justify-between gap-2">
                  {metrics.messagesPerHour.map((count, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="w-6 bg-blue-500 rounded-t" 
                        style={{ height: `${(count / Math.max(...metrics.messagesPerHour)) * 120}px` }}
                      />
                      <span className="text-xs text-muted-foreground mt-1">{index}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Response Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Questions & Help</span>
                  <Badge>45%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">General Support</span>
                  <Badge>32%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Technical Issues</span>
                  <Badge>18%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Other</span>
                  <Badge>5%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rate Limiting</span>
                  <Badge variant="default" className="bg-green-600">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Content Filtering</span>
                  <Badge variant="default" className="bg-green-600">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Verification</span>
                  <Badge variant="default" className="bg-green-600">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Threat Detection</span>
                  <Badge variant="default" className="bg-green-600">Clean</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Model Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Model Status</span>
                  <Badge variant="default" className="bg-green-600">Loaded</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Response Quality</span>
                  <Badge variant="default" className="bg-blue-600">High</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Training Data</span>
                  <Badge variant="default" className="bg-green-600">Current</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Context Memory</span>
                  <Badge variant="default" className="bg-green-600">Optimal</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Last updated: {metrics.lastActivity.toLocaleTimeString()}</span>
              <span>•</span>
              <span>Uptime: {metrics.uptime}%</span>
              <span>•</span>
              <span>Total errors: {metrics.errors}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>System operational</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RedditBotMonitor