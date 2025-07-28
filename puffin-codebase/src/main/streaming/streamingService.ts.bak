        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const data = JSON.parse(line)
            
            if (data.response) {
              const token: StreamToken = {
                id: `${this.id}_${position}`,
                content: data.response,
                timestamp: Date.now(),
                position: position++,
                done: data.done || false,
                metadata: {
                  model: this.request.model,
                  confidence: data.confidence,
                  totalTokens: data.total_tokens
                }
              }

              this.tokens.push(token)
              this.updateMetrics()
              
              // Emit token event for real-time updates
              this.emit('token', token)

              if (data.done) {
                this.handleStreamComplete()
                break
              }
            }
          } catch (parseError) {
            logger.warn(`Failed to parse streaming chunk in ${this.id}`, parseError, 'chat-stream')
          }
        }
      }
    } catch (error: any) {
      this.handleStreamError(error)
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Handle stream completion
   */
  private handleStreamComplete(): void {
    this.isActive = false
    this.metrics.streamDuration = Date.now() - this.startTime

    const fullContent = this.tokens.map(token => token.content).join('')
    
    const result: StreamResult = {
      id: this.id,
      content: fullContent,
      totalTokens: this.tokens.length,
      duration: this.metrics.streamDuration,
      success: true
    }

    logger.success(`Stream ${this.id} completed successfully`, {
      totalTokens: this.tokens.length,
      duration: this.metrics.streamDuration,
      avgTokensPerSecond: this.metrics.tokensPerSecond
    }, 'chat-stream')

    // Store in memory for future context
    this.storeConversation(fullContent)

    this.emit('complete', result)
  }

  /**
   * Handle stream errors
   */
  private handleStreamError(error: any): void {
    this.isActive = false
    this.metrics.errorCount++

    logger.error(`Stream ${this.id} encountered error`, error, 'chat-stream')

    const result: StreamResult = {
      id: this.id,
      content: this.tokens.map(token => token.content).join(''),
      totalTokens: this.tokens.length,
      duration: Date.now() - this.startTime,
      success: false,
      error: error.message
    }

    this.emit('error', result)
  }

  /**
   * Cancel the stream
   */
  async cancel(): Promise<void> {
    if (!this.isActive) return

    this.isCancelled = true
    this.isActive = false

    logger.info(`Stream ${this.id} cancelled by user`, undefined, 'chat-stream')

    const result: StreamResult = {
      id: this.id,
      content: this.tokens.map(token => token.content).join(''),
      totalTokens: this.tokens.length,
      duration: Date.now() - this.startTime,
      success: false,
      error: 'Cancelled by user'
    }

    this.emit('cancelled', result)
  }

  /**
   * Update streaming metrics
   */
  private updateMetrics(): void {
    const now = Date.now()
    const elapsed = (now - this.startTime) / 1000 // Convert to seconds
    
    this.metrics.totalTokens = this.tokens.length
    this.metrics.tokensPerSecond = elapsed > 0 ? this.tokens.length / elapsed : 0
    this.metrics.streamDuration = now - this.startTime
    
    // Calculate average latency (time between tokens)
    if (this.tokens.length > 1) {
      const latencies = []
      for (let i = 1; i < this.tokens.length; i++) {
        latencies.push(this.tokens[i].timestamp - this.tokens[i - 1].timestamp)
      }
      this.metrics.averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
    }
  }

  /**
   * Store conversation in ChromaDB for future context
   */
  private async storeConversation(response: string): Promise<void> {
    try {
      await chromaService.storeChatMessage(
        this.request.message,
        response,
        {
          model: this.request.model,
          streamId: this.id,
          timestamp: new Date().toISOString(),
          responseTime: this.metrics.streamDuration,
          tokenCount: this.tokens.length
        }
      )
    } catch (error) {
      logger.warn(`Failed to store conversation for stream ${this.id}`, error, 'chat-stream')
    }
  }

  /**
   * Get current stream metrics
   */
  getMetrics(): StreamMetrics {
    return { ...this.metrics }
  }

  /**
   * Get stream status
   */
  getStatus(): {
    id: string
    isActive: boolean
    isCancelled: boolean
    tokenCount: number
    duration: number
  } {
    return {
      id: this.id,
      isActive: this.isActive,
      isCancelled: this.isCancelled,
      tokenCount: this.tokens.length,
      duration: Date.now() - this.startTime
    }
  }
}

/**
 * Central streaming service manager
 */
export class StreamingService {
  private static instance: StreamingService
  private activeStreams = new Map<string, ChatStream>()
  private streamCounter = 0

  static getInstance(): StreamingService {
    if (!StreamingService.instance) {
      StreamingService.instance = new StreamingService()
    }
    return StreamingService.instance
  }

  /**
   * Create a new chat stream
   */
  async createChatStream(request: Omit<StreamRequest, 'id'>): Promise<ChatStream> {
    const streamId = `stream_${Date.now()}_${++this.streamCounter}`
    
    const streamRequest: StreamRequest = {
      ...request,
      id: streamId
    }

    const stream = new ChatStream(streamRequest)
    this.activeStreams.set(streamId, stream)

    // Clean up when stream completes or errors
    stream.on('complete', () => this.cleanupStream(streamId))
    stream.on('error', () => this.cleanupStream(streamId))
    stream.on('cancelled', () => this.cleanupStream(streamId))

    logger.info(`Created chat stream ${streamId}`, {
      model: request.model,
      activeStreams: this.activeStreams.size
    }, 'streaming-service')

    return stream
  }

  /**
   * Get existing stream by ID
   */
  getStream(streamId: string): ChatStream | undefined {
    return this.activeStreams.get(streamId)
  }

  /**
   * Cancel stream by ID
   */
  async cancelStream(streamId: string): Promise<boolean> {
    const stream = this.activeStreams.get(streamId)
    if (!stream) return false

    await stream.cancel()
    return true
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): ChatStream[] {
    return Array.from(this.activeStreams.values())
  }

  /**
   * Get streaming service metrics
   */
  getServiceMetrics(): {
    activeStreams: number
    totalStreamsCreated: number
    averageStreamDuration: number
    totalTokensProcessed: number
  } {
    const activeStreams = Array.from(this.activeStreams.values())
    
    return {
      activeStreams: activeStreams.length,
      totalStreamsCreated: this.streamCounter,
      averageStreamDuration: activeStreams.length > 0 
        ? activeStreams.reduce((sum, stream) => sum + stream.getMetrics().streamDuration, 0) / activeStreams.length
        : 0,
      totalTokensProcessed: activeStreams.reduce((sum, stream) => sum + stream.getMetrics().totalTokens, 0)
    }
  }

  /**
   * Cleanup completed stream
   */
  private cleanupStream(streamId: string): void {
    this.activeStreams.delete(streamId)
    
    logger.debug(`Cleaned up stream ${streamId}`, {
      remainingStreams: this.activeStreams.size
    }, 'streaming-service')
  }

  /**
   * Cleanup all streams (for shutdown)
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.activeStreams.values()).map(stream => stream.cancel())
    await Promise.allSettled(cleanupPromises)
    
    this.activeStreams.clear()
    logger.info('Streaming service cleaned up', undefined, 'streaming-service')
  }
}

// Export singleton instance
export const streamingService = StreamingService.getInstance()

// Export for testing
export function createStreamingService(): StreamingService {
  return new StreamingService()
}
