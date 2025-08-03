/**
 * Enhanced Memory IPC Handlers - Optimized semantic memory and analytics
 * Enhanced with ChromaDB optimizations and user controls
 */

import { ipcMain } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeError, safeInfo } from '../utils/safeLogger';
import { unifiedMemoryManager, MemoryItem, SearchOptions, MemoryOptimizationConfig } from '../core/unifiedMemory';
import { chromaService } from '../services/chromaService';

export function registerMemoryHandlers(
  container: DependencyContainer,
  Security: any
): void {

  /**
   * Enhanced search with analytics
   */
  ipcMain.handle('search-memory', async (_, query: string, limit: number = 5) => {
    try {
      if (typeof query !== 'string' || !query.trim()) {
        return { success: false, error: 'Query must be a non-empty string' };
      }
      
      if (typeof limit !== 'number' || limit < 1 || limit > 100) {
        return { success: false, error: 'Limit must be a number between 1 and 100' };
      }

      const sanitizedQuery = Security.sanitizeInput(query.trim());
      
      // Use enhanced unified memory manager
      const results = await unifiedMemoryManager.semanticSearch(sanitizedQuery, { limit });
      
      return {
        success: true,
        results: results.items,
        analytics: results.analytics,
        searchTime: results.searchTime,
        cacheHit: results.cacheHit,
        totalFound: results.totalFound,
        query: sanitizedQuery,
        limit
      };
    } catch (error: any) {
      safeError('❌ search-memory error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Store memory with enhanced metadata
   */
  ipcMain.handle('umsl-store-memory', async (_, content: string, type: string, metadata: any = {}) => {
    try {
      if (typeof content !== 'string' || !content.trim()) {
        return { success: false, error: 'Content must be a non-empty string' };
      }

      const validTypes = ['conversation', 'document', 'code', 'task', 'agent_state', 'system'];
      if (!validTypes.includes(type)) {
        return { success: false, error: `Type must be one of: ${validTypes.join(', ')}` };
      }

      const sanitizedContent = Security.sanitizeInput(content);
      
      const memoryItem: MemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type as MemoryItem['type'],
        content: sanitizedContent,
        metadata: {
          ...metadata,
          stored_via: 'ipc_handler',
          content_length: sanitizedContent.length
        },
        timestamp: new Date().toISOString(),
        tags: metadata.tags || [],
        priority: metadata.priority || 'medium',
        source: metadata.source || 'user',
        accessCount: 0
      };
      
      const result = await unifiedMemoryManager.storeMemory(memoryItem);
      
      return { 
        success: result.success, 
        memoryId: memoryItem.id,
        error: result.error 
      };
    } catch (error: any) {
      safeError('❌ umsl-store-memory error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Enhanced advanced search with comprehensive options
   */
  ipcMain.handle('umsl-advanced-search', async (_, query: string, options: SearchOptions = {}) => {
    try {
      if (typeof query !== 'string' || !query.trim()) {
        return { success: false, error: 'Query must be a non-empty string' };
      }

      const sanitizedQuery = Security.sanitizeInput(query.trim());
      
      // Validate and sanitize search options
      const searchOptions: SearchOptions = {
        limit: Math.min(options.limit || 10, 100),
        threshold: options.threshold,
        type: options.type,
        tags: options.tags,
        timeRange: options.timeRange,
        includeEmbeddings: options.includeEmbeddings || false,
        priority: options.priority,
        sortBy: options.sortBy || 'relevance',
        filterByAccess: options.filterByAccess
      };
      
      const results = await unifiedMemoryManager.semanticSearch(sanitizedQuery, searchOptions);
      
      return { 
        success: true, 
        results: results.items,
        analytics: results.analytics,
        searchTime: results.searchTime,
        cacheHit: results.cacheHit,
        totalFound: results.totalFound
      };
    } catch (error: any) {
      safeError('❌ umsl-advanced-search error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get comprehensive memory analytics
   */
  ipcMain.handle('umsl-get-memory-analytics', async () => {
    try {
      const [stats, chromaAnalytics] = await Promise.all([
        unifiedMemoryManager.getStats(),
        chromaService.getMemoryAnalytics()
      ]);
      
      return { 
        success: true, 
        stats,
        chromaAnalytics,
        config: unifiedMemoryManager.getConfig()
      };
    } catch (error: any) {
      safeError('❌ umsl-get-memory-analytics error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Vacuum/optimize memory storage
   */
  ipcMain.handle('umsl-vacuum-memory', async (_, dataPath?: string) => {
    try {
      safeInfo('🧹 Starting memory vacuum operation...');
      
      const [vacuumResult, optimizeResult] = await Promise.all([
        chromaService.vacuum(dataPath),
        unifiedMemoryManager.optimize()
      ]);
      
      return {
        success: vacuumResult.success && optimizeResult.success,
        vacuumResult,
        optimizeResult,
        message: 'Memory optimization completed'
      };
    } catch (error: any) {
      safeError('❌ umsl-vacuum-memory error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Configure HNSW parameters
   */
  ipcMain.handle('umsl-configure-hnsw', async (_, collectionName: string, config: any) => {
    try {
      if (typeof collectionName !== 'string' || !collectionName.trim()) {
        return { success: false, error: 'Collection name must be a non-empty string' };
      }

      const hnswConfig = {
        ef_search: config.ef_search || 50,
        ef_construction: config.ef_construction || 200,
        M: config.M || 16
      };

      const result = await chromaService.configureHNSW(collectionName, hnswConfig);
      
      return result;
    } catch (error: any) {
      safeError('❌ umsl-configure-hnsw error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update memory optimization configuration
   */
  ipcMain.handle('umsl-update-config', async (_, newConfig: Partial<MemoryOptimizationConfig>) => {
    try {
      unifiedMemoryManager.updateConfig(newConfig);
      
      return { 
        success: true, 
        config: unifiedMemoryManager.getConfig(),
        message: 'Memory configuration updated successfully'
      };
    } catch (error: any) {
      safeError('❌ umsl-update-config error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Clear memory cache
   */
  ipcMain.handle('umsl-clear-cache', async () => {
    try {
      await chromaService.clearCache();
      await unifiedMemoryManager.cleanup();
      
      return { 
        success: true, 
        message: 'Memory cache cleared successfully' 
      };
    } catch (error: any) {
      safeError('❌ umsl-clear-cache error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get cache hit rate and performance metrics
   */
  ipcMain.handle('umsl-get-performance-metrics', async () => {
    try {
      const cacheHitRate = chromaService.getCacheHitRate();
      const avgLatency = chromaService.getAverageLatency();
      const stats = await unifiedMemoryManager.getStats();
      
      return {
        success: true,
        metrics: {
          cacheHitRate,
          avgLatency,
          storageStats: stats
        }
      };
    } catch (error: any) {
      safeError('❌ umsl-get-performance-metrics error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Retrieve specific memory item
   */
  ipcMain.handle('umsl-retrieve-memory', async (_, memoryId: string) => {
    try {
      if (typeof memoryId !== 'string' || !memoryId.trim()) {
        return { success: false, error: 'Memory ID must be a non-empty string' };
      }

      const memoryItem = await unifiedMemoryManager.retrieveMemory(memoryId);
      
      return { 
        success: true, 
        memoryItem,
        found: memoryItem !== null
      };
    } catch (error: any) {
      safeError('❌ umsl-retrieve-memory error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get ChromaDB collections info
   */
  ipcMain.handle('umsl-get-collections', async () => {
    try {
      const result = await chromaService.getCollections();
      
      if (result.success) {
        // Get additional analytics for each collection
        const collectionsWithStats = await Promise.all(
          (result.collections || []).map(async (collection) => {
            try {
              const analytics = await chromaService.getMemoryAnalytics();
              const collectionStats = analytics.collections.find(c => c.name === collection.name);
              
              return {
                ...collection,
                stats: collectionStats || { count: 0, size: 0, memoryUsage: 0 }
              };
            } catch {
              return {
                ...collection,
                stats: { count: 0, size: 0, memoryUsage: 0 }
              };
            }
          })
        );

        return {
          success: true,
          collections: collectionsWithStats
        };
      }
      
      return result;
    } catch (error: any) {
      safeError('❌ umsl-get-collections error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Create optimized collection with HNSW parameters
   */
  ipcMain.handle('umsl-create-collection', async (_, name: string, metadata?: any, hnswConfig?: any) => {
    try {
      if (typeof name !== 'string' || !name.trim()) {
        return { success: false, error: 'Collection name must be a non-empty string' };
      }

      const sanitizedName = Security.sanitizeInput(name.trim());
      const result = await chromaService.createCollection(sanitizedName, metadata, hnswConfig);
      
      return result;
    } catch (error: any) {
      safeError('❌ umsl-create-collection error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Delete collection
   */
  ipcMain.handle('umsl-delete-collection', async (_, name: string) => {
    try {
      if (typeof name !== 'string' || !name.trim()) {
        return { success: false, error: 'Collection name must be a non-empty string' };
      }

      const result = await chromaService.deleteCollection(name.trim());
      
      return result;
    } catch (error: any) {
      safeError('❌ umsl-delete-collection error:', error);
      return { success: false, error: error.message };
    }
  });

  // Backward compatibility handlers
  ipcMain.handle('umsl-retrieve-context', async (_, query: string, options: any = {}) => {
    try {
      const results = await unifiedMemoryManager.semanticSearch(query, options);
      return { 
        success: true, 
        context: results.items.map(item => item.content).join('\n\n')
      };
    } catch (error: any) {
      safeError('❌ umsl-retrieve-context error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('umsl-create-thread', async (_, message: string, metadata: any = {}) => {
    try {
      const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const memoryItem: MemoryItem = {
        id: threadId,
        type: 'conversation',
        content: message,
        metadata: { ...metadata, thread_start: true },
        timestamp: new Date().toISOString(),
        tags: ['thread', 'conversation'],
        priority: 'medium',
        source: 'thread',
        accessCount: 0
      };
      
      await unifiedMemoryManager.storeMemory(memoryItem);
      
      return { success: true, threadId };
    } catch (error: any) {
      safeError('❌ umsl-create-thread error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('umsl-add-to-thread', async (_, threadId: string, role: string, content: string, metadata: any = {}) => {
    try {
      const messageId = `msg_${threadId}_${Date.now()}`;
      
      const memoryItem: MemoryItem = {
        id: messageId,
        type: 'conversation',
        content: `${role}: ${content}`,
        metadata: { ...metadata, threadId, role },
        timestamp: new Date().toISOString(),
        tags: ['thread', 'message', role],
        priority: 'medium',
        source: 'thread',
        accessCount: 0
      };
      
      await unifiedMemoryManager.storeMemory(memoryItem);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ umsl-add-to-thread error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('umsl-get-thread', async (_, threadId: string) => {
    try {
      const results = await unifiedMemoryManager.semanticSearch(`threadId:${threadId}`, {
        limit: 100,
        sortBy: 'timestamp'
      });
      
      return { 
        success: true, 
        thread: {
          id: threadId,
          messages: results.items
        }
      };
    } catch (error: any) {
      safeError('❌ umsl-get-thread error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('umsl-get-memory-stats', async () => {
    try {
      const stats = await unifiedMemoryManager.getStats();
      return { success: true, stats };
    } catch (error: any) {
      safeError('❌ umsl-get-memory-stats error:', error);
      return { success: false, error: error.message };
    }
  });

  safeLog('✅ Enhanced memory handlers registered with optimization support');
}