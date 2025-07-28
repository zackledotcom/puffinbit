/**
 * Agent Security Layer - Prevents execution of dangerous system operations
 *
 * This module implements a comprehensive security framework for agent operations,
 * preventing unauthorized system access while maintaining legitimate functionality.
 *
 * @author Puffer Security Team
 * @version 1.0.0
 */

import { logger } from '@utils/logger'

// Define threat categories for system operations
export enum ThreatLevel {
  SAFE = 'safe',
  ELEVATED = 'elevated',
  DANGEROUS = 'dangerous',
  CRITICAL = 'critical'
}

// Comprehensive threat assessment database
export const TOOL_THREAT_MATRIX = {
  // Critical threats - never allow without explicit user approval
  'system.execute_command': ThreatLevel.CRITICAL,
  'filesystem.delete_file': ThreatLevel.CRITICAL,
  'filesystem.write_executable': ThreatLevel.CRITICAL,
  'network.external_request': ThreatLevel.CRITICAL,
  'process.spawn': ThreatLevel.CRITICAL,

  // Dangerous - require permission and sandboxing
  'filesystem.write_file': ThreatLevel.DANGEROUS,
  'filesystem.read_system_file': ThreatLevel.DANGEROUS,
  'network.internal_request': ThreatLevel.DANGEROUS,
  'registry.modify': ThreatLevel.DANGEROUS,

  // Elevated - require logging and monitoring
  'filesystem.read_file': ThreatLevel.ELEVATED,
  'filesystem.list_directory': ThreatLevel.ELEVATED,
  'system.get_environment': ThreatLevel.ELEVATED,

  // Safe operations
  'chat.send_message': ThreatLevel.SAFE,
  'memory.store': ThreatLevel.SAFE,
  'ui.display': ThreatLevel.SAFE
} as const

export interface SecurityContext {
  userId: string
  sessionId: string
  agentId: string
  timestamp: Date
  permissions: string[]
}

export interface AgentAction {
  tool: string
  args: Record<string, any>
  context: SecurityContext
}

export interface SecurityResult {
  allowed: boolean
  reason: string
  requiresApproval: boolean
  threatLevel: ThreatLevel
  mitigations?: string[]
}

/**
 * Enterprise-grade agent security validator
 * Implements defense-in-depth security model
 */
export class AgentSecurityValidator {
  private static instance: AgentSecurityValidator
  private auditLog: Array<{ action: AgentAction; result: SecurityResult; timestamp: Date }> = []
  private userApprovals = new Map<string, Set<string>>() // userId -> approved dangerous tools

  static getInstance(): AgentSecurityValidator {
    if (!AgentSecurityValidator.instance) {
      AgentSecurityValidator.instance = new AgentSecurityValidator()
    }
    return AgentSecurityValidator.instance
  }

  /**
   * Validates agent action against security policies
   * @param action The agent action to validate
   * @returns Security assessment result
   */
  async validateAction(action: AgentAction): Promise<SecurityResult> {
    const threatLevel = this.assessThreatLevel(action.tool)
    const result = await this.performSecurityCheck(action, threatLevel)

    // Audit all actions for security monitoring
    this.auditLog.push({
      action,
      result,
      timestamp: new Date()
    })

    // Trim audit log to prevent memory bloat (keep last 1000 entries)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000)
    }

    logger.security(`Agent action validated: ${action.tool}`, {
      allowed: result.allowed,
      threatLevel: result.threatLevel,
      agentId: action.context.agentId
    })

    return result
  }

  /**
   * Assesses threat level of a tool
   */
  private assessThreatLevel(tool: string): ThreatLevel {
    // Exact match first
    if (tool in TOOL_THREAT_MATRIX) {
      return TOOL_THREAT_MATRIX[tool as keyof typeof TOOL_THREAT_MATRIX]
    }

    // Pattern matching for dynamic tools
    if (tool.includes('execute') || tool.includes('command') || tool.includes('shell')) {
      return ThreatLevel.CRITICAL
    }

    if (tool.includes('delete') || tool.includes('remove') || tool.includes('destroy')) {
      return ThreatLevel.CRITICAL
    }

    if (tool.includes('write') || tool.includes('modify') || tool.includes('update')) {
      return ThreatLevel.DANGEROUS
    }

    if (tool.includes('read') || tool.includes('get') || tool.includes('fetch')) {
      return ThreatLevel.ELEVATED
    }

    // Default to elevated for unknown tools
    return ThreatLevel.ELEVATED
  }

  /**
   * Performs comprehensive security check
   */
  private async performSecurityCheck(
    action: AgentAction,
    threatLevel: ThreatLevel
  ): Promise<SecurityResult> {
    switch (threatLevel) {
      case ThreatLevel.CRITICAL:
        return this.handleCriticalThreat(action)

      case ThreatLevel.DANGEROUS:
        return this.handleDangerousThreat(action)

      case ThreatLevel.ELEVATED:
        return this.handleElevatedThreat(action)

      case ThreatLevel.SAFE:
        return {
          allowed: true,
          reason: 'Safe operation - no restrictions',
          requiresApproval: false,
          threatLevel
        }
    }
  }

  private handleCriticalThreat(action: AgentAction): SecurityResult {
    logger.warn(`🚨 CRITICAL THREAT BLOCKED: ${action.tool}`, action.args)

    return {
      allowed: false,
      reason: `Critical security threat: ${action.tool} is blocked by security policy`,
      requiresApproval: true,
      threatLevel: ThreatLevel.CRITICAL,
      mitigations: [
        'Contact system administrator for manual approval',
        'Use safer alternatives if available',
        'Implement sandboxed execution environment'
      ]
    }
  }

  private handleDangerousThreat(action: AgentAction): SecurityResult {
    const userId = action.context.userId
    const approvedTools = this.userApprovals.get(userId) || new Set()

    if (approvedTools.has(action.tool)) {
      logger.info(`⚠️ Dangerous tool approved by user: ${action.tool}`)
      return {
        allowed: true,
        reason: 'Previously approved by user',
        requiresApproval: false,
        threatLevel: ThreatLevel.DANGEROUS
      }
    }

    return {
      allowed: false,
      reason: `Dangerous operation requires user approval: ${action.tool}`,
      requiresApproval: true,
      threatLevel: ThreatLevel.DANGEROUS,
      mitigations: [
        'Request explicit user permission',
        'Implement operation sandboxing',
        'Create backup before execution'
      ]
    }
  }

  private handleElevatedThreat(action: AgentAction): SecurityResult {
    // Log for monitoring but allow
    logger.info(`📊 Elevated operation logged: ${action.tool}`)

    return {
      allowed: true,
      reason: 'Elevated operation - logged for security monitoring',
      requiresApproval: false,
      threatLevel: ThreatLevel.ELEVATED
    }
  }

  /**
   * Grant user approval for dangerous tools
   */
  approveToolForUser(userId: string, tool: string): void {
    if (!this.userApprovals.has(userId)) {
      this.userApprovals.set(userId, new Set())
    }
    this.userApprovals.get(userId)!.add(tool)

    logger.info(`🔓 User ${userId} approved dangerous tool: ${tool}`)
  }

  /**
   * Get security audit log
   */
  getAuditLog(): Array<{ action: AgentAction; result: SecurityResult; timestamp: Date }> {
    return [...this.auditLog] // Return copy to prevent mutation
  }

  /**
   * Get security statistics for monitoring
   */
  getSecurityStats(): {
    totalActions: number
    blockedActions: number
    criticalThreats: number
    dangerousOperations: number
    elevatedOperations: number
  } {
    const total = this.auditLog.length
    const blocked = this.auditLog.filter((entry) => !entry.result.allowed).length
    const critical = this.auditLog.filter(
      (entry) => entry.result.threatLevel === ThreatLevel.CRITICAL
    ).length
    const dangerous = this.auditLog.filter(
      (entry) => entry.result.threatLevel === ThreatLevel.DANGEROUS
    ).length
    const elevated = this.auditLog.filter(
      (entry) => entry.result.threatLevel === ThreatLevel.ELEVATED
    ).length

    return {
      totalActions: total,
      blockedActions: blocked,
      criticalThreats: critical,
      dangerousOperations: dangerous,
      elevatedOperations: elevated
    }
  }
}

// Convenience function for quick validation
export async function validateAgentAction(action: AgentAction): Promise<SecurityResult> {
  const validator = AgentSecurityValidator.getInstance()
  return await validator.validateAction(action)
}

// Export singleton instance
export const agentSecurity = AgentSecurityValidator.getInstance()
