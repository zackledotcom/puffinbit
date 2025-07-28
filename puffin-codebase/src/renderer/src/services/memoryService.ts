import { chromaService } from './chromaService';
import { ollamaService } from './ollamaService';
import LRU from 'lru-cache'; // npm i lru-cache @types/lru-cache

const cache = new LRU<string, string>({ max: 100, ttl: 1000 * 60 * 5 }); // 100 entries, 5min TTL

class MemoryService {
  private summaryModel = 'tinydolphin:latest'; // Configurable, e.g., from modelSettings.ts

  async getContext(query: string, limit: number = 3): Promise<string> {
    const cacheKey = `${query}:${limit}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey)!;

    // Retry logic: 3 attempts with 1s delay
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { success, results } = await chromaService.searchChatHistory(query, limit);
        if (!success || !results) {
          if (attempt === 3) return ''; // Final attempt failed
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
          continue;
        }

        const context = results.join('\n\n');
        if (context.length > 2000) {
          const { response } = await ollamaService.generateResponse({
            model: this.summaryModel,
            prompt: `Summarize this context to 500 chars max, preserving key facts: ${context}`
          });
          const summary = response || context.slice(0, 500);
          cache.set(cacheKey, summary);
          return summary;
        }

        cache.set(cacheKey, context);
        return context;
      } catch (error) {
        console.warn(`Memory context attempt ${attempt}/3 failed:`, error);
        if (attempt === 3) return ''; // Final attempt failed
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      }
    }

    return ''; // Fallback
  }

  async storeMemory(userMessage: string, aiResponse: string): Promise<void> {
    try {
      await chromaService.storeChatConversation(userMessage, aiResponse);
    } catch (error) {
      console.error('Memory store failed:', error);
      // Optional: Retry or log to file
    }
  }

  setSummaryModel(model: string) {
    this.summaryModel = model;
  }
}

export const memoryService = new MemoryService();
