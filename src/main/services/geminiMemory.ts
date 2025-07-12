/**
 * Gemini-Inspired Hybrid Memory Service - Puffer
 *
 * Based on Gemini cookbook best practices for local AI memory systems.
 * Uses proven JSON storage + in-memory indexing for maximum compatibility.
 *
 * Features from Gemini examples:
 * - Simple but effective text similarity matching
 * - Conversation chunking for RAG
 * - Topic extraction and relevance scoring
 * - Memory summarization techniques
 * - No native dependencies - pure JavaScript/TypeScript
 */

import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'
import { appendChatMessage } from '@main/storage'
import type { Message } from '../../types/chat'

export interface ConversationChunk {
  id: string
  user_message: string
  ai_response: string
  model: string
  timestamp: number
  topics: string[]
  relevance_score: number
  access_count: number
  last_accessed: number
  metadata?: any
}

export interface MemoryIndex {
  version: string
  chunks: ConversationChunk[]
  word_index: Record<string, string[]> // word -> chunk_ids
  topic_index: Record<string, string[]> // topic -> chunk_ids
  created_at: string
  last_updated: string
}

export interface MemorySearchResult {
  chunk: ConversationChunk
  similarity: number
  snippet: string
  match_reason: string
}

class GeminiInspiredMemoryService {
  private memoryIndex: MemoryIndex | null = null
  private initialized = false
  private readonly memoryPath: string

  constructor() {
    this.memoryPath = join(app.getPath('userData'), 'memory-index.json')
    this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadMemoryIndex()
      this.initialized = true
      console.log('🧠 Gemini-inspired memory service initialized successfully')
    } catch (error) {
      console.error('❌ Memory service initialization failed:', error)
      await this.createDefaultMemoryIndex()
    }
  }

  private async loadMemoryIndex(): Promise<void> {
    if (!existsSync(this.memoryPath)) {
      await this.createDefaultMemoryIndex()
      return
    }

    try {
      const fileContent = await readFile(this.memoryPath, 'utf-8')
      this.memoryIndex = JSON.parse(fileContent)
      console.log(`🧠 Loaded memory index with ${this.memoryIndex?.chunks.length || 0} chunks`)
    } catch (error) {
      console.warn('🧠 Failed to load memory index, creating new one:', error)
      await this.createDefaultMemoryIndex()
    }
  }

  private async createDefaultMemoryIndex(): Promise<void> {
    this.memoryIndex = {
      version: '1.0.0',
      chunks: [],
      word_index: {},
      topic_index: {},
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    }
    await this.saveMemoryIndex()
  }

  private async saveMemoryIndex(): Promise<void> {
    if (!this.memoryIndex) return

    try {
      this.memoryIndex.last_updated = new Date().toISOString()
      await writeFile(this.memoryPath, JSON.stringify(this.memoryIndex, null, 2), 'utf-8')
    } catch (error) {
      console.error('❌ Failed to save memory index:', error)
    }
  }

  /**
   * Store a conversation with advanced indexing (Gemini approach)
   */
  async storeConversation(
    userMessage: string,
    aiResponse: string,
    model: string,
    responseTime?: number,
    tokenCount?: number,
    metadata?: any
  ): Promise<string> {
    if (!this.initialized || !this.memoryIndex) {
      throw new Error('Memory service not initialized')
    }

    try {
      const id = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = Date.now()

      // Extract topics using Gemini-inspired technique
      const topics = this.extractTopics(userMessage, aiResponse)

      // Calculate relevance score
      const relevance_score = this.calculateRelevanceScore(userMessage, aiResponse)

      const chunk: ConversationChunk = {
        id,
        user_message: userMessage,
        ai_response: aiResponse,
        model,
        timestamp,
        topics,
        relevance_score,
        access_count: 0,
        last_accessed: timestamp,
        metadata: {
          responseTime,
          tokenCount,
          ...metadata
        }
      }

      // Add to chunks
      this.memoryIndex.chunks.push(chunk)

      // Update word index for fast text search
      this.updateWordIndex(chunk)

      // Update topic index
      this.updateTopicIndex(chunk)

      // Keep only recent chunks (memory management)
      if (this.memoryIndex.chunks.length > 1000) {
        this.memoryIndex.chunks = this.memoryIndex.chunks
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, 800) // Keep top 800 by relevance
      }

      await this.saveMemoryIndex()

      // Also store in JSON for backup compatibility
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

      console.log('🧠 Conversation stored with advanced indexing:', id)
      return id
    } catch (error) {
      console.error('❌ Failed to store conversation:', error)
      throw error
    }
  }

  /**
   * Search memory using Gemini-inspired similarity techniques
   */
  async searchMemoryChunks(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.initialized || !this.memoryIndex) {
      throw new Error('Memory service not initialized')
    }

    try {
      const queryWords = this.extractWords(query.toLowerCase())
      const results: MemorySearchResult[] = []

      // 1. Exact word matches (highest priority)
      for (const word of queryWords) {
        const chunkIds = this.memoryIndex.word_index[word] || []
        for (const chunkId of chunkIds) {
          const chunk = this.memoryIndex.chunks.find((c) => c.id === chunkId)
          if (chunk) {
            const similarity = this.calculateWordSimilarity(query, chunk)
            results.push({
              chunk,
              similarity: similarity + 0.2, // Boost for exact word match
              snippet: this.extractSnippet(chunk.user_message + ' ' + chunk.ai_response, query),
              match_reason: `Word match: "${word}"`
            })
          }
        }
      }

      // 2. Topic matches (medium priority)
      const queryTopics = this.extractTopics(query, '')
      for (const topic of queryTopics) {
        const chunkIds = this.memoryIndex.topic_index[topic] || []
        for (const chunkId of chunkIds) {
          const chunk = this.memoryIndex.chunks.find((c) => c.id === chunkId)
          if (chunk && !results.find((r) => r.chunk.id === chunkId)) {
            const similarity = this.calculateTopicSimilarity(queryTopics, chunk.topics)
            results.push({
              chunk,
              similarity: similarity + 0.1, // Boost for topic match
              snippet: this.extractSnippet(chunk.user_message + ' ' + chunk.ai_response, query),
              match_reason: `Topic match: "${topic}"`
            })
          }
        }
      }

      // 3. Semantic similarity (lower priority but broader coverage)
      for (const chunk of this.memoryIndex.chunks) {
        if (!results.find((r) => r.chunk.id === chunk.id)) {
          const similarity = this.calculateSemanticSimilarity(query, chunk)
          if (similarity > 0.2) {
            // Threshold for semantic matches
            results.push({
              chunk,
              similarity,
              snippet: this.extractSnippet(chunk.user_message + ' ' + chunk.ai_response, query),
              match_reason: 'Semantic similarity'
            })
          }
        }
      }

      // Update access counts for returned chunks
      const finalResults = results.sort((a, b) => b.similarity - a.similarity).slice(0, limit)

      for (const result of finalResults) {
        result.chunk.access_count++
        result.chunk.last_accessed = Date.now()
      }

      await this.saveMemoryIndex()

      console.log(`🧠 Memory search found ${finalResults.length} relevant chunks`)
      return finalResults
    } catch (error) {
      console.error('❌ Memory search failed:', error)
      return []
    }
  }

  /**
   * Get memory statistics for UI
   */
  getMemoryStats(): { total: number; byModel: Record<string, number>; recentActivity: number } {
    if (!this.memoryIndex) {
      return { total: 0, byModel: {}, recentActivity: 0 }
    }

    const total = this.memoryIndex.chunks.length
    const byModel: Record<string, number> = {}
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    let recentActivity = 0

    for (const chunk of this.memoryIndex.chunks) {
      byModel[chunk.model] = (byModel[chunk.model] || 0) + 1
      if (chunk.timestamp > oneDayAgo) {
        recentActivity++
      }
    }

    return { total, byModel, recentActivity }
  }

  // Helper methods inspired by Gemini cookbook patterns

  private extractTopics(userMessage: string, aiResponse: string): string[] {
    const content = (userMessage + ' ' + aiResponse).toLowerCase()
    const topics = new Set<string>()

    // Common tech/AI topics (inspired by Gemini examples)
    const topicPatterns = [
      { pattern: /\b(code|coding|programming|development|software)\b/i, topic: 'programming' },
      { pattern: /\b(database|data|storage|query|sql)\b/i, topic: 'database' },
      { pattern: /\b(api|service|endpoint|request|http)\b/i, topic: 'api' },
      { pattern: /\b(error|bug|issue|problem|debug)\b/i, topic: 'troubleshooting' },
      { pattern: /\b(security|auth|login|access|permission)\b/i, topic: 'security' },
      { pattern: /\b(performance|optimization|speed|fast)\b/i, topic: 'performance' },
      { pattern: /\b(ai|model|gemini|llm|machine learning)\b/i, topic: 'ai' },
      { pattern: /\b(ui|ux|interface|design|user)\b/i, topic: 'design' },
      { pattern: /\b(test|testing|unit|integration)\b/i, topic: 'testing' }
    ]

    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(content)) {
        topics.add(topic)
      }
    }

    // Extract key nouns as topics
    const words = content.match(/\b\w{4,}\b/g) || []
    const commonWords = new Set([
      'that',
      'this',
      'with',
      'from',
      'they',
      'have',
      'been',
      'were',
      'said',
      'each'
    ])

    for (const word of words.slice(0, 10)) {
      // Limit to first 10 significant words
      if (!commonWords.has(word) && word.length > 3) {
        topics.add(word)
      }
    }

    return Array.from(topics).slice(0, 8) // Max 8 topics
  }

  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .filter(
        (word) =>
          ![
            'the',
            'and',
            'for',
            'are',
            'but',
            'not',
            'you',
            'all',
            'can',
            'her',
            'was',
            'one',
            'our'
          ].includes(word)
      )
  }

  private updateWordIndex(chunk: ConversationChunk): void {
    if (!this.memoryIndex) return

    const text = chunk.user_message + ' ' + chunk.ai_response
    const words = this.extractWords(text)

    for (const word of words) {
      if (!this.memoryIndex.word_index[word]) {
        this.memoryIndex.word_index[word] = []
      }
      if (!this.memoryIndex.word_index[word].includes(chunk.id)) {
        this.memoryIndex.word_index[word].push(chunk.id)
      }
    }
  }

  private updateTopicIndex(chunk: ConversationChunk): void {
    if (!this.memoryIndex) return

    for (const topic of chunk.topics) {
      if (!this.memoryIndex.topic_index[topic]) {
        this.memoryIndex.topic_index[topic] = []
      }
      if (!this.memoryIndex.topic_index[topic].includes(chunk.id)) {
        this.memoryIndex.topic_index[topic].push(chunk.id)
      }
    }
  }

  private calculateRelevanceScore(userMessage: string, aiResponse: string): number {
    const messageLength = userMessage.length + aiResponse.length
    const hasQuestions = /\?/.test(userMessage)
    const hasCodeBlocks = /```/.test(aiResponse)
    const hasExplanations = /(because|therefore|since|thus|here's how|step by step)/i.test(
      aiResponse
    )
    const hasNumbers = /\d+/.test(userMessage + aiResponse)

    let score = Math.min(0.6, messageLength / 1000) // Base score from length
    if (hasQuestions) score += 0.15
    if (hasCodeBlocks) score += 0.15
    if (hasExplanations) score += 0.1
    if (hasNumbers) score += 0.05

    return Math.min(1.0, score)
  }

  private calculateWordSimilarity(query: string, chunk: ConversationChunk): number {
    const queryWords = new Set(this.extractWords(query))
    const chunkText = chunk.user_message + ' ' + chunk.ai_response
    const chunkWords = new Set(this.extractWords(chunkText))

    const intersection = new Set([...queryWords].filter((word) => chunkWords.has(word)))
    const union = new Set([...queryWords, ...chunkWords])

    return intersection.size / union.size
  }

  private calculateTopicSimilarity(queryTopics: string[], chunkTopics: string[]): number {
    if (queryTopics.length === 0 || chunkTopics.length === 0) return 0

    const querySet = new Set(queryTopics)
    const chunkSet = new Set(chunkTopics)
    const intersection = new Set([...querySet].filter((topic) => chunkSet.has(topic)))

    return intersection.size / Math.max(querySet.size, chunkSet.size)
  }

  private calculateSemanticSimilarity(query: string, chunk: ConversationChunk): number {
    // Simple semantic similarity based on content patterns
    const queryLower = query.toLowerCase()
    const chunkText = (chunk.user_message + ' ' + chunk.ai_response).toLowerCase()

    // Boost score based on chunk relevance and access patterns
    let similarity = 0

    // Content similarity
    if (chunkText.includes(queryLower)) similarity += 0.8
    else if (queryLower.includes(chunk.user_message.toLowerCase().substring(0, 20)))
      similarity += 0.6

    // Boost frequently accessed chunks
    similarity += Math.min(0.2, chunk.access_count * 0.02)

    // Boost recent chunks slightly
    const daysSinceCreated = (Date.now() - chunk.timestamp) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated < 7) similarity += 0.1

    return Math.min(1.0, similarity)
  }

  private extractSnippet(content: string, query: string, maxLength: number = 150): string {
    const queryLower = query.toLowerCase()
    const contentLower = content.toLowerCase()
    const index = contentLower.indexOf(queryLower)

    if (index === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '')
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
export const geminiMemoryService = new GeminiInspiredMemoryService()
export default geminiMemoryService
