import axios from 'axios'
import { spawn, ChildProcess } from 'child_process'
import { safeLog, safeError, safeWarn, safeInfo } from '@utils/safeLogger'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

interface OllamaModel {
  name: string
  model: string
  size: number
  digest: string
  details: {
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

interface ServiceStatus {
  connected: boolean
  message: string
  version?: string
}

interface GenerateRequest {
  model: string
  prompt: string
  system?: string
  template?: string
  context?: number[]
  stream?: boolean
  raw?: boolean
  format?: string
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
    repeat_penalty?: number
    seed?: number
    num_predict?: number
    stop?: string[]
  }
}

let ollamaProcess: ChildProcess | null = null

class OllamaService {
  private baseUrl = OLLAMA_BASE_URL

  async checkStatus(): Promise<ServiceStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      })

      return {
        connected: true,
        message: 'Ollama is running and accessible',
        version: response.headers['ollama-version'] || 'unknown'
      }
    } catch (error: any) {
      return {
        connected: false,
        message: `Ollama is not running: ${error.message}`
      }
    }
  }

  async getModels(): Promise<{ success: boolean; models?: OllamaModel[]; error?: string }> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`)
      return {
        success: true,
        models: response.data.models || []
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async generateResponse(
    request: GenerateRequest
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          ...request,
          stream: false
        },
        {
          timeout: 30000
        }
      )

      return {
        success: true,
        response: response.data.response
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async *streamGenerate(request: GenerateRequest): AsyncGenerator<string, void, unknown> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          ...request,
          stream: true
        },
        {
          responseType: 'stream',
          timeout: 60000
        }
      )

      for await (const chunk of response.data) {
        try {
          const lines = chunk.toString().split('\n').filter(Boolean)
          for (const line of lines) {
            const data: OllamaResponse = JSON.parse(line)
            if (data.response) {
              yield data.response
            }
            if (data.done) {
              return
            }
          }
        } catch (parseError) {
          safeError('Error parsing stream chunk:', parseError)
        }
      }
    } catch (error: any) {
      throw new Error(`Stream generation failed: ${error.message}`)
    }
  }

  async pullModel(modelName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.post(
        `${this.baseUrl}/api/pull`,
        {
          name: modelName
        },
        {
          timeout: 300000 // 5 minutes for model download
        }
      )

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async startService(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if already running
      const status = await this.checkStatus()
      if (status.connected) {
        return {
          success: true,
          message: 'Ollama is already running'
        }
      }

      // Try to start Ollama
      const ollamaPaths = ['/usr/local/bin/ollama', '/opt/homebrew/bin/ollama', 'ollama']

      for (const ollamaPath of ollamaPaths) {
        try {
          ollamaProcess = spawn(ollamaPath, ['serve'], {
            stdio: 'pipe',
            detached: false
          })

          ollamaProcess.on('error', (error) => {
            safeError('Ollama process error:', error)
            ollamaProcess = null
          })

          ollamaProcess.on('exit', (code, signal) => {
            safeLog(`Ollama process exited with code ${code} and signal ${signal}`)
            ollamaProcess = null
          })

          // Wait for service to start
          await new Promise((resolve) => setTimeout(resolve, 3000))

          const finalStatus = await this.checkStatus()
          if (finalStatus.connected) {
            return {
              success: true,
              message: 'Ollama started successfully'
            }
          }
        } catch (error) {
          safeError(`Failed to start Ollama with path ${ollamaPath}:`, error)
          continue
        }
      }

      return {
        success: false,
        message: 'Failed to start Ollama. Please ensure Ollama is installed.'
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to start Ollama: ${error.message}`
      }
    }
  }

  async deleteModel(modelName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.delete(
        `${this.baseUrl}/api/delete`,
        {
          data: { name: modelName },
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      )

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async stopService(): Promise<{ success: boolean; message: string }> {
    try {
      if (ollamaProcess) {
        ollamaProcess.kill('SIGTERM')
        ollamaProcess = null
        return {
          success: true,
          message: 'Ollama service stopped'
        }
      }

      return {
        success: true,
        message: 'Ollama service was not running'
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to stop Ollama: ${error.message}`
      }
    }
  }
}

// Export singleton instance
export const ollamaService = new OllamaService()
export default ollamaService
