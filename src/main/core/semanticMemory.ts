/**
 * SEMANTIC MEMORY LAYER
 * Advanced context recall and RAG integration for Phase 1 Agent Platform
 * 
 * Features:
 * - Intelligent context retrieval
 * - Conversation threading
 * - Knowledge graph construction
 * - Multi-modal memory integration
 * - Temporal memory patterns
 */

import { UnifiedMemoryManager, MemoryItem, SearchOptions } from './unifiedMemory'
import { chromaService } from '../services/chromaService'
import { z } from 'zod'
import { createHash } from 'crypto'

// Context schemas
export const ConversationContextSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.string(),
    metadata: z.record(z.any()).optional()
  })),
  summary: z.string().optional(),
  entities: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  lastUpdated: z.string()
})

export const KnowledgeNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['entity', 'concept', 'relationship', 'fact']),
  content: z.string(),
  connections: z.array(z.object({
    nodeId: z.string(),
    strength: z.number(),
    type: z.string()
  })).default([]),
  confidence: z.number().min(0).max(1),
  lastAccessed: z.string(),
  metadata: z.record(z.any()).default({})
})

export type ConversationContext = z.infer<typeof ConversationContextSchema>
export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>

interface ContextRetrievalOptions {
  includeHistory?: boolean
  maxHistoryItems?: number
  relevanceThreshold?: number
  temporalWeight?: number
  entityFocus?: string[]
  excludeTypes?: MemoryItem['type'][]
}

interface SemanticContext {
  primary: MemoryItem[]
  related: MemoryItem[]
  conversations: ConversationContext[]
  entities: string[]
  summary: string
  confidence: number
  retrievalTime: number
}

/**
 * Context Processor
 * Analyzes and enriches memory items with semantic understanding
 */
class ContextProcessor {
  private static readonly ENTITY_PATTERNS = [
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Proper nouns
    /\b(?:React|TypeScript|JavaScript|Python|Node\.js|Electron)\b/gi, // Tech terms
    /\b(?:project|feature|bug|issue|task)\s+#?\d+\b/gi, // References
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g // Emails
  ]

  private static readonly TOPIC_KEYWORDS = [
    'implementation', 'architecture', 'design', 'performance', 'security',
    'testing', 'deployment', 'optimization', 'refactoring', 'debugging',
    'feature', 'enhancement', 'bug', 'issue', 'requirement'
  ]

  static extractEntities(text: string): string[] {
    const entities = new Set<string>()
    
    for (const pattern of this.ENTITY_PATTERNS) {
      const matches = text.match(pattern) || []
      matches.forEach(match => entities.add(match.trim()))
    }

    return Array.from(entities).filter(entity => 
      entity.length > 2 && entity.length < 50
    )
  }

  static extractTopics(text: string): string[] {
    const topics = new Set<string>()
    const lowercaseText = text.toLowerCase()

    for (const keyword of this.TOPIC_KEYWORDS) {
      if (lowercaseText.includes(keyword)) {
        topics.add(keyword)
      }
    }

    // Simple topic extraction from repeated terms
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || []
    const wordCounts = new Map<string, number>()
    
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    })

    // Add words that appear multiple times
    for (const [word, count] of wordCounts) {
      if (count >= 2 && word.length > 4) {
        topics.add(word)
      }
    }

    return Array.from(topics).slice(0, 10) // Limit to top 10
  }

  static analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'amazing', 'fantastic', 'wonderful', 'awesome', 'brilliant', 'outstanding']
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'wrong', 'error', 'problem', 'issue', 'bug', 'broken', 'failed']
    
    const lowercaseText = text.toLowerCase()
    let score = 0

    positiveWords.forEach(word => {
      if (lowercaseText.includes(word)) score += 1
    })

    negativeWords.forEach(word => {
      if (lowercaseText.includes(word)) score -= 1
    })

    if (score > 0) return 'positive'
    if (score < 0) return 'negative'
    return 'neutral'
  }

  static summarizeText(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) return text

    // Simple sentence-based summarization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
    
    if (sentences.length <= 2) {
      return text.substring(0, maxLength).trim() + '...'
    }

    // Take first and last sentences
    const summary = `${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`
    
    return summary.length <= maxLength ? summary : 
           summary.substring(0, maxLength).trim() + '...'
  }
}

/**
 * Conversation Thread Manager
 * Maintains conversation context and threading
 */
class ConversationThreadManager {
  private memoryManager: UnifiedMemoryManager
  private activeThreads = new Map<string, ConversationContext>()

  constructor(memoryManager: UnifiedMemoryManager) {
    this.memoryManager = memoryManager
  }

  async createThread(initialMessage: string, metadata: Record<string, any> = {}): Promise<string> {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    const context: ConversationContext = {
      id: `context_${threadId}`,
      threadId,
      messages: [{
        role: 'user',
        content: initialMessage,
        timestamp: new Date().toISOString(),
        metadata
      }],
      entities: ContextProcessor.extractEntities(initialMessage),
      topics: ContextProcessor.extractTopics(initialMessage),
      sentiment: ContextProcessor.analyzeSentiment(initialMessage),
      lastUpdated: new Date().toISOString()
    }

    this.activeThreads.set(threadId, context)
    
    // Store in unified memory
    await this.memoryManager.store({
      id: context.id,
      type: 'conversation',
      content: JSON.stringify(context),
      metadata: { threadId, messageCount: 1 },
      timestamp: new Date().toISOString(),
      tags: ['conversation', 'thread', ...context.topics]
    })

    return threadId
  }

  async addMessage(threadId: string, role: 'user' | 'assistant' | 'system', content: string, metadata: Record<string, any> = {}): Promise<void> {
    let context = this.activeThreads.get(threadId)
    
    if (!context) {
      // Try to load from memory
      const stored = await this.memoryManager.retrieve(`context_${threadId}`)
      if (stored) {
        context = JSON.parse(stored.content)
        this.activeThreads.set(threadId, context!)
      } else {
        throw new Error(`Thread ${threadId} not found`)
      }
    }

    context!.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    })

    // Update context analysis
    const allContent = context!.messages.map(m => m.content).join(' ')
    context!.entities = ContextProcessor.extractEntities(allContent)
    context!.topics = ContextProcessor.extractTopics(allContent)
    context!.sentiment = ContextProcessor.analyzeSentiment(allContent)
    context!.lastUpdated = new Date().toISOString()

    // Generate summary for long conversations
    if (context!.messages.length >= 5) {
      context!.summary = ContextProcessor.summarizeText(allContent, 300)
    }

    // Update in memory
    await this.memoryManager.store({
      id: context!.id,
      type: 'conversation',
      content: JSON.stringify(context),
      metadata: { threadId, messageCount: context!.messages.length },
      timestamp: new Date().toISOString(),
      tags: ['conversation', 'thread', ...context!.topics]
    })

    this.activeThreads.set(threadId, context!)
  }

  async getThread(threadId: string): Promise<ConversationContext | null> {
    let context = this.activeThreads.get(threadId)
    
    if (!context) {
      const stored = await this.memoryManager.retrieve(`context_${threadId}`)
      if (stored) {
        context = JSON.parse(stored.content)
        this.activeThreads.set(threadId, context!)
      }
    }

    return context || null
  }

  async getRecentThreads(limit: number = 10): Promise<ConversationContext[]> {
    const results = await this.memoryManager.search('conversation', {
      type: 'conversation',
      limit: limit * 2 // Get more to filter
    })

    const contexts = results.items
      .filter(item => item.tags.includes('thread'))
      .map(item => JSON.parse(item.content) as ConversationContext)
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, limit)

    return contexts
  }
}

/**
 * Semantic Memory Engine
 * Main interface for advanced memory operations
 */
export class SemanticMemoryEngine {
  private memoryManager: UnifiedMemoryManager
  private threadManager: ConversationThreadManager
  private knowledgeGraph = new Map<string, KnowledgeNode>()

  constructor(chromaServiceInstance: any) {
    this.memoryManager = new UnifiedMemoryManager(chromaServiceInstance)
    this.threadManager = new ConversationThreadManager(this.memoryManager)
  }

  async initialize(): Promise<void> {
    await this.memoryManager.initialize()
    await this.loadKnowledgeGraph()
  }

  /**
   * Store enriched memory with semantic analysis
   */
  async storeMemory(content: string, type: MemoryItem['type'], metadata: Record<string, any> = {}): Promise<string> {
    const id = `memory_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    const enrichedMetadata = {
      ...metadata,
      entities: ContextProcessor.extractEntities(content),
      topics: ContextProcessor.extractTopics(content),
      sentiment: ContextProcessor.analyzeSentiment(content),
      summary: ContextProcessor.summarizeText(content)
    }

    const memoryItem: MemoryItem = {
      id,
      type,
      content,
      metadata: enrichedMetadata,
      timestamp: new Date().toISOString(),
      tags: [type, ...enrichedMetadata.topics]
    }

    await this.memoryManager.store(memoryItem)
    await this.updateKnowledgeGraph(memoryItem)

    return id
  }

  /**
   * Intelligent context retrieval with multiple strategies
   */
  async retrieveContext(query: string, options: ContextRetrievalOptions = {}): Promise<SemanticContext> {
    const startTime = Date.now()
    const {
      includeHistory = true,
      maxHistoryItems = 5,
      relevanceThreshold = 0.7,
      temporalWeight = 0.3,
      entityFocus = [],
      excludeTypes = []
    } = options

    // Primary semantic search
    const searchResults = await this.memoryManager.search(query, {
      limit: 20,
      threshold: relevanceThreshold
    })

    // Filter by type if specified
    const primaryResults = searchResults.items.filter(item => 
      !excludeTypes.includes(item.type)
    )

    // Enhanced entity-based search
    const entities = ContextProcessor.extractEntities(query)
    const entityResults: MemoryItem[] = []

    if (entityFocus.length > 0 || entities.length > 0) {
      const focusEntities = [...entityFocus, ...entities]
      
      for (const entity of focusEntities) {
        const entitySearch = await this.memoryManager.search(entity, {
          limit: 5,
          threshold: 0.6
        })
        entityResults.push(...entitySearch.items)
      }
    }

    // Conversation history if requested
    const conversations: ConversationContext[] = []
    if (includeHistory) {
      const recentThreads = await this.threadManager.getRecentThreads(maxHistoryItems)
      conversations.push(...recentThreads)
    }

    // Related items through knowledge graph
    const relatedItems = await this.findRelatedMemories(primaryResults.slice(0, 5))

    // Extract all unique entities
    const allEntities = new Set<string>()
    primaryResults.forEach(item => {
      const entities = item.metadata.entities || []
      entities.forEach((entity: string) => allEntities.add(entity))
    })

    // Generate contextual summary
    const allContent = [
      ...primaryResults.map(item => item.content),
      ...conversations.map(conv => conv.summary || conv.messages.map(m => m.content).join(' '))
    ].join(' ')

    const summary = ContextProcessor.summarizeText(allContent, 500)

    // Calculate confidence based on result quality
    const confidence = this.calculateContextConfidence(primaryResults, entities)

    return {
      primary: primaryResults.slice(0, 10),
      related: relatedItems,
      conversations,
      entities: Array.from(allEntities),
      summary,
      confidence,
      retrievalTime: Date.now() - startTime
    }
  }

  /**
   * Create or continue conversation thread
   */
  async createConversationThread(initialMessage: string, metadata: Record<string, any> = {}): Promise<string> {
    return await this.threadManager.createThread(initialMessage, metadata)
  }

  async addToConversation(threadId: string, role: 'user' | 'assistant' | 'system', content: string, metadata: Record<string, any> = {}): Promise<void> {
    await this.threadManager.addMessage(threadId, role, content, metadata)
  }

  async getConversationThread(threadId: string): Promise<ConversationContext | null> {
    return await this.threadManager.getThread(threadId)
  }

  /**
   * Advanced search with multiple parameters
   */
  async advancedSearch(query: string, filters: {
    types?: MemoryItem['type'][]
    dateRange?: { start: Date; end: Date }
    entities?: string[]
    topics?: string[]
    sentiment?: 'positive' | 'negative' | 'neutral'
    limit?: number
  } = {}): Promise<MemoryItem[]> {
    const baseResults = await this.memoryManager.search(query, {
      limit: filters.limit || 50,
      type: filters.types?.[0] // Basic type filter
    })

    // Apply advanced filters
    return baseResults.items.filter(item => {
      // Type filter
      if (filters.types && !filters.types.includes(item.type)) {
        return false
      }

      // Date range filter
      if (filters.dateRange) {
        const itemDate = new Date(item.timestamp)
        if (itemDate < filters.dateRange.start || itemDate > filters.dateRange.end) {
          return false
        }
      }

      // Entity filter
      if (filters.entities) {
        const itemEntities = item.metadata.entities || []
        if (!filters.entities.some(entity => itemEntities.includes(entity))) {
          return false
        }
      }

      // Topic filter
      if (filters.topics) {
        const itemTopics = item.metadata.topics || []
        if (!filters.topics.some(topic => itemTopics.includes(topic))) {
          return false
        }
      }

      // Sentiment filter
      if (filters.sentiment && item.metadata.sentiment !== filters.sentiment) {
        return false
      }

      return true
    })
  }

  /**
   * Get memory statistics and health
   */
  async getMemoryStats(): Promise<{
    storage: { [key: string]: any }
    knowledgeGraph: { nodeCount: number; connectionCount: number }
    activeThreads: number
    totalMemories: number
  }> {
    const storageStats = await this.memoryManager.getStats()
    
    const connectionCount = Array.from(this.knowledgeGraph.values())
      .reduce((total, node) => total + node.connections.length, 0)

    return {
      storage: storageStats,
      knowledgeGraph: {
        nodeCount: this.knowledgeGraph.size,
        connectionCount
      },
      activeThreads: this.threadManager['activeThreads'].size,
      totalMemories: storageStats.filesystem?.itemCount || 0
    }
  }

  // Private helper methods
  private async updateKnowledgeGraph(memoryItem: MemoryItem): Promise<void> {
    const entities = memoryItem.metadata.entities || []
    const topics = memoryItem.metadata.topics || []

    // Create nodes for entities and topics
    const allTerms = entities.concat(topics)
    allTerms.forEach(term => {
      if (!this.knowledgeGraph.has(term)) {
        const node: KnowledgeNode = {
          id: term,
          type: entities.includes(term) ? 'entity' : 'concept',
          content: term,
          connections: [],
          confidence: 0.5,
          lastAccessed: new Date().toISOString(),
          metadata: { source: memoryItem.id }
        }
        this.knowledgeGraph.set(term, node)
      }
    })

    // Create connections between co-occurring terms
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        this.addConnection(entities[i], entities[j], 0.8)
      }
    }
  }

  private addConnection(nodeId1: string, nodeId2: string, strength: number): void {
    const node1 = this.knowledgeGraph.get(nodeId1)
    const node2 = this.knowledgeGraph.get(nodeId2)

    if (node1 && node2) {
      // Add or update connection
      const existingConnection = node1.connections.find(c => c.nodeId === nodeId2)
      if (existingConnection) {
        existingConnection.strength = Math.min(1.0, existingConnection.strength + 0.1)
      } else {
        node1.connections.push({ nodeId: nodeId2, strength, type: 'semantic' })
        node2.connections.push({ nodeId: nodeId1, strength, type: 'semantic' })
      }
    }
  }

  private async findRelatedMemories(items: MemoryItem[]): Promise<MemoryItem[]> {
    const related: MemoryItem[] = []
    
    for (const item of items) {
      const entities = item.metadata.entities || []
      for (const entity of entities) {
        const node = this.knowledgeGraph.get(entity)
        if (node) {
          // Find connected entities
          for (const connection of node.connections) {
            if (connection.strength > 0.6) {
              const relatedSearch = await this.memoryManager.search(connection.nodeId, { limit: 2 })
              related.push(...relatedSearch.items)
            }
          }
        }
      }
    }

    // Remove duplicates and original items
    const originalIds = new Set(items.map(item => item.id))
    return related.filter((item, index, self) => 
      !originalIds.has(item.id) && 
      self.findIndex(other => other.id === item.id) === index
    ).slice(0, 10)
  }

  private calculateContextConfidence(results: MemoryItem[], queryEntities: string[]): number {
    if (results.length === 0) return 0

    let score = 0
    let factors = 0

    // Result count factor
    score += Math.min(results.length / 10, 1) * 0.3
    factors += 0.3

    // Entity overlap factor
    if (queryEntities.length > 0) {
      const entityOverlap = results.reduce((total, item) => {
        const itemEntities = item.metadata.entities || []
        const overlap = queryEntities.filter(entity => itemEntities.includes(entity)).length
        return total + (overlap / queryEntities.length)
      }, 0) / results.length

      score += entityOverlap * 0.4
      factors += 0.4
    }

    // Recency factor
    const now = Date.now()
    const avgAge = results.reduce((total, item) => {
      const age = now - new Date(item.timestamp).getTime()
      return total + age
    }, 0) / results.length

    const recencyScore = Math.max(0, 1 - (avgAge / (7 * 24 * 60 * 60 * 1000))) // 7 days max
    score += recencyScore * 0.3
    factors += 0.3

    return Math.min(score / factors, 1)
  }

  private async loadKnowledgeGraph(): Promise<void> {
    // Load existing knowledge graph from storage
    try {
      const stored = await this.memoryManager.retrieve('knowledge_graph')
      if (stored) {
        const graphData = JSON.parse(stored.content)
        this.knowledgeGraph = new Map(Object.entries(graphData))
      }
    } catch (error) {
      // Knowledge graph doesn't exist yet
    }
  }

  async saveKnowledgeGraph(): Promise<void> {
    const graphData = Object.fromEntries(this.knowledgeGraph)
    await this.memoryManager.store({
      id: 'knowledge_graph',
      type: 'agent_state',
      content: JSON.stringify(graphData),
      metadata: { nodeCount: this.knowledgeGraph.size },
      timestamp: new Date().toISOString(),
      tags: ['knowledge_graph', 'system']
    })
  }
}
