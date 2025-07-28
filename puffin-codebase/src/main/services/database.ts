/**
 * Sophisticated Hybrid Database Service - Puffer
 *
 * Combines better-sqlite3 for high-performance structured data
 * with JSON storage for settings and memory management.
 *
 * Features:
 * - High-performance conversation storage with FTS
 * - Memory chunks for RAG with relevance scoring
 * - Telemetry and performance metrics
 * - Automatic database optimization
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { readFileSync, existsSync } from 'fs'
import { appendChatMessage, loadMemoryStore, addMemorySummary } from '@main/storage'
import type { Message, MemorySummary } from '../../types/chat'

export interface ConversationRecord {
  id: string
  user_message: string
  ai_response: string
  model: string
  timestamp: number
  response_time?: number
  token_count?: number
  metadata?: any
}

export interface MemoryChunk {
  id: string
  content: string
  summary?: string
  topics: string[]
  relevance_score: number
  access_count: number
  last_accessed: number
  source_type: 'conversation' | 'file' | 'manual'
  source_id?: string
}

export interface MemorySearchResult {
  chunk: MemoryChunk
  similarity: number
  snippet: string
}

class DatabaseService {
  private db: Database.Database | null = null
  private initialized = false

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    try {
      const dbPath = join(app.getPath('userData'), 'puffer.db')
      console.log('🗄️ Initializing database at:', dbPath)

      this.db = new Database(dbPath)

      // Apply performance optimizations
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('synchronous = NORMAL')
      this.db.pragma('cache_size = 1000')
      this.db.pragma('temp_store = MEMORY')
      this.db.pragma('foreign_keys = ON')

      // Load and execute schema
      const schemaPath = join(__dirname, '../../../electron/database/schema.sql')
      if (existsSync(schemaPath)) {
        const schema = readFileSync(schemaPath, 'utf-8')
        this.db.exec(schema)
        console.log('✅ Database schema loaded successfully')
      } else {
        console.warn('⚠️ Schema file not found, creating basic tables')
        this.createBasicTables()
      }

      // Prepare common statements for performance
      this.prepareStatements()

      this.initialized = true
      console.log('✅ Database service initialized successfully')
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      this.db = null
    }
  }

  private createBasicTables(): void {
    if (!this.db) return

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        model TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        response_time INTEGER,
        token_count INTEGER,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversations_model ON conversations(model);
    `)
  }

  private prepareStatements(): void {
    if (!this.db) return

    // Pre-compile frequently used statements for performance
    this.insertConversationStmt = this.db.prepare(`
      INSERT INTO conversations (id, user_message, ai_response, model, timestamp, response_time, token_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    this.searchConversationsStmt = this.db.prepare(`
      SELECT * FROM conversations 
      WHERE user_message LIKE ? OR ai_response LIKE ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `)

    this.insertMemoryChunkStmt = this.db.prepare(`
      INSERT INTO memory_chunks (id, content, summary, topics, relevance_score, source_type, source_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    this.searchMemoryChunksStmt = this.db.prepare(`
      SELECT * FROM memory_chunks 
      WHERE content LIKE ? OR summary LIKE ?
      ORDER BY relevance_score DESC, access_count DESC
      LIMIT ?
    `)

    this.updateMemoryAccessStmt = this.db.prepare(`
      UPDATE memory_chunks 
      SET access_count = access_count + 1, last_accessed = ?
      WHERE id = ?
    `)
  }

  private insertConversationStmt?: Database.Statement
  private searchConversationsStmt?: Database.Statement
  private insertMemoryChunkStmt?: Database.Statement
  private searchMemoryChunksStmt?: Database.Statement
  private updateMemoryAccessStmt?: Database.Statement

  /**
   * Store a conversation in the high-performance database
   */
  async storeConversation(
    userMessage: string,
    aiResponse: string,
    model: string,
    responseTime?: number,
    tokenCount?: number,
    metadata?: any
  ): Promise<string> {
    if (!this.db || !this.insertConversationStmt) {
      throw new Error('Database not initialized')
    }

    try {
      const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = Date.now()

      // Store in SQLite for fast retrieval
      this.insertConversationStmt.run(
        id,
        userMessage,
        aiResponse,
        model,
        timestamp,
        responseTime || null,
        tokenCount || null,
        metadata ? JSON.stringify(metadata) : null
      )

      // Also store in JSON for backup and compatibility
      const message: Message = {
        id: id,
        type: 'user',
        content: userMessage,
        timestamp: new Date(timestamp)
      }
      await appendChatMessage(message)

      const responseMessage: Message = {
        id: `${id}_response`,
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date(timestamp + 1)
      }
      await appendChatMessage(responseMessage)

      // Create memory chunk for future RAG
      await this.createMemoryChunk(
        userMessage,
        aiResponse,
        'conversation',
        id,
        this.calculateRelevanceScore(userMessage, aiResponse)
      )

      console.log('🗄️ Conversation stored successfully:', id)
      return id
    } catch (error) {
      console.error('❌ Failed to store conversation:', error)
      throw error
    }
  }

  /**
   * Search conversations with sophisticated text matching
   */
  async searchConversations(query: string, limit: number = 10): Promise<ConversationRecord[]> {
    if (!this.db || !this.searchConversationsStmt) {
      throw new Error('Database not initialized')
    }

    try {
      const searchPattern = `%${query}%`
      const results = this.searchConversationsStmt.all(
        searchPattern,
        searchPattern,
        limit
      ) as ConversationRecord[]

      return results.map((result) => ({
        ...result,
        metadata: result.metadata ? JSON.parse(result.metadata) : undefined
      }))
    } catch (error) {
      console.error('❌ Failed to search conversations:', error)
      return []
    }
  }

  /**
   * Create a memory chunk for RAG functionality
   */
  async createMemoryChunk(
    userMessage: string,
    aiResponse: string,
    sourceType: 'conversation' | 'file' | 'manual',
    sourceId?: string,
    relevanceScore: number = 0.5
  ): Promise<string> {
    if (!this.db || !this.insertMemoryChunkStmt) {
      throw new Error('Database not initialized')
    }

    try {
      const id = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const content = `Q: ${userMessage}\nA: ${aiResponse}`
      const summary = this.generateSummary(content)
      const topics = this.extractTopics(content)

      this.insertMemoryChunkStmt.run(
        id,
        content,
        summary,
        JSON.stringify(topics),
        relevanceScore,
        sourceType,
        sourceId || null
      )

      console.log('🧠 Memory chunk created:', id)
      return id
    } catch (error) {
      console.error('❌ Failed to create memory chunk:', error)
      throw error
    }
  }

  /**
   * Search memory chunks for RAG context
   */
  async searchMemoryChunks(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.db || !this.searchMemoryChunksStmt || !this.updateMemoryAccessStmt) {
      throw new Error('Database not initialized')
    }

    try {
      const searchPattern = `%${query}%`
      const results = this.searchMemoryChunksStmt.all(searchPattern, searchPattern, limit) as any[]

      const searchResults: MemorySearchResult[] = results.map((result) => {
        // Update access tracking
        this.updateMemoryAccessStmt.run(Date.now(), result.id)

        return {
          chunk: {
            ...result,
            topics: JSON.parse(result.topics || '[]')
          },
          similarity: this.calculateSimilarity(query, result.content),
          snippet: this.extractSnippet(result.content, query)
        }
      })

      return searchResults.sort((a, b) => b.similarity - a.similarity)
    } catch (error) {
      console.error('❌ Failed to search memory chunks:', error)
      return []
    }
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(): {
    total: number
    byModel: Record<string, number>
    recentActivity: number
  } {
    if (!this.db) {
      return { total: 0, byModel: {}, recentActivity: 0 }
    }

    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM conversations')
      const total = (totalStmt.get() as any)?.count || 0

      const byModelStmt = this.db.prepare(
        'SELECT model, COUNT(*) as count FROM conversations GROUP BY model'
      )
      const modelCounts = byModelStmt.all() as any[]
      const byModel = Object.fromEntries(modelCounts.map((row) => [row.model, row.count]))

      const recentStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM conversations 
        WHERE timestamp > ?
      `)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      const recentActivity = (recentStmt.get(oneDayAgo) as any)?.count || 0

      return { total, byModel, recentActivity }
    } catch (error) {
      console.error('❌ Failed to get conversation stats:', error)
      return { total: 0, byModel: {}, recentActivity: 0 }
    }
  }

  /**
   * Optimize database performance
   */
  optimize(): void {
    if (!this.db) return

    try {
      console.log('🗄️ Optimizing database...')
      this.db.pragma('optimize')
      this.db.exec('VACUUM')
      console.log('✅ Database optimization complete')
    } catch (error) {
      console.error('❌ Database optimization failed:', error)
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.optimize() // Optimize before closing
      this.db.close()
      this.db = null
      console.log('🗄️ Database connection closed')
    }
  }

  // Helper methods
  private calculateRelevanceScore(userMessage: string, aiResponse: string): number {
    // Simple relevance scoring based on message length and content quality
    const messageLength = userMessage.length + aiResponse.length
    const hasQuestions = /\?/.test(userMessage)
    const hasCodeBlocks = /```/.test(aiResponse)
    const hasExplanations = /(because|therefore|since|thus)/i.test(aiResponse)

    let score = Math.min(0.8, messageLength / 1000) // Base score from length
    if (hasQuestions) score += 0.1
    if (hasCodeBlocks) score += 0.1
    if (hasExplanations) score += 0.1

    return Math.min(1.0, score)
  }

  private generateSummary(content: string): string {
    // Simple extractive summary - take first meaningful sentence
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20)
    return sentences.length > 0 ? sentences[0].trim() + '.' : content.substring(0, 100)
  }

  private extractTopics(content: string): string[] {
    // Simple keyword extraction
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)

    const topicWords = new Set<string>()

    // Look for common topic indicators
    const topicPatterns = [
      /\b(code|coding|programming|development)\b/i,
      /\b(database|data|storage|query)\b/i,
      /\b(api|service|endpoint|request)\b/i,
      /\b(error|bug|issue|problem)\b/i,
      /\b(security|auth|login|access)\b/i,
      /\b(performance|optimization|speed)\b/i
    ]

    for (const pattern of topicPatterns) {
      const match = content.match(pattern)
      if (match) {
        topicWords.add(match[0].toLowerCase())
      }
    }

    return Array.from(topicWords).slice(0, 5) // Max 5 topics
  }

  private calculateSimilarity(query: string, content: string): number {
    // Simple word overlap similarity
    const queryWords = new Set(query.toLowerCase().split(/\s+/))
    const contentWords = new Set(content.toLowerCase().split(/\s+/))

    const intersection = new Set([...queryWords].filter((word) => contentWords.has(word)))
    const union = new Set([...queryWords, ...contentWords])

    return intersection.size / union.size
  }

  private extractSnippet(content: string, query: string, maxLength: number = 150): string {
    const queryLower = query.toLowerCase()
    const contentLower = content.toLowerCase()
    const index = contentLower.indexOf(queryLower)

    if (index === -1) {
      return content.substring(0, maxLength)
    }

    const start = Math.max(0, index - 50)
    const end = Math.min(content.length, index + query.length + 100)

    let snippet = content.substring(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet = snippet + '...'

    return snippet
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()
export default databaseService
