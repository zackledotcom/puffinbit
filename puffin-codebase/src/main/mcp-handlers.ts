/**
 * MCP Service IPC Handlers
 * 
 * Provides IPC interface for Model Context Protocol operations
 * Handles web automation, research, and advanced filesystem operations
 * 
 * @author Puffer Engineering Team
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { mcpService } from '@services/mcpService'
import { safeLog, safeError } from '@utils/safeLogger'
import { withErrorBoundary } from '@core/errorHandler'

/**
 * Initialize MCP service
 */
ipcMain.handle('mcp:initialize', withErrorBoundary(async () => {
  safeLog('Initializing MCP service')
  const result = await mcpService.initialize()
  return { success: result }
}, 'main', 'mcp:initialize'))

/**
 * Get MCP service status
 */
ipcMain.handle('mcp:status', withErrorBoundary(async () => {
  const status = mcpService.getStatus()
  return status
}, 'main', 'mcp:status'))

/**
 * Stop MCP service
 */
ipcMain.handle('mcp:stop', withErrorBoundary(async () => {
  await mcpService.stop()
  return { success: true }
}, 'main', 'mcp:stop'))

/**
 * Restart a specific MCP server
 */
ipcMain.handle('mcp:restart-server', withErrorBoundary(async (_event: IpcMainInvokeEvent, serverName: string) => {
  safeLog('Restarting MCP server:', serverName)
  const result = await mcpService.restartServer(serverName)
  return { success: result }
}, 'main', 'mcp:restart-server'))

/**
 * Toggle server enabled/disabled
 */
ipcMain.handle('mcp:toggle-server', withErrorBoundary(async (_event: IpcMainInvokeEvent, serverName: string, enabled: boolean) => {
  safeLog('Toggling MCP server:', { serverName, enabled })
  const result = await mcpService.toggleServer(serverName, enabled)
  return { success: result }
}, 'main', 'mcp:toggle-server'))

// ===============================
// Puppeteer Operations
// ===============================

/**
 * Take screenshot of a webpage
 */
ipcMain.handle('mcp:puppeteer-screenshot', withErrorBoundary(async (_event: IpcMainInvokeEvent, url: string, options?: any) => {
  safeLog('Puppeteer screenshot:', { url, options })
  const response = await mcpService.puppeteerScreenshot(url, options)
  return response
}, 'main', 'mcp:puppeteer-screenshot'))

/**
 * Scrape webpage content
 */
ipcMain.handle('mcp:puppeteer-scrape', withErrorBoundary(async (_event: IpcMainInvokeEvent, url: string, selector?: string) => {
  safeLog('Puppeteer scrape:', { url, selector })
  const response = await mcpService.puppeteerScrape(url, selector)
  return response
}, 'main', 'mcp:puppeteer-scrape'))

/**
 * Click element on webpage
 */
ipcMain.handle('mcp:puppeteer-click', withErrorBoundary(async (_event: IpcMainInvokeEvent, url: string, selector: string) => {
  safeLog('Puppeteer click:', { url, selector })
  const response = await mcpService.puppeteerClick(url, selector)
  return response
}, 'main', 'mcp:puppeteer-click'))

// ===============================
// Filesystem Operations
// ===============================

/**
 * Read file via MCP filesystem server
 */
ipcMain.handle('mcp:filesystem-read', withErrorBoundary(async (_event: IpcMainInvokeEvent, path: string) => {
  safeLog('MCP filesystem read:', path)
  const response = await mcpService.filesystemReadFile(path)
  return response
}, 'main', 'mcp:filesystem-read'))

/**
 * Write file via MCP filesystem server
 */
ipcMain.handle('mcp:filesystem-write', withErrorBoundary(async (_event: IpcMainInvokeEvent, path: string, content: string) => {
  safeLog('MCP filesystem write:', { path, contentLength: content.length })
  const response = await mcpService.filesystemWriteFile(path, content)
  return response
}, 'main', 'mcp:filesystem-write'))

/**
 * List directory via MCP filesystem server
 */
ipcMain.handle('mcp:filesystem-list', withErrorBoundary(async (_event: IpcMainInvokeEvent, path: string) => {
  safeLog('MCP filesystem list:', path)
  const response = await mcpService.filesystemListDirectory(path)
  return response
}, 'main', 'mcp:filesystem-list'))

// ===============================
// Research Quest Operations
// ===============================

/**
 * Perform web research
 */
ipcMain.handle('mcp:research-search', withErrorBoundary(async (_event: IpcMainInvokeEvent, query: string, options?: any) => {
  safeLog('Research Quest search:', { query, options })
  const response = await mcpService.researchSearch(query, options)
  return response
}, 'main', 'mcp:research-search'))

/**
 * Fact check a claim
 */
ipcMain.handle('mcp:research-fact-check', withErrorBoundary(async (_event: IpcMainInvokeEvent, claim: string) => {
  safeLog('Research Quest fact check:', claim)
  const response = await mcpService.researchFactCheck(claim)
  return response
}, 'main', 'mcp:research-fact-check'))

// ===============================
// Batch Operations
// ===============================

/**
 * Batch web scraping
 */
ipcMain.handle('mcp:batch-scrape', withErrorBoundary(async (_event: IpcMainInvokeEvent, urls: string[], options?: any) => {
  safeLog('Batch scraping:', { urlCount: urls.length, options })
  
  const results = []
  for (const url of urls) {
    try {
      const response = await mcpService.puppeteerScrape(url, options?.selector)
      results.push({
        url,
        success: response.success,
        data: response.data,
        error: response.error
      })
    } catch (error: any) {
      results.push({
        url,
        success: false,
        error: error.message
      })
    }
  }

  return {
    success: true,
    results,
    totalUrls: urls.length,
    successCount: results.filter(r => r.success).length
  }
}, 'main', 'mcp:batch-scrape'))

/**
 * Multi-source research
 */
ipcMain.handle('mcp:multi-research', withErrorBoundary(async (_event: IpcMainInvokeEvent, queries: string[], options?: any) => {
  safeLog('Multi-source research:', { queryCount: queries.length, options })
  
  const results = []
  for (const query of queries) {
    try {
      const response = await mcpService.researchSearch(query, options)
      results.push({
        query,
        success: response.success,
        data: response.data,
        error: response.error
      })
    } catch (error: any) {
      results.push({
        query,
        success: false,
        error: error.message
      })
    }
  }

  return {
    success: true,
    results,
    totalQueries: queries.length,
    successCount: results.filter(r => r.success).length
  }
}, 'main', 'mcp:multi-research'))

// ===============================
// Advanced Web Automation
// ===============================

/**
 * Complex web automation workflow
 */
ipcMain.handle('mcp:web-workflow', withErrorBoundary(async (_event: IpcMainInvokeEvent, workflow: any) => {
  safeLog('Web automation workflow:', { steps: workflow.steps?.length })
  
  const results = []
  
  for (const step of workflow.steps || []) {
    try {
      let response
      
      switch (step.action) {
        case 'screenshot':
          response = await mcpService.puppeteerScreenshot(step.url, step.options)
          break
        case 'scrape':
          response = await mcpService.puppeteerScrape(step.url, step.selector)
          break
        case 'click':
          response = await mcpService.puppeteerClick(step.url, step.selector)
          break
        default:
          response = { success: false, error: `Unknown action: ${step.action}` }
      }
      
      results.push({
        step: step.name || step.action,
        success: response.success,
        data: response.data,
        error: response.error
      })
      
      // Stop workflow on error if not configured to continue
      if (!response.success && !workflow.continueOnError) {
        break
      }
      
      // Add delay between steps if specified
      if (step.delay) {
        await new Promise(resolve => setTimeout(resolve, step.delay))
      }
    } catch (error: any) {
      results.push({
        step: step.name || step.action,
        success: false,
        error: error.message
      })
      
      if (!workflow.continueOnError) {
        break
      }
    }
  }

  return {
    success: true,
    results,
    totalSteps: workflow.steps?.length || 0,
    successCount: results.filter(r => r.success).length,
    completed: results.length === (workflow.steps?.length || 0)
  }
}, 'main', 'mcp:web-workflow'))

// ===============================
// Enhanced Management Operations
// ===============================

/**
 * Get detailed server information
 */
ipcMain.handle('mcp:server-info', withErrorBoundary(async (_event: IpcMainInvokeEvent, serverName: string) => {
  safeLog('MCP server info request:', serverName)
  const info = mcpService.getServerInfo(serverName)
  return { success: true, data: info }
}, 'main', 'mcp:server-info'))

/**
 * Health check for all servers
 */
ipcMain.handle('mcp:health-check', withErrorBoundary(async () => {
  safeLog('MCP health check requested')
  const health = await mcpService.healthCheck()
  return { success: true, data: health }
}, 'main', 'mcp:health-check'))

/**
 * Add custom server configuration
 */
ipcMain.handle('mcp:add-custom-server', withErrorBoundary(async (_event: IpcMainInvokeEvent, config: any) => {
  safeLog('Adding custom MCP server:', config.name)
  const result = mcpService.addCustomServer(config)
  return { success: result }
}, 'main', 'mcp:add-custom-server'))

/**
 * Remove server configuration
 */
ipcMain.handle('mcp:remove-server', withErrorBoundary(async (_event: IpcMainInvokeEvent, serverName: string) => {
  safeLog('Removing MCP server:', serverName)
  const result = await mcpService.removeServer(serverName)
  return { success: result }
}, 'main', 'mcp:remove-server'))

safeLog('MCP IPC handlers registered successfully')
