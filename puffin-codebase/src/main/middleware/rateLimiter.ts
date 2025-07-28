interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessful?: boolean
  keyGenerator?: (event: any, ...args: any[]) => string
}

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

class IPCRateLimiter {
  private limits = new Map<string, RateLimitEntry>()
  private configs = new Map<string, RateLimitConfig>()

  private defaultConfigs: Record<string, RateLimitConfig> = {
    'chat-with-ai': { windowMs: 60000, maxRequests: 20 },
    'check-ollama-status': { windowMs: 30000, maxRequests: 10 },
    'check-chroma-status': { windowMs: 30000, maxRequests: 10 },
    'get-chat-history': { windowMs: 60000, maxRequests: 30 },
    'add-message-to-history': { windowMs: 60000, maxRequests: 50 },
    'search-context': { windowMs: 60000, maxRequests: 25 },
    'save-settings': { windowMs: 60000, maxRequests: 10 },
    'get-settings': { windowMs: 30000, maxRequests: 20 },
    'start-ollama': { windowMs: 300000, maxRequests: 3 },
    'start-chroma': { windowMs: 300000, maxRequests: 3 },
    'pull-model': { windowMs: 600000, maxRequests: 1 },
    'delete-model': { windowMs: 60000, maxRequests: 5 },
    'agent-create': { windowMs: 300000, maxRequests: 5 },
    'agent-update': { windowMs: 60000, maxRequests: 20 },
    'agent-delete': { windowMs: 300000, maxRequests: 5 },
    'summarize-messages': { windowMs: 300000, maxRequests: 10 },
    'clear-memory': { windowMs: 600000, maxRequests: 2 },
    default: { windowMs: 60000, maxRequests: 50 }
  }

  constructor() {
    setInterval(() => this.cleanup(), 300000)
  }

  configure(channel: string, config: RateLimitConfig) {
    this.configs.set(channel, config)
  }

  createMiddleware(channel: string) {
    return async (originalHandler: Function) => {
      return async (event: any, ...args: any[]) => {
        const config =
          this.configs.get(channel) || this.defaultConfigs[channel] || this.defaultConfigs.default
        const key = config.keyGenerator
          ? config.keyGenerator(event, ...args)
          : `${channel}:${event.sender.id}`

        const now = Date.now()
        let entry = this.limits.get(key)

        if (!entry || now > entry.resetTime) {
          entry = {
            count: 0,
            resetTime: now + config.windowMs,
            blocked: false
          }
          this.limits.set(key, entry)
        }

        if (entry.blocked && now < entry.resetTime) {
          console.warn(`🚫 Rate limit exceeded for ${channel} (${key})`)
          throw new Error(
            `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`
          )
        }

        entry.count++

        if (entry.count > config.maxRequests) {
          entry.blocked = true
          console.warn(
            `🚫 Rate limit exceeded for ${channel} (${key}) - ${entry.count}/${config.maxRequests}`
          )
          throw new Error(
            `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`
          )
        }

        try {
          const result = await originalHandler(event, ...args)

          if (config.skipSuccessful) {
            entry.count--
          }

          return result
        } catch (error) {
          console.error(`❌ ${channel} failed:`, error.message)
          throw error
        }
      }
    }
  }

  getStatus(channel?: string): Record<string, any> {
    if (channel) {
      const entries = Array.from(this.limits.entries()).filter(([key]) =>
        key.startsWith(channel + ':')
      )
      return Object.fromEntries(entries)
    }

    return Object.fromEntries(this.limits.entries())
  }

  private cleanup() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries`)
    }
  }

  reset(key?: string) {
    if (key) {
      this.limits.delete(key)
    } else {
      this.limits.clear()
    }
  }
}

export const rateLimiter = new IPCRateLimiter()

export function withRateLimit(channel: string, handler: Function) {
  const middleware = rateLimiter.createMiddleware(channel)
  // Return a synchronous function that calls the async middleware internally
  return async (event: any, ...args: any[]) => {
    const wrapped = await middleware(handler)
    return wrapped(event, ...args)
  }
}
