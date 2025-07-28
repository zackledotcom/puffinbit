/**
 * Memory IPC Handlers - Semantic memory and search functionality
 * Uses dependency injection for SemanticMemoryEngine
 */

import { ipcMain } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeError } from '../utils/safeLogger';

export function registerMemoryHandlers(
  container: DependencyContainer,
  Security: any
): void {

  /**
   * Search semantic memory
   */
  ipcMain.handle('search-memory', async (_, query: string, limit: number = 5) => {
    try {
      // Input validation
      if (typeof query !== 'string' || !query.trim()) {
        return { success: false, error: 'Query must be a non-empty string' };
      }
      
      if (typeof limit !== 'number' || limit < 1 || limit > 100) {
        return { success: false, error: 'Limit must be a number between 1 and 100' };
      }

      const sanitizedQuery = Security.sanitizeInput(query.trim());
      const semanticMemory = container.get('semanticMemory');
      
      const results = await semanticMemory.advancedSearch(sanitizedQuery, { limit });
      
      return {
        success: true,
        results,
        query: sanitizedQuery,
        limit
      };
    } catch (error: any) {
      safeError('❌ search-memory error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Store memory in semantic memory engine
   */
  ipcMain.handle('umsl-store-memory', async (_, content: string, type: string, metadata: any = {}) => {
    try {
      // Input validation
      if (typeof content !== 'string' || !content.trim()) {
        return { success: false, error: 'Content must be a non-empty string' };
      }

      const validTypes = ['conversation', 'document', 'code', 'task', 'agent_state'];
      if (!validTypes.includes(type)) {
        return { success: false, error: `Type must be one of: ${validTypes.join(', ')}` };
      }

      const sanitizedContent = Security.sanitizeInput(content);
      const validType = type as 'conversation' | 'document' | 'code' | 'task' | 'agent_state';
      
      const semanticMemory = container.get('semanticMemory');
      const memoryId = await semanticMemory.storeMemory(sanitizedContent, validType, metadata);
      
      return { success: true, memoryId };
    } catch (error: any) {
      safeError('❌ umsl-store-memory error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Retrieve context from semantic memory
   */
  ipcMain.handle('umsl-retrieve-context', async (_, query: string, options: any = {}) => {
    try {
      if (typeof query !== 'string' || !query.trim()) {
        return { success: false, error: 'Query must be a non-empty string' };
      }

      const sanitizedQuery = Security.sanitizeInput(query.trim());
      const semanticMemory = container.get('semanticMemory');
      
      const context = await semanticMemory.retrieveContext(sanitizedQuery, options);
      
      return { success: true, context };
    } catch (error: any) {
      safeError('❌ umsl-retrieve-context error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Advanced search with filters
   */
  ipcMain.handle('umsl-advanced-search', async (_, query: string, filters: any = {}) => {
    try {
      if (typeof query !== 'string' || !query.trim()) {
        return { success: false, error: 'Query must be a non-empty string' };
      }

      const sanitizedQuery = Security.sanitizeInput(query.trim());
      const semanticMemory = container.get('semanticMemory');
      
      const results = await semanticMemory.advancedSearch(sanitizedQuery, filters);
      
      return { success: true, results };
    } catch (error: any) {
      safeError('❌ umsl-advanced-search error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Create conversation thread
   */
  ipcMain.handle('umsl-create-thread', async (_, message: string, metadata: any = {}) => {
    try {
      if (typeof message !== 'string' || !message.trim()) {
        return { success: false, error: 'Message must be a non-empty string' };
      }

      const sanitizedMessage = Security.sanitizeInput(message.trim());
      const semanticMemory = container.get('semanticMemory');
      
      const threadId = await semanticMemory.createConversationThread(sanitizedMessage, metadata);
      
      return { success: true, threadId };
    } catch (error: any) {
      safeError('❌ umsl-create-thread error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Add message to conversation thread
   */
  ipcMain.handle('umsl-add-to-thread', async (_, threadId: string, role: string, content: string, metadata: any = {}) => {
    try {
      if (typeof threadId !== 'string' || !threadId.trim()) {
        return { success: false, error: 'Thread ID must be a non-empty string' };
      }

      const validRoles = ['user', 'assistant', 'system'];
      if (!validRoles.includes(role)) {
        return { success: false, error: `Role must be one of: ${validRoles.join(', ')}` };
      }

      if (typeof content !== 'string' || !content.trim()) {
        return { success: false, error: 'Content must be a non-empty string' };
      }

      const sanitizedContent = Security.sanitizeInput(content.trim());
      const validRole = role as 'user' | 'assistant' | 'system';
      
      const semanticMemory = container.get('semanticMemory');
      await semanticMemory.addToConversation(threadId.trim(), validRole, sanitizedContent, metadata);
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ umsl-add-to-thread error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get conversation thread
   */
  ipcMain.handle('umsl-get-thread', async (_, threadId: string) => {
    try {
      if (typeof threadId !== 'string' || !threadId.trim()) {
        return { success: false, error: 'Thread ID must be a non-empty string' };
      }

      const semanticMemory = container.get('semanticMemory');
      const thread = await semanticMemory.getConversationThread(threadId.trim());
      
      return { success: true, thread };
    } catch (error: any) {
      safeError('❌ umsl-get-thread error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get memory statistics
   */
  ipcMain.handle('umsl-get-memory-stats', async () => {
    try {
      const semanticMemory = container.get('semanticMemory');
      const stats = await semanticMemory.getMemoryStats();
      
      return { success: true, stats };
    } catch (error: any) {
      safeError('❌ umsl-get-memory-stats error:', error);
      return { success: false, error: error.message };
    }
  });

  safeLog('✅ Memory handlers registered');
}
