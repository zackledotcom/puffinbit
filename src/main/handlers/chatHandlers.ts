/**
 * Updated Chat Handlers - Integrated with Dependency Injection
 * 
 * Preserves existing chat functionality while using the new dependency container
 * and service management architecture for better stability and testing.
 */

import { ipcMain } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeError, safeInfo } from '../utils/safeLogger';

// Enhanced interfaces for better type safety
export interface ChatRequest {
  message: string;
  model: string;
  history?: Array<{ role: string; content: string }>;
  memoryOptions?: {
    enabled?: boolean;
    searchLimit?: number;
    threshold?: number;
  };
  streaming?: boolean;
  options?: {
    temperature?: number;
    max_tokens?: number;
  };
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  modelUsed: string;
  responseTime?: number;
  tokenCount?: number;
  memoryUsed?: boolean;
  memoryContext?: string[]; // Add memory context to response
  error?: string;
}

// Security interface for validation
interface SecurityService {
  validatePermission(operation: string, context: any): boolean;
  sanitizeInput(input: string): string;
  logSecurityEvent(event: string, details: any): void;
}

/**
 * Chat Processing with Enhanced Security and Dependency Injection
 */
class ChatProcessor {
  private static instance: ChatProcessor;
  private metrics = {
    totalRequests: 0,
    totalResponseTime: 0,
    errors: 0,
  };

  private container: DependencyContainer;
  private security: SecurityService;

  constructor(container: DependencyContainer, security: SecurityService) {
    this.container = container;
    this.security = security;
  }

  static getInstance(container: DependencyContainer, security: SecurityService): ChatProcessor {
    if (!ChatProcessor.instance) {
      ChatProcessor.instance = new ChatProcessor(container, security);
    }
    return ChatProcessor.instance;
  }

  /**
   * Process chat request with enhanced security and validation
   */
  async processChat(request: ChatRequest): Promise<ChatResponse> {
    this.metrics.totalRequests++;
    const startTime = Date.now();

    try {
      // Enhanced input validation and security checks
      if (!this.validateChatRequest(request)) {
        throw new Error('Invalid chat request');
      }

      // Security permission check
      if (!this.security.validatePermission('chat:process', { 
        model: request.model, 
        messageLength: request.message.length 
      })) {
        this.security.logSecurityEvent('unauthorized_chat_request', { 
          model: request.model, 
          messageLength: request.message.length 
        });
        throw new Error('Permission denied');
      }

      // Sanitize input message
      const sanitizedMessage = this.security.sanitizeInput(request.message);
      
      safeInfo('Processing chat request', {
        model: request.model,
        messageLength: sanitizedMessage.length,
        historyLength: request.history?.length || 0,
        memoryEnabled: request.memoryOptions?.enabled || false,
      });

      // Build context from history with validation
      let context = '';
      if (request.history && Array.isArray(request.history) && request.history.length > 0) {
        context = request.history
          .slice(-10) // Keep last 10 messages for context
          .filter(msg => msg && typeof msg.role === 'string' && typeof msg.content === 'string')
          .map((msg) => `${this.security.sanitizeInput(msg.role)}: ${this.security.sanitizeInput(msg.content)}`)
          .join('\n');
        if (context.length > 4000) context = context.slice(-4000); // Token limit
      }

      // Enhanced memory retrieval with proper error handling
      let enhancedPrompt = sanitizedMessage;
      let memoryUsed = false;
      let memoryContext: string[] = [];

      if (request.memoryOptions?.enabled) {
        try {
          const semanticMemory = this.container.get('semanticMemory');
          if (!semanticMemory) {
            safeError('Semantic memory service not available');
          } else {
            const contextResults = await semanticMemory.retrieveContext(
              sanitizedMessage, 
              { maxHistoryItems: Math.min(request.memoryOptions.searchLimit || 3, 10) }
            );

            if (contextResults?.primary?.length > 0) {
              // Store the raw memory context for the response
              memoryContext = contextResults.primary
                .slice(0, 5) // Limit memory results
                .map(result => this.security.sanitizeInput(result.content));
                
              const memoryContextString = memoryContext.join('\n');
              enhancedPrompt = `Context: ${memoryContextString}\n\nUser: ${sanitizedMessage}`;
              memoryUsed = true;
              safeInfo(`Enhanced prompt with ${contextResults.primary.length} memory chunks`);
            }
          }
        } catch (memoryError: any) {
          safeError('Memory enhancement failed:', memoryError);
          this.security.logSecurityEvent('memory_enhancement_error', { error: memoryError.message });
          // Continue without memory enhancement - non-critical
        }
      }

      // Build full prompt with security
      const fullPrompt = context ? `${context}\nuser: ${enhancedPrompt}` : enhancedPrompt;
      if (fullPrompt.length > 32000) { // Reasonable prompt limit
        throw new Error('Prompt too long');
      }

      // Generate response using Ollama service with enhanced error handling
      const ollamaService = this.container.get('ollamaService');
      if (!ollamaService) {
        throw new Error('Ollama service not available');
      }

      const generateRequest = {
        model: request.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: Math.max(0, Math.min(2, request.options?.temperature || 0.7)), // Clamp temperature
          num_predict: Math.max(1, Math.min(4096, request.options?.max_tokens || 2048)), // Clamp tokens
        }
      };

      const result = await ollamaService.generateResponse(generateRequest);

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to generate response');
      }

      const responseTime = Date.now() - startTime;
      this.metrics.totalResponseTime += responseTime;

      // Store conversation in memory if enabled and successful
      if (request.memoryOptions?.enabled && result.response) {
        try {
          const semanticMemory = this.container.get('semanticMemory');
          if (semanticMemory) {
            await semanticMemory.storeMemory(
              `User: ${sanitizedMessage}\nAssistant: ${this.security.sanitizeInput(result.response)}`,
              'conversation',
              {
                model: request.model,
                timestamp: new Date().toISOString(),
                responseTime
              }
            );
          }
        } catch (storageError: any) {
          safeError('Failed to store conversation in memory:', storageError);
          this.security.logSecurityEvent('memory_storage_error', { error: storageError.message });
          // Don't fail the request - storage is non-critical
        }
      }

      safeInfo(`Chat request completed in ${responseTime}ms`);

      return {
        success: true,
        message: result.response,
        modelUsed: request.model,
        responseTime,
        tokenCount: result.tokenCount || 0,
        memoryUsed,
        memoryContext: memoryContext.length > 0 ? memoryContext : undefined
      };

    } catch (error: any) {
      this.metrics.errors++;
      const responseTime = Date.now() - startTime;
      this.metrics.totalResponseTime += responseTime;

      safeError('Chat processing failed:', error);
      this.security.logSecurityEvent('chat_processing_error', { 
        error: error.message,
        model: request.model 
      });

      return {
        success: false,
        modelUsed: request.model,
        responseTime,
        memoryUsed: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Enhanced request validation
   */
  private validateChatRequest(request: ChatRequest): boolean {
    if (!request || typeof request !== 'object') return false;
    if (!request.message || typeof request.message !== 'string') return false;
    if (!request.model || typeof request.model !== 'string') return false;
    if (request.message.length > 32000) return false; // Message too long
    if (request.model.length > 100) return false; // Model name too long
    
    // Validate history if provided
    if (request.history && !Array.isArray(request.history)) return false;
    if (request.history) {
      for (const msg of request.history) {
        if (!msg || typeof msg !== 'object') return false;
        if (!msg.role || typeof msg.role !== 'string') return false;
        if (!msg.content || typeof msg.content !== 'string') return false;
      }
    }
    
    return true;
  }

  /**
   * Get processing metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.metrics.totalRequests > 0 
        ? this.metrics.totalResponseTime / this.metrics.totalRequests 
        : 0,
      errorRate: this.metrics.totalRequests > 0 
        ? this.metrics.errors / this.metrics.totalRequests 
        : 0
    };
  }
}

// Store processor instance for reuse
let chatProcessor: ChatProcessor | null = null;

/**
 * Register chat handlers with enhanced dependency injection and security
 */
export function registerChatHandlers(
  container: DependencyContainer,
  security: SecurityService
): void {
  // Validate container is initialized
  if (!container || !container.isInitialized()) {
    throw new Error('Dependency container must be initialized before registering chat handlers');
  }

  ipcMain.handle('chat-with-ai', async (_, request: ChatRequest) => {
    try {
      // Initialize chat processor if needed
      if (!chatProcessor) {
        chatProcessor = ChatProcessor.getInstance(container, security);
      }

      return await chatProcessor.processChat(request);

    } catch (error: any) {
      safeError('❌ chat-with-ai error:', error);
      security.logSecurityEvent('chat_handler_error', { error: error.message });
      return {
        success: false,
        modelUsed: request?.model || 'unknown',
        memoryUsed: false,
        error: error.message || 'Chat handler failed'
      };
    }
  });

  // Get chat metrics
  ipcMain.handle('get-chat-metrics', async () => {
    try {
      if (!chatProcessor) {
        return { success: true, metrics: { totalRequests: 0, errors: 0, averageResponseTime: 0, errorRate: 0 } };
      }
      
      return { success: true, metrics: chatProcessor.getMetrics() };
    } catch (error: any) {
      safeError('❌ get-chat-metrics error:', error);
      return { success: false, error: error.message };
    }
  });

  safeLog('✅ Chat handlers registered with enhanced dependency injection and security');
}
