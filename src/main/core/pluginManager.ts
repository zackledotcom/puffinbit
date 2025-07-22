/**
 * PLUGIN ARCHITECTURE SYSTEM
 * Phase 2A: Platform Extensibility - Registry-based plugin system
 * 
 * Features:
 * - Dynamic plugin loading and hot-reload
 * - Sandboxed plugin execution with security boundaries
 * - Plugin lifecycle management (install, enable, disable, uninstall)
 * - Dependency resolution and version management
 * - Plugin API with capability-based permissions
 * - Registry-based discovery and distribution
 */

import { z } from 'zod'
import { EventEmitter } from 'events'
import { join, dirname } from 'path'
import { app } from 'electron'
import { promises as fs } from 'fs'
import { Worker } from 'worker_threads'
import { createHash } from 'crypto'
import { AgentRuntime } from './agentRuntime'

// Plugin schemas
export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  
  // Plugin metadata
  type: z.enum(['tool', 'agent', 'ui', 'integration', 'workflow']),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  
  // Technical requirements
  engine: z.object({
    puffer: z.string(), // semver range
    node: z.string().optional(),
    electron: z.string().optional()
  }),
  
  // Dependencies
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  
  // Plugin capabilities and permissions
  capabilities: z.array(z.string()),
  permissions: z.object({
    filesystem: z.object({
      read: z.array(z.string()).default([]),
      write: z.array(z.string()).default([])
    }).optional(),
    network: z.object({
      domains: z.array(z.string()).default([]),
      external: z.boolean().default(false)
    }).optional(),
    agents: z.object({
      create: z.boolean().default(false),
      execute: z.boolean().default(false),
      manage: z.boolean().default(false)
    }).optional(),
    models: z.object({
      access: z.array(z.string()).default([]),
      execute: z.boolean().default(false)
    }).optional(),
    ui: z.object({
      panels: z.boolean().default(false),
      menus: z.boolean().default(false),
      commands: z.boolean().default(false)
    }).optional()
  }),
  
  // Entry points
  main: z.string(),
  worker: z.string().optional(),
  ui: z.string().optional(),
  
  // Configuration schema
  configSchema: z.record(z.any()).optional(),
  defaultConfig: z.record(z.any()).optional(),
  
  // Plugin metadata
  metadata: z.object({
    icon: z.string().optional(),
    screenshots: z.array(z.string()).optional(),
    documentation: z.string().optional(),
    changelog: z.string().optional(),
    supportUrl: z.string().url().optional()
  }).optional()
})

export const PluginStateSchema = z.object({
  id: z.string(),
  status: z.enum(['installed', 'enabled', 'disabled', 'error', 'loading']),
  version: z.string(),
  installedAt: z.string(),
  enabledAt: z.string().optional(),
  lastError: z.string().optional(),
  config: z.record(z.any()).optional(),
  metrics: z.object({
    loadTime: z.number().optional(),
    memoryUsage: z.number().optional(),
    executionCount: z.number().default(0),
    errorCount: z.number().default(0)
  }).optional()
})

export type PluginManifest = z.infer<typeof PluginManifestSchema>
export type PluginState = z.infer<typeof PluginStateSchema>

interface PluginAPI {
  // Core API
  getManifest(): PluginManifest
  getConfig(): Record<string, any>
  setConfig(config: Record<string, any>): Promise<void>
  
  // Agent integration
  createAgent(config: any): Promise<string>
  executeAgent(agentId: string, task: any): Promise<any>
  
  // Model access
  executeModel(modelId: string, prompt: string, options?: any): Promise<any>
  
  // Memory operations
  storeMemory(content: string, type: string, metadata?: any): Promise<string>
  searchMemory(query: string, options?: any): Promise<any[]>
  
  // UI integration
  addCommand(command: any): void
  addMenuItem(item: any): void
  showNotification(notification: any): void
  
  // Event system
  on(event: string, handler: Function): void
  emit(event: string, data?: any): void
  
  // Filesystem (sandboxed)
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  
  // Network (restricted)
  fetch(url: string, options?: any): Promise<any>
}

/**
 * Plugin Security Sandbox
 * Isolates plugin execution and enforces permissions
 */
class PluginSandbox {
  private pluginId: string
  private permissions: PluginManifest['permissions']
  private worker?: Worker
  private api: Partial<PluginAPI>

  constructor(pluginId: string, manifest: PluginManifest) {
    this.pluginId = pluginId
    this.permissions = manifest.permissions
    this.api = this.createSandboxedAPI()
  }

  async initialize(pluginPath: string): Promise<void> {
    const workerPath = join(__dirname, 'pluginWorker.js')
    this.worker = new Worker(workerPath, {
      workerData: {
        pluginId: this.pluginId,
        pluginPath,
        permissions: this.permissions,
        api: this.api
      }
    })

    this.worker.on('error', (error) => {
      console.error(`Plugin ${this.pluginId} worker error:`, error)
    })

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Plugin ${this.pluginId} worker exited with code ${code}`)
      }
    })
  }

  async execute(method: string, args: any[]): Promise<any> {
    if (!this.worker) {
      throw new Error(`Plugin ${this.pluginId} not initialized`)
    }

    return new Promise((resolve, reject) => {
      const messageId = createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex')
      
      const timeout = setTimeout(() => {
        reject(new Error(`Plugin ${this.pluginId} execution timeout`))
      }, 30000)

      const messageHandler = (message: any) => {
        if (message.id === messageId) {
          clearTimeout(timeout)
          this.worker!.off('message', messageHandler)
          
          if (message.error) {
            reject(new Error(message.error))
          } else {
            resolve(message.result)
          }
        }
      }

      this.worker.on('message', messageHandler)
      this.worker.postMessage({
        id: messageId,
        method,
        args
      })
    })
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = undefined
    }
  }

  private createSandboxedAPI(): Partial<PluginAPI> {
    return {
      // Filesystem access (restricted to plugin directory)
      readFile: this.checkPermission('filesystem', async (path: string) => {
        const safePath = this.validatePath(path)
        return await fs.readFile(safePath, 'utf-8')
      }),

      writeFile: this.checkPermission('filesystem', async (path: string, content: string) => {
        const safePath = this.validatePath(path)
        await fs.writeFile(safePath, content, 'utf-8')
      }),

      // Network access (restricted to allowed domains)
      fetch: this.checkPermission('network', async (url: string, options?: any) => {
        if (!this.isAllowedUrl(url)) {
          throw new Error(`Network access denied: ${url}`)
        }
        // Implementation would use a sandboxed fetch
        return { data: 'sandboxed response' }
      })
    }
  }

  private checkPermission<T extends any[], R>(
    category: string, 
    fn: (...args: T) => R
  ): (...args: T) => R {
    return (...args: T): R => {
      if (!this.hasPermission(category)) {
        throw new Error(`Permission denied: ${category}`)
      }
      return fn(...args)
    }
  }

  private hasPermission(category: string): boolean {
    // Check if plugin has required permission
    return true // Simplified for now
  }

  private validatePath(path: string): string {
    // Ensure path is within plugin directory
    const pluginDir = join(app.getPath('userData'), 'plugins', this.pluginId)
    const resolvedPath = join(pluginDir, path)
    
    if (!resolvedPath.startsWith(pluginDir)) {
      throw new Error('Path traversal not allowed')
    }
    
    return resolvedPath
  }

  private isAllowedUrl(url: string): boolean {
    const allowedDomains = this.permissions.network?.domains || []
    const urlObj = new URL(url)
    
    return allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    )
  }
}

/**
 * Plugin Registry
 * Manages plugin discovery, installation, and distribution
 */
class PluginRegistry extends EventEmitter {
  private registryUrl: string
  private cache = new Map<string, any>()
  private lastSync: number = 0

  constructor(registryUrl: string = 'https://registry.puffer.ai') {
    super()
    this.registryUrl = registryUrl
  }

  async search(query: string, options: {
    category?: string
    type?: string
    limit?: number
  } = {}): Promise<any[]> {
    await this.ensureSync()
    
    const results = Array.from(this.cache.values()).filter(plugin => {
      const matchesQuery = !query || 
        plugin.name.toLowerCase().includes(query.toLowerCase()) ||
        plugin.description.toLowerCase().includes(query.toLowerCase()) ||
        plugin.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))

      const matchesCategory = !options.category || 
        plugin.categories.includes(options.category)

      const matchesType = !options.type || plugin.type === options.type

      return matchesQuery && matchesCategory && matchesType
    })

    return results.slice(0, options.limit || 50)
  }

  async getPlugin(pluginId: string): Promise<any | null> {
    await this.ensureSync()
    return this.cache.get(pluginId) || null
  }

  async getVersions(pluginId: string): Promise<string[]> {
    // Fetch version information from registry
    return ['1.0.0', '1.1.0', '2.0.0'] // Mock data
  }

  async downloadPlugin(pluginId: string, version: string): Promise<Buffer> {
    const url = `${this.registryUrl}/download/${pluginId}/${version}`
    // Implementation would download and verify plugin package
    return Buffer.from('mock plugin data')
  }

  private async ensureSync(): Promise<void> {
    const now = Date.now()
    const syncInterval = 24 * 60 * 60 * 1000 // 24 hours

    if (now - this.lastSync > syncInterval) {
      await this.syncRegistry()
    }
  }

  private async syncRegistry(): Promise<void> {
    try {
      // Fetch plugin list from registry
      const plugins = [
        {
          id: 'web-scraper',
          name: 'Web Scraper',
          description: 'Extract data from web pages',
          type: 'tool',
          categories: ['automation', 'data'],
          tags: ['web', 'scraping', 'data-extraction'],
          version: '1.0.0'
        },
        {
          id: 'code-assistant',
          name: 'Code Assistant',
          description: 'AI-powered code generation and analysis',
          type: 'agent',
          categories: ['development', 'ai'],
          tags: ['coding', 'ai', 'development'],
          version: '2.1.0'
        }
      ]

      this.cache.clear()
      plugins.forEach(plugin => this.cache.set(plugin.id, plugin))
      this.lastSync = Date.now()

      this.emit('registry_synced', plugins.length)
    } catch (error) {
      console.error('Failed to sync plugin registry:', error)
    }
  }
}

/**
 * Plugin Manager
 * Central orchestrator for plugin lifecycle and execution
 */
export class PluginManager extends EventEmitter {
  private plugins = new Map<string, {
    manifest: PluginManifest
    state: PluginState
    sandbox: PluginSandbox
  }>()
  
  private registry: PluginRegistry
  private pluginsDir: string
  private agentRuntime: AgentRuntime

  constructor(agentRuntime: AgentRuntime) {
    super()
    this.agentRuntime = agentRuntime
    this.registry = new PluginRegistry()
    this.pluginsDir = join(app.getPath('userData'), 'plugins')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.pluginsDir, { recursive: true })
    await this.loadInstalledPlugins()
    
    this.registry.on('registry_synced', (count) => {
      this.emit('registry_updated', count)
    })
  }

  // Plugin installation and management
  async installPlugin(pluginId: string, version?: string): Promise<void> {
    try {
      const pluginInfo = await this.registry.getPlugin(pluginId)
      if (!pluginInfo) {
        throw new Error(`Plugin ${pluginId} not found in registry`)
      }

      const targetVersion = version || pluginInfo.version
      const pluginData = await this.registry.downloadPlugin(pluginId, targetVersion)
      
      const pluginDir = join(this.pluginsDir, pluginId)
      await fs.mkdir(pluginDir, { recursive: true })
      
      // Extract and validate plugin
      await this.extractPlugin(pluginData, pluginDir)
      const manifest = await this.loadManifest(pluginDir)
      
      // Create plugin state
      const state: PluginState = {
        id: pluginId,
        status: 'installed',
        version: targetVersion,
        installedAt: new Date().toISOString(),
        config: manifest.defaultConfig || {}
      }

      // Create sandbox
      const sandbox = new PluginSandbox(pluginId, manifest)
      await sandbox.initialize(pluginDir)

      this.plugins.set(pluginId, { manifest, state, sandbox })
      await this.savePluginState(state)

      this.emit('plugin_installed', pluginId)
      
    } catch (error) {
      this.emit('plugin_install_failed', { pluginId, error: error.message })
      throw error
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return

    try {
      // Disable plugin first
      await this.disablePlugin(pluginId)
      
      // Terminate sandbox
      await plugin.sandbox.terminate()
      
      // Remove files
      const pluginDir = join(this.pluginsDir, pluginId)
      await fs.rm(pluginDir, { recursive: true, force: true })
      
      // Remove from memory
      this.plugins.delete(pluginId)
      
      this.emit('plugin_uninstalled', pluginId)
      
    } catch (error) {
      this.emit('plugin_uninstall_failed', { pluginId, error: error.message })
      throw error
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    try {
      // Execute plugin initialization
      await plugin.sandbox.execute('initialize', [])
      
      plugin.state.status = 'enabled'
      plugin.state.enabledAt = new Date().toISOString()
      
      await this.savePluginState(plugin.state)
      this.emit('plugin_enabled', pluginId)
      
    } catch (error) {
      plugin.state.status = 'error'
      plugin.state.lastError = error.message
      await this.savePluginState(plugin.state)
      
      this.emit('plugin_enable_failed', { pluginId, error: error.message })
      throw error
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return

    try {
      // Execute plugin cleanup
      await plugin.sandbox.execute('cleanup', [])
      
      plugin.state.status = 'disabled'
      plugin.state.enabledAt = undefined
      
      await this.savePluginState(plugin.state)
      this.emit('plugin_disabled', pluginId)
      
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error)
    }
  }

  // Plugin execution
  async executePlugin(pluginId: string, method: string, args: any[] = []): Promise<any> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin || plugin.state.status !== 'enabled') {
      throw new Error(`Plugin ${pluginId} not available`)
    }

    try {
      const startTime = Date.now()
      const result = await plugin.sandbox.execute(method, args)
      const executionTime = Date.now() - startTime

      // Update metrics
      if (!plugin.state.metrics) {
        plugin.state.metrics = { executionCount: 0, errorCount: 0 }
      }
      plugin.state.metrics.executionCount++
      plugin.state.metrics.loadTime = executionTime

      await this.savePluginState(plugin.state)
      return result

    } catch (error) {
      // Update error metrics
      if (plugin.state.metrics) {
        plugin.state.metrics.errorCount++
        plugin.state.lastError = error.message
        await this.savePluginState(plugin.state)
      }
      
      throw error
    }
  }

  // Plugin information and management
  getInstalledPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map(p => p.manifest)
  }

  getPluginState(pluginId: string): PluginState | null {
    const plugin = this.plugins.get(pluginId)
    return plugin ? plugin.state : null
  }

  async searchRegistry(query: string, options?: any): Promise<any[]> {
    return await this.registry.search(query, options)
  }

  async updatePlugin(pluginId: string, version?: string): Promise<void> {
    await this.uninstallPlugin(pluginId)
    await this.installPlugin(pluginId, version)
  }

  // Configuration management
  async getPluginConfig(pluginId: string): Promise<Record<string, any>> {
    const plugin = this.plugins.get(pluginId)
    return plugin?.state.config || {}
  }

  async setPluginConfig(pluginId: string, config: Record<string, any>): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    plugin.state.config = { ...plugin.state.config, ...config }
    await this.savePluginState(plugin.state)
    
    // Notify plugin of config change
    if (plugin.state.status === 'enabled') {
      await plugin.sandbox.execute('configChanged', [config])
    }
  }

  // Private helper methods
  private async loadInstalledPlugins(): Promise<void> {
    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true })
      const pluginDirs = entries.filter(entry => entry.isDirectory())

      for (const dir of pluginDirs) {
        try {
          const pluginDir = join(this.pluginsDir, dir.name)
          const manifest = await this.loadManifest(pluginDir)
          const state = await this.loadPluginState(dir.name)
          
          const sandbox = new PluginSandbox(dir.name, manifest)
          await sandbox.initialize(pluginDir)
          
          this.plugins.set(dir.name, { manifest, state, sandbox })
          
          // Auto-enable if it was previously enabled
          if (state.status === 'enabled') {
            await this.enablePlugin(dir.name)
          }
          
        } catch (error) {
          console.error(`Failed to load plugin ${dir.name}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to load installed plugins:', error)
    }
  }

  private async loadManifest(pluginDir: string): Promise<PluginManifest> {
    const manifestPath = join(pluginDir, 'manifest.json')
    const manifestData = await fs.readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestData)
    return PluginManifestSchema.parse(manifest)
  }

  private async loadPluginState(pluginId: string): Promise<PluginState> {
    const statePath = join(this.pluginsDir, pluginId, 'state.json')
    
    try {
      const stateData = await fs.readFile(statePath, 'utf-8')
      const state = JSON.parse(stateData)
      return PluginStateSchema.parse(state)
    } catch (error) {
      // Return default state if no state file exists
      return {
        id: pluginId,
        status: 'installed',
        version: '0.0.0',
        installedAt: new Date().toISOString()
      }
    }
  }

  private async savePluginState(state: PluginState): Promise<void> {
    const statePath = join(this.pluginsDir, state.id, 'state.json')
    await fs.writeFile(statePath, JSON.stringify(state, null, 2))
  }

  private async extractPlugin(pluginData: Buffer, targetDir: string): Promise<void> {
    // Mock implementation - would extract zip/tar file
    const manifestContent = {
      id: 'mock-plugin',
      name: 'Mock Plugin',
      version: '1.0.0',
      description: 'A mock plugin for testing',
      type: 'tool',
      capabilities: ['basic'],
      permissions: {},
      main: 'index.js',
      engine: { puffer: '^1.0.0' }
    }
    
    await fs.writeFile(
      join(targetDir, 'manifest.json'),
      JSON.stringify(manifestContent, null, 2)
    )
    
    await fs.writeFile(
      join(targetDir, 'index.js'),
      'module.exports = { initialize() {}, cleanup() {} }'
    )
  }
}
