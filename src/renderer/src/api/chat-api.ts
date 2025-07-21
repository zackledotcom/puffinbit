/**
 * Assistant UI API Route
 * 
 * Creates a /api/chat endpoint that bridges Assistant UI with Puffer's services
 * This enables the simple 5-line Assistant UI integration
 */

export interface ChatAPIRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  model?: string
  temperature?: number
  max_tokens?: number
}

export interface ChatAPIResponse {
  choices?: Array<{
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: string
  }>
  error?: {
    message: string
    type: string
  }
}

/**
 * Simulated API route handler for Assistant UI
 * This mimics a REST API but uses IPC to communicate with Puffer services
 */
export class PufferChatAPI {
  private static instance: PufferChatAPI

  static getInstance(): PufferChatAPI {
    if (!PufferChatAPI.instance) {
      PufferChatAPI.instance = new PufferChatAPI()
    }
    return PufferChatAPI.instance
  }

  async handleChatRequest(request: ChatAPIRequest): Promise<ChatAPIResponse> {
    try {
      // Convert API request to Puffer format
      const pufferRequest = {
        messages: request.messages,
        model: request.model,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        memoryEnabled: true, // Use Puffer's memory system
        useContext: true,
        agentMode: 'manual'
      }

      // Call Puffer's backend via IPC
      const response = await window.api.assistantUIChat(pufferRequest)

      if (!response.success) {
        return {
          error: {
            message: response.error || 'Chat request failed',
            type: 'api_error'
          }
        }
      }

      // Convert Puffer response to Assistant UI format
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: response.message || ''
            },
            finish_reason: 'stop'
          }
        ]
      }
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Internal server error',
          type: 'api_error'
        }
      }
    }
  }

  /**
   * Create a fetch-compatible API endpoint
   * This allows Assistant UI to work with a local "API"
   */
  createAPIEndpoint() {
    return async (url: string, options: RequestInit = {}): Promise<Response> => {
      try {
        if (!options.body) {
          throw new Error('Request body is required')
        }

        const request: ChatAPIRequest = JSON.parse(options.body as string)
        const response = await this.handleChatRequest(request)

        return new Response(JSON.stringify(response), {
          status: response.error ? 400 : 200,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } catch (error: any) {
        return new Response(JSON.stringify({
          error: {
            message: error.message || 'Invalid request',
            type: 'bad_request'
          }
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    }
  }
}

export const pufferChatAPI = PufferChatAPI.getInstance()
