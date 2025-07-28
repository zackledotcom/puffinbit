/**
 * Agent Platform React Hooks
 * Frontend integration for Agent Runtime Environment
 * Phase 1 Agent Platform UI components
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Type definitions for Agent Platform operations
interface AgentConfig {
  id: string
  name: string
  description?: string
  version: string
  type: 'assistant' | 'researcher' | 'writer' | 'analyst' | 'developer' | 'custom'
  capabilities: string[]
  permissions: {
    memory: { read: boolean; write: boolean; search: boolean }
    models: { execute: boolean; load: boolean; manage: boolean }
    filesystem: { read: boolean; write: boolean; execute: boolean }
    network: { external: boolean; internal: boolean }
    system: { processes: boolean; environment: boolean }
  }
  resourceLimits: {
    maxMemory: number
    maxCpuTime: number
    maxExecutionTime: number
    maxConcurrentTasks: number
    maxApiCalls: number
    rateLimitWindow: number
  }
  tools: string[]
  models: string[]
  metadata: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AgentTask {
  id: string
  agentId: string
  type: 'query' | 'action' | 'workflow' | 'analysis'
  input: any
  priority: 'low' | 'medium' | 'high' | 'critical'
  timeout?: number
  metadata: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: any
  error?: string
  startTime?: string
  endTime?: string
  executionTime?: number
  resourceUsage?: {
    memory: number
    cpu: number
    apiCalls: number
  }
}

interface AgentStatus {
  agentId: string
  status: string
  currentTask?: string
  queueLength: number
  uptime: number
  circuitBreakerState: string
}

interface SystemStatus {
  totalAgents: number
  activeAgents: number
  totalTasks: number
  systemLoad: number
}

/**
 * Hook for agent management operations
 */
export function useAgentManager() {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAgent = useCallback(async (config: Partial<AgentConfig>): Promise<string | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.agentCreate(config)
      if (!result.success) throw new Error(result.error)
      
      // Refresh agent list
      await loadAgents()
      return result.agentId
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startAgent = useCallback(async (agentId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.agentStart(agentId)
      if (!result.success) throw new Error(result.error)
      
      // Refresh agent list to update status
      await loadAgents()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopAgent = useCallback(async (agentId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.agentStop(agentId)
      if (!result.success) throw new Error(result.error)
      
      // Refresh agent list to update status
      await loadAgents()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.agentDelete(agentId)
      if (!result.success) throw new Error(result.error)
      
      // Remove from local state
      setAgents(prev => prev.filter(agent => agent.id !== agentId))
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getAgent = useCallback(async (agentId: string): Promise<AgentConfig | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.agentGet(agentId)
      if (!result.success) throw new Error(result.error)
      return result.agent
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadAgents = useCallback(async (): Promise<AgentConfig[]> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.agentList()
      if (!result.success) throw new Error(result.error)
      
      setAgents(result.agents)
      return result.agents
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-load agents on mount
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  return {
    agents,
    createAgent,
    startAgent,
    stopAgent,
    deleteAgent,
    getAgent,
    loadAgents,
    isLoading,
    error
  }
}

/**
 * Hook for agent status monitoring
 */
export function useAgentStatus(agentId?: string) {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAgentStatus = useCallback(async (id: string): Promise<AgentStatus | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.agentGetStatus(id)
      if (!result.success) throw new Error(result.error)
      
      setStatus(result.status)
      return result.status
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getSystemStatus = useCallback(async (): Promise<SystemStatus | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.api.agentGetSystemStatus()
      if (!result.success) throw new Error(result.error)
      
      setSystemStatus(result.status)
      return result.status
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-refresh status
  useEffect(() => {
    if (agentId) {
      getAgentStatus(agentId)
      const interval = setInterval(() => getAgentStatus(agentId), 5000) // Every 5 seconds
      return () => clearInterval(interval)
    }
  }, [agentId, getAgentStatus])

  // Auto-refresh system status
  useEffect(() => {
    getSystemStatus()
    const interval = setInterval(getSystemStatus, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [getSystemStatus])

  return {
    status,
    systemStatus,
    getAgentStatus,
    getSystemStatus,
    isLoading,
    error
  }
}

/**
 * Hook for agent task execution
 */
export function useAgentTasks() {
  const [activeTasks, setActiveTasks] = useState<Map<string, AgentTask>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeTask = useCallback(async (
    agentId: string,
    task: Partial<AgentTask>
  ): Promise<any> => {
    setIsLoading(true)
    setError(null)
    
    const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    // Add to active tasks
    const fullTask: AgentTask = {
      id: taskId,
      agentId,
      type: task.type || 'query',
      input: task.input,
      priority: task.priority || 'medium',
      metadata: task.metadata || {},
      status: 'pending'
    }
    
    setActiveTasks(prev => new Map(prev.set(taskId, fullTask)))

    try {
      const result = await window.api.agentExecuteTask(agentId, fullTask)
      if (!result.success) throw new Error(result.error)
      
      // Update task status
      setActiveTasks(prev => {
        const updated = new Map(prev)
        const task = updated.get(taskId)
        if (task) {
          task.status = 'completed'
          task.result = result.result
          task.endTime = new Date().toISOString()
          updated.set(taskId, task)
        }
        return updated
      })
      
      return result.result
    } catch (err: any) {
      // Update task status with error
      setActiveTasks(prev => {
        const updated = new Map(prev)
        const task = updated.get(taskId)
        if (task) {
          task.status = 'failed'
          task.error = err.message
          task.endTime = new Date().toISOString()
          updated.set(taskId, task)
        }
        return updated
      })
      
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearCompletedTasks = useCallback(() => {
    setActiveTasks(prev => {
      const filtered = new Map()
      for (const [id, task] of prev) {
        if (task.status === 'running' || task.status === 'pending') {
          filtered.set(id, task)
        }
      }
      return filtered
    })
  }, [])

  const getTaskHistory = useCallback((): AgentTask[] => {
    return Array.from(activeTasks.values()).sort((a, b) => 
      new Date(b.startTime || '').getTime() - new Date(a.startTime || '').getTime()
    )
  }, [activeTasks])

  return {
    activeTasks: Array.from(activeTasks.values()),
    executeTask,
    clearCompletedTasks,
    getTaskHistory,
    isLoading,
    error
  }
}

/**
 * Agent Builder Hook
 * Helper for creating and configuring agents
 */
export function useAgentBuilder() {
  const [agentConfig, setAgentConfig] = useState<Partial<AgentConfig>>({
    name: '',
    type: 'custom',
    capabilities: [],
    permissions: {
      memory: { read: true, write: true, search: true },
      models: { execute: true, load: false, manage: false },
      filesystem: { read: false, write: false, execute: false },
      network: { external: false, internal: true },
      system: { processes: false, environment: false }
    },
    resourceLimits: {
      maxMemory: 512,
      maxCpuTime: 30000,
      maxExecutionTime: 300000,
      maxConcurrentTasks: 3,
      maxApiCalls: 100,
      rateLimitWindow: 60000
    },
    tools: ['basic.chat', 'basic.search'],
    models: [],
    metadata: {}
  })

  const updateConfig = useCallback((updates: Partial<AgentConfig>) => {
    setAgentConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const updatePermissions = useCallback((permissions: Partial<AgentConfig['permissions']>) => {
    setAgentConfig(prev => ({
      ...prev,
      permissions: { ...prev.permissions, ...permissions }
    }))
  }, [])

  const updateResourceLimits = useCallback((limits: Partial<AgentConfig['resourceLimits']>) => {
    setAgentConfig(prev => ({
      ...prev,
      resourceLimits: { ...prev.resourceLimits, ...limits }
    }))
  }, [])

  const addCapability = useCallback((capability: string) => {
    setAgentConfig(prev => ({
      ...prev,
      capabilities: [...(prev.capabilities || []), capability]
    }))
  }, [])

  const removeCapability = useCallback((capability: string) => {
    setAgentConfig(prev => ({
      ...prev,
      capabilities: (prev.capabilities || []).filter(c => c !== capability)
    }))
  }, [])

  const addTool = useCallback((tool: string) => {
    setAgentConfig(prev => ({
      ...prev,
      tools: [...(prev.tools || []), tool]
    }))
  }, [])

  const removeTool = useCallback((tool: string) => {
    setAgentConfig(prev => ({
      ...prev,
      tools: (prev.tools || []).filter(t => t !== tool)
    }))
  }, [])

  const addModel = useCallback((model: string) => {
    setAgentConfig(prev => ({
      ...prev,
      models: [...(prev.models || []), model]
    }))
  }, [])

  const removeModel = useCallback((model: string) => {
    setAgentConfig(prev => ({
      ...prev,
      models: (prev.models || []).filter(m => m !== model)
    }))
  }, [])

  const resetConfig = useCallback(() => {
    setAgentConfig({
      name: '',
      type: 'custom',
      capabilities: [],
      permissions: {
        memory: { read: true, write: true, search: true },
        models: { execute: true, load: false, manage: false },
        filesystem: { read: false, write: false, execute: false },
        network: { external: false, internal: true },
        system: { processes: false, environment: false }
      },
      resourceLimits: {
        maxMemory: 512,
        maxCpuTime: 30000,
        maxExecutionTime: 300000,
        maxConcurrentTasks: 3,
        maxApiCalls: 100,
        rateLimitWindow: 60000
      },
      tools: ['basic.chat', 'basic.search'],
      models: [],
      metadata: {}
    })
  }, [])

  const validateConfig = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!agentConfig.name || agentConfig.name.trim().length === 0) {
      errors.push('Agent name is required')
    }

    if (!agentConfig.type) {
      errors.push('Agent type is required')
    }

    if (agentConfig.resourceLimits?.maxMemory && agentConfig.resourceLimits.maxMemory < 128) {
      errors.push('Maximum memory must be at least 128 MB')
    }

    if (agentConfig.resourceLimits?.maxExecutionTime && agentConfig.resourceLimits.maxExecutionTime < 1000) {
      errors.push('Maximum execution time must be at least 1 second')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [agentConfig])

  return {
    agentConfig,
    updateConfig,
    updatePermissions,
    updateResourceLimits,
    addCapability,
    removeCapability,
    addTool,
    removeTool,
    addModel,
    removeModel,
    resetConfig,
    validateConfig
  }
}

/**
 * Combined hook for all Agent Platform functionality
 */
export function useAgentPlatform() {
  const agentManager = useAgentManager()
  const agentStatus = useAgentStatus()
  const agentTasks = useAgentTasks()
  const agentBuilder = useAgentBuilder()

  return {
    agentManager,
    agentStatus,
    agentTasks,
    agentBuilder,
    
    // Global loading state
    isLoading: agentManager.isLoading || agentStatus.isLoading || agentTasks.isLoading,
    
    // Combined error state
    error: agentManager.error || agentStatus.error || agentTasks.error
  }
}
