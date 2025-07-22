/**
 * Plugin Manager React Hooks
 * Frontend integration for Plugin Architecture System
 * Phase 2A: Platform Extensibility UI components
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Type definitions for Plugin operations
interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author?: string
  homepage?: string
  repository?: string
  license?: string
  type: 'tool' | 'agent' | 'ui' | 'integration' | 'workflow'
  categories: string[]
  tags: string[]
  engine: {
    puffer: string
    node?: string
    electron?: string
  }
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  capabilities: string[]
  permissions: {
    filesystem?: {
      read: string[]
      write: string[]
    }
    network?: {
      domains: string[]
      external: boolean
    }
    agents?: {
      create: boolean
      execute: boolean
      manage: boolean
    }
    models?: {
      access: string[]
      execute: boolean
    }
    ui?: {
      panels: boolean
      menus: boolean
      commands: boolean
    }
  }
  main: string
  worker?: string
  ui?: string
  configSchema?: Record<string, any>
  defaultConfig?: Record<string, any>
  metadata?: {
    icon?: string
    screenshots?: string[]
    documentation?: string
    changelog?: string
    supportUrl?: string
  }
}

interface PluginState {
  id: string
  status: 'installed' | 'enabled' | 'disabled' | 'error' | 'loading'
  version: string
  installedAt: string
  enabledAt?: string
  lastError?: string
  config?: Record<string, any>
  metrics?: {
    loadTime?: number
    memoryUsage?: number
    executionCount: number
    errorCount: number
  }
}

interface RegistryPlugin {
  id: string
  name: string
  description: string
  type: string
  categories: string[]
  tags: string[]
  version: string
  author?: string
  homepage?: string
  downloads?: number
  rating?: number
  lastUpdated?: string
}

/**
 * Hook for plugin installation and management
 */
export function usePluginManager() {
  const [installedPlugins, setInstalledPlugins] = useState<PluginManifest[]>([])
  const [pluginStates, setPluginStates] = useState<Map<string, PluginState>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInstalledPlugins = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.pluginListInstalled()
      if (!result.success) throw new Error(result.error)
      
      setInstalledPlugins(result.plugins)
      
      // Load states for all plugins
      const states = new Map<string, PluginState>()
      for (const plugin of result.plugins) {
        const stateResult = await window.api.pluginGetState(plugin.id)
        if (stateResult.success && stateResult.state) {
          states.set(plugin.id, stateResult.state)
        }
      }
      setPluginStates(states)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const installPlugin = useCallback(async (pluginId: string, version?: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.pluginInstall(pluginId, version)
      if (!result.success) throw new Error(result.error)
      
      // Refresh the plugin list
      await loadInstalledPlugins()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadInstalledPlugins])

  const uninstallPlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.pluginUninstall(pluginId)
      if (!result.success) throw new Error(result.error)
      
      // Remove from local state
      setInstalledPlugins(prev => prev.filter(p => p.id !== pluginId))
      setPluginStates(prev => {
        const updated = new Map(prev)
        updated.delete(pluginId)
        return updated
      })
      
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const enablePlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.pluginEnable(pluginId)
      if (!result.success) throw new Error(result.error)
      
      // Update local state
      setPluginStates(prev => {
        const updated = new Map(prev)
        const state = updated.get(pluginId)
        if (state) {
          state.status = 'enabled'
          state.enabledAt = new Date().toISOString()
          updated.set(pluginId, state)
        }
        return updated
      })
      
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disablePlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.pluginDisable(pluginId)
      if (!result.success) throw new Error(result.error)
      
      // Update local state
      setPluginStates(prev => {
        const updated = new Map(prev)
        const state = updated.get(pluginId)
        if (state) {
          state.status = 'disabled'
          state.enabledAt = undefined
          updated.set(pluginId, state)
        }
        return updated
      })
      
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updatePlugin = useCallback(async (pluginId: string, version?: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.pluginUpdate(pluginId, version)
      if (!result.success) throw new Error(result.error)
      
      // Refresh the plugin list
      await loadInstalledPlugins()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadInstalledPlugins])

  // Auto-load installed plugins on mount
  useEffect(() => {
    loadInstalledPlugins()
  }, [loadInstalledPlugins])

  return {
    installedPlugins,
    pluginStates,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    updatePlugin,
    loadInstalledPlugins,
    isLoading,
    error
  }
}

/**
 * Hook for plugin registry search and discovery
 */
export function usePluginRegistry() {
  const [searchResults, setSearchResults] = useState<RegistryPlugin[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')

  const searchPlugins = useCallback(async (
    query: string, 
    options: {
      category?: string
      type?: string
      limit?: number
    } = {}
  ): Promise<RegistryPlugin[]> => {
    setIsSearching(true)
    setSearchError(null)
    setLastQuery(query)
    
    try {
      const result = await window.api.pluginSearchRegistry(query, options)
      if (!result.success) throw new Error(result.error)
      
      setSearchResults(result.results)
      return result.results
    } catch (err: any) {
      setSearchError(err.message)
      return []
    } finally {
      setIsSearching(false)
    }
  }, [])

  const clearSearch = useCallback(() => {
    setSearchResults([])
    setLastQuery('')
    setSearchError(null)
  }, [])

  return {
    searchResults,
    searchPlugins,
    clearSearch,
    isSearching,
    searchError,
    lastQuery
  }
}

/**
 * Hook for plugin execution and interaction
 */
export function usePluginExecution() {
  const [executionResults, setExecutionResults] = useState<Map<string, any>>(new Map())
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionError, setExecutionError] = useState<string | null>(null)

  const executePlugin = useCallback(async (
    pluginId: string,
    method: string,
    args: any[] = []
  ): Promise<any> => {
    setIsExecuting(true)
    setExecutionError(null)
    
    try {
      const result = await window.api.pluginExecute(pluginId, method, args)
      if (!result.success) throw new Error(result.error)
      
      // Store result for reference
      setExecutionResults(prev => new Map(prev.set(`${pluginId}:${method}`, result.result)))
      
      return result.result
    } catch (err: any) {
      setExecutionError(err.message)
      throw err
    } finally {
      setIsExecuting(false)
    }
  }, [])

  const getLastResult = useCallback((pluginId: string, method: string): any => {
    return executionResults.get(`${pluginId}:${method}`)
  }, [executionResults])

  const clearResults = useCallback(() => {
    setExecutionResults(new Map())
    setExecutionError(null)
  }, [])

  return {
    executePlugin,
    getLastResult,
    clearResults,
    isExecuting,
    executionError,
    executionResults: Array.from(executionResults.entries())
  }
}

/**
 * Hook for plugin configuration management
 */
export function usePluginConfig(pluginId: string) {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    if (!pluginId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.pluginGetConfig(pluginId)
      if (!result.success) throw new Error(result.error)
      
      setConfig(result.config)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [pluginId])

  const updateConfig = useCallback(async (newConfig: Record<string, any>): Promise<boolean> => {
    if (!pluginId) return false
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.pluginSetConfig(pluginId, newConfig)
      if (!result.success) throw new Error(result.error)
      
      setConfig(prev => ({ ...prev, ...newConfig }))
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [pluginId])

  const resetConfig = useCallback(async (): Promise<boolean> => {
    return await updateConfig({})
  }, [updateConfig])

  // Auto-load config when pluginId changes
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return {
    config,
    updateConfig,
    resetConfig,
    loadConfig,
    isLoading,
    error
  }
}

/**
 * Combined hook for all plugin functionality
 */
export function usePlugins() {
  const pluginManager = usePluginManager()
  const pluginRegistry = usePluginRegistry()
  const pluginExecution = usePluginExecution()

  const getPluginState = useCallback((pluginId: string): PluginState | undefined => {
    return pluginManager.pluginStates.get(pluginId)
  }, [pluginManager.pluginStates])

  const isPluginInstalled = useCallback((pluginId: string): boolean => {
    return pluginManager.installedPlugins.some(p => p.id === pluginId)
  }, [pluginManager.installedPlugins])

  const isPluginEnabled = useCallback((pluginId: string): boolean => {
    const state = getPluginState(pluginId)
    return state?.status === 'enabled'
  }, [getPluginState])

  return {
    // Plugin management
    ...pluginManager,
    
    // Registry search
    registry: pluginRegistry,
    
    // Plugin execution
    execution: pluginExecution,
    
    // Convenience methods
    getPluginState,
    isPluginInstalled,
    isPluginEnabled,
    
    // Global loading state
    isLoading: pluginManager.isLoading || pluginRegistry.isSearching || pluginExecution.isExecuting,
    
    // Combined error state
    error: pluginManager.error || pluginRegistry.searchError || pluginExecution.executionError
  }
}
