import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { safeLog, safeError, safeInfo } from '@utils/safeLogger';
import { ollamaService } from './ollamaService';

const CHROMA_BASE_URL = 'http://localhost:8000';

interface ChromaCollection {
  name: string;
  id: string;
  metadata: Record<string, any>;
}

interface QueryResult {
  documents: string[][];
  metadatas: Record<string, any>[][];
  distances: number[][];
  ids: string[][];
}

interface ServiceStatus {
  connected: boolean;
  message: string;
  version?: string;
}

interface HNSWConfig {
  ef_search?: number;
  ef_construction?: number;
  M?: number;
}

interface MemoryAnalytics {
  collections: Array<{
    name: string;
    count: number;
    size: number;
    memoryUsage: number;
  }>;
  totalMemoryUsage: number;
  cacheHitRate: number;
  queryLatency: number;
  lastVacuum?: string;
}

interface PreFlightChecks {
  max_batch_size: number;
  server_version: string;
  available_memory: number;
}

let chromaProcess: ChildProcess | null = null;

class ChromaService {
  private baseUrl = CHROMA_BASE_URL;
  private queryCache = new Map<string, { data: QueryResult; timestamp: number; ttl: number }>();
  private preFlightChecks: PreFlightChecks | null = null;
  private cacheHits = 0;
  private cacheMisses = 0;
  private queryLatencies: number[] = [];
  private lastVacuumTime: string | null = null;

  async checkStatus(): Promise<ServiceStatus> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/api/v1/heartbeat`, { timeout: 5000 });
      return { connected: true, message: 'ChromaDB running', version: data.version || 'unknown' };
    } catch {
      return { connected: false, message: 'ChromaDB not running' };
    }
  }

  /**
   * Enhanced collection creation with HNSW optimization
   */
  async createCollection(
    name: string, 
    metadata?: Record<string, any>,
    hnswConfig?: HNSWConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = {
        name,
        metadata: {
          ...metadata,
          'hnsw:space': 'cosine',
          'hnsw:ef_construction': hnswConfig?.ef_construction || 200,
          'hnsw:ef_search': hnswConfig?.ef_search || 50,
          'hnsw:M': hnswConfig?.M || 16,
          created_at: new Date().toISOString()
        }
      };

      await this.retry(() => axios.post(`${this.baseUrl}/api/v1/collections`, config));
      safeInfo(`✅ Collection ${name} created with optimized HNSW parameters`);
      return { success: true };
    } catch (error: any) {
      if (error.response?.status === 409) return { success: true };
      safeError(`❌ Failed to create collection ${name}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch-optimized document addition with size validation
   */
  async addDocuments(
    collectionName: string, 
    documents: string[], 
    metadatas?: Record<string, any>[], 
    ids?: string[]
  ): Promise<{ success: boolean; addedCount: number; error?: string }> {
    try {
      await this.createCollection(collectionName);
      
      // Get pre-flight checks for batch size limits
      const preFlightChecks = await this.getPreFlightChecks();
      const maxBatchSize = preFlightChecks?.max_batch_size || 5000;

      if (documents.length > maxBatchSize) {
        // Process in batches
        let totalAdded = 0;
        for (let i = 0; i < documents.length; i += maxBatchSize) {
          const batch = documents.slice(i, i + maxBatchSize);
          const batchMetadatas = metadatas?.slice(i, i + maxBatchSize);
          const batchIds = ids?.slice(i, i + maxBatchSize);
          
          const result = await this.addDocumentsBatch(collectionName, batch, batchMetadatas, batchIds);
          if (!result.success) {
            return { success: false, addedCount: totalAdded, error: result.error };
          }
          totalAdded += result.addedCount;
          
          // Small delay between batches to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return { success: true, addedCount: totalAdded };
      }

      return await this.addDocumentsBatch(collectionName, documents, metadatas, ids);
    } catch (error: any) {
      safeError(`❌ Failed to add documents to ${collectionName}:`, error.message);
      return { success: false, addedCount: 0, error: error.message };
    }
  }

  private async addDocumentsBatch(
    collectionName: string,
    documents: string[],
    metadatas?: Record<string, any>[],
    ids?: string[]
  ): Promise<{ success: boolean; addedCount: number; error?: string }> {
    const embeddings = await this.generateEmbeddings(documents);
    const docIds = ids || documents.map((_, i) => `doc_${Date.now()}_${i}`);
    
    await this.retry(() => axios.post(`${this.baseUrl}/api/v1/collections/${collectionName}/add`, {
      documents,
      embeddings,
      metadatas: metadatas || documents.map(() => ({})),
      ids: docIds,
    }));
    
    return { success: true, addedCount: documents.length };
  }

  /**
   * Enhanced query with caching and performance tracking
   */
  async queryCollection(
    collectionName: string, 
    queryTexts: string[], 
    nResults: number = 5,
    threshold?: number
  ): Promise<{ success: boolean; results?: QueryResult; error?: string; cached?: boolean }> {
    const startTime = Date.now();
    const cacheKey = `${collectionName}:${queryTexts.join(',')}:${nResults}:${threshold || 'none'}`;
    
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.timestamp + cached.ttl > Date.now()) {
      this.cacheHits++;
      this.queryLatencies.push(Date.now() - startTime);
      return { success: true, results: cached.data, cached: true };
    }

    try {
      this.cacheMisses++;
      const queryEmbeddings = await this.generateEmbeddings(queryTexts);
      
      const requestBody: any = {
        query_embeddings: queryEmbeddings,
        n_results: nResults,
      };

      // Add distance threshold if specified
      if (threshold !== undefined) {
        requestBody.where = { distance: { $lt: threshold } };
      }

      const { data } = await this.retry(() => 
        axios.post(`${this.baseUrl}/api/v1/collections/${collectionName}/query`, requestBody)
      );

      // Cache the result with 5-minute TTL
      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutes
      });

      this.queryLatencies.push(Date.now() - startTime);
      
      // Limit latency tracking array size
      if (this.queryLatencies.length > 100) {
        this.queryLatencies = this.queryLatencies.slice(-50);
      }

      return { success: true, results: data, cached: false };
    } catch (error: any) {
      safeError(`❌ Query failed for collection ${collectionName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vacuum operation to optimize database size and performance
   */
  async vacuum(dataPath?: string): Promise<{ success: boolean; message: string; sizeBefore?: number; sizeAfter?: number }> {
    try {
      safeInfo('🧹 Starting ChromaDB vacuum operation...');
      
      const vacuumCommand = dataPath 
        ? `chroma utils vacuum --path ${dataPath}`
        : 'chroma utils vacuum';

      const result = await new Promise<{ success: boolean; message: string }>((resolve) => {
        const process = spawn('chroma', ['utils', 'vacuum', ...(dataPath ? ['--path', dataPath] : [])], {
          stdio: 'pipe'
        });

        let output = '';
        let error = '';

        process.stdout?.on('data', (data) => {
          output += data.toString();
        });

        process.stderr?.on('data', (data) => {
          error += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, message: output || 'Vacuum completed successfully' });
          } else {
            resolve({ success: false, message: error || 'Vacuum failed' });
          }
        });

        // Timeout after 5 minutes
        setTimeout(() => {
          process.kill();
          resolve({ success: false, message: 'Vacuum operation timed out' });
        }, 5 * 60 * 1000);
      });

      if (result.success) {
        this.lastVacuumTime = new Date().toISOString();
        this.clearCache(); // Clear cache after vacuum
        safeInfo('✅ ChromaDB vacuum completed successfully');
      } else {
        safeError('❌ ChromaDB vacuum failed:', result.message);
      }

      return result;
    } catch (error: any) {
      safeError('❌ Vacuum operation error:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get comprehensive memory analytics
   */
  async getMemoryAnalytics(): Promise<MemoryAnalytics> {
    try {
      const collections = await this.getCollections();
      const analytics: MemoryAnalytics = {
        collections: [],
        totalMemoryUsage: 0,
        cacheHitRate: this.getCacheHitRate(),
        queryLatency: this.getAverageLatency(),
        lastVacuum: this.lastVacuumTime
      };

      if (collections.success && collections.collections) {
        for (const collection of collections.collections) {
          try {
            // Get collection count
            const countResult = await axios.get(
              `${this.baseUrl}/api/v1/collections/${collection.name}/count`
            );
            
            const count = countResult.data?.count || 0;
            const estimatedSize = count * 1024; // Rough estimate
            const estimatedMemory = count * 4096; // HNSW memory estimate

            analytics.collections.push({
              name: collection.name,
              count,
              size: estimatedSize,
              memoryUsage: estimatedMemory
            });

            analytics.totalMemoryUsage += estimatedMemory;
          } catch (error) {
            // Skip collections that can't be analyzed
            analytics.collections.push({
              name: collection.name,
              count: 0,
              size: 0,
              memoryUsage: 0
            });
          }
        }
      }

      return analytics;
    } catch (error: any) {
      safeError('❌ Failed to get memory analytics:', error.message);
      return {
        collections: [],
        totalMemoryUsage: 0,
        cacheHitRate: 0,
        queryLatency: 0,
        lastVacuum: this.lastVacuumTime
      };
    }
  }

  /**
   * Configure HNSW parameters for existing collection
   */
  async configureHNSW(collectionName: string, config: HNSWConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // ChromaDB doesn't support direct parameter updates, so we need to recommend recreation
      safeInfo(`⚙️ HNSW configuration update requested for ${collectionName}`);
      return {
        success: true,
        error: 'HNSW parameters can only be set during collection creation. Consider recreating the collection with new parameters.'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get server pre-flight checks
   */
  async getPreFlightChecks(): Promise<PreFlightChecks | null> {
    if (this.preFlightChecks) {
      return this.preFlightChecks;
    }

    try {
      const { data } = await axios.get(`${this.baseUrl}/api/v1/pre-flight-checks`);
      this.preFlightChecks = {
        max_batch_size: data.max_batch_size || 5000,
        server_version: data.version || 'unknown',
        available_memory: data.available_memory || 0
      };
      return this.preFlightChecks;
    } catch (error) {
      // Fallback if endpoint doesn't exist
      return {
        max_batch_size: 5000,
        server_version: 'unknown',
        available_memory: 0
      };
    }
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    safeInfo('🧹 Query cache cleared');
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  /**
   * Get average query latency
   */
  getAverageLatency(): number {
    if (this.queryLatencies.length === 0) return 0;
    const sum = this.queryLatencies.reduce((a, b) => a + b, 0);
    return sum / this.queryLatencies.length;
  }

  async getCollections(): Promise<{ success: boolean; collections?: ChromaCollection[]; error?: string }> {
    try {
      const { data } = await this.retry(() => axios.get(`${this.baseUrl}/api/v1/collections`));
      return { success: true, collections: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteCollection(name: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.retry(() => axios.delete(`${this.baseUrl}/api/v1/collections/${name}`));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async startService(): Promise<{ success: boolean; message: string }> {
    if (await this.checkStatus().then(s => s.connected)) return { success: true, message: 'ChromaDB running' };
    const paths = ['/Users/jibbr/.local/bin/chroma', '/usr/local/bin/chroma', 'chroma'];
    for (const path of paths) {
      try {
        chromaProcess = spawn(path, ['run', '--port', '8000'], { stdio: 'pipe' });
        
        chromaProcess.unref();
        
        chromaProcess.on('error', (err) => safeError('Chroma error:', err));
        chromaProcess.on('exit', (code) => {
          safeLog(`Chroma exited: ${code}`);
          chromaProcess = null;
        });
        
        await new Promise(r => setTimeout(r, 4000));
        if (await this.checkStatus().then(s => s.connected)) return { success: true, message: 'Chroma started' };
      } catch {}
    }
    return { success: false, message: 'Chroma start failed' };
  }

  async stopService(): Promise<{ success: boolean; message: string }> {
    if (chromaProcess) {
      chromaProcess.kill('SIGTERM');
      chromaProcess = null;
      return { success: true, message: 'Chroma stopped' };
    }
    return { success: true, message: 'Chroma not running' };
  }
  async storeChatConversation(userMessage: string, aiResponse: string): Promise<{ success: boolean; error?: string }> {
    const collectionName = 'chat_history';
    const documents = [`User: ${userMessage}\nAI: ${aiResponse}`];
    const metadatas = [{ 
      timestamp: new Date().toISOString(), 
      type: 'conversation', 
      user_message: userMessage, 
      ai_response: aiResponse,
      session_id: Date.now().toString()
    }];
    const result = await this.addDocuments(collectionName, documents, metadatas);
    return { success: result.success, error: result.error };
  }

  async searchChatHistory(query: string, limit: number = 5): Promise<{ success: boolean; results?: string[]; error?: string }> {
    const collectionName = 'chat_history';
    const result = await this.queryCollection(collectionName, [query], limit);
    if (result.success && result.results) return { success: true, results: result.results.documents[0] || [] };
    return { success: false, error: result.error };
  }

  /**
   * Search memory with advanced semantic options
   */
  async searchMemory(
    query: string, 
    limit: number = 10,
    threshold?: number,
    collectionName: string = 'chat_history'
  ): Promise<{ success: boolean; results?: string[]; distances?: number[]; metadata?: any[]; error?: string }> {
    const result = await this.queryCollection(collectionName, [query], limit, threshold);
    if (result.success && result.results) {
      return {
        success: true,
        results: result.results.documents[0] || [],
        distances: result.results.distances[0] || [],
        metadata: result.results.metadatas[0] || []
      };
    }
    return { success: false, error: result.error };
  }

  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await Promise.all(texts.map(async (text) => {
        try {
          const { response } = await ollamaService.generateResponse({ 
            model: 'nomic-embed-text', 
            prompt: text, 
            options: { num_predict: 128 } 
          });
          return JSON.parse(response || '[]') as number[];
        } catch (error) {
          safeError('Failed to generate embedding for text:', text.substring(0, 50));
          // Return a default embedding vector (768 dimensions with zeros)
          return new Array(768).fill(0);
        }
      }));
      return embeddings;
    } catch (error: any) {
      safeError('❌ Failed to generate embeddings:', error.message);
      // Return default embeddings for all texts
      return texts.map(() => new Array(768).fill(0));
    }
  }

  private async retry<T>(fn: () => Promise<T>, attempts = 3, delay = 1000): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === attempts - 1) throw err;
        await new Promise(r => setTimeout(r, delay * 2 ** i));
      }
    }
    throw new Error('Retry exhausted');
  }
}

export const chromaService = new ChromaService();
export default chromaService;