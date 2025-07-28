/**
 * Capability-Based IPC Security System
 * 
 * Implements zero-trust validation for all IPC calls with fine-grained permissions,
 * rate limiting, and security event logging.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { safeLog, safeError, safeWarn, safeInfo } from '../utils/safeLogger';

// Permission definitions
export interface IPCPermission {
  channel: string;
  action: string;
  maxRate: number; // requests per minute
  requiresAuth: boolean;
  capabilities: string[];
  validation?: (args: any[]) => boolean;
}

export interface SecurityContext {
  sessionId: string;
  windowId?: number;
  permissions: string[];
  rateLimits: Map<string, RateLimit>;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

interface RateLimit {
  count: number;
  resetTime: number;
}

interface SecurityEvent {
  type: 'permission_denied' | 'rate_limit_exceeded' | 'invalid_input' | 'security_violation';
  timestamp: Date;
  sessionId: string;
  channel: string;
  details: any;
}

/**
 * Zero-Trust IPC Security Manager
 */
export class IPCSecurity extends EventEmitter {
  private static instance: IPCSecurity;
  private permissions = new Map<string, IPCPermission>();
  private sessions = new Map<string, SecurityContext>();
  private securityEvents: SecurityEvent[] = [];
  private blockedSessions = new Set<string>();
  
  // Default security configuration
  private readonly DEFAULT_RATE_LIMIT = 60; // requests per minute
  private readonly MAX_EVENTS_HISTORY = 1000;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_VIOLATIONS_PER_SESSION = 10;

  constructor() {
    super();
    this.setupDefaultPermissions();
    this.startCleanupInterval();
  }

  static getInstance(): IPCSecurity {
    if (!IPCSecurity.instance) {
      IPCSecurity.instance = new IPCSecurity();
    }
    return IPCSecurity.instance;
  }

  /**
   * Register an IPC handler with security validation
   */
  registerSecureHandler(
    channel: string,
    handler: (...args: any[]) => Promise<any>,
    permission: Partial<IPCPermission> = {}
  ): void {
    // Define complete permission
    const fullPermission: IPCPermission = {
      channel,
      action: permission.action || channel,
      maxRate: permission.maxRate || this.DEFAULT_RATE_LIMIT,
      requiresAuth: permission.requiresAuth ?? true,
      capabilities: permission.capabilities || [],
      validation: permission.validation
    };

    this.permissions.set(channel, fullPermission);

    // Register the IPC handler with security wrapper
    ipcMain.handle(channel, async (event, ...args) => {
      const startTime = Date.now();
      
      try {
        // Extract session context
        const sessionId = this.getSessionId(event);
        const windowId = event.sender.id;

        // Validate security context
        const securityCheck = await this.validateSecurityContext(
          sessionId,
          windowId,
          channel,
          args
        );

        if (!securityCheck.allowed) {
          this.logSecurityEvent('permission_denied', sessionId, channel, {
            reason: securityCheck.reason,
            windowId,
            args: this.sanitizeArgs(args)
          });
          return { success: false, error: 'Permission denied' };
        }

        // Execute handler with timeout
        const result = await Promise.race([
          handler(...args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Handler timeout')), 30000)
          )
        ]);

        // Log successful operation
        this.updateSessionActivity(sessionId);
        
        const responseTime = Date.now() - startTime;
        safeInfo(`IPC ${channel} completed in ${responseTime}ms`);

        return result;

      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        safeError(`IPC ${channel} failed after ${responseTime}ms:`, error);
        
        const sessionId = this.getSessionId(event);
        this.logSecurityEvent('security_violation', sessionId, channel, {
          error: error.message,
          responseTime
        });

        return { success: false, error: 'Operation failed' };
      }
    });

    safeLog(`Registered secure IPC handler: ${channel}`);
  }

  /**
   * Create a new security session
   */
  createSession(sessionId: string, permissions: string[] = []): SecurityContext {
    const context: SecurityContext = {
      sessionId,
      permissions,
      rateLimits: new Map(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, context);
    safeInfo(`Created security session: ${sessionId}`);
    
    return context;
  }

  /**
   * Update session permissions
   */
  updateSessionPermissions(sessionId: string, permissions: string[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.permissions = permissions;
    session.lastActivity = new Date();
    
    safeInfo(`Updated permissions for session: ${sessionId}`);
    return true;
  }

  /**
   * Validate security context for IPC call
   */
  private async validateSecurityContext(
    sessionId: string,
    windowId: number,
    channel: string,
    args: any[]
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check if session is blocked
    if (this.blockedSessions.has(sessionId)) {
      return { allowed: false, reason: 'Session blocked' };
    }

    // Get permission configuration
    const permission = this.permissions.get(channel);
    if (!permission) {
      return { allowed: false, reason: 'Unknown channel' };
    }

    // Get or create session context
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(sessionId);
    }

    // Check rate limiting
    const rateLimitCheck = this.checkRateLimit(session, channel, permission.maxRate);
    if (!rateLimitCheck.allowed) {
      this.logSecurityEvent('rate_limit_exceeded', sessionId, channel, {
        limit: permission.maxRate,
        current: rateLimitCheck.current
      });
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    // Check authentication if required
    if (permission.requiresAuth && session.permissions.length === 0) {
      return { allowed: false, reason: 'Authentication required' };
    }

    // Check capabilities
    if (permission.capabilities.length > 0) {
      const hasCapability = permission.capabilities.some(cap => 
        session.permissions.includes(cap) || session.permissions.includes('*')
      );
      
      if (!hasCapability) {
        return { allowed: false, reason: 'Insufficient capabilities' };
      }
    }

    // Custom validation
    if (permission.validation && !permission.validation(args)) {
      this.logSecurityEvent('invalid_input', sessionId, channel, {
        args: this.sanitizeArgs(args)
      });
      return { allowed: false, reason: 'Invalid input' };
    }

    return { allowed: true };
  }

  /**
   * Check rate limiting for session and channel
   */
  private checkRateLimit(
    session: SecurityContext,
    channel: string,
    maxRate: number
  ): { allowed: boolean; current?: number } {
    const now = Date.now();
    const resetTime = now + (60 * 1000); // 1 minute from now
    
    const key = `${session.sessionId}:${channel}`;
    let rateLimit = session.rateLimits.get(key);

    if (!rateLimit || now > rateLimit.resetTime) {
      // Reset or create new rate limit
      rateLimit = { count: 1, resetTime };
      session.rateLimits.set(key, rateLimit);
      return { allowed: true };
    }

    rateLimit.count++;
    
    if (rateLimit.count > maxRate) {
      return { allowed: false, current: rateLimit.count };
    }

    return { allowed: true };
  }

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(
    type: SecurityEvent['type'],
    sessionId: string,
    channel: string,
    details: any
  ): void {
    const event: SecurityEvent = {
      type,
      timestamp: new Date(),
      sessionId,
      channel,
      details
    };

    this.securityEvents.push(event);

    // Limit event history
    if (this.securityEvents.length > this.MAX_EVENTS_HISTORY) {
      this.securityEvents.shift();
    }

    // Check for violation patterns
    this.checkViolationPatterns(sessionId);

    // Emit event for external monitoring
    this.emit('security-event', event);

    safeWarn(`Security event: ${type} for ${sessionId} on ${channel}`);
  }

  /**
   * Check for violation patterns and block malicious sessions
   */
  private checkViolationPatterns(sessionId: string): void {
    const recentEvents = this.securityEvents.filter(
      event => event.sessionId === sessionId && 
               Date.now() - event.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentEvents.length >= this.MAX_VIOLATIONS_PER_SESSION) {
      this.blockedSessions.add(sessionId);
      safeError(`Blocked session ${sessionId} due to excessive violations`);
      
      this.emit('session-blocked', { sessionId, violations: recentEvents.length });
    }
  }

  /**
   * Get session ID from IPC event
   */
  private getSessionId(event: Electron.IpcMainInvokeEvent): string {
    // Generate session ID based on process and webContents
    return `session_${event.processId}_${event.sender.id}`;
  }

  /**
   * Update session activity timestamp
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Sanitize arguments for logging (remove sensitive data)
   */
  private sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string' && arg.length > 100) {
        return arg.substring(0, 100) + '...';
      }
      if (typeof arg === 'object' && arg !== null) {
        return { type: 'object', keys: Object.keys(arg) };
      }
      return arg;
    });
  }

  /**
   * Setup default security permissions
   */
  private setupDefaultPermissions(): void {
    // Define default IPC permissions
    const defaultPermissions: Partial<IPCPermission>[] = [
      {
        action: 'chat-with-ai',
        maxRate: 30,
        capabilities: ['chat:send'],
        validation: (args) => args.length > 0 && typeof args[0]?.message === 'string'
      },
      {
        action: 'browser-extract-context',
        maxRate: 10,
        capabilities: ['browser:extract'],
        validation: (args) => args.length > 0 && typeof args[0] === 'string'
      },
      {
        action: 'get-health-status',
        maxRate: 120,
        requiresAuth: false,
        capabilities: []
      }
    ];

    // Register default permissions
    defaultPermissions.forEach(perm => {
      if (perm.action) {
        this.permissions.set(perm.action, {
          channel: perm.action,
          action: perm.action,
          maxRate: perm.maxRate || this.DEFAULT_RATE_LIMIT,
          requiresAuth: perm.requiresAuth ?? true,
          capabilities: perm.capabilities || [],
          validation: perm.validation
        });
      }
    });

    safeLog('Default IPC security permissions configured');
  }

  /**
   * Start cleanup interval for expired sessions and events
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Clean up expired sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
          this.sessions.delete(sessionId);
          this.blockedSessions.delete(sessionId);
        }
      }

      // Clean up old security events
      const cutoff = new Date(now - (24 * 60 * 60 * 1000)); // 24 hours ago
      this.securityEvents = this.securityEvents.filter(
        event => event.timestamp > cutoff
      );

    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    activeSessions: number;
    blockedSessions: number;
    recentEvents: number;
    topViolations: Array<{ type: string; count: number }>;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentEvents = this.securityEvents.filter(
      event => event.timestamp.getTime() > oneHourAgo
    );

    const violationCounts = new Map<string, number>();
    recentEvents.forEach(event => {
      violationCounts.set(event.type, (violationCounts.get(event.type) || 0) + 1);
    });

    const topViolations = Array.from(violationCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      activeSessions: this.sessions.size,
      blockedSessions: this.blockedSessions.size,
      recentEvents: recentEvents.length,
      topViolations
    };
  }

  /**
   * Validate permission for operation (external API)
   */
  validatePermission(operation: string, context: any): boolean {
    // This is a simplified external validation method
    // In practice, this would check against the full security context
    const permission = this.permissions.get(operation);
    if (!permission) {
      return false;
    }

    // Basic validation - in real implementation, would check full context
    return true;
  }

  /**
   * Sanitize input for security
   */
  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters and limit length
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, 10000);
  }

  /**
   * Log security event (external API)
   */
  logSecurityEvent(event: string, details: any): void {
    safeWarn(`Security event: ${event}`, details);
  }
}

// Export singleton instance
export const ipcSecurity = IPCSecurity.getInstance();
export default ipcSecurity;
