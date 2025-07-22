import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { safeLog, safeError } from '@utils/safeLogger'

interface ModelfileRequest {
  modelName: string
  content: string
  options?: {
    customName?: string
    overwrite?: boolean
    validate?: boolean
  }
}

interface ModelfileResponse {
  success: boolean
  modelName?: string
  error?: string
  responseTime: number
}

// Rate limiting map
const rateLimitMap = new Map<string, number[]>()
const MAX_REQUESTS_PER_MINUTE = 3

/**
 * Check if request is within rate limits
 */
function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const requests = rateLimitMap.get(sessionId) || []
  
  // Clean old requests (older than 1 minute)
  const recentRequests = requests.filter(time => now - time < 60000)
  
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false
  }
  
  recentRequests.push(now)
  rateLimitMap.set(sessionId, recentRequests)
  return true
}

/**
 * Validate modelfile content for security
 */
function validateModelfileContent(content: string): { valid: boolean; error?: string } {
  // Basic size check
  if (content.length > 10 * 1024 * 1024) { // 10MB max
    return { valid: false, error: 'Content exceeds maximum size (10MB)' }
  }
  
  // Basic content validation
  if (!content.trim()) {
    return { valid: false, error: 'Content cannot be empty' }
  }
  
  // Check for valid directives
  const validDirectives = ['FROM', 'SYSTEM', 'TEMPLATE', 'PARAMETER']
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const directive = trimmed.split(' ')[0]?.toUpperCase()
      if (directive && !validDirectives.includes(directive)) {
        return { valid: false, error: `Invalid directive: ${directive}` }
      }
    }
  }
  
  return { valid: true }
}

/**
 * Handle modelfile update request
 */
async function handleModelfileUpdate(
  event: IpcMainInvokeEvent,
  request: ModelfileRequest
): Promise<ModelfileResponse> {
  const startTime = Date.now()
  const sessionId = event.sender.id.toString()
  
  try {
    // Rate limiting
    if (!checkRateLimit(sessionId)) {
      return {
        success: false,
        error: 'Rate limit exceeded. Maximum 3 requests per minute.',
        responseTime: Date.now() - startTime
      }
    }
    
    // Validate content
    const validation = validateModelfileContent(request.content)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        responseTime: Date.now() - startTime
      }
    }
    
    // Sanitize model name
    const sanitizedName = request.options?.customName || 
      `${request.modelName.replace(/[^a-zA-Z0-9\-_:.]/g, '')}-custom`
    
    // For now, just simulate success (actual Ollama integration would go here)
    safeLog(`Modelfile update simulated for ${sanitizedName}`)
    
    return {
      success: true,
      modelName: sanitizedName,
      responseTime: Date.now() - startTime
    }
    
  } catch (error) {
    safeError('Modelfile update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * Register modelfile handlers
 */
export function registerModelfileHandlers(): void {
  safeLog('Registering modelfile handlers...')
  
  // Main modelfile update handler
  if (!ipcMain.listeners('ollama:update-modelfile').length) {
    ipcMain.handle('ollama:update-modelfile', handleModelfileUpdate)
    safeLog('Registered ollama:update-modelfile handler')
  } else {
    safeLog('Skipped registering duplicate handler for ollama:update-modelfile')
  }
  
  // Rate limit status checker
  ipcMain.handle('ollama:modelfile-rate-limit-status', async (event) => {
    const sessionId = event.sender.id.toString()
    const requests = rateLimitMap.get(sessionId) || []
    const now = Date.now()
    const recentRequests = requests.filter(time => now - time < 60000)
    
    return {
      requestsRemaining: Math.max(0, MAX_REQUESTS_PER_MINUTE - recentRequests.length),
      resetTime: Math.max(...recentRequests) + 60000
    }
  })
}
