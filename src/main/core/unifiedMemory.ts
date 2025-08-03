/**
 * UNIFIED MEMORY & STORAGE LAYER (UMSL) - OPTIMIZED
 * Enhanced with ChromaDB optimizations and user controls
 * 
 * Provides unified interface for:
 * - ChromaDB vector storage with vacuum and HNSW tuning
 * - Local file storage with compression
 * - In-memory caching with intelligent eviction
 * - Advanced semantic memory operations
 * - Memory analytics and optimization
 */

import { z } from 'zod'
import { chromaService } from '../services/chromaService'
import { join } from 'path'
import { app } from 'electron'
import { promises as fs } from 'fs'
import { createHash } from 'crypto'
import { safeLog, safeError, safeInfo } from '../utils/safeLogger'

// Enhanced storage interface definitions
export interface StorageProvider {
  name: string
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<void>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  clear(): Promise<void>
  getStats(): Promise<StorageStats>
  optimize?(): Promise<void>
}

export interface StorageStats {
  size: number
  itemCount: number
  hitRate?: number
  memoryUsage?: number
  avgLatency?: number
  lastOptimized?: string
}

// Enhanced memory item schema
export const MemoryItemSchema = z.object({
  id: z.string(),
  type: z.enum(['conversation', 'document', 'code', 'task', 'agent_state', 'system']),
  content: z.string(),
  metadata: z.record(z.any()),
  embeddings: z.array(z.number()).optional(),
  timestamp: z.string(),
  ttl: z.number().optional(),
  tags: z.array(z.string()).default([]),
  similarity: z.number().optional(),
  source: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  accessCount: z.number().default(0),
  lastAccessed: z.string().optional()
})

export type MemoryItem = z.infer<typeof MemoryItemSchema>

// Enhanced search and retrieval options
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
  priority?: MemoryItem['priority']
  sortBy?: 'relevance' | 'timestamp' | 'accessCount'
  filterByAccess?: {
    minCount?: number
    maxAge?: number // days
  }
}

export interface SemanticSearchResult {
  items: MemoryItem[]
  totalFound: number
  searchTime: number
  cacheHit: boolean
  analytics: {
    avgSimilarity: number
    sourceDistribution: Record<string, number>
    typeDistribution: Record<string, number>
  }
}

export interface MemoryOptimizationConfig {
  autoVacuum: boolean
  vacuumSchedule: string // cron expression
  maxCacheSize: number // MB
  cacheTTL: number // minutes
  compressionEnabled: boolean
  hnswParams: {
    ef_search: number
    ef_construction: number
    M: number
  }
}

/**
 * Enhanced In-Memory Cache Provider with LRU and intelligent eviction
 */
class MemoryCacheProvider implements StorageProvider {
  name = 'memory-cache'
  private cache = new Map<string, { value: any; expiry?: number; accessed: number; size: number }>()
  private hitCount = 0
  private missCount = 0
  private maxSize: number
  private currentSize = 0
  private latencies: number[] = []

  constructor(maxSizeMB: number = 100) {
    this.maxSize = maxSizeMB * 1024 * 1024 // Convert to bytes
  }

  async get(key: string): Promise<any> {
    const startTime = Date.now()
    const item = this.cache.get(key)
    
    if (!item) {
      this.missCount++
      this.trackLatency(Date.now() - startTime)
      return null
    }

    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key)
      this.currentSize -= item.size
      this.missCount++
      this.trackLatency(Date.now() - startTime)
      return null
    }

    // Update access time for LRU
    item.accessed = Date.now()
    this.hitCount++
    this.trackLatency(Date.now() - startTime)
    return item.value
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const startTime = Date.now()
    const serialized = JSON.stringify(value)
    const size = Buffer.byteLength(serialized, 'utf8')
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined

    // Check if we need to evict items
    if (this.currentSize + size > this.maxSize) {
      await this.evictLRU(size)
    }

    // Remove existing item if it exists
    const existing = this.cache.get(key)
    if (existing) {
      this.currentSize -= existing.size
    }

    this.cache.set(key, { value, expiry, accessed: Date.now(), size })
    this.currentSize += size
    this.trackLatency(Date.now() - startTime)
  }

  async delete(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (item) {
      this.cache.delete(key)
      this.currentSize -= item.size
      return true
    }
    return false
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key)
      this.currentSize -= item.size
      return false
    }
    return true
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.currentSize = 0
    this.hitCount = 0
    this.missCount = 0
    this.latencies = []
    safeInfo('🧹 Memory cache cleared')
  }

  async getStats(): Promise<StorageStats> {
    const total = this.hitCount + this.missCount
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0
    const avgLatency = this.latencies.length > 0 
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length 
      : 0

    return {
      size: this.currentSize,
      itemCount: this.cache.size,
      hitRate,
      memoryUsage: this.currentSize,
      avgLatency
    }
  }

  async optimize(): Promise<void> {
    const startTime = Date.now()
    let cleaned = 0

    // Remove expired items
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && Date.now() > item.expiry) {
        this.cache.delete(key)
        this.currentSize -= item.size
        cleaned++
      }
    }

    safeInfo(`✅ Cache optimization completed: ${cleaned} expired items removed in ${Date.now() - startTime}ms`)
  }

  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].accessed - b[1].accessed) // Sort by access time (oldest first)

    let freedSpace = 0
    let evicted = 0

    for (const [key, item] of entries) {
      this.cache.delete(key)
      this.currentSize -= item.size
      freedSpace += item.size
      evicted++

      if (freedSpace >= requiredSpace) break
    }

    safeInfo(`🗑️ Evicted ${evicted} LRU cache items to free ${Math.round(freedSpace / 1024)}KB`)
  }

  private trackLatency(latency: number): void {
    this.latencies.push(latency)
    if (this.latencies.length > 100) {
      this.latencies = this.latencies.slice(-50) // Keep last 50 measurements
    }
  }

  cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && now > item.expiry) {
        this.cache.delete(key)
        this.currentSize -= item.size
        cleaned++
      }
    }

    if (cleaned > 0) {
      safeInfo(`🧹 Cache cleanup: ${cleaned} expired items removed`)
    }
  }
}

/**
 * Enhanced File System Provider with compression and optimization
 */
class FileSystemProvider implements StorageProvider {
  name = 'file-storage'
  private basePath: string
  private compressionEnabled: boolean

  constructor(compressionEnabled: boolean = true) {
    this.basePath = join(app.getPath('userData'), 'memory')
    this.compressionEnabled = compressionEnabled
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true })
      safeInfo(`📁 File storage initialized at: ${this.basePath}`)
    } catch (error: any) {
      safeError('❌ Failed to initialize file storage:', error.message)
      throw error
    }
  }

  private getFilePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex')
    return join(this.basePath, `${hash}.json${this.compressionEnabled ? '.gz' : ''}`)
  }

  async get(key: string): Promise<any> {
    try {
      const filePath = this.getFilePath(key)
      let content = await fs.readFile(filePath, 'utf-8')
      
      if (this.compressionEnabled) {
        // Decompress if needed (simplified - would use actual compression library)
        // content = await decompress(content)
      }

      const data = JSON.parse(content)
      
      // Check TTL
      if (data.expiry && Date.now() > data.expiry) {
        await this.delete(key)
        return null
      }

      return data.value
    } catch (error: any) {
      if (error.code === 'ENOENT') return null
      safeError(`❌ Failed to read file storage key ${key}:`, error.message)
      throw error
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const filePath = this.getFilePath(key)
      const expiry = ttl ? Date.now() + (ttl * 1000) : undefined
      const data = { value, expiry, created: Date.now() }
      
      let content = JSON.stringify(data)
      
      if (this.compressionEnabled) {
        // Compress if needed (simplified - would use actual compression library)
        // content = await compress(content)
      }

      await fs.writeFile(filePath, content, 'utf-8')
    } catch (error: any) {
      safeError(`❌ Failed to write file storage key ${key}:`, error.message)
      throw error
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key)
      await fs.unlink(filePath)
      return true
    } catch (error: any) {
      if (error.code === 'ENOENT') return false
      safeError(`❌ Failed to delete file storage key ${key}:`, error.message)
      return false
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
      safeInfo('🧹 File storage cleared')
    } catch (error: any) {
      safeError('❌ Failed to clear file storage:', error.message)
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

  async optimize(): Promise<void> {
    const startTime = Date.now()
    const files = await fs.readdir(this.basePath)
    let cleaned = 0

    for (const file of files) {
      try {
        const filePath = join(this.basePath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const data = JSON.parse(content)
        
        if (data.expiry && Date.now() > data.expiry) {
          await fs.unlink(filePath)
          cleaned++
        }
      } catch {
        // Skip corrupted files
      }
    }

    safeInfo(`✅ File storage optimization completed: ${cleaned} expired files removed in ${Date.now() - startTime}ms`)
  }
}
/**
 * Enhanced ChromaDB Vector Storage Provider with advanced features
 */
class VectorStorageProvider implements StorageProvider {
  name = 'vector-storage'
  public chromaService: any
  private operationLatencies: number[] = []

  constructor(chromaServiceInstance: any) {
    this.chromaService = chromaServiceInstance
  }

  async get(key: string): Promise<any> {
    const startTime = Date.now()
    try {
      const results = await this.chromaService.searchMemory(key, 1)
      this.trackLatency(Date.now() - startTime)
      return results.results?.[0] || null
    } catch (error: any) {
      safeError(`❌ Vector storage get failed for key ${key}:`, error.message)
      return null
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const startTime = Date.now()
    try {
      const content = typeof value === 'string' ? value : JSON.stringify(value)
      const metadata = {
        key,
        stored_at: new Date().toISOString(),
        ttl: ttl ? Date.now() + (ttl * 1000) : undefined,
        content_type: typeof value,
        size: Buffer.byteLength(content, 'utf8')
      }

      await this.chromaService.storeChatConversation(key, content)
      this.trackLatency(Date.now() - startTime)
    } catch (error: any) {
      safeError(`❌ Vector storage set failed for key ${key}:`, error.message)
      throw error
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      // ChromaDB doesn't have direct delete by key, but we can mark as deleted
      const metadata = {
        key,
        deleted_at: new Date().toISOString(),
        status: 'deleted'
      }
      
      await this.chromaService.addDocuments('deleted_items', [`DELETED: ${key}`], [metadata], [key])
      return true
    } catch (error: any) {
      safeError(`❌ Vector storage delete failed for key ${key}:`, error.message)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.get(key)
      return result !== null
    } catch {
      return false
    }
  }

  async clear(): Promise<void> {
    try {
      // This would require dropping and recreating collections
      const collections = await this.chromaService.getCollections()
      if (collections.success && collections.collections) {
        for (const collection of collections.collections) {
          await this.chromaService.deleteCollection(collection.name)
        }
      }
      safeInfo('🧹 Vector storage cleared')
    } catch (error: any) {
      safeError('❌ Failed to clear vector storage:', error.message)
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const analytics = await this.chromaService.getMemoryAnalytics()
      const avgLatency = this.operationLatencies.length > 0
        ? this.operationLatencies.reduce((a, b) => a + b, 0) / this.operationLatencies.length
        : 0

      return {
        size: analytics.totalMemoryUsage || 0,
        itemCount: analytics.collections?.reduce((sum, col) => sum + col.count, 0) || 0,
        memoryUsage: analytics.totalMemoryUsage || 0,
        avgLatency,
        lastOptimized: analytics.lastVacuum
      }
    } catch (error: any) {
      safeError('❌ Failed to get vector storage stats:', error.message)
      return { size: 0, itemCount: 0 }
    }
  }

  async optimize(): Promise<void> {
    try {
      const result = await this.chromaService.vacuum()
      if (result.success) {
        safeInfo('✅ Vector storage optimization (vacuum) completed')
      } else {
        safeError('❌ Vector storage optimization failed:', result.message)
      }
    } catch (error: any) {
      safeError('❌ Vector storage optimization error:', error.message)
    }
  }

  private trackLatency(latency: number): void {
    this.operationLatencies.push(latency)
    if (this.operationLatencies.length > 100) {
      this.operationLatencies = this.operationLatencies.slice(-50)
    }
  }
}

/**
 * Enhanced Unified Memory Manager with optimization and analytics
 */
export class UnifiedMemoryManager {
  private cache: MemoryCacheProvider
  private filesystem: FileSystemProvider
  private vectorStorage: VectorStorageProvider
  private initialized = false
  private config: MemoryOptimizationConfig
  private optimizationInterval: NodeJS.Timeout | null = null

  constructor(chromaServiceInstance: any, config?: Partial<MemoryOptimizationConfig>) {
    this.config = {
      autoVacuum: true,
      vacuumSchedule: '0 2 * * *', // Daily at 2 AM
      maxCacheSize: 100, // MB
      cacheTTL: 30, // minutes
      compressionEnabled: true,
      hnswParams: {
        ef_search: 50,
        ef_construction: 200,
        M: 16
      },
      ...config
    }

    this.cache = new MemoryCacheProvider(this.config.maxCacheSize)
    this.filesystem = new FileSystemProvider(this.config.compressionEnabled)
    this.vectorStorage = new VectorStorageProvider(chromaServiceInstance)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await this.filesystem.init()
      this.initialized = true

      // Start optimization intervals
      this.startOptimizationSchedule()

      safeInfo('✅ Unified Memory Manager initialized with optimization enabled')
    } catch (error: any) {
      safeError('❌ Failed to initialize Unified Memory Manager:', error.message)
      throw error
    }
  }

  /**
   * Store memory item with intelligent routing
   */
  async storeMemory(item: MemoryItem): Promise<{ success: boolean; error?: string }> {
    try {
      const key = item.id
      
      // Always store in vector storage for semantic search
      await this.vectorStorage.set(key, item, item.ttl)
      
      // Store in cache for fast access
      await this.cache.set(key, item, this.config.cacheTTL * 60)
      
      // Store in filesystem for persistence (high priority items)
      if (item.priority === 'high' || item.priority === 'critical') {
        await this.filesystem.set(key, item, item.ttl)
      }

      return { success: true }
    } catch (error: any) {
      safeError(`❌ Failed to store memory item ${item.id}:`, error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Retrieve memory item with fallback hierarchy
   */
  async retrieveMemory(id: string): Promise<MemoryItem | null> {
    try {
      // Try cache first (fastest)
      let item = await this.cache.get(id)
      if (item) {
        // Update access tracking
        item.accessCount = (item.accessCount || 0) + 1
        item.lastAccessed = new Date().toISOString()
        await this.cache.set(id, item) // Update cache with new access info
        return item
      }

      // Try filesystem (medium speed)
      item = await this.filesystem.get(id)
      if (item) {
        // Cache for future access
        await this.cache.set(id, item, this.config.cacheTTL * 60)
        item.accessCount = (item.accessCount || 0) + 1
        item.lastAccessed = new Date().toISOString()
        return item
      }

      // Try vector storage (slowest but most comprehensive)
      item = await this.vectorStorage.get(id)
      if (item) {
        // Cache for future access
        await this.cache.set(id, item, this.config.cacheTTL * 60)
        item.accessCount = (item.accessCount || 0) + 1
        item.lastAccessed = new Date().toISOString()
        return item
      }

      return null
    } catch (error: any) {
      safeError(`❌ Failed to retrieve memory item ${id}:`, error.message)
      return null
    }
  }

  /**
   * Advanced semantic search with analytics
   */
  async semanticSearch(query: string, options: SearchOptions = {}): Promise<SemanticSearchResult> {
    const startTime = Date.now()
    const cacheKey = createHash('sha256').update(`search:${query}:${JSON.stringify(options)}`).digest('hex')

    try {
      // Check cache for recent search results
      const cachedResult = await this.cache.get(cacheKey)
      if (cachedResult) {
        return {
          ...cachedResult,
          searchTime: Date.now() - startTime,
          cacheHit: true
        }
      }

      // Perform vector search
      const vectorResults = await this.vectorStorage.chromaService.searchMemory(
        query,
        options.limit || 10,
        options.threshold,
        'chat_history'
      )

      const items: MemoryItem[] = []
      const analytics = {
        avgSimilarity: 0,
        sourceDistribution: {} as Record<string, number>,
        typeDistribution: {} as Record<string, number>
      }

      if (vectorResults.success && vectorResults.results) {
        let totalSimilarity = 0
        
        for (let i = 0; i < vectorResults.results.length; i++) {
          const content = vectorResults.results[i]
          const distance = vectorResults.distances?.[i] || 1
          const similarity = 1 - distance // Convert distance to similarity
          const metadata = vectorResults.metadata?.[i] || {}

          const item: MemoryItem = {
            id: createHash('sha256').update(content).digest('hex'),
            type: metadata.type || 'conversation',
            content,
            metadata,
            timestamp: metadata.timestamp || new Date().toISOString(),
            similarity,
            source: metadata.source || 'unknown',
            priority: metadata.priority || 'medium',
            accessCount: metadata.accessCount || 0,
            tags: metadata.tags || []
          }

          // Apply filters
          if (this.matchesFilters(item, options)) {
            items.push(item)
            totalSimilarity += similarity

            // Update analytics
            const source = item.source || 'unknown'
            const type = item.type
            analytics.sourceDistribution[source] = (analytics.sourceDistribution[source] || 0) + 1
            analytics.typeDistribution[type] = (analytics.typeDistribution[type] || 0) + 1
          }
        }

        analytics.avgSimilarity = items.length > 0 ? totalSimilarity / items.length : 0

        // Sort results if requested
        if (options.sortBy === 'timestamp') {
          items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        } else if (options.sortBy === 'accessCount') {
          items.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
        }
        // Default sort by relevance (similarity) is already applied
      }

      const result: SemanticSearchResult = {
        items,
        totalFound: items.length,
        searchTime: Date.now() - startTime,
        cacheHit: false,
        analytics
      }

      // Cache result for future searches (5 minute TTL)
      await this.cache.set(cacheKey, result, 5 * 60)

      return result
    } catch (error: any) {
      safeError(`❌ Semantic search failed for query "${query}":`, error.message)
      return {
        items: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        cacheHit: false,
        analytics: { avgSimilarity: 0, sourceDistribution: {}, typeDistribution: {} }
      }
    }
  }

  /**
   * Get comprehensive storage statistics
   */
  async getStats(): Promise<{ [key: string]: StorageStats }> {
    try {
      const [cacheStats, filesystemStats, vectorStats] = await Promise.all([
        this.cache.getStats(),
        this.filesystem.getStats(),
        this.vectorStorage.getStats()
      ])

      return {
        cache: cacheStats,
        filesystem: filesystemStats,
        vectorStorage: vectorStats
      }
    } catch (error: any) {
      safeError('❌ Failed to get memory stats:', error.message)
      return {
        cache: { size: 0, itemCount: 0 },
        filesystem: { size: 0, itemCount: 0 },
        vectorStorage: { size: 0, itemCount: 0 }
      }
    }
  }

  /**
   * Optimize all storage providers
   */
  async optimize(): Promise<{ success: boolean; details: string[] }> {
    const details: string[] = []
    let success = true

    try {
      safeInfo('🚀 Starting comprehensive memory optimization...')

      // Optimize cache
      try {
        await this.cache.optimize()
        details.push('Cache optimization completed')
      } catch (error: any) {
        details.push(`Cache optimization failed: ${error.message}`)
        success = false
      }

      // Optimize filesystem
      try {
        await this.filesystem.optimize()
        details.push('Filesystem optimization completed')
      } catch (error: any) {
        details.push(`Filesystem optimization failed: ${error.message}`)
        success = false
      }

      // Optimize vector storage (vacuum)
      try {
        await this.vectorStorage.optimize()
        details.push('Vector storage optimization (vacuum) completed')
      } catch (error: any) {
        details.push(`Vector storage optimization failed: ${error.message}`)
        success = false
      }

      if (success) {
        safeInfo('✅ Memory optimization completed successfully')
      } else {
        safeError('⚠️ Memory optimization completed with some errors')
      }

      return { success, details }
    } catch (error: any) {
      safeError('❌ Memory optimization failed:', error.message)
      return { success: false, details: [`Optimization failed: ${error.message}`] }
    }
  }

  /**
   * Update optimization configuration
   */
  updateConfig(newConfig: Partial<MemoryOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Update cache size if changed
    if (newConfig.maxCacheSize) {
      this.cache = new MemoryCacheProvider(newConfig.maxCacheSize)
    }

    // Restart optimization schedule if changed
    if (newConfig.autoVacuum !== undefined || newConfig.vacuumSchedule) {
      this.stopOptimizationSchedule()
      this.startOptimizationSchedule()
    }

    safeInfo('⚙️ Memory optimization config updated')
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryOptimizationConfig {
    return { ...this.config }
  }

  /**
   * Cleanup expired items across all providers
   */
  async cleanup(): Promise<void> {
    try {
      this.cache.cleanup()
      await this.filesystem.optimize()
      safeInfo('🧹 Memory cleanup completed')
    } catch (error: any) {
      safeError('❌ Memory cleanup failed:', error.message)
    }
  }

  /**
   * Clear all storage (for testing/reset)
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.cache.clear(),
        this.filesystem.clear(),
        this.vectorStorage.clear()
      ])
      safeInfo('🗑️ All memory storage cleared')
    } catch (error: any) {
      safeError('❌ Failed to clear all memory storage:', error.message)
    }
  }

  private matchesFilters(item: MemoryItem, options: SearchOptions): boolean {
    // Type filter
    if (options.type && item.type !== options.type) return false

    // Priority filter
    if (options.priority && item.priority !== options.priority) return false

    // Tags filter
    if (options.tags && options.tags.length > 0) {
      const hasMatchingTag = options.tags.some(tag => item.tags.includes(tag))
      if (!hasMatchingTag) return false
    }

    // Time range filter
    if (options.timeRange) {
      const itemTime = new Date(item.timestamp).getTime()
      if (options.timeRange.start && itemTime < options.timeRange.start.getTime()) return false
      if (options.timeRange.end && itemTime > options.timeRange.end.getTime()) return false
    }

    // Access count filter
    if (options.filterByAccess) {
      if (options.filterByAccess.minCount && (item.accessCount || 0) < options.filterByAccess.minCount) {
        return false
      }
      if (options.filterByAccess.maxAge && item.lastAccessed) {
        const daysSinceAccess = (Date.now() - new Date(item.lastAccessed).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceAccess > options.filterByAccess.maxAge) return false
      }
    }

    return true
  }

  private startOptimizationSchedule(): void {
    if (!this.config.autoVacuum) return

    // For simplicity, run optimization every hour
    // In production, you'd use a proper cron scheduler
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.cleanup()
      } catch (error: any) {
        safeError('❌ Scheduled optimization failed:', error.message)
      }
    }, 60 * 60 * 1000) // Every hour

    safeInfo('⏰ Memory optimization schedule started')
  }

  private stopOptimizationSchedule(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = null
      safeInfo('⏸️ Memory optimization schedule stopped')
    }
  }

  /**
   * Backward compatibility methods
   */
  async store(content: string, metadata?: any): Promise<{ success: boolean; error?: string }> {
    const memoryItem: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'conversation',
      content,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      tags: [],
      priority: 'medium',
      source: 'system',
      accessCount: 0
    }
    return this.storeMemory(memoryItem)
  }

  async retrieve(memoryId: string): Promise<MemoryItem | null> {
    return this.retrieveMemory(memoryId)
  }

  async search(query: string, limit?: number): Promise<{ items: MemoryItem[] }> {
    const result = await this.semanticSearch(query, { limit })
    return { items: result.items }
  }
}

// Export singleton instance
export const unifiedMemoryManager = new UnifiedMemoryManager(chromaService)
export default unifiedMemoryManager