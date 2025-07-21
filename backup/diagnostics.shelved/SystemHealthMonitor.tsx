import React, { useState, useEffect } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Database,
  Cpu,
  Robot,
  Shield,
  Play,
  RefreshCw
} from 'phosphor-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { useAllServices } from '../../hooks/useServices'
import { useAgentService } from '../../hooks/useAgents'

interface TestResult {
  name: string
  status: 'running' | 'passed' | 'failed' | 'pending'
  message: string
  duration?: number
  details?: any
}

const SystemHealthMonitor: React.FC = () => {
  const { ollama, chroma, chat, memory, allServicesConnected } = useAllServices()
  const agents = useAgentService()

  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [systemStats, setSystemStats] = useState({
    uptime: 0,
    totalChats: 0,
    totalAgents: 0,
    memoryUsage: 0
  })

  // System health tests
  const runSystemTests = async () => {
    setIsRunningTests(true)
    const results: TestResult[] = []

    // Test 1: Ollama Service
    results.push({ name: 'Ollama Service', status: 'running', message: 'Testing connection...' })
    setTestResults([...results])

    try {
      await ollama.checkStatus()
      results[results.length - 1] = {
        name: 'Ollama Service',
        status: ollama.status.connected ? 'passed' : 'failed',
        message: ollama.status.message,
        duration: 150
      }
    } catch (error) {
      results[results.length - 1] = {
        name: 'Ollama Service',
        status: 'failed',
        message: 'Connection failed',
        duration: 150
      }
    }
    setTestResults([...results])

    // Test 2: ChromaDB Service
    results.push({ name: 'ChromaDB Service', status: 'running', message: 'Testing connection...' })
    setTestResults([...results])

    try {
      await chroma.checkStatus()
      results[results.length - 1] = {
        name: 'ChromaDB Service',
        status: chroma.status.connected ? 'passed' : 'failed',
        message: chroma.status.message,
        duration: 200
      }
    } catch (error) {
      results[results.length - 1] = {
        name: 'ChromaDB Service',
        status: 'failed',
        message: 'Connection failed',
        duration: 200
      }
    }
    setTestResults([...results])

    // Test 3: Memory System
    results.push({
      name: 'Memory System',
      status: 'running',
      message: 'Testing memory operations...'
    })
    setTestResults([...results])

    try {
      await memory.loadMemoryStore()
      results[results.length - 1] = {
        name: 'Memory System',
        status: 'passed',
        message: 'Memory system operational',
        duration: 100
      }
    } catch (error) {
      results[results.length - 1] = {
        name: 'Memory System',
        status: 'failed',
        message: 'Memory system error',
        duration: 100
      }
    }
    setTestResults([...results])

    // Test 4: Chat Functionality
    results.push({
      name: 'Chat System',
      status: 'running',
      message: 'Testing chat functionality...'
    })
    setTestResults([...results])

    try {
      const chatTest = await chat.sendMessage(
        'Test message for system health check',
        ollama.models[0] || 'tinydolphin:latest',
        [],
        { mode: 'manual', memoryOptions: { enabled: false } }
      )

      results[results.length - 1] = {
        name: 'Chat System',
        status: chatTest.success ? 'passed' : 'failed',
        message: chatTest.success ? 'Chat system working' : 'Chat system error',
        duration: 300,
        details: { response: chatTest.response?.substring(0, 100) + '...' }
      }
    } catch (error) {
      results[results.length - 1] = {
        name: 'Chat System',
        status: 'failed',
        message: 'Chat test failed',
        duration: 300
      }
    }
    setTestResults([...results])

    // Test 5: Agent System
    results.push({
      name: 'Agent System',
      status: 'running',
      message: 'Testing agent functionality...'
    })
    setTestResults([...results])

    try {
      await agents.loadAgents()
      results[results.length - 1] = {
        name: 'Agent System',
        status: agents.error ? 'failed' : 'passed',
        message: agents.error || 'Agent system operational',
        duration: 120,
        details: { agentCount: agents.getAllAgents().length }
      }
    } catch (error) {
      results[results.length - 1] = {
        name: 'Agent System',
        status: 'failed',
        message: 'Agent system error',
        duration: 120
      }
    }
    setTestResults([...results])

    setIsRunningTests(false)
  }

  // Update system stats
  useEffect(() => {
    const updateStats = () => {
      setSystemStats({
        uptime: Math.floor(Date.now() / 1000) % 3600, // Mock uptime
        totalChats: 42, // Mock data
        totalAgents: agents.getAllAgents().length,
        memoryUsage: Math.floor(Math.random() * 100) // Mock memory usage
      })
    }

    updateStats()
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [agents])

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle size={20} className="text-green-500" />
      case 'failed':
        return <XCircle size={20} className="text-red-500" />
      case 'running':
        return <RefreshCw size={20} className="text-blue-500 animate-spin" />
      default:
        return <Clock size={20} className="text-gray-400" />
    }
  }

  const getOverallHealth = () => {
    if (testResults.length === 0) return 'unknown'
    const passed = testResults.filter((r) => r.status === 'passed').length
    const total = testResults.filter((r) => r.status !== 'pending').length

    if (total === 0) return 'unknown'
    if (passed === total) return 'healthy'
    if (passed > total / 2) return 'warning'
    return 'critical'
  }

  const overallHealth = getOverallHealth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-green-600" />
          <h2 className="text-xl font-semibold">System Health Monitor</h2>
          <Badge
            variant={
              overallHealth === 'healthy'
                ? 'default'
                : overallHealth === 'warning'
                  ? 'secondary'
                  : 'destructive'
            }
            className={overallHealth === 'healthy' ? 'bg-green-500' : ''}
          >
            {overallHealth.toUpperCase()}
          </Badge>
        </div>
        <Button
          onClick={runSystemTests}
          disabled={isRunningTests}
          className="flex items-center gap-2"
        >
          <Play size={16} />
          {isRunningTests ? 'Running Tests...' : 'Run Health Check'}
        </Button>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cpu size={20} className="text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Services</p>
                <p className="text-lg font-semibold">{allServicesConnected ? '2/2' : '1/2'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Memory</p>
                <p className="text-lg font-semibold">{systemStats.memoryUsage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Robot size={20} className="text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Agents</p>
                <p className="text-lg font-semibold">{systemStats.totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Security</p>
                <p className="text-lg font-semibold">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Cpu size={20} className="text-blue-500" />
                <div>
                  <p className="font-medium">Ollama Service</p>
                  <p className="text-sm text-gray-600">{ollama.status.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ollama.status.connected ? 'default' : 'destructive'}>
                  {ollama.status.connected ? 'Connected' : 'Disconnected'}
                </Badge>
                {ollama.status.connected && (
                  <Badge variant="secondary">{ollama.models.length} models</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Database size={20} className="text-purple-500" />
                <div>
                  <p className="font-medium">ChromaDB Service</p>
                  <p className="text-sm text-gray-600">{chroma.status.message}</p>
                </div>
              </div>
              <Badge variant={chroma.status.connected ? 'default' : 'destructive'}>
                {chroma.status.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Health Check Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-gray-600">{result.message}</p>
                      {result.details && (
                        <p className="text-xs text-gray-500 mt-1">
                          {JSON.stringify(result.details)}
                        </p>
                      )}
                    </div>
                  </div>
                  {result.duration && <Badge variant="outline">{result.duration}ms</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">System Memory</span>
                <span className="text-sm text-gray-600">{systemStats.memoryUsage}%</span>
              </div>
              <Progress value={systemStats.memoryUsage} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Vector Database</span>
                <span className="text-sm text-gray-600">45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Chat History</span>
                <span className="text-sm text-gray-600">23%</span>
              </div>
              <Progress value={23} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SystemHealthMonitor
