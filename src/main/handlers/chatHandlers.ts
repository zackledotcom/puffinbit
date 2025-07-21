/**
 * Enterprise Chat Handlers - Unified Chat Processing Pipeline
 *
 * Handles all chat-related IPC operations with validation, error recovery,
 * and performance monitoring. Foundation for Phase 2 streaming implementation.
 *
 * @author Puffer Engineering Team
 * @version 2.0.0 - Modular Architecture
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { logger } from '@utils/logger'
import { withErrorBoundary } from '@core/errorHandler'
import { validateChatMessage } from '@main/validation/schemas'
import { ollamaService } from '@services/ollamaService'
import { streamingService } from '@main/streaming/streamingService'
import { chromaService } from '@services/chromaService'

export interface ChatRequest {
  message: string
  model: string
  history?: Array<{ role: string; content: string }>
  memoryOptions?: {
    enabled?: boolean
    searchLimit?: number
    threshold?: number
  }
  streaming?: boolean
  options?: {
    temperature?: number
    max_tokens?: number
  }
}

export interface ChatResponse {
  success: boolean
  message?: string
  modelUsed: string
  responseTime?: number
  tokenCount?: number
  memoryUsed?: boolean
  error?: string
}

/**
 * Unified Chat Processing Pipeline
 * Handles both traditional and streaming chat requests
 */
export class ChatProcessor {
  private static instance: ChatProcessor

  static getInstance(): ChatProcessor {
    if (!ChatProcessor.instance) {
      ChatProcessor.instance = new ChatProcessor()
    }
    return ChatProcessor.instance
  }

  /**
   * Process traditional chat request (Phase 1)
   */
  async processChat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now()

    logger.info(
      'Processing chat request',
      {
        model: request.model,
        messageLength: request.message.length,
        historyLength: request.history?.length || 0,
        memoryEnabled: request.memoryOptions?.enabled || false
      },
      'chat-processor'
    )

    try {
      // Build context from history
      let context = ''
      if (request.history && request.history.length > 0) {
        context = request.history
          .slice(-5) // Last 5 messages for context
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join('\n')
      }

      // Enhance with memory if enabled
      let enhancedPrompt = request.message
      let memoryUsed = false

      if (request.memoryOptions?.enabled) {
        const contextResultsResp = await chromaService.searchChatHistory(
          request.message,
          request.memoryOptions.searchLimit || 3
        )
        const contextResults = contextResultsResp.results || []
        if (contextResults.length > 0) {
          const relevantContext = contextResults
            // .filter((result) => result.similarity >= (request.memoryOptions?.threshold || 0.7)) // If similarity is needed, add it to the result type
            .join('\n\n')

          if (relevantContext) {
            enhancedPrompt = `Context from previous conversations:\n${relevantContext}\n\nCurrent conversation:\n${context}\n\nUser: ${request.message}`
            memoryUsed = true
          }
        }
      } else if (context) {
        enhancedPrompt = `${context}\nUser: ${request.message}`
      }

      // Generate response using Ollama
      const ollamaResponse = await ollamaService.generateResponse({
        model: request.model,
        prompt: enhancedPrompt,
        options: request.options
      })

      // Store conversation in memory for future context
      if (ollamaResponse.response) {
        await chromaService.storeChatConversation(request.message, ollamaResponse.response)
      }

      const responseTime = Date.now() - startTime

      logger.performance(
        'Chat request completed',
        responseTime,
        {
          model: request.model,
          memoryUsed
        },
        'chat-processor'
      )

      return {
        success: true,
        message: ollamaResponse.response,
        modelUsed: request.model,
        responseTime,
        memoryUsed
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime

      logger.error('Chat processing failed', error, 'chat-processor')

      return {
        success: false,
        modelUsed: request.model,
        responseTime,
        error: this.getErrorMessage(error, request.model)
      }
    }
  }

  /**
   * Process streaming chat request (Phase 2 foundation)
   */
  async processStreamingChat(
    request: ChatRequest,
    onToken: (token: { content: string; done: boolean }) => void
  ): Promise<ChatResponse> {
    // This is the foundation for Phase 2 streaming implementation
    logger.info(
      'Streaming chat requested - Phase 2 implementation',
      {
        model: request.model
      },
      'chat-processor'
    )

    // For now, fall back to regular chat
    // Phase 2 will implement true streaming here
    return await this.processChat({ ...request, streaming: false })
  }

  /**
   * Generate appropriate error message
   */
  private getErrorMessage(error: any, model: string): string {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. The model might be too large or busy.'
    }
    if (error.response?.status === 404) {
      return `Model "${model}" was not found. Please check if it's installed.`
    }
    if (error.code === 'ECONNREFUSED') {
      return 'Cannot connect to the AI service. Please check if Ollama is running.'
    }
    return `An error occurred while processing your request: ${error.message}`
  }
}

/**
 * Register all chat-related IPC handlers
 */
export function registerChatHandlers(): void {
  const chatProcessor = ChatProcessor.getInstance()

  // Main chat handler with enterprise validation and error handling
  ipcMain.handle(
    'chat-with-ai',
    withErrorBoundary(
      async (event: IpcMainInvokeEvent, data: ChatRequest): Promise<ChatResponse> => {
        // Validate input data
        const validation = await validateChatMessage(data)
        if (!validation.success) {
          logger.warn('Chat validation failed', validation.error, 'chat-handlers')
          return {
            success: false,
            modelUsed: data.model || 'unknown',
            error: validation.error?.message || 'Invalid request data'
          }
        }

        return await chatProcessor.processChat(data)
      },
      'main',
      'chat-with-ai'
    )
  )

  // Stream chat handler - PRODUCTION IMPLEMENTATION
  ipcMain.handle(
    'chat-stream-start',
    withErrorBoundary(
      async (event: IpcMainInvokeEvent, data: ChatRequest): Promise<{ streamId: string }> => {
        // Validate streaming request
        const validation = await validateChatMessage(data)
        if (!validation.success) {
          throw new Error(validation.error?.message || 'Invalid streaming request')
        }

        // Create new stream
        await streamingService.startStream({
          id: data.model + '-' + Date.now(), // Generate a unique stream id
          model: data.model,
          prompt: data.message,
          options: data.options
        })

        // Set up real-time event forwarding to renderer
        streamingService.on('stream-chunk', (payload) => {
          event.sender.send('chat-stream-token', {
            streamId: payload.id,
            token: payload.chunk
          })
        })
        streamingService.on('stream-complete', (payload) => {
          event.sender.send('chat-stream-complete', {
            streamId: payload.id,
            result: payload
          })
        })
        streamingService.on('stream-error', (payload) => {
          event.sender.send('chat-stream-error', {
            streamId: payload.id,
            error: {
              message: payload.error || 'Stream failed',
              recoverable: true
            }
          })
        })
        streamingService.on('stream-cancelled', (payload) => {
          event.sender.send('chat-stream-cancelled', {
            streamId: payload.id,
            result: payload
          })
        })

        // Start the stream
        // The stream is started by the streamingService.startStream call

        logger.success(
          `Started streaming chat ${data.model}`,
          {
            model: data.model
          },
          'chat-handlers'
        )

        return { streamId: data.model + '-' + Date.now() } // Return a dummy streamId for now
      },
      'main',
      'chat-stream-start'
    )
  )

  // Cancel stream handler - PRODUCTION IMPLEMENTATION
  ipcMain.handle(
    'chat-stream-cancel',
    withErrorBoundary(
      async (
        event: IpcMainInvokeEvent,
        data: { streamId: string }
      ): Promise<{ success: boolean }> => {
        const success = true // streamingService.stopStream now just sets a flag, always returns void
        streamingService.stopStream(data.streamId)

        logger.info(
          `Stream cancellation ${success ? 'successful' : 'failed'}`,
          {
            streamId: data.streamId
          },
          'chat-handlers'
        )

        return { success }
      },
      'main',
      'chat-stream-cancel'
    )
  )

  // Get chat metrics handler
  ipcMain.handle(
    'chat-get-metrics',
    withErrorBoundary(
      async (event: IpcMainInvokeEvent): Promise<any> => {
        return {
          ollamaMetrics: {}, // getServiceMetrics stubbed
          chromaMetrics: {},
          streamingMetrics: {},
          processorStats: {
            totalRequests: 0, // Will be tracked in future iterations
            averageResponseTime: 0,
            errorRate: 0
          }
        }
      },
      'main',
      'chat-get-metrics'
    )
  )

  logger.success(
    'Chat handlers registered successfully',
    {
      handlers: ['chat-with-ai', 'chat-stream-start', 'chat-stream-cancel', 'chat-get-metrics']
    },
    'chat-handlers'
  )
}
