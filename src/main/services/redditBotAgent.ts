/**
 * Reddit Bot Agent for Puffer
 * 
 * Automated Reddit DM handling with AI-powered responses
 * Integrates with Ollama for intelligent message processing
 * 
 * @author Puffer Engineering Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { redditService, RedditDM } from '@services/reddit'
import { ollamaService } from '@services/ollamaService'
import { chromaService } from '@services/chromaService'
import { safeLog, safeError, safeWarn, safeInfo } from '@utils/safeLogger'

interface BotConfig {
  enabled: boolean
  autoReply: boolean
  model: string
  systemPrompt: string
  responseDelay: number // seconds
  maxResponseLength: number
  blacklistedUsers: string[]
  whitelistedUsers: string[]
  keywords: {
    trigger: string[]
    ignore: string[]
  }
  rateLimiting: {
    maxMessagesPerHour: number
    maxMessagesPerDay: number
  }
}

interface BotStats {
  messagesReceived: number
  messagesReplied: number
  messagesIgnored: number
  errors: number
  uptime: number
  lastActivity: string
}

interface ProcessedMessage {
  dm: RedditDM
  shouldReply: boolean
  response?: string
  reason: string
  confidence: number
}

class RedditBotAgent extends EventEmitter {
  private config: BotConfig
  private stats: BotStats
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private messageHistory = new Map<string, Date>()
  private rateLimitTracker = {
    hourly: new Map<string, number>(),
    daily: new Map<string, number>()
  }

  constructor() {
    super()
    
    this.config = {
      enabled: false,
      autoReply: false,
      model: 'llama3.2:latest',
      systemPrompt: `You are a helpful Reddit assistant. You receive direct messages and should respond helpfully and concisely. 

Guidelines:
- Be friendly and professional
- Keep responses under 500 characters
- Don't share personal information
- If unsure, politely decline to help
- Maintain Reddit etiquette`,
      responseDelay: 30,
      maxResponseLength: 500,
      blacklistedUsers: [],
      whitelistedUsers: [],
      keywords: {
        trigger: ['help', 'question', 'support', 'assistance'],
        ignore: ['spam', 'advertisement', 'promotion', 'buy', 'sell']
      },
      rateLimiting: {
        maxMessagesPerHour: 10,
        maxMessagesPerDay: 50
      }
    }

    this.stats = {
      messagesReceived: 0,
      messagesReplied: 0,
      messagesIgnored: 0,
      errors: 0,
      uptime: 0,
      lastActivity: new Date().toISOString()
    }
  }

  /**
   * Start the Reddit bot
   */
  async start(): Promise<{ success: boolean; message?: string }> {
    try {
      if (this.isRunning) {
        return { success: false, message: 'Bot is already running' }
      }

      // Check if Reddit service is connected
      if (!redditService.isConnected()) {
        return { success: false, message: 'Reddit service not connected' }
      }

      // Check if Ollama is available
      const ollamaStatus = await ollamaService.checkStatus()
      if (!ollamaStatus.connected) {
        return { success: false, message: 'Ollama service not available' }
      }

      this.isRunning = true
      this.config.enabled = true
      
      // Start monitoring for new messages
      this.intervalId = setInterval(() => {
        this.checkMessages()
      }, 60000) // Check every minute

      this.stats.uptime = Date.now()
      safeInfo('Reddit bot started successfully')
      this.emit('started')
      
      return { success: true, message: 'Reddit bot started' }
    } catch (error: any) {
      safeError('Failed to start Reddit bot:', error.message)
      return { success: false, message: error.message }
    }
  }

  /**
   * Stop the Reddit bot
   */
  async stop(): Promise<{ success: boolean; message?: string }> {
    try {
      this.isRunning = false
      this.config.enabled = false

      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }

      safeInfo('Reddit bot stopped')
      this.emit('stopped')
      
      return { success: true, message: 'Reddit bot stopped' }
    } catch (error: any) {
      safeError('Failed to stop Reddit bot:', error.message)
      return { success: false, message: error.message }
    }
  }

  /**
   * Check for new messages and process them
   */
  private async checkMessages(): Promise<void> {
    try {
      if (!this.isRunning || !this.config.enabled) {
        return
      }

      const unreadResponse = await redditService.getUnreadDMs()
      if (!unreadResponse.success || !unreadResponse.data) {
        return
      }

      const unreadDMs: RedditDM[] = unreadResponse.data
      safeLog(`Found ${unreadDMs.length} unread messages`)

      for (const dm of unreadDMs) {
        await this.processMessage(dm)
        
        // Add delay between processing messages
        if (unreadDMs.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      this.stats.lastActivity = new Date().toISOString()
    } catch (error: any) {
      this.stats.errors++
      safeError('Error checking messages:', error.message)
      this.emit('error', error)
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(dm: RedditDM): Promise<void> {
    try {
      this.stats.messagesReceived++
      safeLog(`Processing message from ${dm.author}: ${dm.subject}`)

      // Check if we've already processed this message
      if (this.messageHistory.has(dm.id)) {
        return
      }
      this.messageHistory.set(dm.id, new Date())

      // Analyze the message
      const processed = await this.analyzeMessage(dm)
      
      if (processed.shouldReply && this.config.autoReply) {
        await this.sendReply(dm, processed.response!)
        this.stats.messagesReplied++
        safeInfo(`Replied to ${dm.author}: ${processed.reason}`)
      } else {
        this.stats.messagesIgnored++
        safeLog(`Ignored message from ${dm.author}: ${processed.reason}`)
      }

      this.emit('message_processed', { dm, processed })
    } catch (error: any) {
      this.stats.errors++
      safeError(`Error processing message from ${dm.author}:`, error.message)
      this.emit('error', error)
    }
  }

  /**
   * Analyze a message to determine if and how to respond
   */
  private async analyzeMessage(dm: RedditDM): Promise<ProcessedMessage> {
    // Check blacklist
    if (this.config.blacklistedUsers.includes(dm.author.toLowerCase())) {
      return {
        dm,
        shouldReply: false,
        reason: 'User is blacklisted',
        confidence: 1.0
      }
    }

    // Check rate limiting
    if (!this.checkRateLimit(dm.author)) {
      return {
        dm,
        shouldReply: false,
        reason: 'Rate limit exceeded',
        confidence: 1.0
      }
    }

    // Check for ignore keywords
    const messageText = `${dm.subject} ${dm.body}`.toLowerCase()
    const hasIgnoreKeywords = this.config.keywords.ignore.some(keyword => 
      messageText.includes(keyword.toLowerCase())
    )

    if (hasIgnoreKeywords) {
      return {
        dm,
        shouldReply: false,
        reason: 'Contains ignore keywords',
        confidence: 0.9
      }
    }

    // Check for trigger keywords or if user is whitelisted
    const hasTriggerKeywords = this.config.keywords.trigger.some(keyword => 
      messageText.includes(keyword.toLowerCase())
    )
    const isWhitelisted = this.config.whitelistedUsers.includes(dm.author.toLowerCase())

    if (!hasTriggerKeywords && !isWhitelisted) {
      return {
        dm,
        shouldReply: false,
        reason: 'No trigger keywords and not whitelisted',
        confidence: 0.7
      }
    }

    // Generate AI response
    try {
      const response = await this.generateResponse(dm)
      return {
        dm,
        shouldReply: true,
        response,
        reason: 'Generated AI response',
        confidence: 0.8
      }
    } catch (error: any) {
      return {
        dm,
        shouldReply: false,
        reason: `Failed to generate response: ${error.message}`,
        confidence: 0.0
      }
    }
  }

  /**
   * Generate AI response using Ollama
   */
  private async generateResponse(dm: RedditDM): Promise<string> {
    // Build context with message history if available
    let context = ''
    try {
      const searchResult = await chromaService.searchChatHistory(
        `${dm.author} ${dm.subject}`,
        3
      )
      if (searchResult.success && searchResult.results) {
        context = `Previous conversations:\n${searchResult.results.join('\n\n')}\n\n`
      }
    } catch (error) {
      // Continue without context if search fails
    }

    const prompt = `${context}Reddit DM from ${dm.author}:
Subject: ${dm.subject}
Message: ${dm.body}

Please provide a helpful, concise response (max ${this.config.maxResponseLength} characters).`

    const result = await ollamaService.generateResponse({
      model: this.config.model,
      prompt,
      system: this.config.systemPrompt,
      options: {
        temperature: 0.7,
        num_predict: Math.floor(this.config.maxResponseLength / 4), // Rough token estimate
        stop: ['\n\n', 'User:', 'Reddit DM:']
      }
    })

    if (!result.success || !result.response) {
      throw new Error('Failed to generate AI response')
    }

    let response = result.response.trim()
    
    // Ensure response doesn't exceed max length
    if (response.length > this.config.maxResponseLength) {
      response = response.substring(0, this.config.maxResponseLength - 3) + '...'
    }

    // Store conversation in memory
    try {
      await chromaService.storeChatConversation(
        `Reddit DM from ${dm.author}: ${dm.subject} - ${dm.body}`,
        `Bot response: ${response}`
      )
    } catch (error) {
      // Continue if storage fails
    }

    return response
  }

  /**
   * Send reply to a Reddit DM
   */
  private async sendReply(dm: RedditDM, response: string): Promise<void> {
    // Add delay before sending
    if (this.config.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay * 1000))
    }

    const result = await redditService.replyToDM(dm.id, response)
    if (!result.success) {
      throw new Error(`Failed to send reply: ${result.error}`)
    }

    // Track rate limiting
    this.updateRateLimit(dm.author)
  }

  /**
   * Check rate limiting for a user
   */
  private checkRateLimit(username: string): boolean {
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Clean old entries
    this.cleanRateLimitTrackers(hourAgo, dayAgo)

    const hourlyCount = this.rateLimitTracker.hourly.get(username) || 0
    const dailyCount = this.rateLimitTracker.daily.get(username) || 0

    return hourlyCount < this.config.rateLimiting.maxMessagesPerHour &&
           dailyCount < this.config.rateLimiting.maxMessagesPerDay
  }

  /**
   * Update rate limiting counters
   */
  private updateRateLimit(username: string): void {
    const hourlyCount = this.rateLimitTracker.hourly.get(username) || 0
    const dailyCount = this.rateLimitTracker.daily.get(username) || 0

    this.rateLimitTracker.hourly.set(username, hourlyCount + 1)
    this.rateLimitTracker.daily.set(username, dailyCount + 1)
  }

  /**
   * Clean old rate limit tracking entries
   */
  private cleanRateLimitTrackers(hourAgo: Date, dayAgo: Date): void {
    // This is a simplified cleanup - in production you'd want more sophisticated tracking
    if (Math.random() < 0.1) { // Clean 10% of the time
      this.rateLimitTracker.hourly.clear()
      this.rateLimitTracker.daily.clear()
    }
  }

  /**
   * Update bot configuration
   */
  updateConfig(updates: Partial<BotConfig>): void {
    this.config = { ...this.config, ...updates }
    safeLog('Bot configuration updated:', updates)
    this.emit('config_updated', this.config)
  }

  /**
   * Get bot configuration
   */
  getConfig(): BotConfig {
    return { ...this.config }
  }

  /**
   * Get bot statistics
   */
  getStats(): BotStats & { runtime: number } {
    return {
      ...this.stats,
      runtime: this.stats.uptime > 0 ? Date.now() - this.stats.uptime : 0
    }
  }

  /**
   * Test connection and send manual reply
   */
  async sendManualReply(recipient: string, subject: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await redditService.sendDM(recipient, subject, message)
      if (result.success) {
        safeInfo(`Manual message sent to ${recipient}: ${subject}`)
        this.emit('manual_message_sent', { recipient, subject, message })
      }
      return result
    } catch (error: any) {
      this.stats.errors++
      safeError('Failed to send manual message:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Test bot connectivity
   */
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      // Test Reddit connection
      if (!redditService.isConnected()) {
        return { success: false, message: 'Reddit not connected' }
      }

      // Test Ollama connection
      const ollamaStatus = await ollamaService.checkStatus()
      if (!ollamaStatus.connected) {
        return { success: false, message: 'Ollama not available' }
      }

      // Test getting unread messages
      const unreadResponse = await redditService.getUnreadDMs()
      if (!unreadResponse.success) {
        return { success: false, message: 'Failed to fetch messages' }
      }

      return { success: true, message: 'All connections working' }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  /**
   * Check if bot is running
   */
  isActive(): boolean {
    return this.isRunning && this.config.enabled
  }
}

// Export singleton instance
export const redditBotAgent = new RedditBotAgent()
export default redditBotAgent

// Export types
export type { BotConfig, BotStats, ProcessedMessage }
