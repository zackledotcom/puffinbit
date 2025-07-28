/**
 * Assistant UI Integration Handlers
 * 
 * Bridges Assistant UI with existing Puffer services:
 * - Ollama service for AI responses
 * - ChromaDB for memory and context
 * - Analytics for tracking
 * - All existing functionality preserved
 */

import { ipcMain } from 'electron'
import { ollamaService } from '../services/ollamaService'
import { chromaService } from '../services/chromaService'
import { memoryService } from '../services/memoryService'
import { logger } from '../utils/logger'
import type { Message } from '../../types/chat'

export interface AssistantUIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  id?: string
}

export interface AssistantUIChatRequest {
  messages: AssistantUIMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  // Puffer-specific options
  memoryEnabled?: boolean
  useContext?: boolean
  agentMode?: string
}

export interface AssistantUIChatResponse {
  success: boolean
  message?: string
  error?: string
  metadata?: {
    model: string
    responseTime: number
    memoryUsed: boolean
    contextLength: number
  }
}

/**
 * Main chat handler that integrates Assistant UI with all Puffer services
 */
export async function handleAssistantUIChat(
  request: AssistantUIChatRequest
): Promise<AssistantUIChatResponse> {
  const startTime = Date.now()
  
  try {
    logger.info('Assistant UI chat request', {
      messageCount: request.messages.length,
      model: request.model,
      memoryEnabled: request.memoryEnabled
    })

    // Extract the latest user message
    const userMessage = request.messages[request.messages.length - 1]
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('Invalid message format')
    }

    // Get current model (use default if not specified)
    const models = await ollamaService.getModels()
    const selectedModel = request.model || models.models[0]?.name || 'tinydolphin:latest'

    // Build conversation context from message history
    const conversationHistory = request.messages
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')

    // Enhance with memory if enabled (preserving existing memory system)
    let enhancedPrompt = userMessage.content
    let memoryUsed = false
    let contextLength = 0

    if (request.memoryEnabled !== false) {
      try {
        const memoryResult = await memoryService.enrichPromptWithMemory(
          userMessage.content,
          {
            enabled: true,
            contextLength: 3,
            smartFilter: true,
            debugMode: false
          }
        )

        if (memoryResult.contextUsed) {
          enhancedPrompt = memoryResult.enrichedPrompt
          memoryUsed = true
          contextLength = memoryResult.contextLength
        }
      } catch (memoryError) {
        logger.warn('Memory enrichment failed, continuing without it', memoryError)
      }
    }

    // Add conversation history to the prompt
    const finalPrompt = conversationHistory ? 
      `${conversationHistory}\nuser: ${enhancedPrompt}` : 
      enhancedPrompt

    // Generate response using existing Ollama service
    const ollamaResponse = await ollamaService.generateResponse({
      model: selectedModel,
      prompt: finalPrompt,
      stream: false,
      options: {
        temperature: request.temperature || 0.7,
        num_predict: request.max_tokens || 2048
      }
    })

    if (!ollamaResponse.response) {
      throw new Error('Empty response from AI model')
    }

    // Store conversation in ChromaDB (preserving existing memory system)
    try {
      await chromaService.storeChatConversation(
        userMessage.content,
        ollamaResponse.response
      )
    } catch (storageError) {
      logger.warn('Failed to store conversation in ChromaDB', storageError)
    }

    const responseTime = Date.now() - startTime

    logger.info('Assistant UI chat completed', {
      model: selectedModel,
      responseTime,
      memoryUsed,
      contextLength
    })

    return {
      success: true,
      message: ollamaResponse.response,
      metadata: {
        model: selectedModel,
        responseTime,
        memoryUsed,
        contextLength
      }
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    logger.error('Assistant UI chat failed', error)

    return {
      success: false,
      error: error.message || 'Chat processing failed',
      metadata: {
        model: request.model || 'unknown',
        responseTime,
        memoryUsed: false,
        contextLength: 0
      }
    }
  }
}

// Register IPC handler
ipcMain.handle('assistant-ui-chat', async (event, request: AssistantUIChatRequest) => {
  return await handleAssistantUIChat(request)
})
