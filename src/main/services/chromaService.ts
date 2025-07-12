import axios from 'axios'
import { spawn, ChildProcess } from 'child_process'
import { safeLog, safeError, safeWarn, safeInfo } from '@utils/safeLogger'

const CHROMA_BASE_URL = 'http://localhost:8000'

interface ChromaCollection {
  name: string
  id: string
  metadata: Record<string, any>
}

interface QueryResult {
  documents: string[][]
  metadatas: Record<string, any>[][]
  distances: number[][]
  ids: string[][]
}

interface ServiceStatus {
  connected: boolean
  message: string
  version?: string
}

let chromaProcess: ChildProcess | null = null

class ChromaService {
  private baseUrl = CHROMA_BASE_URL

  async checkStatus(): Promise<ServiceStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/heartbeat`, {
        timeout: 5000
      })

      return {
        connected: true,
        message: 'ChromaDB is running and accessible',
        version: response.data?.version || 'unknown'
      }
    } catch (error: any) {
      return {
        connected: false,
        message: `ChromaDB is not running: ${error.message}`
      }
    }
  }

  async createCollection(
    name: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.post(`${this.baseUrl}/api/v1/collections`, {
        name,
        metadata: metadata || {}
      })

      return { success: true }
    } catch (error: any) {
      // Collection might already exist
      if (error.response?.status === 409) {
        return { success: true } // Already exists, that's fine
      }
      return {
        success: false,
        error: error.message
      }
    }
  }

  async addDocuments(
    collectionName: string,
    documents: string[],
    metadatas?: Record<string, any>[],
    ids?: string[]
  ): Promise<{ success: boolean; addedCount: number; error?: string }> {
    try {
      // Ensure collection exists
      await this.createCollection(collectionName)

      const docIds = ids || documents.map((_, i) => `doc_${Date.now()}_${i}`)

      await axios.post(`${this.baseUrl}/api/v1/collections/${collectionName}/add`, {
        documents,
        metadatas: metadatas || documents.map(() => ({})),
        ids: docIds
      })

      return {
        success: true,
        addedCount: documents.length
      }
    } catch (error: any) {
      return {
        success: false,
        addedCount: 0,
        error: error.message
      }
    }
  }

  async queryCollection(
    collectionName: string,
    queryTexts: string[],
    nResults: number = 5
  ): Promise<{ success: boolean; results?: QueryResult; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/collections/${collectionName}/query`,
        {
          query_texts: queryTexts,
          n_results: nResults
        }
      )

      return {
        success: true,
        results: response.data
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getCollections(): Promise<{
    success: boolean
    collections?: ChromaCollection[]
    error?: string
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/collections`)

      return {
        success: true,
        collections: response.data || []
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async deleteCollection(name: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.delete(`${this.baseUrl}/api/v1/collections/${name}`)
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
          message: 'ChromaDB is already running'
        }
      }

      // Try to start ChromaDB
      const chromaPaths = ['/Users/jibbr/.local/bin/chroma', '/usr/local/bin/chroma', 'chroma']

      for (const chromaPath of chromaPaths) {
        try {
          chromaProcess = spawn(chromaPath, ['run', '--port', '8000'], {
            stdio: 'pipe',
            detached: false
          })

          chromaProcess.on('error', (error) => {
            safeError('ChromaDB process error:', error)
            chromaProcess = null
          })

          chromaProcess.on('exit', (code, signal) => {
            safeLog(`ChromaDB process exited with code ${code} and signal ${signal}`)
            chromaProcess = null
          })

          // Wait for service to start
          await new Promise((resolve) => setTimeout(resolve, 4000))

          const finalStatus = await this.checkStatus()
          if (finalStatus.connected) {
            return {
              success: true,
              message: 'ChromaDB started successfully'
            }
          }
        } catch (error) {
          safeError(`Failed to start ChromaDB with path ${chromaPath}:`, error)
          continue
        }
      }

      return {
        success: false,
        message: 'Failed to start ChromaDB. Please ensure ChromaDB is installed.'
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to start ChromaDB: ${error.message}`
      }
    }
  }

  async stopService(): Promise<{ success: boolean; message: string }> {
    try {
      if (chromaProcess) {
        chromaProcess.kill('SIGTERM')
        chromaProcess = null
        return {
          success: true,
          message: 'ChromaDB service stopped'
        }
      }

      return {
        success: true,
        message: 'ChromaDB service was not running'
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to stop ChromaDB: ${error.message}`
      }
    }
  }

  // Convenience method for storing chat conversations
  async storeChatConversation(
    userMessage: string,
    aiResponse: string
  ): Promise<{ success: boolean; error?: string }> {
    const collectionName = 'chat_history'
    const documents = [`User: ${userMessage}\nAI: ${aiResponse}`]
    const metadatas = [
      {
        timestamp: new Date().toISOString(),
        type: 'conversation',
        user_message: userMessage,
        ai_response: aiResponse
      }
    ]

    const result = await this.addDocuments(collectionName, documents, metadatas)
    return {
      success: result.success,
      error: result.error
    }
  }

  // Convenience method for searching chat history
  async searchChatHistory(
    query: string,
    limit: number = 5
  ): Promise<{ success: boolean; results?: string[]; error?: string }> {
    const collectionName = 'chat_history'
    const result = await this.queryCollection(collectionName, [query], limit)

    if (result.success && result.results) {
      return {
        success: true,
        results: result.results.documents[0] || []
      }
    }

    return {
      success: false,
      error: result.error
    }
  }
}

// Export singleton instance
export const chromaService = new ChromaService()
export default chromaService
