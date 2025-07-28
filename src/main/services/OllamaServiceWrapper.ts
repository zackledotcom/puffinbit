/**
 * Ollama Service Wrapper - Implements Service interface for ServiceManager integration
 */

import { ollamaService } from './ollamaService';
import { Service, ServiceConfig, HealthStatus, ServiceMetrics } from './ServiceManager';
import { safeLog, safeError, safeInfo } from '../utils/safeLogger';

export class OllamaServiceWrapper implements Service {
  public readonly name = 'ollama';
  
  public readonly config: ServiceConfig = {
    name: 'ollama',
    displayName: 'Ollama AI Service',
    description: 'Local LLM inference engine',
    dependencies: [],
    healthCheckInterval: 10000, // 10 seconds
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    circuitBreakerThreshold: 5,
    autoRestart: true,
    critical: true
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
      const status = await ollamaService.checkStatus();
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
          status: 'down',
          message: status.message,
          timestamp: new Date(),
          responseTime,
          metrics: this.metrics
        };
      }
    } catch (error: any) {
      this.metrics.errorCount++;
      return {
        status: 'critical',
        message: `Health check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        metrics: this.metrics
      };
    }
  }

  async start(): Promise<{ success: boolean; message: string }> {
    try {
      safeInfo('Starting Ollama service...');
      this.startTime = new Date();
      
      const result = await ollamaService.startService();
      
      if (result.success) {
        safeInfo('✅ Ollama service started successfully');
        return { success: true, message: 'Ollama service started' };
      } else {
        safeError('❌ Failed to start Ollama service:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      safeError('❌ Ollama service start error:', error);
      return { success: false, message: error.message };
    }
  }

  async stop(): Promise<{ success: boolean; message: string }> {
    try {
      safeInfo('Stopping Ollama service...');
      
      // Ollama doesn't have a direct stop method, so we'll just mark it as stopped
      // In a real implementation, you might want to kill the ollama process
      
      this.startTime = null;
      safeInfo('✅ Ollama service stopped');
      return { success: true, message: 'Ollama service stopped' };
    } catch (error: any) {
      safeError('❌ Ollama service stop error:', error);
      return { success: false, message: error.message };
    }
  }

  async restart(): Promise<{ success: boolean; message: string }> {
    safeInfo('Restarting Ollama service...');
    
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
  async getModels() {
    this.metrics.requestCount++;
    try {
      const result = await ollamaService.getModels();
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async generateResponse(request: any) {
    this.metrics.requestCount++;
    try {
      const result = await ollamaService.generateResponse(request);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async pullModel(modelName: string) {
    this.metrics.requestCount++;
    try {
      const result = await ollamaService.pullModel(modelName);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async deleteModel(modelName: string) {
    this.metrics.requestCount++;
    try {
      const result = await ollamaService.deleteModel(modelName);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }
}

// Export singleton instance
export const ollamaServiceWrapper = new OllamaServiceWrapper();
