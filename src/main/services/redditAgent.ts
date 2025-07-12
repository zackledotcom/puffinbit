import { redditService, RedditDM } from '@services/reddit'
import { withModelRouting } from '@core/modelRouter'
import { telemetry } from '@core/telemetry'
import { crashRecovery } from '@core/crashRecovery'
import { getMemorySummaries } from '@main/storage'
import { withMemoryEnrichment } from '@services/memoryEnrichment'

export interface RedditAgentConfig {
  enabled: boolean
  pollInterval: number // milliseconds
  maxRepliesPerHour: number
  replyTemplate?: string
  blacklistedUsers: string[]
  whitelistedUsers: string[]
  autoReplyEnabled: boolean
  model: string
  systemPrompt: string
}

export interface RedditAgentStats {
  totalDMsProcessed: number
  totalRepliesSent: number
  lastPollTime: string | null
  currentlyRunning: boolean
  errors: Array<{ timestamp: string; error: string }>
  recentActivity: Array<{
    timestamp: string
    action: 'received' | 'replied' | 'ignored'
    user: string
    subject?: string
  }>
}

class RedditAgent {
  private config: RedditAgentConfig = {
    enabled: false,
    pollInterval: 60000, // 1 minute
    maxRepliesPerHour: 10,
    blacklistedUsers: [],
    whitelistedUsers: [],
    autoReplyEnabled: false,
    model: 'llama2',
    systemPrompt:
      'You are a helpful Reddit assistant. Respond naturally and helpfully to direct messages. Keep responses concise and friendly.'
  }

  private stats: RedditAgentStats = {
    totalDMsProcessed: 0,
    totalRepliesSent: 0,
    lastPollTime: null,
    currentlyRunning: false,
    errors: [],
    recentActivity: []
  }

  private pollTimer: NodeJS.Timeout | null = null
  private replyTracker = new Map<string, number>() // hourly reply tracking

  async start(): Promise<boolean> {
    if (!redditService.isConnected()) {
      this.addError('Reddit service not authenticated')
      return false
    }

    if (this.config.enabled && this.pollTimer) {
      console.log('🤖 Reddit agent already running')
      return true
    }

    this.config.enabled = true
    this.stats.currentlyRunning = true

    // Start polling for DMs
    this.pollTimer = setInterval(() => {
      this.processDMs()
    }, this.config.pollInterval)

    // Initial poll
    this.processDMs()

    telemetry.trackEvent({
      type: 'system_event',
      category: 'reddit_agent',
      action: 'started',
      metadata: { pollInterval: this.config.pollInterval }
    })

    console.log('🤖 Reddit DM agent started')
    return true
  }

  async stop(): Promise<void> {
    this.config.enabled = false
    this.stats.currentlyRunning = false

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    telemetry.trackEvent({
      type: 'system_event',
      category: 'reddit_agent',
      action: 'stopped'
    })

    console.log('🛑 Reddit DM agent stopped')
  }

  private async processDMs(): Promise<void> {
    if (!this.config.enabled || !redditService.isConnected()) {
      return
    }

    try {
      const result = await redditService.getUnreadDMs()

      if (!result.success) {
        this.addError(`Failed to fetch DMs: ${result.error}`)
        return
      }

      const unreadDMs: RedditDM[] = result.data || []
      this.stats.lastPollTime = new Date().toISOString()

      telemetry.trackEvent({
        type: 'operation',
        category: 'reddit_agent',
        action: 'poll_dms',
        value: unreadDMs.length
      })

      for (const dm of unreadDMs) {
        await this.processDM(dm)
      }

      // Clean up old reply tracking
      this.cleanupReplyTracker()
    } catch (error) {
      this.addError(`DM processing error: ${error.message}`)

      await crashRecovery.logError(error as Error, {
        operation: 'reddit_agent_process_dms',
        component: 'service',
        severity: 'medium',
        timestamp: new Date().toISOString()
      })
    }
  }

  private async processDM(dm: RedditDM): Promise<void> {
    try {
      this.stats.totalDMsProcessed++

      // Check blacklist
      if (this.config.blacklistedUsers.includes(dm.author)) {
        this.addActivity('ignored', dm.author, dm.subject, 'User blacklisted')
        return
      }

      // Check whitelist (if configured)
      if (
        this.config.whitelistedUsers.length > 0 &&
        !this.config.whitelistedUsers.includes(dm.author)
      ) {
        this.addActivity('ignored', dm.author, dm.subject, 'User not whitelisted')
        return
      }

      // Check rate limits
      if (!this.canSendReply()) {
        this.addActivity('ignored', dm.author, dm.subject, 'Rate limit exceeded')
        return
      }

      this.addActivity('received', dm.author, dm.subject)

      // Auto-reply if enabled
      if (this.config.autoReplyEnabled) {
        await this.generateAndSendReply(dm)
      }
    } catch (error) {
      this.addError(`Error processing DM from ${dm.author}: ${error.message}`)
    }
  }

  private async generateAndSendReply(dm: RedditDM): Promise<void> {
    try {
      // Build context for the AI
      const conversationContext = `
Reddit DM Received:
From: ${dm.author}
Subject: ${dm.subject}
Message: ${dm.body}

Please generate a helpful, natural response to this Reddit direct message.
`

      // Use model routing with memory enrichment
      const { result: aiResponse } = await withModelRouting(
        async (selectedModel) => {
          // Get memory context
          const memorySummaries = await getMemorySummaries()

          // Enrich with memory if available
          const { result: enrichedPrompt } = await withMemoryEnrichment(
            async (prompt) => prompt,
            conversationContext,
            memorySummaries,
            { enabled: true, maxSummaries: 2, maxKeyFacts: 5 }
          )

          const fullPrompt = `${this.config.systemPrompt}\n\n${enrichedPrompt}`

          // Generate response using the selected model
          const response = await fetch(`${selectedModel.endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.config.model,
              prompt: fullPrompt,
              stream: false,
              options: {
                temperature: 0.7,
                max_tokens: 500
              }
            })
          })

          const data = await response.json()
          return (
            data.response || 'I apologize, but I was unable to generate a response at this time.'
          )
        },
        {
          preferredModel: `ollama-${this.config.model}`,
          requiredCapabilities: ['chat'],
          fallbackToOffline: true
        }
      )

      // Send the reply
      const replyResult = await redditService.replyToDM(dm.id, aiResponse)

      if (replyResult.success) {
        this.stats.totalRepliesSent++
        this.trackReply()
        this.addActivity('replied', dm.author, dm.subject)

        telemetry.trackEvent({
          type: 'operation',
          category: 'reddit_agent',
          action: 'reply_sent',
          metadata: {
            recipient: dm.author,
            subject: dm.subject,
            replyLength: aiResponse.length
          }
        })

        console.log(`🤖 Sent auto-reply to ${dm.author}`)
      } else {
        this.addError(`Failed to send reply to ${dm.author}: ${replyResult.error}`)
      }
    } catch (error) {
      this.addError(`Error generating reply for ${dm.author}: ${error.message}`)
    }
  }

  private canSendReply(): boolean {
    const now = Date.now()
    const hourAgo = now - 60 * 60 * 1000

    // Count replies in the last hour
    let repliesThisHour = 0
    for (const [timestamp, count] of this.replyTracker.entries()) {
      if (parseInt(timestamp) > hourAgo) {
        repliesThisHour += count
      }
    }

    return repliesThisHour < this.config.maxRepliesPerHour
  }

  private trackReply(): void {
    const hourKey = Math.floor(Date.now() / (60 * 60 * 1000)).toString()
    const current = this.replyTracker.get(hourKey) || 0
    this.replyTracker.set(hourKey, current + 1)
  }

  private cleanupReplyTracker(): void {
    const hourAgo = Date.now() - 2 * 60 * 60 * 1000 // Keep 2 hours of data
    const cutoffKey = Math.floor(hourAgo / (60 * 60 * 1000)).toString()

    for (const key of this.replyTracker.keys()) {
      if (key < cutoffKey) {
        this.replyTracker.delete(key)
      }
    }
  }

  private addError(error: string): void {
    this.stats.errors.push({
      timestamp: new Date().toISOString(),
      error
    })

    // Keep only last 50 errors
    if (this.stats.errors.length > 50) {
      this.stats.errors = this.stats.errors.slice(-50)
    }

    console.error('🤖 Reddit Agent Error:', error)
  }

  private addActivity(
    action: 'received' | 'replied' | 'ignored',
    user: string,
    subject?: string,
    note?: string
  ): void {
    this.stats.recentActivity.push({
      timestamp: new Date().toISOString(),
      action,
      user,
      subject
    })

    // Keep only last 100 activities
    if (this.stats.recentActivity.length > 100) {
      this.stats.recentActivity = this.stats.recentActivity.slice(-100)
    }
  }

  // Configuration methods
  updateConfig(newConfig: Partial<RedditAgentConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Restart polling if interval changed and agent is running
    if (newConfig.pollInterval && this.config.enabled) {
      this.stop()
      this.start()
    }

    telemetry.trackEvent({
      type: 'system_event',
      category: 'reddit_agent',
      action: 'config_updated',
      metadata: newConfig
    })
  }

  getConfig(): RedditAgentConfig {
    return { ...this.config }
  }

  getStats(): RedditAgentStats {
    return { ...this.stats }
  }

  isRunning(): boolean {
    return this.config.enabled && this.stats.currentlyRunning
  }

  // Manual actions
  async sendManualReply(recipient: string, subject: string, message: string): Promise<boolean> {
    if (!this.canSendReply()) {
      throw new Error('Rate limit exceeded')
    }

    const result = await redditService.sendDM(recipient, subject, message)

    if (result.success) {
      this.trackReply()
      this.addActivity('replied', recipient, subject)
      return true
    }

    throw new Error(result.error || 'Failed to send message')
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await redditService.listDMs(1)
      return result.success
    } catch (error) {
      return false
    }
  }
}

export const redditAgent = new RedditAgent()
