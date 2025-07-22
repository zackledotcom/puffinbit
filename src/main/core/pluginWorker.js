/**
 * Plugin Worker - Sandboxed execution environment for plugins
 * Isolates plugin code and provides controlled API access
 */

const { parentPort, workerData } = require('worker_threads')
const path = require('path')
const vm = require('vm')

class PluginWorker {
  constructor() {
    this.pluginId = workerData.pluginId
    this.pluginPath = workerData.pluginPath
    this.permissions = workerData.permissions
    this.plugin = null
    this.context = null
  }

  async initialize() {
    try {
      // Load plugin module
      const pluginMainPath = path.join(this.pluginPath, 'index.js')
      delete require.cache[pluginMainPath] // Allow hot reload
      
      // Create sandboxed context
      this.context = this.createSandboxContext()
      
      // Load and execute plugin in sandbox
      const pluginCode = require('fs').readFileSync(pluginMainPath, 'utf-8')
      const script = new vm.Script(`
        (function(module, exports, require, __dirname, __filename) {
          ${pluginCode}
          return module.exports;
        })
      `)
      
      const moduleExports = script.runInNewContext(this.context)
      this.plugin = moduleExports
      
      console.log(`Plugin ${this.pluginId} loaded successfully`)
      
    } catch (error) {
      console.error(`Failed to initialize plugin ${this.pluginId}:`, error)
      throw error
    }
  }

  createSandboxContext() {
    const api = this.createPluginAPI()
    
    return {
      console: {
        log: (...args) => console.log(`[${this.pluginId}]`, ...args),
        error: (...args) => console.error(`[${this.pluginId}]`, ...args),
        warn: (...args) => console.warn(`[${this.pluginId}]`, ...args)
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer,
      process: {
        env: process.env,
        version: process.version,
        platform: process.platform
      },
      require: this.createSafeRequire(),
      module: { exports: {} },
      exports: {},
      __dirname: this.pluginPath,
      __filename: path.join(this.pluginPath, 'index.js'),
      puffer: api,
      global: {}
    }
  }

  createPluginAPI() {
    return {
      // Plugin metadata
      getManifest: () => {
        const manifestPath = path.join(this.pluginPath, 'manifest.json')
        return JSON.parse(require('fs').readFileSync(manifestPath, 'utf-8'))
      },

      // Configuration
      getConfig: () => {
        // Would retrieve from plugin state
        return {}
      },

      setConfig: async (config) => {
        // Would save to plugin state
        parentPort.postMessage({
          type: 'api_call',
          method: 'setConfig',
          args: [config]
        })
      },

      // Agent integration (if permitted)
      createAgent: this.hasPermission('agents', 'create') ? async (config) => {
        return this.callParentAPI('createAgent', [config])
      } : undefined,

      executeAgent: this.hasPermission('agents', 'execute') ? async (agentId, task) => {
        return this.callParentAPI('executeAgent', [agentId, task])
      } : undefined,

      // Model access (if permitted)
      executeModel: this.hasPermission('models', 'execute') ? async (modelId, prompt, options) => {
        return this.callParentAPI('executeModel', [modelId, prompt, options])
      } : undefined,

      // Memory operations (if permitted)
      storeMemory: this.hasPermission('memory', 'write') ? async (content, type, metadata) => {
        return this.callParentAPI('storeMemory', [content, type, metadata])
      } : undefined,

      searchMemory: this.hasPermission('memory', 'read') ? async (query, options) => {
        return this.callParentAPI('searchMemory', [query, options])
      } : undefined,

      // Filesystem (sandboxed)
      readFile: this.hasPermission('filesystem', 'read') ? async (filePath) => {
        const safePath = this.validatePath(filePath)
        return require('fs').promises.readFile(safePath, 'utf-8')
      } : undefined,

      writeFile: this.hasPermission('filesystem', 'write') ? async (filePath, content) => {
        const safePath = this.validatePath(filePath)
        return require('fs').promises.writeFile(safePath, content, 'utf-8')
      } : undefined,

      // Network (restricted)
      fetch: this.hasPermission('network', 'external') ? async (url, options) => {
        if (!this.isAllowedUrl(url)) {
          throw new Error(`Network access denied: ${url}`)
        }
        // Would use a safe fetch implementation
        return { data: 'mock response' }
      } : undefined,

      // Events
      on: (event, handler) => {
        // Plugin event subscription
      },

      emit: (event, data) => {
        parentPort.postMessage({
          type: 'plugin_event',
          event,
          data
        })
      },

      // UI integration (if permitted)
      addCommand: this.hasPermission('ui', 'commands') ? (command) => {
        this.callParentAPI('addCommand', [command])
      } : undefined,

      showNotification: this.hasPermission('ui', 'notifications') ? (notification) => {
        this.callParentAPI('showNotification', [notification])
      } : undefined
    }
  }

  createSafeRequire() {
    const allowedModules = [
      'crypto', 'path', 'url', 'querystring', 'util',
      'events', 'stream', 'buffer', 'string_decoder'
    ]

    return (moduleName) => {
      if (allowedModules.includes(moduleName)) {
        return require(moduleName)
      }
      
      // Allow relative requires within plugin directory
      if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
        const fullPath = path.resolve(this.pluginPath, moduleName)
        if (fullPath.startsWith(this.pluginPath)) {
          return require(fullPath)
        }
      }
      
      throw new Error(`Module '${moduleName}' is not allowed`)
    }
  }

  hasPermission(category, action) {
    const perms = this.permissions[category]
    if (!perms) return false
    
    if (typeof perms === 'boolean') return perms
    if (typeof perms === 'object' && perms[action]) return perms[action]
    
    return false
  }

  validatePath(filePath) {
    const resolved = path.resolve(this.pluginPath, filePath)
    if (!resolved.startsWith(this.pluginPath)) {
      throw new Error('Path traversal not allowed')
    }
    return resolved
  }

  isAllowedUrl(url) {
    const allowedDomains = this.permissions.network?.domains || []
    const urlObj = new URL(url)
    
    return allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    )
  }

  async callParentAPI(method, args) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2)
      
      const timeout = setTimeout(() => {
        reject(new Error('API call timeout'))
      }, 10000)

      const handler = (message) => {
        if (message.id === id) {
          clearTimeout(timeout)
          parentPort.off('message', handler)
          
          if (message.error) {
            reject(new Error(message.error))
          } else {
            resolve(message.result)
          }
        }
      }

      parentPort.on('message', handler)
      parentPort.postMessage({
        type: 'api_call',
        id,
        method,
        args
      })
    })
  }

  async execute(method, args) {
    if (!this.plugin || typeof this.plugin[method] !== 'function') {
      throw new Error(`Method '${method}' not found in plugin`)
    }

    try {
      const result = await this.plugin[method](...args)
      return result
    } catch (error) {
      console.error(`Plugin ${this.pluginId} method ${method} failed:`, error)
      throw error
    }
  }
}

// Initialize worker
const worker = new PluginWorker()

parentPort.on('message', async (message) => {
  try {
    let result

    switch (message.type) {
      case 'initialize':
        await worker.initialize()
        result = 'initialized'
        break

      case 'execute':
        result = await worker.execute(message.method, message.args || [])
        break

      default:
        throw new Error(`Unknown message type: ${message.type}`)
    }

    parentPort.postMessage({
      id: message.id,
      result
    })

  } catch (error) {
    parentPort.postMessage({
      id: message.id,
      error: error.message
    })
  }
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`Plugin ${worker.pluginId} uncaught exception:`, error)
  parentPort.postMessage({
    type: 'error',
    error: error.message
  })
})

process.on('unhandledRejection', (reason) => {
  console.error(`Plugin ${worker.pluginId} unhandled rejection:`, reason)
  parentPort.postMessage({
    type: 'error',
    error: reason?.message || 'Unhandled rejection'
  })
})
