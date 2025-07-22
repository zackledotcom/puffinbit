/**
 * Model Context Protocol (MCP) Service for Puffer
 * 
 * Integrates MCP servers for enhanced AI capabilities:
 * - Puppeteer server for web automation
 * - Research Quest for web research
 * - Filesystem server for advanced file operations
 * 
 * @author Puffer Engineering Team
 * @version 1.0.0
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { safeLog, safeError, safeWarn, safeInfo } from '@utils/safeLogger'

// MCP Server Configurations
interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  enabled: boolean
  description: string
  capabilities: string[]
}

interface MCPMessage {
  jsonrpc: '2.0'
  id?: string | number
  method?: string
  params?: any
  result?: any
  error?: any
}

interface MCPResponse {
  success: boolean
  data?: any
  error?: string
  serverName?: string
}

class MCPService extends EventEmitter {
  private servers: Map<string, { process: ChildProcess; config: MCPServerConfig }> = new Map()
  private isInitialized = false

  private readonly serverConfigs: MCPServerConfig[] = [
    {
      name: 'puppeteer',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      enabled: true,
      description: 'Web automation and browser control',
      capabilities: ['web_scraping', 'browser_automation', 'screenshot', 'pdf_generation']
    },
    {
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', './'],
      enabled: true,
      description: 'Advanced filesystem operations',
      capabilities: ['file_operations', 'directory_traversal', 'file_search', 'text_manipulation']
    },
    {
      name: 'research-quest',
      command: 'node',
      args: ['./node_modules/research-quest/server.js'],
      enabled: false, // Disabled by default, needs manual installation
      description: 'Web research and information gathering',
      capabilities: ['web_research', 'data_extraction', 'fact_checking', 'source_validation']
    },
    {
      name: 'sqlite',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite'],
      enabled: true,
      description: 'SQLite database operations',
      capabilities: ['database_queries', 'data_storage', 'sql_operations']
    },
    {
      name: 'brave-search',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      enabled: false, // Requires API key
      description: 'Brave Search API integration',
      capabilities: ['web_search', 'real_time_data', 'search_results']
    }
  ]

  constructor() {
    super()
  }

  /**
   * Initialize MCP service and start enabled servers
   */
  async initialize(): Promise<boolean> {
    try {
      safeInfo('🔧 Initializing MCP Service...')

      let successCount = 0
      let totalEnabled = this.serverConfigs.filter(c => c.enabled).length

      if (totalEnabled === 0) {
        safeWarn('⚠️ No MCP servers enabled - MCP service will be available but no servers will run')
        this.isInitialized = true
        this.emit('initialized')
        return true
      }

      // Start enabled servers with individual error handling
      for (const config of this.serverConfigs) {
        if (config.enabled) {
          try {
            const started = await this.startServer(config)
            if (started) {
              successCount++
              safeInfo(`✅ MCP server ${config.name} started successfully`)
            } else {
              safeWarn(`⚠️ MCP server ${config.name} failed to start but continuing...`)
            }
          } catch (error: any) {
            safeError(`❌ Error starting MCP server ${config.name}:`, error.message)
            // Continue with other servers even if one fails
          }
        }
      }

      this.isInitialized = true
      
      if (successCount > 0) {
        safeInfo(`✅ MCP Service initialized successfully - ${successCount}/${totalEnabled} servers running`)
        this.emit('initialized', { successCount, totalEnabled })
        return true
      } else {
        safeWarn('⚠️ MCP Service initialized but no servers are running')
        this.emit('initialized', { successCount: 0, totalEnabled })
        return true // Still return true as the service itself is ready
      }
    } catch (error: any) {
      safeError('❌ Failed to initialize MCP Service:', error.message)
      this.emit('error', error)
      return false
    }
  }

  /**
   * Start an MCP server
   */
  private async startServer(config: MCPServerConfig): Promise<boolean> {
    try {
      safeInfo(`Starting MCP server: ${config.name}`)

      const childProcess = spawn(config.command, config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production' }
      })

      // PHASE 2 FIX: Unref process to prevent M1 CPU drain
      childProcess.unref();

      childProcess.on('error', (error) => {
        safeError(`MCP server ${config.name} error:`, error)
        this.servers.delete(config.name)
        this.emit('server_error', { server: config.name, error })
      })

      childProcess.on('exit', (code, signal) => {
        safeWarn(`MCP server ${config.name} exited with code ${code}, signal ${signal}`)
        this.servers.delete(config.name)
        this.emit('server_exit', { server: config.name, code, signal })
      })

      // Handle server stdout for responses
      childProcess.stdout?.on('data', (data) => {
        try {
          const messages = data.toString().split('\n').filter(Boolean)
          for (const message of messages) {
            const mcpMessage: MCPMessage = JSON.parse(message)
            this.handleServerMessage(config.name, mcpMessage)
          }
        } catch (error) {
          safeError(`Failed to parse MCP message from ${config.name}:`, error)
        }
      })

      childProcess.stderr?.on('data', (data) => {
        safeWarn(`MCP server ${config.name} stderr:`, data.toString())
      })

      this.servers.set(config.name, { process: childProcess, config })
      
      // Wait for server to be ready
      await this.waitForServerReady(config.name)
      
      safeInfo(`MCP server ${config.name} started successfully`)
      return true
    } catch (error: any) {
      safeError(`Failed to start MCP server ${config.name}:`, error.message)
      return false
    }
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServerReady(serverName: string, timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkReady = async () => {
        try {
          const response = await this.sendMessage(serverName, {
            jsonrpc: '2.0',
            id: 'init',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {}
            }
          })

          if (response.success) {
            resolve()
          } else if (Date.now() - startTime > timeout) {
            reject(new Error(`Server ${serverName} initialization timeout`))
          } else {
            setTimeout(checkReady, 1000)
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error)
          } else {
            setTimeout(checkReady, 1000)
          }
        }
      }

      checkReady()
    })
  }

  /**
   * Send message to MCP server
   */
  async sendMessage(serverName: string, message: MCPMessage): Promise<MCPResponse> {
    const server = this.servers.get(serverName)
    if (!server) {
      return {
        success: false,
        error: `Server ${serverName} not found or not running`,
        serverName
      }
    }

    return new Promise((resolve) => {
      const messageId = message.id || Date.now().toString()
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: `Timeout waiting for response from ${serverName}`,
          serverName
        })
      }, 30000)

      // Listen for response
      const responseHandler = (response: MCPMessage) => {
        if (response.id === messageId) {
          clearTimeout(timeout)
          this.removeListener(`response_${serverName}`, responseHandler)
          
          if (response.error) {
            resolve({
              success: false,
              error: response.error.message || 'MCP server error',
              serverName
            })
          } else {
            resolve({
              success: true,
              data: response.result,
              serverName
            })
          }
        }
      }

      this.on(`response_${serverName}`, responseHandler)

      // Send message
      try {
        server.process.stdin?.write(JSON.stringify(message) + '\n')
      } catch (error: any) {
        clearTimeout(timeout)
        this.removeListener(`response_${serverName}`, responseHandler)
        resolve({
          success: false,
          error: `Failed to send message to ${serverName}: ${error.message}`,
          serverName
        })
      }
    })
  }

  /**
   * Handle incoming messages from servers
   */
  private handleServerMessage(serverName: string, message: MCPMessage): void {
    if (message.id) {
      // Response to a request
      this.emit(`response_${serverName}`, message)
    } else if (message.method) {
      // Notification or request from server
      this.emit(`notification_${serverName}`, message)
    }
  }

  /**
   * Puppeteer operations
   */
  async puppeteerScreenshot(url: string, options?: any): Promise<MCPResponse> {
    return this.sendMessage('puppeteer', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'screenshot',
      params: { url, ...options }
    })
  }

  async puppeteerScrape(url: string, selector?: string): Promise<MCPResponse> {
    return this.sendMessage('puppeteer', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'scrape',
      params: { url, selector }
    })
  }

  async puppeteerClick(url: string, selector: string): Promise<MCPResponse> {
    return this.sendMessage('puppeteer', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'click',
      params: { url, selector }
    })
  }

  /**
   * Filesystem operations
   */
  async filesystemReadFile(path: string): Promise<MCPResponse> {
    return this.sendMessage('filesystem', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'read_file',
      params: { path }
    })
  }

  async filesystemWriteFile(path: string, content: string): Promise<MCPResponse> {
    return this.sendMessage('filesystem', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'write_file',
      params: { path, content }
    })
  }

  async filesystemListDirectory(path: string): Promise<MCPResponse> {
    return this.sendMessage('filesystem', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'list_directory',
      params: { path }
    })
  }

  /**
   * Research Quest operations
   */
  async researchSearch(query: string, options?: any): Promise<MCPResponse> {
    return this.sendMessage('research-quest', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'search',
      params: { query, ...options }
    })
  }

  async researchFactCheck(claim: string): Promise<MCPResponse> {
    return this.sendMessage('research-quest', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'fact_check',
      params: { claim }
    })
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean
    servers: Array<{
      name: string
      running: boolean
      description: string
      capabilities: string[]
    }>
  } {
    return {
      initialized: this.isInitialized,
      servers: this.serverConfigs.map(config => ({
        name: config.name,
        running: this.servers.has(config.name),
        description: config.description,
        capabilities: config.capabilities
      }))
    }
  }

  /**
   * Stop all servers
   */
  async stop(): Promise<void> {
    safeInfo('Stopping MCP Service...')

    for (const [name, { process }] of this.servers) {
      try {
        process.kill('SIGTERM')
        safeInfo(`Stopped MCP server: ${name}`)
      } catch (error) {
        safeError(`Failed to stop MCP server ${name}:`, error)
      }
    }

    this.servers.clear()
    this.isInitialized = false
    this.emit('stopped')
  }

  /**
   * Restart a server
   */
  async restartServer(serverName: string): Promise<boolean> {
    const config = this.serverConfigs.find(c => c.name === serverName)
    if (!config) {
      return false
    }

    // Stop if running
    const server = this.servers.get(serverName)
    if (server) {
      server.process.kill('SIGTERM')
      this.servers.delete(serverName)
    }

    // Restart
    return this.startServer(config)
  }

  /**
   * Enable/disable a server
   */
  async toggleServer(serverName: string, enabled: boolean): Promise<boolean> {
    const config = this.serverConfigs.find(c => c.name === serverName)
    if (!config) {
      return false
    }

    config.enabled = enabled

    if (enabled && !this.servers.has(serverName)) {
      return this.startServer(config)
    } else if (!enabled && this.servers.has(serverName)) {
      const server = this.servers.get(serverName)
      if (server) {
        server.process.kill('SIGTERM')
        this.servers.delete(serverName)
      }
      return true
    }

    return true
  }

  /**
   * Get detailed server information
   */
  getServerInfo(serverName: string): {
    config?: MCPServerConfig
    running: boolean
    pid?: number
    uptime?: number
  } {
    const config = this.serverConfigs.find(c => c.name === serverName)
    const server = this.servers.get(serverName)
    
    return {
      config,
      running: !!server,
      pid: server?.process.pid,
      uptime: server ? Date.now() - (server.process.spawnargs.length > 0 ? Date.now() : 0) : undefined
    }
  }

  /**
   * Health check for all servers
   */
  async healthCheck(): Promise<{
    service: { initialized: boolean; serverCount: number }
    servers: Array<{
      name: string
      status: 'running' | 'stopped' | 'error'
      lastError?: string
    }>
  }> {
    const serverStatuses = []
    
    for (const config of this.serverConfigs) {
      if (config.enabled) {
        const server = this.servers.get(config.name)
        if (server) {
          try {
            // Try to send a ping to verify the server is responsive
            const response = await this.sendMessage(config.name, {
              jsonrpc: '2.0',
              id: 'health-check',
              method: 'ping',
              params: {}
            })
            
            serverStatuses.push({
              name: config.name,
              status: response.success ? 'running' : 'error',
              lastError: response.error
            })
          } catch (error: any) {
            serverStatuses.push({
              name: config.name,
              status: 'error',
              lastError: error.message
            })
          }
        } else {
          serverStatuses.push({
            name: config.name,
            status: 'stopped'
          })
        }
      }
    }

    return {
      service: {
        initialized: this.isInitialized,
        serverCount: this.servers.size
      },
      servers: serverStatuses
    }
  }

  /**
   * Add a custom server configuration
   */
  addCustomServer(config: MCPServerConfig): boolean {
    try {
      // Validate the config
      if (!config.name || !config.command || !Array.isArray(config.args)) {
        throw new Error('Invalid server configuration')
      }

      // Check if server already exists
      if (this.serverConfigs.find(c => c.name === config.name)) {
        throw new Error(`Server ${config.name} already exists`)
      }

      this.serverConfigs.push(config)
      safeInfo(`Added custom MCP server: ${config.name}`)
      return true
    } catch (error: any) {
      safeError('Failed to add custom server:', error.message)
      return false
    }
  }

  /**
   * Remove a server configuration
   */
  async removeServer(serverName: string): Promise<boolean> {
    try {
      // Stop the server if running
      const server = this.servers.get(serverName)
      if (server) {
        server.process.kill('SIGTERM')
        this.servers.delete(serverName)
      }

      // Remove from config
      const index = this.serverConfigs.findIndex(c => c.name === serverName)
      if (index !== -1) {
        this.serverConfigs.splice(index, 1)
        safeInfo(`Removed MCP server: ${serverName}`)
        return true
      }

      return false
    } catch (error: any) {
      safeError(`Failed to remove server ${serverName}:`, error.message)
      return false
    }
  }
}

// Export singleton instance
export const mcpService = new MCPService()
export default mcpService

// Export types
export type { MCPServerConfig, MCPMessage, MCPResponse }
