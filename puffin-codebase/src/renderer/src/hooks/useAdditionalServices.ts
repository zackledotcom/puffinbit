import { useState, useEffect, useCallback } from 'react'

// ===============================
// Workflow Service Hook
// ===============================

export const useWorkflowService = () => {
  const [workflows, setWorkflows] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [templates, setTemplates] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [workflowsData, statsData, templatesData, executionsData] = await Promise.all([
        window.api.workflowGetAll(),
        window.api.workflowGetStats(),
        window.api.workflowGetTemplates(),
        window.api.workflowGetExecutions(undefined, 20)
      ])

      setWorkflows(workflowsData)
      setStats(statsData)
      setTemplates(templatesData)
      setExecutions(executionsData)
    } catch (error) {
      console.error('Failed to load workflow data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkflow = useCallback(
    async (workflowData: any) => {
      try {
        const result = await window.api.workflowCreate(workflowData)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Failed to create workflow:', error)
        throw error
      }
    },
    [loadData]
  )

  const createFromTemplate = useCallback(
    async (template: string, variables: any) => {
      try {
        const result = await window.api.workflowCreateFromTemplate(template, variables)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Failed to create workflow from template:', error)
        throw error
      }
    },
    [loadData]
  )

  const triggerWorkflow = useCallback(async (workflowId: string, input: any) => {
    try {
      return await window.api.workflowTrigger(workflowId, input)
    } catch (error) {
      console.error('Failed to trigger workflow:', error)
      throw error
    }
  }, [])

  const deleteWorkflow = useCallback(
    async (id: string) => {
      try {
        await window.api.workflowDelete(id)
        await loadData() // Refresh data
      } catch (error) {
        console.error('Failed to delete workflow:', error)
        throw error
      }
    },
    [loadData]
  )

  const updateWorkflow = useCallback(
    async (id: string, updates: any) => {
      try {
        const result = await window.api.workflowUpdate(id, updates)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Failed to update workflow:', error)
        throw error
      }
    },
    [loadData]
  )

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    workflows,
    executions,
    stats,
    templates,
    loading,
    loadData,
    createWorkflow,
    createFromTemplate,
    triggerWorkflow,
    deleteWorkflow,
    updateWorkflow
  }
}

// ===============================
// System Diagnostics Service Hook
// ===============================

export const useSystemService = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const getDiagnostics = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.getSystemDiagnostics()
      setDiagnostics(data)
      return data
    } catch (error) {
      console.error('Failed to get system diagnostics:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const searchLogs = useCallback(async (query: any) => {
    try {
      const results = await window.api.searchLogs(query)
      setLogs(results)
      return results
    } catch (error) {
      console.error('Failed to search logs:', error)
      return []
    }
  }, [])

  const exportTelemetry = useCallback(async (options: any) => {
    try {
      return await window.api.exportTelemetry(options)
    } catch (error) {
      console.error('Failed to export telemetry:', error)
      throw error
    }
  }, [])

  const exportAudit = useCallback(async (options: any) => {
    try {
      return await window.api.exportAudit(options)
    } catch (error) {
      console.error('Failed to export audit:', error)
      throw error
    }
  }, [])

  return {
    diagnostics,
    logs,
    loading,
    getDiagnostics,
    searchLogs,
    exportTelemetry,
    exportAudit
  }
}

// ===============================
// Reddit Service Hook
// ===============================

export const useRedditService = () => {
  const [status, setStatus] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const statusData = await window.api.redditGetStatus()
      setStatus(statusData)
      setAuthenticated(statusData?.authenticated || false)

      if (statusData?.authenticated) {
        const [configData, statsData] = await Promise.all([
          window.api.redditAgentGetConfig(),
          window.api.redditAgentGetStats()
        ])
        setConfig(configData)
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to load reddit data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const authenticate = useCallback(
    async (credentials: any) => {
      try {
        const result = await window.api.redditAuthenticate(credentials)
        if (result.success) {
          await loadData() // Refresh data after authentication
        }
        return result
      } catch (error) {
        console.error('Failed to authenticate:', error)
        throw error
      }
    },
    [loadData]
  )

  const startAgent = useCallback(async () => {
    try {
      await window.api.redditAgentStop() // Stop first if running
      const result = await window.api.redditAgentStart()
      await loadData() // Refresh data
      return result
    } catch (error) {
      console.error('Failed to start reddit agent:', error)
      throw error
    }
  }, [loadData])

  const stopAgent = useCallback(async () => {
    try {
      await window.api.redditAgentStop()
      await loadData() // Refresh data
    } catch (error) {
      console.error('Failed to stop reddit agent:', error)
      throw error
    }
  }, [loadData])

  const updateConfig = useCallback(
    async (newConfig: any) => {
      try {
        const result = await window.api.redditAgentUpdateConfig(newConfig)
        if (result.success) {
          await loadData() // Refresh data
        }
        return result
      } catch (error) {
        console.error('Failed to update config:', error)
        throw error
      }
    },
    [loadData]
  )

  const disconnect = useCallback(async () => {
    try {
      const result = await window.api.redditDisconnect()
      await loadData() // Refresh data
      return result
    } catch (error) {
      console.error('Failed to disconnect:', error)
      throw error
    }
  }, [loadData])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    status,
    config,
    stats,
    loading,
    authenticated,
    loadData,
    authenticate,
    startAgent,
    stopAgent,
    updateConfig,
    disconnect
  }
}
