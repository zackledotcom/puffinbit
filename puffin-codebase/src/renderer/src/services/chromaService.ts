import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { safeLog, safeError } from '../../../utils/safeLogger';

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

let chromaProcess: ChildProcess | null = null;

class ChromaService {
  private baseUrl = CHROMA_BASE_URL;
  private cache = new Map<string, QueryResult>(); // Query caching

  async checkStatus(): Promise<ServiceStatus> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/api/v1/heartbeat`, { timeout: 5000 });
      return { connected: true, message: 'ChromaDB running', version: data.version || 'unknown' };
    } catch {
      return { connected: false, message: 'ChromaDB not running' };
    }
  }

  async createCollection(name: string, metadata?: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      await this.retry(() => axios.post(`${this.baseUrl}/api/v1/collections`, { name, metadata: metadata || {} }));
      return { success: true };
    } catch (error: any) {
      if (error.response?.status === 409) return { success: true };
      return { success: false, error: error.message };
    }
  }

  async addDocuments(collectionName: string, documents: string[], metadatas?: Record<string, any>[], ids?: string[]): Promise<{ success: boolean; addedCount: number; error?: string }> {
    try {
      await this.createCollection(collectionName);
      const docIds = ids || documents.map((_, i) => `doc_${Date.now()}_${i}`);
      await this.retry(() => axios.post(`${this.baseUrl}/api/v1/collections/${collectionName}/add`, {
        documents,
        metadatas: metadatas || documents.map(() => ({})),
        ids: docIds,
      }));
      return { success: true, addedCount: documents.length };
    } catch (error: any) {
      return { success: false, addedCount: 0, error: error.message };
    }
  }

  async queryCollection(collectionName: string, queryTexts: string[], nResults: number = 5): Promise<{ success: boolean; results?: QueryResult; error?: string }> {
    const cacheKey = `${collectionName}:${queryTexts.join(',')}:${nResults}`;
    if (this.cache.has(cacheKey)) return { success: true, results: this.cache.get(cacheKey) };
    try {
      const { data } = await this.retry(() => axios.post(`${this.baseUrl}/api/v1/collections/${collectionName}/query`, {
        query_texts: queryTexts,
        n_results: nResults,
      }));
      this.cache.set(cacheKey, data);
      return { success: true, results: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
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
        chromaProcess.on('error', (err) => safeError('Chroma error:', err));
        chromaProcess.on('exit', (code) => safeLog(`Chroma exited: ${code}`));
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
    const metadatas = [{ timestamp: new Date().toISOString(), type: 'conversation', user_message: userMessage, ai_response: aiResponse }];
    const result = await this.addDocuments(collectionName, documents, metadatas);
    return { success: result.success, error: result.error };
  }

  async searchChatHistory(query: string, limit: number = 5): Promise<{ success: boolean; results?: string[]; error?: string }> {
    const collectionName = 'chat_history';
    const result = await this.queryCollection(collectionName, [query], limit);
    if (result.success && result.results) return { success: true, results: result.results.documents[0] || [] };
    return { success: false, error: result.error };
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