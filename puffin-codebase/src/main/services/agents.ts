import { app, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir, appendFile } from 'fs/promises'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type {
  Agent,
  AgentRegistry,
  ToolRegistry,
  ToolSecurityInfo
} from '../../types/agents'
import { encrypt, decrypt } from './crypto'

// ===============================
// SECURITY-FIRST TOOL REGISTRY
// ===============================

// Risk levels for tools
enum ToolRiskLevel {
  SAFE = 'safe',
  MODERATE = 'moderate',
  DANGEROUS = 'dangerous',
  CRITICAL = 'critical'
}

// Tool definitions with security metadata
const TOOL_SECURITY_REGISTRY: Record<
  string,
  {
    category: string
    operations: string[]
    riskLevel: ToolRiskLevel
    requiresConfirmation: boolean
    description: string
  }
> = {
  'chroma.query': {
    category: 'chroma',
    operations: ['query'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Query vector database'
  },
  'chroma.add': {
    category: 'chroma',
    operations: ['add'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Add to vector database'
  },
  'chroma.delete': {
    category: 'chroma',
    operations: ['delete'],
    riskLevel: ToolRiskLevel.MODERATE,
    requiresConfirmation: true,
    description: 'Delete from vector database'
  },
  'chroma.list_collections': {
    category: 'chroma',
    operations: ['list_collections'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'List database collections'
  },

  'file.read': {
    category: 'file',
    operations: ['read'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Read file contents'
  },
  'file.write': {
    category: 'file',
    operations: ['write'],
    riskLevel: ToolRiskLevel.MODERATE,
    requiresConfirmation: true,
    description: 'Write to file'
  },
  'file.list': {
    category: 'file',
    operations: ['list'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'List files'
  },
  'file.search': {
    category: 'file',
    operations: ['search'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Search file contents'
  },
  'file.move': {
    category: 'file',
    operations: ['move'],
    riskLevel: ToolRiskLevel.MODERATE,
    requiresConfirmation: true,
    description: 'Move/rename files'
  },
  'file.delete': {
    category: 'file',
    operations: ['delete'],
    riskLevel: ToolRiskLevel.DANGEROUS,
    requiresConfirmation: true,
    description: 'Delete files permanently'
  },

  'ollama.generate': {
    category: 'ollama',
    operations: ['generate'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Generate AI text'
  },
  'ollama.list_models': {
    category: 'ollama',
    operations: ['list_models'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'List available models'
  },
  'ollama.pull_model': {
    category: 'ollama',
    operations: ['pull_model'],
    riskLevel: ToolRiskLevel.MODERATE,
    requiresConfirmation: true,
    description: 'Download new model'
  },
  'ollama.summarize': {
    category: 'ollama',
    operations: ['summarize'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Summarize text'
  },

  // CRITICAL TOOLS - DISABLED BY DEFAULT
  'system.execute_command': {
    category: 'system',
    operations: ['execute_command'],
    riskLevel: ToolRiskLevel.CRITICAL,
    requiresConfirmation: true,
    description: 'Execute system command - DANGEROUS'
  },
  'system.get_processes': {
    category: 'system',
    operations: ['get_processes'],
    riskLevel: ToolRiskLevel.MODERATE,
    requiresConfirmation: false,
    description: 'List running processes'
  },
  'system.kill_process': {
    category: 'system',
    operations: ['kill_process'],
    riskLevel: ToolRiskLevel.CRITICAL,
    requiresConfirmation: true,
    description: 'Terminate process - DANGEROUS'
  },

  'memory.get_summaries': {
    category: 'memory',
    operations: ['get_summaries'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Get memory summaries'
  },
  'memory.add_summary': {
    category: 'memory',
    operations: ['add_summary'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Add memory summary'
  },
  'memory.clear_memory': {
    category: 'memory',
    operations: ['clear_memory'],
    riskLevel: ToolRiskLevel.DANGEROUS,
    requiresConfirmation: true,
    description: 'Clear all memory'
  },

  'network.http_request': {
    category: 'network',
    operations: ['http_request'],
    riskLevel: ToolRiskLevel.DANGEROUS,
    requiresConfirmation: true,
    description: 'Make HTTP request - can leak data'
  },
  'network.websocket_connect': {
    category: 'network',
    operations: ['websocket_connect'],
    riskLevel: ToolRiskLevel.DANGEROUS,
    requiresConfirmation: true,
    description: 'Connect to websocket'
  },
  'network.ping': {
    category: 'network',
    operations: ['ping'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Ping network host'
  },

  'reddit.list_dms': {
    category: 'reddit',
    operations: ['list_dms'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'List Reddit messages'
  },
  'reddit.read_dm': {
    category: 'reddit',
    operations: ['read_dm'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Read Reddit message'
  },
  'reddit.send_dm': {
    category: 'reddit',
    operations: ['send_dm'],
    riskLevel: ToolRiskLevel.DANGEROUS,
    requiresConfirmation: true,
    description: 'Send Reddit message - can spam'
  },
  'reddit.reply_dm': {
    category: 'reddit',
    operations: ['reply_dm'],
    riskLevel: ToolRiskLevel.DANGEROUS,
    requiresConfirmation: true,
    description: 'Reply to Reddit message'
  },
  'reddit.get_unread': {
    category: 'reddit',
    operations: ['get_unread'],
    riskLevel: ToolRiskLevel.SAFE,
    requiresConfirmation: false,
    description: 'Get unread messages'
  }
}

// Legacy registry for backwards compatibility
const AVAILABLE_TOOLS: ToolRegistry = {
  chroma: ['query', 'add', 'delete', 'list_collections'],
  file: ['read', 'write', 'list', 'search', 'move', 'delete'],
  ollama: ['generate', 'list_models', 'pull_model', 'summarize'],
  system: ['get_processes'], // REMOVED: execute_command, kill_process
  memory: ['get_summaries', 'add_summary', 'clear_memory'],
  network: ['ping'], // REMOVED: http_request, websocket_connect
  reddit: ['list_dms', 'read_dm', 'get_unread'] // REMOVED: send_dm, reply_dm
} as const

// Security configuration
interface SecurityConfig {
  allowCriticalTools: boolean
  allowDangerousTools: boolean
  requireUserConfirmation: boolean
  adminMode: boolean
}

let securityConfig: SecurityConfig = {
  allowCriticalTools: false, // CRITICAL tools disabled by default
  allowDangerousTools: false, // DANGEROUS tools require explicit enablement
  requireUserConfirmation: true,
  adminMode: false
}

// Tool permission checking
export async function checkToolPermission(
  toolKey: string,
  agentId: string
): Promise<{
  allowed: boolean
  requiresConfirmation: boolean
  reason?: string
}> {
  const toolInfo = TOOL_SECURITY_REGISTRY[toolKey]

  if (!toolInfo) {
    return { allowed: false, requiresConfirmation: false, reason: 'Unknown tool' }
  }

  // Check security level restrictions
  switch (toolInfo.riskLevel) {
    case ToolRiskLevel.CRITICAL:
      if (!securityConfig.allowCriticalTools) {
        return {
          allowed: false,
          requiresConfirmation: false,
          reason: 'Critical tools are disabled. Enable in security settings.'
        }
      }
      break

    case ToolRiskLevel.DANGEROUS:
      if (!securityConfig.allowDangerousTools) {
        return {
          allowed: false,
          requiresConfirmation: false,
          reason: 'Dangerous tools are disabled. Enable in security settings.'
        }
      }
      break
  }

  // Admin mode bypasses confirmation requirements
  const requiresConfirmation =
    !securityConfig.adminMode &&
    (toolInfo.requiresConfirmation || securityConfig.requireUserConfirmation)

  return { allowed: true, requiresConfirmation, reason: toolInfo.description }
}

// User confirmation dialog
export async function requestUserConfirmation(
  toolKey: string,
  agentName: string,
  context: string
): Promise<boolean> {
  const toolInfo = TOOL_SECURITY_REGISTRY[toolKey]

  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Agent Permission Request',
    message: `Agent "${agentName}" wants to use: ${toolKey}`,
    detail: `${toolInfo.description}\n\nContext: ${context}\n\nRisk Level: ${toolInfo.riskLevel.toUpperCase()}`,
    buttons: ['Allow', 'Deny'],
    defaultId: 1, // Default to deny
    cancelId: 1
  })

  return result.response === 0
}

// Security configuration management
export function updateSecurityConfig(config: Partial<SecurityConfig>): void {
  securityConfig = { ...securityConfig, ...config }

  // Log security changes
  auditLog({
    action: 'security_config_updated',
    details: JSON.stringify(config),
    severity: 'high'
  })
}

export function getSecurityConfig(): SecurityConfig {
  return { ...securityConfig }
}
const STORAGE_VERSION = '1.0.0'
const AGENTS_FILE = 'agents.json'
const AUDIT_LOG_FILE = 'agents_audit.log'

// Enhanced agent policy with security constraints
type AgentPolicy = {
  censorship: 'default' | 'uncensored' | 'custom'
  allow_tools: boolean
  allowed_tools?: string[] // Explicit allowlist
  max_context_tokens?: number
  security_level: 'restricted' | 'normal' | 'elevated'
  require_confirmation_for: ToolRiskLevel[]
  audit_all_actions: boolean
}

// Secure audit logging
interface AuditEntry {
  timestamp: string
  agentId?: string
  action: string
  toolUsed?: string
  details?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userConfirmed?: boolean
}

// Audit logging function
async function auditLog(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  const auditEntry: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  }

  try {
    const agentDir = join(app.getPath('userData'), 'agents')
    await mkdir(agentDir, { recursive: true })

    const logFile = join(agentDir, AUDIT_LOG_FILE)
    const encryptedEntry = await encrypt(JSON.stringify(auditEntry))
    await appendFile(logFile, encryptedEntry + '\n', 'utf8')

    // Also log to console for debugging
    console.log(
      `🔒 AGENT AUDIT [${entry.severity.toUpperCase()}]:`,
      entry.action,
      entry.details || ''
    )
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}

// Get storage directory with proper permissions
async function getAgentStorageDir(): Promise<string> {
  const agentDir = join(app.getPath('userData'), 'agents')
  await mkdir(agentDir, { recursive: true })
  return agentDir
}

// Enhanced agent validation with security checks
export function validateAgent(agent: Partial<Agent>): {
  valid: boolean
  errors: string[]
  securityWarnings: string[]
  blockedTools: string[]
} {
  const errors: string[] = []
  const securityWarnings: string[] = []
  const blockedTools: string[] = []

  // Basic validation
  if (!agent.name || typeof agent.name !== 'string' || agent.name.trim().length === 0) {
    errors.push('Agent name is required and must be a non-empty string')
  }

  if (!agent.systemPrompt || typeof agent.systemPrompt !== 'string') {
    errors.push('Agent systemPrompt is required and must be a string')
  }

  if (agent.model && typeof agent.model !== 'string') {
    errors.push('Agent model must be a string')
  }

  // Tool validation with security checks
  if (agent.tools && Array.isArray(agent.tools)) {
    for (const tool of agent.tools) {
      if (typeof tool !== 'string') {
        errors.push(`Tool must be a string: ${tool}`)
        continue
      }

      const toolInfo = TOOL_SECURITY_REGISTRY[tool]
      if (!toolInfo) {
        errors.push(`Unknown tool: ${tool}`)
        continue
      }

      // Check if tool is allowed based on security level
      switch (toolInfo.riskLevel) {
        case ToolRiskLevel.CRITICAL:
          if (!securityConfig.allowCriticalTools) {
            blockedTools.push(tool)
            securityWarnings.push(`Critical tool blocked: ${tool} - ${toolInfo.description}`)
          } else {
            securityWarnings.push(
              `Critical tool allowed: ${tool} - requires explicit user confirmation`
            )
          }
          break

        case ToolRiskLevel.DANGEROUS:
          if (!securityConfig.allowDangerousTools) {
            blockedTools.push(tool)
            securityWarnings.push(`Dangerous tool blocked: ${tool} - ${toolInfo.description}`)
          } else {
            securityWarnings.push(`Dangerous tool allowed: ${tool} - may require user confirmation`)
          }
          break
      }
    }
  }

  // Policy validation
  if (agent.policy) {
    const policy = agent.policy as AgentPolicy

    if (policy.censorship && !['default', 'uncensored', 'custom'].includes(policy.censorship)) {
      errors.push('Agent policy.censorship must be "default", "uncensored", or "custom"')
    }

    if (typeof policy.allow_tools !== 'boolean') {
      errors.push('Agent policy.allow_tools must be a boolean')
    }

    if (
      policy.security_level &&
      !['restricted', 'normal', 'elevated'].includes(policy.security_level)
    ) {
      errors.push('Agent policy.security_level must be "restricted", "normal", or "elevated"')
    }

    if (policy.allowed_tools && !Array.isArray(policy.allowed_tools)) {
      errors.push('Agent policy.allowed_tools must be an array')
    }
  }

  return {
    valid: errors.length === 0 && blockedTools.length === 0,
    errors,
    securityWarnings,
    blockedTools
  }
}

// Load agent registry with decryption and validation
export async function loadAgentRegistry(): Promise<AgentRegistry> {
  try {
    const agentDir = await getAgentStorageDir()
    const agentFile = join(agentDir, AGENTS_FILE)

    if (!existsSync(agentFile)) {
      const defaultRegistry: AgentRegistry = {
        version: STORAGE_VERSION,
        agents: {},
        activeAgentId: null,
        lastModified: new Date().toISOString()
      }

      await auditLog({
        action: 'registry_created',
        details: 'Created new agent registry',
        severity: 'medium'
      })

      return defaultRegistry
    }

    const encryptedContent = await readFile(agentFile, 'utf8')
    const content = await decrypt(encryptedContent)
    const registry = JSON.parse(content) as AgentRegistry

    // Validate and sanitize loaded agents
    for (const [agentId, agent] of Object.entries(registry.agents)) {
      const validation = validateAgent(agent)
      if (!validation.valid) {
        console.warn(`Invalid agent ${agentId} removed:`, validation.errors)
        delete registry.agents[agentId]

        await auditLog({
          action: 'agent_removed_invalid',
          agentId,
          details: `Validation errors: ${validation.errors.join(', ')}`,
          severity: 'high'
        })
      }
    }

    await auditLog({
      action: 'registry_loaded',
      details: `Loaded ${Object.keys(registry.agents).length} agents`,
      severity: 'low'
    })

    return registry
  } catch (error) {
    console.error('Failed to load agent registry:', error)

    await auditLog({
      action: 'registry_load_failed',
      details: `Error: ${error.message}`,
      severity: 'critical'
    })

    // Return safe default
    return {
      version: STORAGE_VERSION,
      agents: {},
      activeAgentId: null,
      lastModified: new Date().toISOString()
    }
  }
}

// Save agent registry with encryption
async function saveAgentRegistry(registry: AgentRegistry): Promise<void> {
  try {
    const agentDir = await getAgentStorageDir()
    const agentFile = join(agentDir, AGENTS_FILE)

    registry.lastModified = new Date().toISOString()

    const content = JSON.stringify(registry, null, 2)
    const encryptedContent = await encrypt(content)

    await writeFile(agentFile, encryptedContent, 'utf8')

    await auditLog({
      action: 'registry_saved',
      details: `Saved ${Object.keys(registry.agents).length} agents`,
      severity: 'low'
    })
  } catch (error) {
    console.error('Failed to save agent registry:', error)

    await auditLog({
      action: 'registry_save_failed',
      details: `Error: ${error.message}`,
      severity: 'critical'
    })

    throw error
  }
}

// Enhanced agent creation with security validation
export async function createAgent(
  agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'metadata'>
): Promise<Agent> {
  const validation = validateAgent(agentData)

  if (!validation.valid) {
    throw new Error(
      `Agent validation failed: ${[...validation.errors, ...validation.securityWarnings].join(', ')}`
    )
  }

  const agent: Agent = {
    ...agentData,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // metadata removed
    // Ensure secure defaults
    policy: {
      censorship: 'default',
      allow_tools: true,
      security_level: 'normal',
      require_confirmation_for: [ToolRiskLevel.DANGEROUS, ToolRiskLevel.CRITICAL],
      audit_all_actions: true,
      ...agentData.policy
    } as AgentPolicy
  }

  const registry = await loadAgentRegistry()
  registry.agents[agent.id] = agent
  await saveAgentRegistry(registry)

  await auditLog({
    action: 'agent_created',
    agentId: agent.id,
    details: `Created agent: ${agent.name}`,
    severity: validation.securityWarnings.length > 0 ? 'medium' : 'low'
  })

  return agent
}

// Rest of the functions with similar security enhancements...
export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
  const registry = await loadAgentRegistry()
  const existing = registry.agents[id]

  if (!existing) {
    throw new Error(`Agent ${id} not found`)
  }

  const updatedAgent = { ...existing, ...updates, updated_at: new Date().toISOString() }
  const validation = validateAgent(updatedAgent)

  if (!validation.valid) {
    throw new Error(
      `Agent validation failed: ${[...validation.errors, ...validation.securityWarnings].join(', ')}`
    )
  }

  registry.agents[id] = updatedAgent
  await saveAgentRegistry(registry)

  await auditLog({
    action: 'agent_updated',
    agentId: id,
    details: `Updated agent: ${updatedAgent.name}`,
    severity: validation.securityWarnings.length > 0 ? 'medium' : 'low'
  })

  return updatedAgent
}

export async function deleteAgent(id: string): Promise<void> {
  const registry = await loadAgentRegistry()
  const agent = registry.agents[id]

  if (!agent) {
    throw new Error(`Agent ${id} not found`)
  }

  delete registry.agents[id]

  if (registry.activeAgentId === id) {
    registry.activeAgentId = null
  }

  await saveAgentRegistry(registry)

  await auditLog({
    action: 'agent_deleted',
    agentId: id,
    details: `Deleted agent: ${agent.name}`,
    severity: 'medium'
  })
}

export async function cloneAgent(id: string, newName: string): Promise<Agent> {
  const registry = await loadAgentRegistry()
  const original = registry.agents[id]

  if (!original) {
    throw new Error(`Agent ${id} not found`)
  }

  const cloned = await createAgent({
    ...original,
    name: newName
  })

  await auditLog({
    action: 'agent_cloned',
    agentId: cloned.id,
    details: `Cloned from ${original.name} to ${newName}`,
    severity: 'low'
  })

  return cloned
}

export async function setActiveAgent(id: string | null): Promise<void> {
  const registry = await loadAgentRegistry()

  if (id && !registry.agents[id]) {
    throw new Error(`Agent ${id} not found`)
  }

  registry.activeAgentId = id
  await saveAgentRegistry(registry)

  await auditLog({
    action: 'active_agent_changed',
    agentId: id || 'none',
    details: id ? `Set active agent: ${registry.agents[id]?.name}` : 'Cleared active agent',
    severity: 'low'
  })
}

export async function getActiveAgent(): Promise<Agent | null> {
  const registry = await loadAgentRegistry()
  return registry.activeAgentId ? registry.agents[registry.activeAgentId] || null : null
}

export async function getAllAgents(): Promise<Agent[]> {
  const registry = await loadAgentRegistry()
  return Object.values(registry.agents)
}

export function getAvailableTools(): ToolRegistry {
  return AVAILABLE_TOOLS
}

export function validateToolKey(toolKey: string): boolean {
  return toolKey in TOOL_SECURITY_REGISTRY
}

// Tool execution function
export async function executeAgentTool(
  agentId: string,
  toolKey: string,
  params: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // Load agent and validate
    const registry = await loadAgentRegistry()
    const agent = registry.agents[agentId]

    if (!agent) {
      return { success: false, error: `Agent ${agentId} not found` }
    }

    // Check if agent has permission to use this tool
    if (!agent.tools.includes(toolKey)) {
      await auditLog({
        action: 'tool_access_denied',
        agentId,
        toolUsed: toolKey,
        details: 'Agent does not have permission to use this tool',
        severity: 'medium'
      })
      return {
        success: false,
        error: `Agent ${agent.name} is not authorized to use tool: ${toolKey}`
      }
    }

    // Check tool security permissions
    const permission = await checkToolPermission(toolKey, agentId)
    if (!permission.allowed) {
      await auditLog({
        action: 'tool_blocked',
        agentId,
        toolUsed: toolKey,
        details: permission.reason || 'Tool blocked by security policy',
        severity: 'high'
      })
      return { success: false, error: permission.reason || 'Tool blocked by security policy' }
    }

    // Request user confirmation if required
    if (permission.requiresConfirmation) {
      const confirmed = await requestUserConfirmation(toolKey, agent.name, JSON.stringify(params))

      if (!confirmed) {
        await auditLog({
          action: 'tool_denied_by_user',
          agentId,
          toolUsed: toolKey,
          details: 'User denied permission',
          severity: 'medium',
          userConfirmed: false
        })
        return { success: false, error: 'User denied permission to execute tool' }
      }
    }

    // Execute the tool
    const result = await executeToolOperation(toolKey, params)

    // Log successful execution
    await auditLog({
      action: 'tool_executed',
      agentId,
      toolUsed: toolKey,
      details: `Executed with params: ${JSON.stringify(params)}`,
      severity: 'low',
      userConfirmed: permission.requiresConfirmation
    })

    return { success: true, result }
  } catch (error: any) {
    await auditLog({
      action: 'tool_execution_failed',
      agentId,
      toolUsed: toolKey,
      details: `Error: ${error.message}`,
      severity: 'high'
    })

    return { success: false, error: error.message }
  }
}

// Tool operation executor
async function executeToolOperation(toolKey: string, params: any): Promise<any> {
  const [category, operation] = toolKey.split('.')

  switch (category) {
    case 'chroma':
      return await executeChromaTool(operation, params)
    case 'file':
      return await executeFileTool(operation, params)
    case 'ollama':
      return await executeOllamaTool(operation, params)
    case 'system':
      return await executeSystemTool(operation, params)
    case 'memory':
      return await executeMemoryTool(operation, params)
    case 'network':
      return await executeNetworkTool(operation, params)
    case 'reddit':
      return await executeRedditTool(operation, params)
    default:
      throw new Error(`Unknown tool category: ${category}`)
  }
}

// Tool category implementations
async function executeChromaTool(operation: string, params: any): Promise<any> {
  // For now, return placeholder results since ChromaDB integration needs to be verified
  switch (operation) {
    case 'query':
      return { results: [], message: 'ChromaDB query placeholder' }
    case 'add':
      return { success: true, message: 'ChromaDB add placeholder' }
    case 'delete':
      return { success: true, message: 'ChromaDB delete placeholder' }
    case 'list_collections':
      return { collections: [], message: 'ChromaDB collections placeholder' }
    default:
      throw new Error(`Unknown chroma operation: ${operation}`)
  }
}

async function executeFileTool(operation: string, params: any): Promise<any> {
  const fs = await import('fs/promises')
  const path = await import('path')

  switch (operation) {
    case 'read':
      return await fs.readFile(params.path, 'utf8')
    case 'write':
      await fs.writeFile(params.path, params.content, 'utf8')
      return { success: true, path: params.path }
    case 'list':
      return await fs.readdir(params.path)
    case 'search':
      // Simple file content search - could be enhanced
      const content = await fs.readFile(params.path, 'utf8')
      const matches = content.split('\n').filter((line, index) => line.includes(params.query))
      return { matches, count: matches.length }
    default:
      throw new Error(`Unknown file operation: ${operation}`)
  }
}

async function executeOllamaTool(operation: string, params: any): Promise<any> {
  // Use placeholder for now since service integration needs verification
  switch (operation) {
    case 'generate':
      return { response: 'Ollama generation placeholder', model: params.model }
    case 'list_models':
      return { models: ['tinydolphin:latest', 'openchat:latest'] }
    case 'pull_model':
      return { success: true, model: params.model }
    case 'summarize':
      return {
        response: `Summary of: ${params.text.substring(0, 50)}...`,
        model: params.model || 'tinydolphin:latest'
      }
    default:
      throw new Error(`Unknown ollama operation: ${operation}`)
  }
}

async function executeSystemTool(operation: string, params: any): Promise<any> {
  // CRITICAL TOOLS - Should only be enabled in admin mode with explicit user confirmation
  switch (operation) {
    case 'get_processes':
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      const { stdout } = await execAsync(process.platform === 'win32' ? 'tasklist' : 'ps aux')
      return { processes: stdout }
    case 'execute_command':
      throw new Error('System command execution is disabled for security reasons')
    case 'kill_process':
      throw new Error('Process termination is disabled for security reasons')
    default:
      throw new Error(`Unknown system operation: ${operation}`)
  }
}

async function executeMemoryTool(operation: string, params: any): Promise<any> {
  // Use placeholder for now since service integration needs verification
  switch (operation) {
    case 'get_summaries':
      return { summaries: [], count: 0 }
    case 'add_summary':
      return { success: true, id: 'summary-' + Date.now() }
    case 'clear_memory':
      return { success: true, cleared: 0 }
    default:
      throw new Error(`Unknown memory operation: ${operation}`)
  }
}

async function executeNetworkTool(operation: string, params: any): Promise<any> {
  switch (operation) {
    case 'ping':
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      const command =
        process.platform === 'win32' ? `ping -n 1 ${params.host}` : `ping -c 1 ${params.host}`
      const { stdout } = await execAsync(command)
      return { result: stdout }
    case 'http_request':
      throw new Error('HTTP requests are disabled for security reasons')
    case 'websocket_connect':
      throw new Error('WebSocket connections are disabled for security reasons')
    default:
      throw new Error(`Unknown network operation: ${operation}`)
  }
}

async function executeRedditTool(operation: string, params: any): Promise<any> {
  // Reddit integration would require API keys and authentication
  // This is a placeholder for future implementation
  switch (operation) {
    case 'list_dms':
    case 'read_dm':
    case 'get_unread':
      throw new Error('Reddit integration not implemented yet')
    case 'send_dm':
    case 'reply_dm':
      throw new Error('Reddit messaging is disabled for security reasons')
    default:
      throw new Error(`Unknown reddit operation: ${operation}`)
  }
}

// Export additional security management functions
export async function getAuditLog(limit: number = 100): Promise<AuditEntry[]> {
  try {
    const agentDir = await getAgentStorageDir()
    const logFile = join(agentDir, AUDIT_LOG_FILE)

    if (!existsSync(logFile)) {
      return []
    }

    const encryptedContent = await readFile(logFile, 'utf8')
    const lines = encryptedContent.split('\n').filter(Boolean)

    const entries: AuditEntry[] = []
    for (const line of lines.slice(-limit)) {
      try {
        const decrypted = await decrypt(line)
        entries.push(JSON.parse(decrypted))
      } catch (error) {
        console.error('Failed to decrypt audit entry:', error)
      }
    }

    return entries.reverse() // Most recent first
  } catch (error) {
    console.error('Failed to load audit log:', error)
    return []
  }
}

export function getToolSecurityInfo(toolKey: string): ToolSecurityInfo | null {
  return TOOL_SECURITY_REGISTRY[toolKey] || null
}

export function getAllToolsWithSecurity(): Record<string, ToolSecurityInfo> {
  return { ...TOOL_SECURITY_REGISTRY }
}

// Security functions are already exported individually above
