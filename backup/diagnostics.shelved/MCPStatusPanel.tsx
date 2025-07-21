/**
 * MCP (Model Context Protocol) Status Panel
 * 
 * Real-time monitoring and control of MCP servers for enhanced AI capabilities
 * 
 * @author Puffer Engineering Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Play, Square, Settings } from 'lucide-react'

// Declare global api interface for TypeScript
declare global {
  interface Window {
    api: {
      mcpStatus: () => Promise<{
        initialized: boolean
        servers: Array<{
          name: string
          running: boolean
          description: string
          capabilities: string[]
        }>
      }>
      mcpHealthCheck: () => Promise<{
        success: boolean
        data?: {
          service: { initialized: boolean; serverCount: number }
          servers: Array<{
            name: string
            status: 'running' | 'stopped' | 'error'
            lastError?: string
          }>
        }
      }>
      mcpInitialize: () => Promise<{ success: boolean; error?: string }>
      mcpRestartServer: (serverName: string) => Promise<{ success: boolean; error?: string }>
      mcpToggleServer: (serverName: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>
      mcpServerInfo: (serverName: string) => Promise<{
        success: boolean
        data?: {
          config?: any
          running: boolean
          pid?: number
          uptime?: number
        }
      }>
    }
  }
}

interface MCPServer {
  name: string
  running: boolean
  description: string
  capabilities: string[]
  status?: 'running' | 'stopped' | 'error'
  lastError?: string
}

interface MCPServiceInfo {
  initialized: boolean
  serverCount: number
}

export const MCPStatusPanel: React.FC = () => {
  const [mcpService, setMCPService] = useState<MCPServiceInfo>({ initialized: false, serverCount: 0 })
  const [servers, setServers] = useState<MCPServer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)

  const loadMCPStatus = async () => {
    try {
      const [statusResponse, healthResponse] = await Promise.all([
        window.api.mcpStatus(),
        window.api.mcpHealthCheck()
      ])

      if (healthResponse.success && healthResponse.data) {
        setMCPService(healthResponse.data.service)
        
        // Merge status and health data
        const healthServers = healthResponse.data.servers
        const enhancedServers = statusResponse.servers.map(server => {
          const healthData = healthServers.find(h => h.name === server.name)
          return {
            ...server,
            status: healthData?.status || (server.running ? 'running' : 'stopped'),
            lastError: healthData?.lastError
          }
        })
        
        setServers(enhancedServers)
      } else {
        setServers(statusResponse.servers)
        setMCPService({ initialized: statusResponse.initialized, serverCount: statusResponse.servers.filter(s => s.running).length })
      }
    } catch (error) {
      console.error('Failed to load MCP status:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const refreshStatus = async () => {
    setIsRefreshing(true)
    await loadMCPStatus()
  }

  const initializeMCP = async () => {
    try {
      const result = await window.api.mcpInitialize()
      if (result.success) {
        await loadMCPStatus()
      } else {
        console.error('Failed to initialize MCP:', result.error)
      }
    } catch (error) {
      console.error('Error initializing MCP:', error)
    }
  }

  const toggleServer = async (serverName: string, currentlyRunning: boolean) => {
    try {
      const result = await window.api.mcpToggleServer(serverName, !currentlyRunning)
      if (result.success) {
        await loadMCPStatus()
      } else {
        console.error(`Failed to toggle server ${serverName}:`, result.error)
      }
    } catch (error) {
      console.error(`Error toggling server ${serverName}:`, error)
    }
  }

  const restartServer = async (serverName: string) => {
    try {
      const result = await window.api.mcpRestartServer(serverName)
      if (result.success) {
        await loadMCPStatus()
      } else {
        console.error(`Failed to restart server ${serverName}:`, result.error)
      }
    } catch (error) {
      console.error(`Error restarting server ${serverName}:`, error)
    }
  }

  useEffect(() => {
    loadMCPStatus()
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadMCPStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-white/90 backdrop-blur-sm rounded-xl border border-white/20">
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading MCP status...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white/90 backdrop-blur-sm rounded-xl border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Model Context Protocol</h3>
            <p className="text-sm text-gray-600">Enhanced AI capabilities and automation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-purple-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          {!mcpService.initialized && (
            <button
              onClick={initializeMCP}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              Initialize MCP
            </button>
          )}
        </div>
      </div>

      {/* Service Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(mcpService.initialized ? 'running' : 'stopped')}
            <span className="font-medium">
              Service Status: {mcpService.initialized ? 'Initialized' : 'Not Initialized'}
            </span>
          </div>
          <span className="text-sm text-gray-600">
            {mcpService.serverCount} server{mcpService.serverCount !== 1 ? 's' : ''} running
          </span>
        </div>
      </div>

      {/* Servers List */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-800 mb-3">Available Servers</h4>
        
        {servers.map((server) => (
          <div key={server.name} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(server.status || 'stopped')}
                <div>
                  <h5 className="font-medium text-gray-800">{server.name}</h5>
                  <p className="text-sm text-gray-600">{server.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-sm ${getStatusColor(server.status || 'stopped')}`}>
                  {server.status || 'stopped'}
                </span>
                
                {server.running && (
                  <button
                    onClick={() => restartServer(server.name)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Restart server"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={() => toggleServer(server.name, server.running)}
                  className={`p-1 transition-colors ${
                    server.running 
                      ? 'text-red-400 hover:text-red-600' 
                      : 'text-green-400 hover:text-green-600'
                  }`}
                  title={server.running ? 'Stop server' : 'Start server'}
                >
                  {server.running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {/* Server Details */}
            {expandedServer === server.name && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Capabilities:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {server.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {server.lastError && (
                    <div>
                      <span className="font-medium text-red-700">Last Error:</span>
                      <p className="mt-1 text-red-600 text-xs">{server.lastError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Toggle Expansion */}
            <button
              onClick={() => setExpandedServer(expandedServer === server.name ? null : server.name)}
              className="mt-2 text-xs text-purple-600 hover:text-purple-800 transition-colors"
            >
              {expandedServer === server.name ? 'Show less' : 'Show details'}
            </button>
          </div>
        ))}
        
        {servers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No MCP servers configured</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MCPStatusPanel