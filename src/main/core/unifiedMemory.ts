/**
 * UNIFIED MEMORY & STORAGE LAYER (UMSL)
 * Core component for Phase 1 Agent Platform
 * 
 * Provides unified interface for:
 * - ChromaDB vector storage
 * - Local file storage
 * - In-memory caching
 * - Semantic memory operations
 */

import { z } from 'zod'
import { chromaService } from '../services/chromaService'
import { join } from 'path'
import { app } from 'electron'
import { promises as fs } from 'fs'
import { createHash } from 'crypto'

// Storage interface definitions
export interface StorageProvider {
  name: string
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<void>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  clear(): Promise<void>
  getStats(): Promise<StorageStats>
}

export interface StorageStats {
  size: number
  itemCount: number
  hitRate?: number
  memoryUsage?: number
}

// Memory item schema
export const MemoryItemSchema = z.object({
  id: z.string(),
  type: z.enum(['conversation', 'document', 'code', 'task', 'agent_state']),
  content: z.string(),
  metadata: z.record(z.any()),
  embeddings: z.array(z.number()).optional(),
  timestamp: z.string(),
  ttl: z.number().optional(),
  tags: z.array(z.string()).default([]),
  similarity: z.number().optional(),
  source: z.string().optional()
})

export type MemoryItem = z.infer<typeof MemoryItemSchema>

// Search and retrieval options
export interface SearchOptions {
  limit?: number
  threshold?: number
  type?: MemoryItem['type']
  tags?: string[]
  timeRange?: {
    start?: Date
    end?: Date
  }
  includeEmbeddings?: boolean
}

export interface SemanticSearchResult {
  items: MemoryItem[]
  totalFound: number
  searchTime: number
  cacheHit: boolean
}

/**
 * In-Memory Cache Provider
 * Fast access for frequently used items
 */
class MemoryCacheProvider implements StorageProvider {
  name = 'memory-cache'
  private cache = new Map<string, { value: any; expiry?: number; accessed: number }>()
  private hitCount = 0
  private missCount = 0

  async get(key: string): Promise<any> {
    const item = this.cache.get(key)
    if (!item) {
      this.missCount++
      return null
    }

    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key)
      this.missCount++
      return null
    }

    item.accessed = Date.now()
    this.hitCount++
    return item.value
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined
    this.cache.set(key, { value, expiry, accessed: Date.now() })
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (!item) return false
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0
  }

  async getStats(): Promise<StorageStats> {
    const total = this.hitCount + this.missCount
    return {
      size: this.cache.size,
      itemCount: this.cache.size,
      hitRate: total > 0 ? this.hitCount / total : 0,
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  private estimateMemoryUsage(): number {
    let size = 0
    for (const [key, item] of this.cache) {
      size += key.length * 2 // Unicode chars are 2 bytes
      size += JSON.stringify(item.value).length * 2
    }
    return size
  }

  // Cache management
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache) {
      if (item.expiry && now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * File System Storage Provider
 * Persistent storage for documents and structured data
 */
class FileSystemProvider implements StorageProvider {
  name = 'filesystem'
  private basePath: string

  constructor() {
    this.basePath = join(app.getPath('userData'), 'unified-memory')
  }

  async init(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true })
  }

  private getFilePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex')
    return join(this.basePath, `${hash}.json`)
  }

  async get(key: string): Promise<any> {
    try {
      const filePath = this.getFilePath(key)
      const data = await fs.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      
      // Check TTL
      if (parsed.expiry && Date.now() > parsed.expiry) {
        await this.delete(key)
        return null
      }
      
      return parsed.value
    } catch (error) {
      if ((error as any).code === 'ENOENT') return null
      throw error
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const filePath = this.getFilePath(key)
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined
    const data = { value, expiry, created: Date.now() }
    await fs.writeFile(filePath, JSON.stringify(data), 'utf-8')
  }

  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key)
      await fs.unlink(filePath)
      return true
    } catch (error) {
      if ((error as any).code === 'ENOENT') return false
      throw error
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key)
      await fs.access(filePath)
      
      // Check TTL
      const data = await this.get(key)
      return data !== null
    } catch {
      return false
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.basePath)
      await Promise.all(
        files.map(file => fs.unlink(join(this.basePath, file)))
      )
    } catch (error) {
      // Directory might not exist
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const files = await fs.readdir(this.basePath)
      let totalSize = 0
      
      for (const file of files) {
        const stats = await fs.stat(join(this.basePath, file))
        totalSize += stats.size
      }
      
      return {
        size: totalSize,
        itemCount: files.length
      }
    } catch {
      return { size: 0, itemCount: 0 }
    }
  }
}

/**
 * ChromaDB Vector Storage Provider
 * Semantic search and vector operations
 */
class VectorStorageProvider implements StorageProvider {
  name = 'vector-storage'
  public chromaService: any

  constructor(chromaServiceInstance: any) {
    this.chromaService = chromaServiceInstance
  }

  async get(key: string): Promise<any> {
    try {
      const results = await this.chromaService.searchMemory(key, 1)
      return results.results?.[0] || null
    } catch {
      return null
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (typeof value === 'string') {
      await this.chromaService.storeChatConversation('query', value)
    } else {
      await this.chromaService.storeChatConversation('query', JSON.stringify(value))
    }
  }

  async delete(key: string): Promise<boolean> {
    // ChromaDB doesn't have direct delete by key
    // This would need to be implemented based on metadata
    return false
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.get(key)
    return result !== null
  }

  async clear(): Promise<void> {
    // Would need to delete entire collection
    // Implement based on ChromaDB API
  }

  async getStats(): Promise<StorageStats> {
    // Would need to query ChromaDB for collection stats
    return { size: 0, itemCount: 0 }
  }
}

/**
 * Unified Memory Manager
 * Orchestrates all storage providers with intelligent caching
 */
export class UnifiedMemoryManager {
  private cache: MemoryCacheProvider
  private filesystem: FileSystemProvider
  private vectorStorage: VectorStorageProvider
  private initialized = false

  constructor(chromaServiceInstance: any) {
    this.cache = new MemoryCacheProvider()
    this.filesystem = new FileSystemProvider()
    this.vectorStorage = new VectorStorageProvider(chromaServiceInstance)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    await this.filesystem.init()
    this.initialized = true

    // Start cache cleanup interval
    setInterval(() => this.cache.cleanup(), 60000) // Every minute
  }

  /**
   * Store memory item with intelligent routing
   */
  async store(item: MemoryItem): Promise<void> {
    if (!this.initialized) await this.initialize()

    const validatedItem = MemoryItemSchema.parse(item)
    const key = validatedItem.id

    // Store in cache for fast access
    await this.cache.set(key, validatedItem, validatedItem.ttl)

    // Store in filesystem for persistence
    await this.filesystem.set(key, validatedItem, validatedItem.ttl)

    // Store in vector database for semantic search
    if (validatedItem.content && validatedItem.content.length > 10) {
      await this.vectorStorage.set(key, validatedItem.content)
    }
  }

  /**
   * Retrieve memory item with fallback chain
   */
  async retrieve(id: string): Promise<MemoryItem | null> {
    if (!this.initialized) await this.initialize()

    // Try cache first
    let item = await this.cache.get(id)
    if (item) return item

    // Fallback to filesystem
    item = await this.filesystem.get(id)
    if (item) {
      // Store back in cache
      await this.cache.set(id, item)
      return item
    }

    return null
  }

  /**
   * Semantic search across all memory
   */
  async search(query: string, options: SearchOptions = {}): Promise<SemanticSearchResult> {
    const startTime = Date.now()
    const cacheKey = `search:${createHash('sha256').update(query + JSON.stringify(options)).digest('hex')}`
    
    // Check cache first
    let cached = await this.cache.get(cacheKey)
    if (cached) {
      return {
        ...cached,
        searchTime: Date.now() - startTime,
        cacheHit: true
      }
    }

    // Perform vector search
    const vectorResults = await this.vectorStorage.chromaService.searchMemory(
      query,
      options.limit || 10
    )

    const items: MemoryItem[] = vectorResults.results?.map(result => ({
      id: createHash('sha256').update(result).digest('hex'),
      type: 'conversation' as const,
      content: result,
      metadata: {},
      timestamp: new Date().toISOString(),
      tags: []
    })) || []

    const result: SemanticSearchResult = {
      items,
      totalFound: items.length,
      searchTime: Date.now() - startTime,
      cacheHit: false
    }

    // Cache result for future searches
    await this.cache.set(cacheKey, result, 300) // 5 minute TTL

    return result
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{ [key: string]: StorageStats }> {
    return {
      cache: await this.cache.getStats(),
      filesystem: await this.filesystem.getStats(),
      vectorStorage: await this.vectorStorage.getStats()
    }
  }

  /**
   * Cleanup expired items across all providers
   */
  async cleanup(): Promise<void> {
    this.cache.cleanup()
    // Filesystem cleanup would need to scan for expired items
    // Vector storage cleanup would need ChromaDB-specific logic
  }

  /**
   * Clear all storage (for testing/reset)
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.cache.clear(),
      this.filesystem.clear(),
      this.vectorStorage.clear()
    ])
  }
}
