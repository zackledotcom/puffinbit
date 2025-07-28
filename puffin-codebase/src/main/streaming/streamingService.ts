import { EventEmitter } from 'events'
import { ollamaService } from '@services/ollamaService'

interface StreamingRequest {
  id: string
  model: string
  prompt: string
  system?: string
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
  }
}

interface StreamingResponse {
  id: string
  chunk: string
  done: boolean
  error?: string
}

class StreamingService extends EventEmitter {
  private activeStreams = new Map<string, boolean>()

  async startStream(request: StreamingRequest): Promise<void> {
    try {
      this.activeStreams.set(request.id, true)

      const streamGenerator = ollamaService.streamGenerate({
        model: request.model,
        prompt: request.prompt,
        system: request.system,
        options: request.options,
        stream: true
      })

      for await (const chunk of streamGenerator) {
        // Check if stream was cancelled
        if (!this.activeStreams.get(request.id)) {
          break
        }

        this.emit('stream-chunk', {
          id: request.id,
          chunk,
          done: false
        } as StreamingResponse)
      }

      // Stream completed
      this.emit('stream-complete', {
        id: request.id,
        chunk: '',
        done: true
      } as StreamingResponse)
    } catch (error: any) {
      this.emit('stream-error', {
        id: request.id,
        chunk: '',
        done: true,
        error: error.message
      } as StreamingResponse)
    } finally {
      this.activeStreams.delete(request.id)
    }
  }

  stopStream(streamId: string): void {
    this.activeStreams.set(streamId, false)
  }

  isStreamActive(streamId: string): boolean {
    return this.activeStreams.has(streamId)
  }

  getActiveStreamCount(): number {
    return this.activeStreams.size
  }

  stopAllStreams(): void {
    for (const streamId of this.activeStreams.keys()) {
      this.activeStreams.set(streamId, false)
    }
    this.activeStreams.clear()
  }
}

// Export singleton instance
export const streamingService = new StreamingService()
export default streamingService
