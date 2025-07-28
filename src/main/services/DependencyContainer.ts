/**
 * Dependency Injection Container for Puffin
 * Replaces global state pollution with proper dependency management
 */

import { SemanticMemoryEngine } from '@main/core/semanticMemory';
import { ModelManager } from '@main/core/modelManager';
import { AgentRuntime } from '@main/core/agentRuntime';
import { PluginManager } from '@main/core/pluginManager';
import { serviceManager } from './ServiceManager';
import { ollamaServiceWrapper } from './OllamaServiceWrapper';
import { chromaServiceWrapper } from './ChromaServiceWrapper';
import { chromaService } from './chromaService';
import { safeLog, safeError, safeInfo } from '../utils/safeLogger';

// Service registry for type-safe dependency injection
interface ServiceRegistry {
  semanticMemory: SemanticMemoryEngine;
  modelManager: ModelManager;
  agentRuntime: AgentRuntime;
  pluginManager: PluginManager;
  ollamaService: typeof ollamaServiceWrapper;
  chromaService: typeof chromaServiceWrapper;
}

export class DependencyContainer {
  private static instance: DependencyContainer;
  private services = new Map<keyof ServiceRegistry, any>();
  private initialized = false;

  private constructor() {}

  static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  /**
   * Initialize all services in proper dependency order
   */
  async initialize(isAppleSilicon: boolean = false): Promise<void> {
    if (this.initialized) {
      safeLog('⚠️ DependencyContainer already initialized');
      return;
    }

    try {
      safeInfo('🏗️ Initializing dependency container...');

      // Register service wrappers with ServiceManager
      serviceManager.register('ollama', () => ollamaServiceWrapper);
      serviceManager.register('chroma', () => chromaServiceWrapper);

      // Store service wrappers
      this.services.set('ollamaService', ollamaServiceWrapper);
      this.services.set('chromaService', chromaServiceWrapper);

      // Initialize core services in dependency order
      safeInfo('🧠 Initializing Unified Memory & Storage Layer (UMSL)...');
      const semanticMemory = new SemanticMemoryEngine(chromaService);
      await semanticMemory.initialize();
      this.services.set('semanticMemory', semanticMemory);
      safeInfo('✅ Semantic Memory Engine initialized');

      safeInfo('⚡ Initializing Model Manager...');
      const modelManager = new ModelManager({
        maxMemory: isAppleSilicon ? 16384 : 8192,
        maxModels: 6,
        maxConcurrentRequests: isAppleSilicon ? 4 : 2,
        memoryThreshold: 0.75,
        unloadTimeout: 10,
        priorityPreemption: true
      });
      await modelManager.initialize();
      this.services.set('modelManager', modelManager);
      safeInfo('✅ Model Manager initialized with platform-optimized settings');

      safeInfo('🤖 Initializing Agent Runtime Environment...');
      const agentRuntime = new AgentRuntime(semanticMemory, modelManager);
      this.services.set('agentRuntime', agentRuntime);
      safeInfo('✅ Agent Runtime Environment initialized');

      safeInfo('🧩 Initializing Plugin Manager...');
      const pluginManager = new PluginManager(agentRuntime);
      await pluginManager.initialize();
      this.services.set('pluginManager', pluginManager);
      safeInfo('✅ Plugin Manager initialized - Plugin system ready');

      // Start critical services
      safeInfo('🚀 Starting critical services...');
      await serviceManager.start('ollama');
      await serviceManager.start('chroma');

      this.initialized = true;
      safeInfo('✅ Dependency container initialized successfully');

    } catch (error) {
      safeError('❌ Failed to initialize dependency container:', error);
      throw error;
    }
  }

  /**
   * Get a service by name with type safety
   */
  get<T extends keyof ServiceRegistry>(serviceName: T): ServiceRegistry[T] {
    if (!this.initialized) {
      throw new Error(`DependencyContainer not initialized. Call initialize() first.`);
    }

    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
    }

    return service;
  }

  /**
   * Check if a service is available
   */
  has<T extends keyof ServiceRegistry>(serviceName: T): boolean {
    return this.services.has(serviceName);
  }

  /**
   * Get all service health statuses
   */
  getHealthStatus() {
    return serviceManager.getAllHealth();
  }

  /**
   * Get system health summary
   */
  getSystemHealth() {
    return serviceManager.getSystemHealth();
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown(): Promise<void> {
    safeInfo('🛑 Shutting down dependency container...');
    
    try {
      // Shutdown ServiceManager (handles service shutdown)
      await serviceManager.shutdown();
      
      // Clear service registry
      this.services.clear();
      this.initialized = false;
      
      safeInfo('✅ Dependency container shutdown complete');
    } catch (error) {
      safeError('❌ Error during dependency container shutdown:', error);
      throw error;
    }
  }

  /**
   * Get list of all registered services
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Check if container is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const dependencyContainer = DependencyContainer.getInstance();

// Type-safe service getters for common services
export const getSemanticMemory = () => dependencyContainer.get('semanticMemory');
export const getModelManager = () => dependencyContainer.get('modelManager');
export const getAgentRuntime = () => dependencyContainer.get('agentRuntime');
export const getPluginManager = () => dependencyContainer.get('pluginManager');
export const getOllamaService = () => dependencyContainer.get('ollamaService');
export const getChromaService = () => dependencyContainer.get('chromaService');
