// ===============================
// Types and Interfaces
// ===============================

interface ModelMetrics {
  modelId: string
  modelName: string
  timestamp: Date
  responseTime: number
  tokenGenerationRate: number
  contextLength: number
  memoryUsage: number
  cpuUsage: number
  gpuUsage: number
  temperature: number
  taskSuccess: boolean
  errorOccurred: boolean
  retryCount: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  conversationId: string
  messageIndex: number
  userType?: 'new' | 'returning' | 'power'
  taskType?: 'chat' | 'code' | 'analysis' | 'creative' | 'debug'
  modelVersion: string
  hardware: 'cpu' | 'gpu'
  cacheHit: boolean
}

interface ModelAnalytics {
  modelId: string
  totalSessions: number
  totalMessages: number
  avgResponseTime: number
  successRate: number
  totalTokens: number
  dailyMetrics: Array<{
    date: string
    sessions: number
    messages: number
    avgResponseTime: number
    successRate: number
    totalTokens: number
  }>
  resourceMetrics: Array<{
    timestamp: Date
    cpu: number
    memory: number
    gpu: number
  }>
}

interface AnalyticsEvent {
  type: string
  timestamp: Date
  modelId: string
  sessionId: string
  data: any
}

interface SessionData {
  sessionId: string
  modelId: string
  startTime: Date
  endTime?: Date
  messageCount: number
  totalTokens: number
  userType?: 'new' | 'returning' | 'power'
  errors: number
  retries: number
  ratings: number[]
}

// ===============================
// Analytics Storage
// ===============================

interface AnalyticsStorage {
  saveEvent(event: AnalyticsEvent): Promise<void>
  saveMetrics(metrics: ModelMetrics): Promise<void>
  getAnalytics(modelId: string, timeRange: { start: Date; end: Date }): Promise<ModelAnalytics>
  cleanup(before: Date): Promise<void>
}

class MemoryAnalyticsStorage implements AnalyticsStorage {
  private events: AnalyticsEvent[] = []
  private metrics: ModelMetrics[] = []

  async saveEvent(event: AnalyticsEvent): Promise<void> {
    this.events.push(event)
  }

  async saveMetrics(metrics: ModelMetrics): Promise<void> {
    this.metrics.push(metrics)
  }

  async getAnalytics(
    modelId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<ModelAnalytics> {
    const filteredMetrics = this.metrics.filter(
      (m) => m.modelId === modelId && m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    )

    const sessions = new Set(filteredMetrics.map((m) => m.conversationId))
    const totalMessages = filteredMetrics.length
    const avgResponseTime =
      filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalMessages
    const successRate = filteredMetrics.filter((m) => m.taskSuccess).length / totalMessages
    const totalTokens = filteredMetrics.reduce((sum, m) => sum + m.totalTokens, 0)

    return {
      modelId,
      totalSessions: sessions.size,
      totalMessages,
      avgResponseTime,
      successRate,
      totalTokens,
      dailyMetrics: this.generateDailyMetrics(filteredMetrics),
      resourceMetrics: this.generateResourceMetrics()
    }
  }

  async cleanup(before: Date): Promise<void> {
    this.events = this.events.filter((e) => e.timestamp >= before)
    this.metrics = this.metrics.filter((m) => m.timestamp >= before)
  }

  private generateDailyMetrics(metrics: ModelMetrics[]) {
    const dailyMap = new Map<
      string,
      {
        sessions: Set<string>
        messages: number
        responseTimes: number[]
        successes: number
        totalTokens: number
      }
    >()

    metrics.forEach((metric) => {
      const dateKey = metric.timestamp.toISOString().split('T')[0]

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          sessions: new Set(),
          messages: 0,
          responseTimes: [],
          successes: 0,
          totalTokens: 0
        })
      }

      const day = dailyMap.get(dateKey)!
      day.sessions.add(metric.conversationId)
      day.messages++
      day.responseTimes.push(metric.responseTime)
      if (metric.taskSuccess) day.successes++
      day.totalTokens += metric.totalTokens
    })

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      sessions: data.sessions.size,
      messages: data.messages,
      avgResponseTime:
        data.responseTimes.reduce((sum, rt) => sum + rt, 0) / data.responseTimes.length,
      successRate: data.successes / data.messages,
      totalTokens: data.totalTokens
    }))
  }

  private generateResourceMetrics() {
    const now = new Date()
    return Array.from({ length: 24 }, (_, i) => {
      const timestamp = new Date(now)
      timestamp.setHours(timestamp.getHours() - (24 - 1 - i))

      return {
        timestamp,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        gpu: Math.random() * 100
      }
    })
  }
}

// ===============================
// Analytics Service
// ===============================

class ModelAnalyticsService {
  private storage: AnalyticsStorage
  private activeSessions: Map<string, SessionData> = new Map()
  private metricsQueue: ModelMetrics[] = []
  private flushInterval: NodeJS.Timeout

  constructor(storage: AnalyticsStorage = new MemoryAnalyticsStorage()) {
    this.storage = storage

    // Flush metrics every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetrics()
    }, 30000)
  }

  // ===============================
  // Event Tracking Methods
  // ===============================

  async trackMessageSent(data: {
    modelId: string
    sessionId: string
    promptTokens: number
    userType?: 'new' | 'returning' | 'power'
    taskType?: 'chat' | 'code' | 'analysis' | 'creative' | 'debug'
  }) {
    await this.storage.saveEvent({
      type: 'message_sent',
      timestamp: new Date(),
      modelId: data.modelId,
      sessionId: data.sessionId,
      data: {
        promptTokens: data.promptTokens,
        userType: data.userType,
        taskType: data.taskType
      }
    })

    // Update session
    if (!this.activeSessions.has(data.sessionId)) {
      this.startSession(data.sessionId, data.modelId, data.userType)
    }
  }

  async trackMessageReceived(data: {
    modelId: string
    sessionId: string
    responseTime: number
    completionTokens: number
    success: boolean
    error?: string
  }) {
    const now = new Date()

    await this.storage.saveEvent({
      type: 'message_received',
      timestamp: now,
      modelId: data.modelId,
      sessionId: data.sessionId,
      data: {
        responseTime: data.responseTime,
        completionTokens: data.completionTokens,
        success: data.success,
        error: data.error
      }
    })

    // Create detailed metrics
    const session = this.activeSessions.get(data.sessionId)
    if (session) {
      const metrics: ModelMetrics = {
        modelId: data.modelId,
        modelName: data.modelId.split(':')[0],
        timestamp: now,
        responseTime: data.responseTime,
        tokenGenerationRate: data.completionTokens / (data.responseTime / 1000),
        contextLength: 0, // Would need to be passed in
        memoryUsage: this.getCurrentMemoryUsage(),
        cpuUsage: this.getCurrentCpuUsage(),
        gpuUsage: this.getCurrentGpuUsage(),
        temperature: 0.7, // Would come from model settings
        taskSuccess: data.success,
        errorOccurred: !!data.error,
        retryCount: 0, // Would need retry tracking
        promptTokens: 0, // From previous message_sent event
        completionTokens: data.completionTokens,
        totalTokens: data.completionTokens, // Would add prompt tokens
        conversationId: data.sessionId,
        messageIndex: session.messageCount,
        userType: session.userType,
        taskType: 'chat', // Would need to be determined
        modelVersion: '1.0.0',
        hardware: 'gpu', // Would be detected
        cacheHit: Math.random() > 0.3
      }

      this.queueMetrics(metrics)

      // Update session
      session.messageCount++
      session.totalTokens += data.completionTokens
      if (data.error) session.errors++
    }
  }

  async trackError(data: { modelId: string; sessionId: string; error: string; context?: any }) {
    await this.storage.saveEvent({
      type: 'error_occurred',
      timestamp: new Date(),
      modelId: data.modelId,
      sessionId: data.sessionId,
      data: {
        error: data.error,
        context: data.context
      }
    })

    const session = this.activeSessions.get(data.sessionId)
    if (session) {
      session.errors++
    }
  }

  async trackRating(data: {
    modelId: string
    sessionId: string
    messageId: string
    rating: number
  }) {
    await this.storage.saveEvent({
      type: 'rating_given',
      timestamp: new Date(),
      modelId: data.modelId,
      sessionId: data.sessionId,
      data: {
        messageId: data.messageId,
        rating: data.rating
      }
    })

    const session = this.activeSessions.get(data.sessionId)
    if (session) {
      session.ratings.push(data.rating)
    }
  }

  async trackRetry(data: {
    modelId: string
    sessionId: string
    originalMessageId: string
    retryReason: string
  }) {
    await this.storage.saveEvent({
      type: 'retry_attempted',
      timestamp: new Date(),
      modelId: data.modelId,
      sessionId: data.sessionId,
      data: {
        originalMessageId: data.originalMessageId,
        retryReason: data.retryReason
      }
    })

    const session = this.activeSessions.get(data.sessionId)
    if (session) {
      session.retries++
    }
  }

  // ===============================
  // Session Management
  // ===============================

  private async startSession(
    sessionId: string,
    modelId: string,
    userType: 'new' | 'returning' | 'power' = 'returning'
  ) {
    const session: SessionData = {
      sessionId,
      modelId,
      startTime: new Date(),
      messageCount: 0,
      totalTokens: 0,
      userType,
      errors: 0,
      retries: 0,
      ratings: []
    }

    this.activeSessions.set(sessionId, session)

    await this.storage.saveEvent({
      type: 'session_started',
      timestamp: new Date(),
      modelId,
      sessionId,
      data: { userType }
    })
  }

  async endSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.endTime = new Date()

      await this.storage.saveEvent({
        type: 'session_ended',
        timestamp: session.endTime,
        modelId: session.modelId,
        sessionId,
        data: {
          duration: session.endTime.getTime() - session.startTime.getTime(),
          messageCount: session.messageCount,
          totalTokens: session.totalTokens,
          errors: session.errors,
          retries: session.retries,
          averageRating:
            session.ratings.length > 0
              ? session.ratings.reduce((sum, r) => sum + r, 0) / session.ratings.length
              : null
        }
      })

      this.activeSessions.delete(sessionId)
    }
  }

  // ===============================
  // Analytics Retrieval
  // ===============================

  async getModelAnalytics(
    modelId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ModelAnalytics> {
    const defaultTimeRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    }

    return this.storage.getAnalytics(modelId, timeRange || defaultTimeRange)
  }

  async getComparativeAnalytics(
    modelIds: string[],
    timeRange?: { start: Date; end: Date }
  ): Promise<Record<string, ModelAnalytics>> {
    const result: Record<string, ModelAnalytics> = {}

    for (const modelId of modelIds) {
      result[modelId] = await this.getModelAnalytics(modelId, timeRange)
    }

    return result
  }

  async exportAnalytics(
    modelId: string,
    format: 'json' | 'csv' = 'json',
    timeRange?: { start: Date; end: Date }
  ) {
    const analytics = await this.getModelAnalytics(modelId, timeRange)

    if (format === 'json') {
      return JSON.stringify(analytics, null, 2)
    } else {
      // Convert to CSV format
      const csvLines = [
        'Date,Sessions,Messages,Avg Response Time,Success Rate,Total Tokens',
        ...analytics.dailyMetrics.map(
          (d) =>
            `${d.date},${d.sessions},${d.messages},${d.avgResponseTime},${d.successRate},${d.totalTokens}`
        )
      ]
      return csvLines.join('\n')
    }
  }

  // ===============================
  // Internal Methods
  // ===============================

  private queueMetrics(metrics: ModelMetrics) {
    this.metricsQueue.push(metrics)
  }

  private async flushMetrics() {
    if (this.metricsQueue.length === 0) return

    const metricsToFlush = [...this.metricsQueue]
    this.metricsQueue = []

    for (const metrics of metricsToFlush) {
      await this.storage.saveMetrics(metrics)
    }
  }

  private getCurrentMemoryUsage(): number {
    // Would integrate with actual system monitoring
    return Math.random() * 1000 + 500
  }

  private getCurrentCpuUsage(): number {
    // Would integrate with actual system monitoring
    return Math.random() * 100
  }

  private getCurrentGpuUsage(): number {
    // Would integrate with actual system monitoring
    return Math.random() * 100
  }

  // ===============================
  // Cleanup
  // ===============================

  async cleanup() {
    clearInterval(this.flushInterval)
    await this.flushMetrics()

    // Clean up old data (older than 90 days)
    const cleanupDate = new Date()
    cleanupDate.setDate(cleanupDate.getDate() - 90)
    await this.storage.cleanup(cleanupDate)
  }

  // Get average response time for a model
  getAverageResponseTime(modelId?: string): number {
    if (!modelId) return 1247 // Default mock value

    // This would calculate real average from stored metrics
    // For now, return a mock value
    return Math.floor(Math.random() * 2000) + 500
  }

  // Track response for the hook
  trackResponse(modelId: string, responseTime: number, messageLength: number) {
    // This would be implemented to store the response data
    console.log('Tracking response:', { modelId, responseTime, messageLength })
  }
}

// ===============================
// Integration Helpers
// ===============================

// Create singleton instance
const analyticsService = new ModelAnalyticsService()

// Hook into chat service
export const useAnalyticsTracking = () => {
  const trackChatMessage = async (data: {
    modelId: string
    sessionId: string
    prompt: string
    response: string
    responseTime: number
    success: boolean
    error?: string
  }) => {
    try {
      // Track message sent
      await analyticsService.trackMessageSent({
        modelId: data.modelId,
        sessionId: data.sessionId,
        promptTokens: estimateTokens(data.prompt),
        userType: 'returning', // Would be determined from user data
        taskType: classifyTask(data.prompt)
      })

      // Track response received - with error handling
      if (analyticsService.trackMessageReceived) {
        await analyticsService.trackMessageReceived({
          modelId: data.modelId,
          sessionId: data.sessionId,
          responseTime: data.responseTime,
          completionTokens: estimateTokens(data.response),
          success: data.success,
          error: data.error
        })
      } else {
        console.warn('trackMessageReceived method not available on analytics service')
      }
    } catch (error) {
      console.error('Analytics tracking failed:', error)
      // Don't throw - analytics shouldn't break the chat flow
    }
  }

  const trackUserRating = async (data: {
    modelId: string
    sessionId: string
    messageId: string
    rating: number
  }) => {
    await analyticsService.trackRating(data)
  }

  const trackError = async (data: {
    modelId: string
    sessionId: string
    error: string
    context?: any
  }) => {
    await analyticsService.trackError(data)
  }

  const getAnalytics = (modelId: string, timeRange?: { start: Date; end: Date }) => {
    return analyticsService.getModelAnalytics(modelId, timeRange)
  }

  const endSession = (sessionId: string) => {
    return analyticsService.endSession(sessionId)
  }

  return {
    trackChatMessage,
    trackUserRating,
    trackError,
    getAnalytics,
    endSession,
    getAverageResponseTime: (modelId: string) => analyticsService.getAverageResponseTime(modelId),
    trackResponse: (modelId: string, responseTime: number, messageLength: number) =>
      analyticsService.trackResponse(modelId, responseTime, messageLength)
  }
}

// Utility functions
function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4)
}

function classifyTask(prompt: string): 'chat' | 'code' | 'analysis' | 'creative' | 'debug' {
  const lowerPrompt = prompt.toLowerCase()

  if (
    lowerPrompt.includes('code') ||
    lowerPrompt.includes('function') ||
    lowerPrompt.includes('debug')
  ) {
    return 'code'
  } else if (
    lowerPrompt.includes('analyze') ||
    lowerPrompt.includes('data') ||
    lowerPrompt.includes('chart')
  ) {
    return 'analysis'
  } else if (
    lowerPrompt.includes('write') ||
    lowerPrompt.includes('story') ||
    lowerPrompt.includes('creative')
  ) {
    return 'creative'
  } else if (
    lowerPrompt.includes('error') ||
    lowerPrompt.includes('fix') ||
    lowerPrompt.includes('problem')
  ) {
    return 'debug'
  } else {
    return 'chat'
  }
}

export default analyticsService
export { ModelAnalyticsService, MemoryAnalyticsStorage }
export type { ModelMetrics, ModelAnalytics, AnalyticsEvent, SessionData }
