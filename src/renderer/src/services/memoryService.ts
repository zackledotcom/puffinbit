import { ChromaVectorStore } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Document } from "@langchain/core/documents";

// Enhanced memory document interface
interface MemoryDocument {
  text: string;
  score?: number;
  metadata?: Record<string, any>;
}

// Memory configuration
interface MemoryConfig {
  ollamaBaseUrl: string;
  chromaUrl: string;
  embeddingModel: string;
  collectionName: string;
  maxResults: number;
}

const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  ollamaBaseUrl: "http://127.0.0.1:11434",
  chromaUrl: "http://127.0.0.1:8000",
  embeddingModel: "nomic-embed-text",
  collectionName: "puffin_memory",
  maxResults: 10
};

class EnhancedMemoryService {
  private vectorStore: ChromaVectorStore | null = null;
  private embeddings: OllamaEmbeddings;
  private config: MemoryConfig;
  private fallbackMemories: MemoryDocument[] = [];
  private isInitialized = false;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    
    this.embeddings = new OllamaEmbeddings({
      baseUrl: this.config.ollamaBaseUrl,
      model: this.config.embeddingModel,
    });

    this.initializeVectorStore();
  }

  private async initializeVectorStore() {
    try {
      // Try to initialize ChromaDB vector store
      this.vectorStore = new ChromaVectorStore(this.embeddings, {
        collectionName: this.config.collectionName,
        url: this.config.chromaUrl,
      });
      
      // Test the connection
      await this.vectorStore.similaritySearch("test", 1);
      console.log("[MemoryService] ChromaDB vector store initialized successfully");
      this.isInitialized = true;
      
    } catch (error) {
      console.warn("[MemoryService] ChromaDB not available, using fallback memory:", error);
      this.vectorStore = null;
      this.isInitialized = true;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeVectorStore();
    }
  }

  // Store memory with enhanced metadata
  async store(text: string, metadata: Record<string, any> = {}): Promise<void> {
    await this.ensureInitialized();

    const enhancedMetadata = {
      timestamp: new Date().toISOString(),
      type: metadata.type || 'general',
      source: metadata.source || 'user',
      ...metadata
    };

    try {
      if (this.vectorStore) {
        // Use ChromaDB vector store
        const document = new Document({
          pageContent: text,
          metadata: enhancedMetadata
        });
        
        await this.vectorStore.addDocuments([document]);
        console.log(`[MemoryService] Stored in ChromaDB: ${text.substring(0, 50)}...`);
      } else {
        // Fallback to in-memory storage
        this.fallbackMemories.push({ 
          text, 
          metadata: enhancedMetadata 
        });
        console.log(`[MemoryService] Stored in fallback: ${text.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error('[MemoryService] Failed to store memory:', error);
      // Always fallback to in-memory if vector store fails
      this.fallbackMemories.push({ 
        text, 
        metadata: enhancedMetadata 
      });
    }
  }

  // Retrieve relevant memories using semantic search
  async retrieve(query: string, k: number = 5): Promise<MemoryDocument[]> {
    await this.ensureInitialized();

    try {
      if (this.vectorStore) {
        // Use ChromaDB for semantic similarity search
        const results = await this.vectorStore.similaritySearchWithScore(query, k);
        
        return results.map(([doc, score]) => ({
          text: doc.pageContent,
          score: 1 - score, // Convert distance to similarity score
          metadata: doc.metadata
        }));
      } else {
        // Fallback to keyword-based search
        return this.keywordSearch(query, k);
      }
    } catch (error) {
      console.error('[MemoryService] Failed to retrieve from vector store, using fallback:', error);
      return this.keywordSearch(query, k);
    }
  }

  // Keyword-based search fallback
  private keywordSearch(query: string, k: number): MemoryDocument[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored = this.fallbackMemories.map(memory => {
      const memoryWords = memory.text.toLowerCase();
      const matches = queryWords.filter(word => memoryWords.includes(word)).length;
      const score = matches / queryWords.length;
      return { ...memory, score };
    });
    
    return scored
      .filter(doc => doc.score! > 0)
      .sort((a, b) => b.score! - a.score!)
      .slice(0, k);
  }

  // Store conversation turn (user + assistant)
  async storeConversation(
    userMessage: string, 
    assistantResponse: string, 
    sessionId?: string
  ): Promise<void> {
    const baseMetadata = {
      sessionId: sessionId || 'default',
      timestamp: new Date().toISOString()
    };

    // Store user message
    await this.store(userMessage, {
      ...baseMetadata,
      type: 'user_message',
      role: 'user'
    });

    // Store assistant response
    await this.store(assistantResponse, {
      ...baseMetadata,
      type: 'assistant_response',
      role: 'assistant'
    });
  }

  // Search memories by type
  async retrieveByType(
    type: string, 
    limit: number = 10
  ): Promise<MemoryDocument[]> {
    await this.ensureInitialized();

    try {
      if (this.vectorStore) {
        // For ChromaDB, we need to do a similarity search and then filter
        // This is a limitation of the current ChromaDB integration
        const allResults = await this.vectorStore.similaritySearch("", Math.min(limit * 3, 50));
        return allResults
          .filter(doc => doc.metadata.type === type)
          .slice(0, limit)
          .map(doc => ({
            text: doc.pageContent,
            metadata: doc.metadata
          }));
      } else {
        // Fallback search
        return this.fallbackMemories
          .filter(memory => memory.metadata?.type === type)
          .slice(0, limit);
      }
    } catch (error) {
      console.error('[MemoryService] Failed to retrieve by type:', error);
      return this.fallbackMemories
        .filter(memory => memory.metadata?.type === type)
        .slice(0, limit);
    }
  }

  // Search memories by session
  async retrieveBySession(
    sessionId: string, 
    limit: number = 20
  ): Promise<MemoryDocument[]> {
    await this.ensureInitialized();

    try {
      if (this.vectorStore) {
        // For ChromaDB, we need to do a similarity search and then filter
        const allResults = await this.vectorStore.similaritySearch("", Math.min(limit * 2, 100));
        return allResults
          .filter(doc => doc.metadata.sessionId === sessionId)
          .slice(0, limit)
          .map(doc => ({
            text: doc.pageContent,
            metadata: doc.metadata
          }));
      } else {
        // Fallback search
        return this.fallbackMemories
          .filter(memory => memory.metadata?.sessionId === sessionId)
          .slice(0, limit);
      }
    } catch (error) {
      console.error('[MemoryService] Failed to retrieve by session:', error);
      return this.fallbackMemories
        .filter(memory => memory.metadata?.sessionId === sessionId)
        .slice(0, limit);
    }
  }

  // Get memory statistics
  async getStats(): Promise<{
    totalMemories: number;
    usingVectorStore: boolean;
    collections: string[];
    memoryTypes: string[];
  }> {
    await this.ensureInitialized();

    const stats = {
      totalMemories: this.fallbackMemories.length,
      usingVectorStore: this.vectorStore !== null,
      collections: this.vectorStore ? [this.config.collectionName] : [],
      memoryTypes: []
    };

    try {
      if (this.vectorStore) {
        // Try to get some stats from vector store
        const sampleResults = await this.vectorStore.similaritySearch("", 50);
        stats.totalMemories = sampleResults.length;
        stats.memoryTypes = [...new Set(sampleResults.map(doc => doc.metadata?.type).filter(Boolean))];
      } else {
        stats.memoryTypes = [...new Set(this.fallbackMemories.map(m => m.metadata?.type).filter(Boolean))];
      }
    } catch (error) {
      console.warn('[MemoryService] Could not retrieve stats:', error);
    }

    return stats;
  }

  // Clear all memories (use with caution)
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.vectorStore) {
        // For ChromaDB, we'd need to recreate the collection
        // This is a more complex operation that might need to be handled differently
        console.warn('[MemoryService] ChromaDB clear not implemented - use ChromaDB admin tools');
      }
      
      // Clear fallback memories
      this.fallbackMemories = [];
      console.log('[MemoryService] Fallback memories cleared');
    } catch (error) {
      console.error('[MemoryService] Failed to clear memories:', error);
    }
  }

  // Update configuration and reinitialize
  async updateConfig(newConfig: Partial<MemoryConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.isInitialized = false;
    
    // Reinitialize embeddings if base URL changed
    if (newConfig.ollamaBaseUrl || newConfig.embeddingModel) {
      this.embeddings = new OllamaEmbeddings({
        baseUrl: this.config.ollamaBaseUrl,
        model: this.config.embeddingModel,
      });
    }

    await this.initializeVectorStore();
    console.log('[MemoryService] Configuration updated and reinitialized');
  }

  // Check service health
  async healthCheck(): Promise<{
    vectorStore: boolean;
    embeddings: boolean;
    fallbackMemoryCount: number;
  }> {
    const health = {
      vectorStore: false,
      embeddings: false,
      fallbackMemoryCount: this.fallbackMemories.length
    };

    try {
      // Test vector store
      if (this.vectorStore) {
        await this.vectorStore.similaritySearch("test", 1);
        health.vectorStore = true;
      }
    } catch (error) {
      console.warn('[MemoryService] Vector store health check failed:', error);
    }

    try {
      // Test embeddings
      await this.embeddings.embedQuery("test");
      health.embeddings = true;
    } catch (error) {
      console.warn('[MemoryService] Embeddings health check failed:', error);
    }

    return health;
  }
}

// Global service instance
let enhancedMemoryService: EnhancedMemoryService | null = null;

// Initialize the enhanced memory service
export function initializeMemoryService(config?: Partial<MemoryConfig>): EnhancedMemoryService {
  if (!enhancedMemoryService) {
    enhancedMemoryService = new EnhancedMemoryService(config);
  }
  return enhancedMemoryService;
}

// Get the current service instance
export function getMemoryService(): EnhancedMemoryService {
  if (!enhancedMemoryService) {
    enhancedMemoryService = new EnhancedMemoryService();
  }
  return enhancedMemoryService;
}

// Legacy compatibility functions
export async function storeMemory(text: string, metadata: Record<string, any> = {}): Promise<void> {
  const service = getMemoryService();
  await service.store(text, metadata);
}

export async function retrieveContext(query: string, k: number = 5): Promise<MemoryDocument[]> {
  const service = getMemoryService();
  return await service.retrieve(query, k);
}

// Enhanced memory service object for compatibility
export const memoryService = {
  store: async (text: string, metadata: Record<string, any> = {}) => {
    const service = getMemoryService();
    return await service.store(text, metadata);
  },
  retrieve: async (query: string, k: number = 5) => {
    const service = getMemoryService();
    return await service.retrieve(query, k);
  },
  storeMemory: async (text: string, metadata: Record<string, any> = {}) => {
    const service = getMemoryService();
    return await service.store(text, metadata);
  },
  retrieveContext: async (query: string, k: number = 5) => {
    const service = getMemoryService();
    return await service.retrieve(query, k);
  },
  storeConversation: async (userMessage: string, assistantResponse: string, sessionId?: string) => {
    const service = getMemoryService();
    return await service.storeConversation(userMessage, assistantResponse, sessionId);
  },
  getStats: async () => {
    const service = getMemoryService();
    return await service.getStats();
  },
  healthCheck: async () => {
    const service = getMemoryService();
    return await service.healthCheck();
  }
};

// Export types
export type { MemoryDocument, MemoryConfig };
