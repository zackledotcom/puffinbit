/**
 * Reddit Bot IPC Handlers
 * 
 * Provides IPC interface for Reddit bot operations
 * Handles bot control, configuration, and monitoring
 * 
 * @author Puffer Engineering Team
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { redditBotAgent } from '@services/redditBotAgent'
import { redditService } from '@services/reddit'
import type { BotConfig } from '@services/redditBotAgent'
import { safeLog, safeError } from '@utils/safeLogger'
import { withErrorBoundary } from '@core/errorHandler'
import { telemetry } from '@core/telemetry'

// Reddit Authentication Handlers
ipcMain.handle('reddit:authenticate', withErrorBoundary(async (_event: IpcMainInvokeEvent, credentials: any) => {
  safeLog('Reddit authentication requested')
  const success = await redditService.authenticate(credentials)
  
  telemetry.trackEvent({
    type: 'system_event',
    category: 'reddit_auth',
    action: success ? 'success' : 'failure'
  })
  
  return { success, message: success ? 'Authentication successful' : 'Authentication failed' }
}, 'main', 'reddit:authenticate'))

ipcMain.handle('reddit:disconnect', withErrorBoundary(async () => {
  await redditBotAgent.stop()
  redditService.disconnect()
  safeLog('Reddit disconnected successfully')
  return { success: true }
}, 'main', 'reddit:disconnect'))

ipcMain.handle('reddit:get-status', withErrorBoundary(async () => {
  return {
    success: true,
    data: {
      connected: redditService.isConnected(),
      authenticated: redditService.isConnected(),
      agentRunning: redditBotAgent.isActive(),
      credentials: redditService.getCredentials()
    }
  }
}, 'main', 'reddit:get-status'))

// Reddit DM Management
ipcMain.handle('reddit:list-dms', withErrorBoundary(async (_event: IpcMainInvokeEvent, limit = 25) => {
  const result = await redditService.listDMs(limit)
  return result
}, 'main', 'reddit:list-dms'))

ipcMain.handle('reddit:send-dm', withErrorBoundary(async (_event: IpcMainInvokeEvent, { recipient, subject, message }: any) => {
  const result = await redditService.sendDM(recipient, subject, message)
  return result
}, 'main', 'reddit:send-dm'))

/**
 * Start Reddit bot
 */
ipcMain.handle('reddit-agent:start', withErrorBoundary(async () => {
  safeLog('Starting Reddit bot')
  const result = await redditBotAgent.start()
  return result
}, 'main', 'reddit-agent:start'))

/**
 * Stop Reddit bot
 */
ipcMain.handle('reddit-agent:stop', withErrorBoundary(async () => {
  safeLog('Stopping Reddit bot')
  const result = await redditBotAgent.stop()
  return result
}, 'main', 'reddit-agent:stop'))

/**
 * Get bot status and statistics
 */
ipcMain.handle('reddit-agent:get-stats', withErrorBoundary(async () => {
  const stats = redditBotAgent.getStats()
  return { success: true, data: stats }
}, 'main', 'reddit-agent:get-stats'))

/**
 * Get full bot configuration
 */
ipcMain.handle('reddit-agent:get-config', withErrorBoundary(async () => {
  const config = redditBotAgent.getConfig()
  return { success: true, data: config }
}, 'main', 'reddit-agent:get-config'))

/**
 * Update bot configuration
 */
ipcMain.handle('reddit-agent:update-config', withErrorBoundary(async (_event: IpcMainInvokeEvent, updates: Partial<BotConfig>) => {
  safeLog('Updating Reddit bot config:', updates)
  redditBotAgent.updateConfig(updates)
  return { success: true }
}, 'main', 'reddit-agent:update-config'))

/**
 * Send manual reply
 */
ipcMain.handle('reddit-agent:send-manual-reply', withErrorBoundary(async (
  _event: IpcMainInvokeEvent,
  { recipient, subject, message }: any
) => {
  safeLog('Sending manual reply:', { recipient, subject })
  const result = await redditBotAgent.sendManualReply(recipient, subject, message)
  return result
}, 'main', 'reddit-agent:send-manual-reply'))

/**
 * Test bot connectivity
 */
ipcMain.handle('reddit-agent:test-connection', withErrorBoundary(async () => {
  const result = await redditBotAgent.testConnection()
  return result
}, 'main', 'reddit-agent:test-connection'))

// Enhanced monitoring and analytics handlers
ipcMain.handle('reddit-agent:get-activity-log', withErrorBoundary(async (_event: IpcMainInvokeEvent, { limit = 50, filter = null }: any = {}) => {
  // This would integrate with a logging system
  const activityLog: any[] = []
  return { success: true, data: activityLog }
}, 'main', 'reddit-agent:get-activity-log'))

ipcMain.handle('reddit-agent:get-performance-metrics', withErrorBoundary(async () => {
  const metrics = {
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    agentStats: redditBotAgent.getStats(),
    connectionStatus: redditService.isConnected()
  }
  return { success: true, data: metrics }
}, 'main', 'reddit-agent:get-performance-metrics'))

ipcMain.handle('reddit-agent:export-config', withErrorBoundary(async () => {
  const config = redditBotAgent.getConfig()
  const exportData = {
    config,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  }
  return { success: true, data: exportData }
}, 'main', 'reddit-agent:export-config'))

ipcMain.handle('reddit-agent:import-config', withErrorBoundary(async (_event: IpcMainInvokeEvent, configData: any) => {
  if (configData.config) {
    redditBotAgent.updateConfig(configData.config)
    safeLog('Configuration imported successfully')
    return { success: true, message: 'Configuration imported successfully' }
  } else {
    throw new Error('Invalid configuration data')
  }
}, 'main', 'reddit-agent:import-config'))

// Error handling and diagnostics
ipcMain.handle('reddit:diagnose', withErrorBoundary(async () => {
  const diagnostics = {
    redditConnection: redditService.isConnected(),
    agentStatus: redditBotAgent.isActive(),
    lastError: null,
    systemHealth: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version
    }
  }
  return { success: true, data: diagnostics }
}, 'main', 'reddit:diagnose'))

safeLog('Reddit bot IPC handlers registered successfully')
