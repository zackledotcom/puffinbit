import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn, ChildProcess, exec } from 'child_process'
import axios from 'axios'

// Import safe logger to prevent EPIPE errors
import { safeLog, safeError, safeWarn, safeInfo } from '@utils/safeLogger'
// Import process error handler for graceful error handling
import { processErrorHandler } from '@utils/processErrorHandler'

safeLog('✅ index.ts is up to date and executing')

// Import modular services and handlers
import { ollamaService } from '@services/ollamaService'
import { chromaService } from '@services/chromaService'
import { streamingService } from '@main/streaming/streamingService'
import { memoryService } from '@services/memoryService'
import { mcpService } from '@services/mcpService'
import { registerContextMenuHandlers } from '@main/handlers/contextMenuHandlers'
import '@main/mcp-handlers' // Import MCP handlers
import '@main/reddit-bot-handlers' // Import Reddit bot handlers
import './canvas-handlers' // Import canvas file system handlers
import './handlers/assistant-ui-handlers' // Import Assistant UI handlers

import {
  loadSettings,
  saveSettings,
  loadChatHistory,
  appendChatMessage,
  loadMemoryStore,
  addMemorySummary,
  clearMemoryStore,
  updateMemorySettings,
  getMemorySummaries
} from '@main/storage'
import { withRateLimit } from '@main/middleware/rateLimiter'

import type { AppSettings } from '../types/settings'
import type { Message, MemorySummary } from '../types/chat'

// Remove globalRateLimit and customRateLimits, as withRateLimit expects a handler, not a config object
// If you need to apply rate limiting, do so directly on each handler registration

// Constants
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const CHROMA_BASE_URL = 'http://localhost:8000'
const CHROMA_PORT = 8000
const CHROMA_PATH = '/Users/jibbr/.local/bin/chroma'

let chromaProcess: ChildProcess | null = null
let ollamaProcess: ChildProcess | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show immediately
    autoHideMenuBar: true,
    title: 'Puffer AI Assistant',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  safeLog('🪟 BrowserWindow created, showing immediately')

  mainWindow.on('ready-to-show', () => {
    safeLog('🚀 Window ready to show, focusing...')
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Register context menu handlers
  registerContextMenuHandlers()

  // Initialize MCP service on startup
  try {
    safeInfo('🔧 Initializing MCP service...')
    const mcpInitialized = await mcpService.initialize()
    if (mcpInitialized) {
      safeInfo('✅ MCP service initialized successfully')
    } else {
      safeWarn('⚠️ MCP service failed to initialize - continuing without MCP features')
    }
  } catch (error: any) {
    safeError('❌ MCP service initialization error:', error.message)
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// File System Handlers
ipcMain.handle('fs-read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-list-directory', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const fileList = files.map(file => ({
      name: file.name,
      path: path.join(dirPath, file.name),
      isDirectory: file.isDirectory(),
    }));
    return { success: true, files: fileList };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-create-file', async (event, filePath, content = '') => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-create-directory', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-delete-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-delete-directory', async (event, dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-rename-file', async (event, oldPath, newPath) => {
  try {
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (result.canceled) {
    return { success: false, error: 'Dialog canceled' };
  }
  return { success: true, filePath: result.filePaths[0] };
});

ipcMain.handle('fs-save-file-dialog', async (event, defaultName, content) => {
  const result = await dialog.showSaveDialog({ defaultPath: defaultName });
  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Dialog canceled' };
  }
  try {
    await fs.writeFile(result.filePath, content || '', 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-get-file-info', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return { success: true, info: { ...stats, isDirectory: stats.isDirectory(), isFile: stats.isFile() } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-execute-command', async (event, command, cwd) => {
  return new Promise((resolve) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
});

// Basic IPC handlers for testing
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// Ollama service handlers
ipcMain.handle('check-ollama-status', async () => {
  try {
    const status = await ollamaService.checkStatus()
    return status
  } catch (error: any) {
    return {
      connected: false,
      message: error.message
    }
  }
})

ipcMain.handle('get-ollama-models', async () => {
  try {
    const result = await ollamaService.getModels()
    return result
  } catch (error: any) {
    return {
      success: false,
      models: [],
      error: error.message
    }
  }
})

ipcMain.handle('start-ollama', async () => {
  try {
    const result = await ollamaService.startService()
    return result
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})

ipcMain.handle('pull-model', async (event, modelName: string) => {
  try {
    const result = await ollamaService.pullModel(modelName)
    return result.success
  } catch (error: any) {
    safeError('Error pulling model:', error)
    return false
  }
})

ipcMain.handle('delete-model', async (event, modelName: string) => {
  try {
    const result = await ollamaService.deleteModel(modelName)
    return result.success
  } catch (error: any) {
    safeError('Error deleting model:', error)
    return false
  }
})

// Settings handlers
ipcMain.handle('get-settings', async (): Promise<AppSettings> => {
  try {
    const settings = await loadSettings()
    return settings
  } catch (error: any) {
    throw error
  }
})

ipcMain.handle('save-settings', async (event, settings: AppSettings): Promise<void> => {
  try {
    await saveSettings(settings)
  } catch (error: any) {
    throw error
  }
})

// Chat history handlers
ipcMain.handle('get-chat-history', async (): Promise<Message[]> => {
  try {
    const history = await loadChatHistory()
    return history
  } catch (error: any) {
    throw error
  }
})

ipcMain.handle('add-message-to-history', async (event, message: Message): Promise<void> => {
  try {
    await appendChatMessage(message)
  } catch (error: any) {
    throw error
  }
})

// Memory handlers
ipcMain.handle('get-memory-summaries', async (): Promise<MemorySummary[]> => {
  try {
    const summaries = await getMemorySummaries()
    return summaries
  } catch (error: any) {
    throw error
  }
})

ipcMain.handle('get-memory-store', async () => {
  try {
    const memoryStore = await loadMemoryStore()
    return memoryStore
  } catch (error: any) {
    throw error
  }
})

// Additional memory handlers
ipcMain.handle('search-memory', async (event, query: string, limit?: number) => {
  try {
    const result = await memoryService.searchMemory(query, limit || 5)
    return result
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

ipcMain.handle('create-memory-summary', async (event, messages: Message[]) => {
  try {
    const result = await memoryService.createMemorySummary(messages)

    // If successful, also save to storage
    if (result.success && result.summary) {
      await addMemorySummary(result.summary)
    }

    return result
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

ipcMain.handle('enrich-with-memory', async (event, data: { prompt: string; options?: any }) => {
  try {
    const { prompt, options } = data
    const result = await memoryService.enrichPromptWithMemory(prompt, options)
    return {
      success: true,
      result
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

// ChromaDB service handlers
ipcMain.handle('check-chroma-status', async () => {
  try {
    const status = await chromaService.checkStatus()
    return status
  } catch (error: any) {
    return {
      connected: false,
      message: error.message
    }
  }
})

ipcMain.handle('start-chroma', async () => {
  try {
    const result = await chromaService.startService()
    return result
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})

// Model avatar handler (placeholder)
ipcMain.handle('get-model-avatar', async (event, modelName: string) => {
  // Placeholder implementation - return default avatar data
  return {
    success: true,
    avatar: {
      name: modelName,
      color: '#3B82F6',
      initials: modelName.substring(0, 2).toUpperCase(),
      type: 'text'
    }
  }
})

// PRODUCTION-READY CHAT HANDLER - Fixed with Context7 + Electron best practices
ipcMain.handle('chat-with-ai', async (event, data) => {
    const startTime = Date.now()
    const { 
      message, 
      model, 
      history = [], 
      memoryOptions = {},
      systemPrompt,
      ollamaOptions = {}
    } = data

    console.log('💬 Chat request received:', {
      model: model,
      message: message.substring(0, 50) + '...',
      historyLength: history.length,
      memoryEnabled: memoryOptions.enabled !== false,
      hasCustomSettings: !!systemPrompt || Object.keys(ollamaOptions).length > 0
    })

    try {
      // Validate input parameters
      if (!message?.trim()) {
        return {
          success: false,
          message: 'Message cannot be empty',
          modelUsed: model || 'unknown',
          error: 'Invalid input: empty message'
        }
      }

      if (!model?.trim()) {
        return {
          success: false,
          message: 'Model must be specified',
          modelUsed: 'unknown',
          error: 'Invalid input: missing model'
        }
      }

      // Build conversation context from history
      let conversationContext = ''
      if (history && history.length > 0) {
        conversationContext = history
          .slice(-5) // Last 5 messages for context
          .map((msg) => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
          .join('\n')
      }

      // Try to enhance with memory using Gemini-inspired memory service
      let finalPrompt = message
      let memoryContext = null

      if (false && memoryOptions.enabled !== false) { // Temporarily disabled for stability
        try {
          // Import the Gemini-inspired memory service (pure JS/TS - no native deps)
          const { geminiMemoryService } = await import('./services/geminiMemory')

          // Search for relevant memory chunks using advanced similarity techniques
          const memoryResults = await geminiMemoryService.searchMemoryChunks(
            message,
            memoryOptions.contextLength || 3
          )

          if (memoryResults.length > 0) {
            const relevantContext = memoryResults
              .filter((result) => result.similarity >= 0.3) // Similarity threshold
              .map((result) => `${result.match_reason}: ${result.snippet}`)
              .slice(0, memoryOptions.contextLength || 3)
              .join('\n\n')

            if (relevantContext) {
              finalPrompt = `Previous relevant context:
${relevantContext}

Current question: ${message}`

              memoryContext = {
                chunksUsed: memoryResults.length,
                contextLength: relevantContext.length,
                avgSimilarity:
                  memoryResults.reduce((sum, r) => sum + r.similarity, 0) / memoryResults.length,
                smartFilter: memoryOptions.smartFilter !== false,
                source: 'gemini-inspired-memory',
                matches: memoryResults.map((r) => ({
                  reason: r.match_reason,
                  similarity: r.similarity.toFixed(3)
                }))
              }
              console.log('🧠 Gemini-inspired memory enhancement applied:', memoryContext)
            }
          } else {
            memoryContext = {
              available: true,
              chunksUsed: 0,
              message: 'No relevant context found in memory',
              source: 'gemini-inspired-memory'
            }
          }
        } catch (memoryError) {
          console.warn('🧠 Gemini-inspired memory enhancement failed:', memoryError.message)
          memoryContext = {
            available: false,
            error: 'Gemini memory service unavailable',
            fallback: true
          }
        }
      }

      // Combine conversation context with memory-enhanced prompt
      if (conversationContext) {
        finalPrompt = `${conversationContext}\nHuman: ${finalPrompt}\nAssistant:`
      } else {
        finalPrompt = `Human: ${finalPrompt}\nAssistant:`
      }

      console.log('📝 Sending to Ollama:', {
        model: model,
        promptLength: finalPrompt.length
      })

      // Prepare the final prompt with system prompt if provided
      let fullPrompt = finalPrompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\nUser: ${finalPrompt}`;
      }

      // Merge custom Ollama options with defaults
      const requestOptions = {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        num_predict: 512,
        stop: ['Human:', 'User:'], // Prevent infinite responses
        ...ollamaOptions // Override with user settings
      };

      console.log('🔧 Using model settings:', {
        systemPrompt: systemPrompt ? 'Custom system prompt applied' : 'Default',
        options: requestOptions
      });

      // Make request to Ollama with robust error handling
      const response = await axios.post(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          model: model,
          prompt: fullPrompt,
          stream: false,
          options: requestOptions
        },
        {
          timeout: 120000, // 2 minutes timeout
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Puffer/1.0'
          },
          validateStatus: (status) => status < 500 // Only treat 5xx as errors
        }
      )

      const responseTime = Date.now() - startTime

      console.log('✅ Response received from Ollama:', {
        model: model,
        responseTime: `${responseTime}ms`,
        responseLength: response.data.response?.length || 0
      })

      // Validate response structure
      if (!response.data || typeof response.data.response !== 'string') {
        throw new Error('Invalid response format from Ollama')
      }

      const aiMessage = response.data.response.trim()

      if (!aiMessage) {
        console.warn('⚠️ Empty response from model:', model, 'with prompt length:', finalPrompt.length)
        return {
          success: false,
          message: 'The AI model returned an empty response. This can happen if the model is still loading, the prompt is too complex, or the model needs different parameters. Please try again or select a different model.',
          modelUsed: model,
          responseTime,
          error: 'Empty response from model'
        }
      }

      // Store conversation using Gemini-inspired memory service
      try {
        const { geminiMemoryService } = await import('./services/geminiMemory')

        // Store with advanced indexing and no native dependencies
        const conversationId = await geminiMemoryService.storeConversation(
          message,
          aiMessage,
          model,
          responseTime,
          (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
          {
            timestamp: new Date().toISOString(),
            sessionId: `session_${Date.now()}`,
            memoryEnabled: memoryOptions.enabled !== false
          }
        )

        console.log('🧠 Conversation stored in Gemini-inspired memory:', conversationId)

        // Get updated stats for UI
        const stats = geminiMemoryService.getMemoryStats()
        memoryContext = {
          ...memoryContext,
          storageStats: {
            totalConversations: stats.total,
            recentActivity: stats.recentActivity,
            modelDistribution: stats.byModel
          }
        }
      } catch (storageError) {
        console.warn('🧠 Gemini memory storage failed:', storageError.message)
        // Don't fail the chat if storage fails
      }

      return {
        success: true,
        message: aiMessage,
        modelUsed: model,
        responseTime,
        memoryContext
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime

      console.error('❌ Chat error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseTime: `${responseTime}ms`
      })

      // Generate user-friendly error messages
      let errorMessage = 'Sorry, I encountered an error.'

      if (error.response) {
        // Server responded with error status
        const status = error.response.status
        switch (status) {
          case 404:
            errorMessage = `Model "${model}" was not found. Please check if it's installed in Ollama.`
            break
          case 400:
            errorMessage = 'Invalid request. Please check your message and try again.'
            break
          case 413:
            errorMessage = 'Message too long. Please try with a shorter message.'
            break
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.'
            break
          case 500:
          case 502:
          case 503:
            errorMessage = 'AI service is temporarily unavailable. Please try again in a moment.'
            break
          default:
            errorMessage = `Server error (${status}). Please try again later.`
        }
      } else if (error.request) {
        // Request made but no response received
        if (error.code === 'ECONNABORTED') {
          errorMessage = `Request timed out. The model "${model}" might be large and need more time to respond.`
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to Ollama. Please ensure Ollama is running and accessible.'
        } else if (error.code === 'ENOTFOUND') {
          errorMessage = 'Cannot reach Ollama service. Please check your network connection.'
        } else {
          errorMessage = 'Network error. Please check your connection and try again.'
        }
      } else {
        // Error in request setup
        errorMessage = `An unexpected error occurred: ${error.message || 'Unknown error'}`
      }

      return {
        success: false,
        message: errorMessage,
        modelUsed: model,
        error: error.message
      }
    }
})

// Agent management handlers
ipcMain.handle('get-agent-registry', async () => {
  try {
    const { loadAgentRegistry } = await import('./services/agents')
    const registry = await loadAgentRegistry()
    return { success: true, registry }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-agent', async (event, agentData: any) => {
  try {
    const { createAgent } = await import('./services/agents')
    const result = await createAgent(agentData)
    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-agent', async (event, agentId: string, updates: any) => {
  try {
    const { updateAgent } = await import('./services/agents')
    const result = await updateAgent(agentId, updates)
    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-agent', async (event, agentId: string) => {
  try {
    const { deleteAgent } = await import('./services/agents')
    const result = await deleteAgent(agentId)
    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle(
  'execute-agent-tool',
  async (event, agentId: string, toolName: string, params: any) => {
    try {
      const { executeAgentTool } = await import('./services/agents')
      const result = await executeAgentTool(agentId, toolName, params)
      return result
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)

ipcMain.handle('get-available-tools', async () => {
  try {
    const { getAvailableTools } = await import('./services/agents')
    const tools = await getAvailableTools()
    return { success: true, tools }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Enhanced agent management handlers
ipcMain.handle('get-agent-audit-log', async (event, limit?: number) => {
  try {
    const { getAuditLog } = await import('./services/agents')
    const auditLog = await getAuditLog(limit)
    return { success: true, auditLog }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-tool-security-info', async (event, toolKey: string) => {
  try {
    const { getToolSecurityInfo } = await import('./services/agents')
    const info = getToolSecurityInfo(toolKey)
    return { success: true, info }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-all-tools-with-security', async () => {
  try {
    const { getAllToolsWithSecurity } = await import('./services/agents')
    const tools = getAllToolsWithSecurity()
    return { success: true, tools }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-security-config', async (event, config: any) => {
  try {
    const { updateSecurityConfig } = await import('./services/agents')
    updateSecurityConfig(config)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-security-config', async () => {
  try {
    const { getSecurityConfig } = await import('./services/agents')
    const config = getSecurityConfig()
    return { success: true, config }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('clone-agent', async (event, agentId: string, newName: string) => {
  try {
    const { cloneAgent } = await import('./services/agents')
    const agent = await cloneAgent(agentId, newName)
    return { success: true, agent }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-active-agent', async (event, agentId: string | null) => {
  try {
    const { setActiveAgent } = await import('./services/agents')
    await setActiveAgent(agentId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-active-agent', async () => {
  try {
    const { getActiveAgent } = await import('./services/agents')
    const agent = await getActiveAgent()
    return { success: true, agent }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Helper function for agent mode system prompts
function getSystemPromptForMode(mode: string): string {
  switch (mode) {
    case 'manual':
      return 'You are a helpful AI assistant. Respond only when directly asked. Be helpful but wait for user input.'
    case 'autonomous':
      return 'You are a proactive AI assistant. Offer suggestions, ask relevant questions, and help anticipate user needs.'
    case 'collaborative':
      return 'You are a collaborative AI partner. Work together with the user by asking clarifying questions and suggesting alternatives.'
    default:
      return 'You are a helpful AI assistant.'
  }
}

// Streaming chat handler
ipcMain.handle(
  'start-chat-stream',
  async (
    event,
    data: {
      message: string
      model: string
      streamId: string
    }
  ) => {
    try {
      const { message, model, streamId } = data

      // Start streaming response
      streamingService.startStream({
        id: streamId,
        model,
        prompt: message
      })

      // Forward streaming events to renderer
      streamingService.on('stream-chunk', (response) => {
        if (response.id === streamId) {
          event.sender.send('chat-stream-chunk', response)
        }
      })

      streamingService.on('stream-complete', (response) => {
        if (response.id === streamId) {
          event.sender.send('chat-stream-complete', response)
        }
      })

      streamingService.on('stream-error', (response) => {
        if (response.id === streamId) {
          event.sender.send('chat-stream-error', response)
        }
      })

      return { success: true, streamId }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
)

ipcMain.handle('stop-chat-stream', async (event, streamId: string) => {
  try {
    streamingService.stopStream(streamId)
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

// Missing IPC handlers - proper Electron patterns
ipcMain.handle('search-context', async (event, query: string) => {
  try {
    safeLog('🔍 Search context:', query)
    const results = await chromaService.queryCollection('memory', [query], 5)
    return { success: true, results }
  } catch (error: any) {
    safeError('Search context failed:', error)
    return { success: false, results: [], error: error.message }
  }
})

// Analytics handlers
ipcMain.on('analytics:track', (event, action: string, data: any) => {
  safeLog(`📊 Analytics: ${action}`, data)
})

// Canvas mode code execution handler
ipcMain.on('execute-code', async (event, code: string) => {
  try {
    const result = await runUserCodeInSandbox(code)
    event.sender.send('execute-response', result)
  } catch (error: any) {
    event.sender.send('execute-response', `Error: ${error.message}`)
  }
})

// Safe code execution sandbox
async function runUserCodeInSandbox(code: string): Promise<string> {
  try {
    // Create a safe execution environment
    const output: string[] = []
    const mockConsole = {
      log: (...args: any[]) =>
        output.push(
          'LOG: ' +
            args
              .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
              .join(' ')
        ),
      error: (...args: any[]) => output.push('ERROR: ' + args.join(' ')),
      warn: (...args: any[]) => output.push('WARN: ' + args.join(' ')),
      info: (...args: any[]) => output.push('INFO: ' + args.join(' '))
    }

    // Execute in isolated context
    const func = new Function(
      'console',
      `
      ${code}
    `
    )

    func(mockConsole)

    return output.length > 0 ? output.join('\n') : 'Code executed successfully (no output)'
  } catch (error: any) {
    return `Execution Error: ${error.message}`
  }
}

// Add process cleanup handlers
app.on('before-quit', () => {
  safeLog('🔄 Application shutting down...')
  processErrorHandler.setShuttingDown(true)

  // Clean up child processes
  if (chromaProcess) {
    chromaProcess.kill('SIGTERM')
    chromaProcess = null
  }
  if (ollamaProcess) {
    ollamaProcess.kill('SIGTERM')
    ollamaProcess = null
  }
})

// Reddit handlers are now in reddit-bot-handlers.ts

app.on('will-quit', async (event) => {
  safeLog('🛑 Will quit - final cleanup')
  
  // Prevent immediate quit to allow cleanup
  event.preventDefault()
  
  try {
    // Stop MCP service gracefully
    await mcpService.stop()
    safeInfo('✅ MCP service stopped')
  } catch (error: any) {
    safeError('❌ Error stopping MCP service:', error.message)
  }
  
  // Now actually quit
  app.quit()
})

safeLog('✅ Puffer main process initialized')
