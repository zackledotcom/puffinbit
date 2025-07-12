import snoowrap from 'snoowrap'
import { crashRecovery } from '@core/crashRecovery'
import { telemetry } from '@core/telemetry'

export interface RedditCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
  userAgent: string
}

export interface RedditDM {
  id: string
  author: string
  subject: string
  body: string
  timestamp: string
  isUnread: boolean
  fullname: string
}

export interface RedditDMResponse {
  success: boolean
  data?: any
  error?: string
}

class RedditService {
  private client: snoowrap | null = null
  private credentials: RedditCredentials | null = null
  private isAuthenticated = false

  async authenticate(credentials: RedditCredentials): Promise<boolean> {
    try {
      this.client = new snoowrap({
        userAgent: credentials.userAgent,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken
      })

      // Test authentication
      await (this.client.getMe() as Promise<any>)

      this.credentials = credentials
      this.isAuthenticated = true

      telemetry.trackEvent({
        type: 'system_event',
        category: 'reddit_service',
        action: 'authentication_success'
      })

      console.log('✅ Reddit authentication successful')
      return true
    } catch (error) {
      this.isAuthenticated = false

      await crashRecovery.logError(error as Error, {
        operation: 'reddit_authenticate',
        component: 'service',
        severity: 'medium',
        timestamp: new Date().toISOString()
      })

      console.error('❌ Reddit authentication failed:', error)
      return false
    }
  }

  async listDMs(limit = 25): Promise<RedditDMResponse> {
    if (!this.isAuthenticated || !this.client) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const messages = await (this.client.getInbox() as Promise<any>)
      const limitedMessages = messages.slice(0, limit)

      const dms: RedditDM[] = limitedMessages
        .filter((msg: any) => msg.was_comment === false) // Only DMs, not comment replies
        .map((msg: any) => ({
          id: msg.id,
          author: msg.author.name,
          subject: msg.subject,
          body: msg.body,
          timestamp: new Date(msg.created_utc * 1000).toISOString(),
          isUnread: msg.new,
          fullname: msg.name
        }))

      telemetry.trackEvent({
        type: 'operation',
        category: 'reddit_service',
        action: 'list_dms',
        value: dms.length
      })

      return { success: true, data: dms }
    } catch (error) {
      await crashRecovery.logError(error as Error, {
        operation: 'reddit_list_dms',
        component: 'service',
        severity: 'low',
        timestamp: new Date().toISOString()
      })

      return { success: false, error: error.message }
    }
  }

  async readDM(messageId: string): Promise<RedditDMResponse> {
    if (!this.isAuthenticated || !this.client) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const message = await (this.client.getMessage(messageId) as Promise<any>)

      const dm: RedditDM = {
        id: message.id,
        author: message.author.name,
        subject: message.subject,
        body: message.body,
        timestamp: new Date(message.created_utc * 1000).toISOString(),
        isUnread: message.new,
        fullname: message.name
      }

      // Mark as read
      await message.markAsRead()

      telemetry.trackEvent({
        type: 'operation',
        category: 'reddit_service',
        action: 'read_dm',
        metadata: { messageId, author: dm.author }
      })

      return { success: true, data: dm }
    } catch (error) {
      await crashRecovery.logError(error as Error, {
        operation: 'reddit_read_dm',
        component: 'service',
        severity: 'low',
        timestamp: new Date().toISOString(),
        metadata: { messageId }
      })

      return { success: false, error: error.message }
    }
  }

  async sendDM(recipient: string, subject: string, message: string): Promise<RedditDMResponse> {
    if (!this.isAuthenticated || !this.client) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      await (this.client.composeMessage({
        to: recipient,
        subject: subject,
        text: message
      }) as Promise<any>)

      telemetry.trackEvent({
        type: 'operation',
        category: 'reddit_service',
        action: 'send_dm',
        metadata: {
          recipient,
          subject,
          messageLength: message.length
        }
      })

      telemetry.auditOperation({
        operation: 'reddit_send_dm',
        component: 'service',
        actor: 'system',
        success: true,
        metadata: { recipient, subject }
      })

      console.log(`📤 Sent DM to ${recipient}: ${subject}`)
      return { success: true }
    } catch (error) {
      await crashRecovery.logError(error as Error, {
        operation: 'reddit_send_dm',
        component: 'service',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        metadata: { recipient, subject }
      })

      telemetry.auditOperation({
        operation: 'reddit_send_dm',
        component: 'service',
        actor: 'system',
        success: false,
        metadata: { recipient, subject, error: error.message }
      })

      return { success: false, error: error.message }
    }
  }

  async getUnreadDMs(): Promise<RedditDMResponse> {
    const response = await this.listDMs(100) // Get more messages to check for unread

    if (!response.success) {
      return response
    }

    const unreadDMs = response.data.filter((dm: RedditDM) => dm.isUnread)

    return { success: true, data: unreadDMs }
  }

  async replyToDM(originalMessageId: string, replyText: string): Promise<RedditDMResponse> {
    if (!this.isAuthenticated || !this.client) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const originalMessage = await (this.client.getMessage(originalMessageId) as Promise<any>)

      // Reply to the original message
      await originalMessage.reply(replyText)

      telemetry.trackEvent({
        type: 'operation',
        category: 'reddit_service',
        action: 'reply_to_dm',
        metadata: {
          originalMessageId,
          author: originalMessage.author.name,
          replyLength: replyText.length
        }
      })

      console.log(`💬 Replied to DM from ${originalMessage.author.name}`)
      return { success: true }
    } catch (error) {
      await crashRecovery.logError(error as Error, {
        operation: 'reddit_reply_dm',
        component: 'service',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        metadata: { originalMessageId }
      })

      return { success: false, error: error.message }
    }
  }

  isConnected(): boolean {
    return this.isAuthenticated
  }

  getCredentials(): RedditCredentials | null {
    return this.credentials
  }

  disconnect(): void {
    this.client = null
    this.credentials = null
    this.isAuthenticated = false

    telemetry.trackEvent({
      type: 'system_event',
      category: 'reddit_service',
      action: 'disconnected'
    })
  }
}

export const redditService = new RedditService()
