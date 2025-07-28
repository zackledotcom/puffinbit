/**
 * Chroma Service Wrapper - Implements Service interface for ServiceManager integration
 */

import { chromaService } from './chromaService';
import { Service, ServiceConfig, HealthStatus, ServiceMetrics } from './ServiceManager';
import { safeLog, safeError, safeInfo } from '../utils/safeLogger';

export class ChromaServiceWrapper implements Service {
  public readonly name = 'chroma';
  
  public readonly config: ServiceConfig = {
    name: 'chroma',
    displayName: 'ChromaDB Vector Database',
    description: 'Vector database for semantic memory',
    dependencies: [],
    healthCheckInterval: 15000, // 15 seconds
    timeout: 20000, // 20 seconds
    maxRetries: 3,
    circuitBreakerThreshold: 5,
    autoRestart: true,
    critical: false // Non-critical - app can function without it
  };

  private metrics: ServiceMetrics = {
    uptime: 0,
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };

  private startTime: Date | null = null;

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const status = await chromaService.checkStatus();
      const responseTime = Date.now() - startTime;
      
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + responseTime) / 2;

      if (status.connected) {
        return {
          status: 'healthy',
          message: status.message,
          timestamp: new Date(),
          responseTime,
          details: {
            version: status.version,
            connected: status.connected
          },
          metrics: this.metrics
        };
      } else {
        this.metrics.errorCount++;
        return {
          status: 'warning', // Warning since it's non-critical
          message: status.message,
          timestamp: new Date(),
          responseTime,
          metrics: this.metrics
        };
      }
    } catch (error: any) {
      this.metrics.errorCount++;
      return {
        status: 'warning', // Warning since it's non-critical
        message: `Health check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        metrics: this.metrics
      };
    }
  }

  async start(): Promise<{ success: boolean; message: string }> {
    try {
      safeInfo('Starting ChromaDB service...');
      this.startTime = new Date();
      
      // ChromaDB service doesn't have a start method yet, so we'll simulate it
      // In a real implementation, you would start the ChromaDB process here
      
      safeInfo('✅ ChromaDB service started successfully');
      return { success: true, message: 'ChromaDB service started (placeholder)' };
    } catch (error: any) {
      safeError('❌ ChromaDB service start error:', error);
      return { success: false, message: error.message };
    }
  }

  async stop(): Promise<{ success: boolean; message: string }> {
    try {
      safeInfo('Stopping ChromaDB service...');
      
      this.startTime = null;
      safeInfo('✅ ChromaDB service stopped');
      return { success: true, message: 'ChromaDB service stopped' };
    } catch (error: any) {
      safeError('❌ ChromaDB service stop error:', error);
      return { success: false, message: error.message };
    }
  }

  async restart(): Promise<{ success: boolean; message: string }> {
    safeInfo('Restarting ChromaDB service...');
    
    const stopResult = await this.stop();
    if (!stopResult.success) {
      return stopResult;
    }
    
    // Wait a moment before restart
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return this.start();
  }

  getMetrics(): ServiceMetrics {
    if (this.startTime) {
      this.metrics.uptime = Date.now() - this.startTime.getTime();
    }
    
    return { ...this.metrics };
  }

  // Delegate methods to the original service
  async createCollection(name: string, metadata?: Record<string, any>) {
    this.metrics.requestCount++;
    try {
      const result = await chromaService.createCollection(name, metadata);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async addDocuments(collectionName: string, documents: string[], metadatas?: Record<string, any>[], ids?: string[]) {
    this.metrics.requestCount++;
    try {
      const result = await chromaService.addDocuments(collectionName, documents, metadatas, ids);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async queryCollection(collectionName: string, queryTexts: string[], nResults?: number) {
    this.metrics.requestCount++;
    try {
      const result = await chromaService.queryCollection(collectionName, queryTexts, nResults);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async getCollections() {
    this.metrics.requestCount++;
    try {
      const result = await chromaService.getCollections();
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async deleteCollection(name: string) {
    this.metrics.requestCount++;
    try {
      const result = await chromaService.deleteCollection(name);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }
}

// Export singleton instance
export const chromaServiceWrapper = new ChromaServiceWrapper();
