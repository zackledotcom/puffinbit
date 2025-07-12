import { useState, useEffect, useCallback } from 'react'
import type {
  Agent,
  AgentRegistry,
  SecurityConfig,
  AuditEntry,
  ToolSecurityInfo
} from '../../../types/agents'

interface AgentService {
  registry: AgentRegistry | null
  loading: boolean
  error: string | null

  // Agent management
  loadAgents: () => Promise<void>
  createAgent: (
    agentData: Partial<Agent>
  ) => Promise<{ success: boolean; agent?: Agent; error?: string }>
  updateAgent: (
    agentId: string,
    updates: Partial<Agent>
  ) => Promise<{ success: boolean; agent?: Agent; error?: string }>
  deleteAgent: (agentId: string) => Promise<{ success: boolean; error?: string }>
  cloneAgent: (
    agentId: string,
    newName: string
  ) => Promise<{ success: boolean; agent?: Agent; error?: string }>

  // Agent activation
  setActiveAgent: (agentId: string | null) => Promise<{ success: boolean; error?: string }>
  getActiveAgent: () => Agent | null

  // Tool management
  executeAgentTool: (
    agentId: string,
    toolName: string,
    params: any
  ) => Promise<{ success: boolean; result?: any; error?: string }>
  getAvailableTools: () => Promise<{ success: boolean; tools?: any; error?: string }>
  getAllToolsWithSecurity: () => Promise<{
    success: boolean
    tools?: Record<string, ToolSecurityInfo>
    error?: string
  }>
  getToolSecurityInfo: (
    toolKey: string
  ) => Promise<{ success: boolean; info?: ToolSecurityInfo; error?: string }>

  // Security management
  getSecurityConfig: () => Promise<{ success: boolean; config?: SecurityConfig; error?: string }>
  updateSecurityConfig: (
    config: Partial<SecurityConfig>
  ) => Promise<{ success: boolean; error?: string }>
  getAuditLog: (
    limit?: number
  ) => Promise<{ success: boolean; auditLog?: AuditEntry[]; error?: string }>

  // Utility functions
  getAgentById: (agentId: string) => Agent | null
  getAllAgents: () => Agent[]

  // Enhanced state
  securityConfig: SecurityConfig | null
  auditLog: AuditEntry[]
  availableTools: Record<string, ToolSecurityInfo>
}

export const useAgentService = (): AgentService => {
  const [registry, setRegistry] = useState<AgentRegistry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [availableTools, setAvailableTools] = useState<Record<string, ToolSecurityInfo>>({})

  const loadAgents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await window.api.getAgentRegistry()
      if (result.success) {
        setRegistry(result.registry)
      } else {
        setError(result.error || 'Failed to load agents')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSecurityConfig = useCallback(async () => {
    try {
      const result = await window.api.getSecurityConfig()
      if (result.success) {
        setSecurityConfig(result.config || null)
      }
    } catch (err: any) {
      console.error('Failed to load security config:', err)
    }
  }, [])

  const loadAuditLog = useCallback(async (limit: number = 50) => {
    try {
      const result = await window.api.getAgentAuditLog(limit)
      if (result.success) {
        setAuditLog(result.auditLog || [])
      }
    } catch (err: any) {
      console.error('Failed to load audit log:', err)
    }
  }, [])

  const loadAvailableTools = useCallback(async () => {
    try {
      const result = await window.api.getAllToolsWithSecurity()
      if (result.success) {
        setAvailableTools(result.tools || {})
      }
    } catch (err: any) {
      console.error('Failed to load available tools:', err)
    }
  }, [])

  const createAgent = useCallback(
    async (agentData: Partial<Agent>) => {
      try {
        const result = await window.api.createAgent(agentData)
        if (result.success) {
          // Reload agents to get updated registry
          await loadAgents()
          await loadAuditLog() // Refresh audit log
        }
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    [loadAgents, loadAuditLog]
  )

  const updateAgent = useCallback(
    async (agentId: string, updates: Partial<Agent>) => {
      try {
        const result = await window.api.updateAgent(agentId, updates)
        if (result.success) {
          // Reload agents to get updated registry
          await loadAgents()
          await loadAuditLog() // Refresh audit log
        }
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    [loadAgents, loadAuditLog]
  )

  const deleteAgent = useCallback(
    async (agentId: string) => {
      try {
        const result = await window.api.deleteAgent(agentId)
        if (result.success) {
          // Reload agents to get updated registry
          await loadAgents()
          await loadAuditLog() // Refresh audit log
        }
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    [loadAgents, loadAuditLog]
  )

  const cloneAgent = useCallback(
    async (agentId: string, newName: string) => {
      try {
        const result = await window.api.cloneAgent(agentId, newName)
        if (result.success) {
          await loadAgents()
          await loadAuditLog()
        }
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    [loadAgents, loadAuditLog]
  )

  const setActiveAgent = useCallback(
    async (agentId: string | null) => {
      try {
        const result = await window.api.setActiveAgent(agentId)
        if (result.success) {
          await loadAgents() // Refresh to get updated active agent
        }
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    [loadAgents]
  )

  const executeAgentTool = useCallback(
    async (agentId: string, toolName: string, params: any) => {
      try {
        const result = await window.api.executeAgentTool(agentId, toolName, params)
        // Refresh audit log after tool execution
        await loadAuditLog()
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    [loadAuditLog]
  )

  const getAvailableTools = useCallback(async () => {
    try {
      return await window.api.getAvailableTools()
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  const getAllToolsWithSecurity = useCallback(async () => {
    try {
      return await window.api.getAllToolsWithSecurity()
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  const getToolSecurityInfo = useCallback(async (toolKey: string) => {
    try {
      return await window.api.getToolSecurityInfo(toolKey)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  const getSecurityConfigData = useCallback(async () => {
    try {
      return await window.api.getSecurityConfig()
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  const updateSecurityConfigData = useCallback(
    async (config: Partial<SecurityConfig>) => {
      try {
        const result = await window.api.updateSecurityConfig(config)
        if (result.success) {
          await loadSecurityConfig() // Refresh security config
          await loadAuditLog() // Refresh audit log
        }
        return result
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
    [loadSecurityConfig, loadAuditLog]
  )

  const getAuditLogData = useCallback(async (limit?: number) => {
    try {
      return await window.api.getAgentAuditLog(limit)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  const getAgentById = useCallback(
    (agentId: string): Agent | null => {
      return registry?.agents[agentId] || null
    },
    [registry]
  )

  const getActiveAgent = useCallback((): Agent | null => {
    if (!registry?.activeAgentId) return null
    return registry.agents[registry.activeAgentId] || null
  }, [registry])

  const getAllAgents = useCallback((): Agent[] => {
    return registry ? Object.values(registry.agents) : []
  }, [registry])

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([loadAgents(), loadSecurityConfig(), loadAuditLog(), loadAvailableTools()])
    }

    loadInitialData()
  }, [loadAgents, loadSecurityConfig, loadAuditLog, loadAvailableTools])

  return {
    registry,
    loading,
    error,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    cloneAgent,
    setActiveAgent,
    executeAgentTool,
    getAvailableTools,
    getAllToolsWithSecurity,
    getToolSecurityInfo,
    getSecurityConfig: getSecurityConfigData,
    updateSecurityConfig: updateSecurityConfigData,
    getAuditLog: getAuditLogData,
    getAgentById,
    getActiveAgent,
    getAllAgents,
    securityConfig,
    auditLog,
    availableTools
  }
}

export default useAgentService
