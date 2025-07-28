// Agent-related type definitions

export interface Agent {
  id: string
  name: string
  description: string
  model: string
  systemPrompt: string
  tools: string[]
  isActive: boolean
  created_at: string
  updated_at: string
  settings: AgentSettings
  policy?: AgentPolicy
}

export interface AgentSettings {
  temperature: number
  max_tokens: number
  top_p?: number
  top_k?: number
  repeat_penalty?: number
  stop_sequences?: string[]
}

export interface AgentPolicy {
  censorship: 'default' | 'uncensored' | 'custom'
  allow_tools: boolean
  allowed_tools?: string[]
  max_context_tokens?: number
  security_level: 'restricted' | 'normal' | 'elevated'
  require_confirmation_for: ToolRiskLevel[]
  audit_all_actions: boolean
}

export interface AgentConfig {
  name: string
  description: string
  model: string
  systemPrompt: string
  tools: string[]
  settings: AgentSettings
  policy?: AgentPolicy
}

export interface AgentRegistry {
  version: string
  agents: Record<string, Agent>
  activeAgentId: string | null
  lastModified: string
}

export enum ToolRiskLevel {
  SAFE = 'safe',
  MODERATE = 'moderate',
  DANGEROUS = 'dangerous',
  CRITICAL = 'critical'
}

export interface ToolSecurityInfo {
  category: string
  operations: string[]
  riskLevel: ToolRiskLevel
  requiresConfirmation: boolean
  description: string
}

export interface ToolRegistry {
  [category: string]: string[]
}

export interface AuditEntry {
  timestamp: string
  agentId?: string
  action: string
  toolUsed?: string
  details?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userConfirmed?: boolean
}

export interface SecurityConfig {
  allowCriticalTools: boolean
  allowDangerousTools: boolean
  requireUserConfirmation: boolean
  adminMode: boolean
}

export interface ToolPermissionResult {
  allowed: boolean
  requiresConfirmation: boolean
  reason?: string
}

// Agent mode types
export type AgentMode = 'manual' | 'autonomous' | 'collaborative'

export interface AgentModeConfig {
  mode: AgentMode
  systemPrompt: string
  behavior: {
    proactive: boolean
    askQuestions: boolean
    suggestActions: boolean
    autoExecute: boolean
  }
}
