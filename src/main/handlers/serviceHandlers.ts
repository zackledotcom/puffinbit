/**
 * Service IPC Handlers - Service management and health monitoring
 * Integrates with ServiceManager for proper health monitoring
 */

import { ipcMain } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { serviceManager } from '../services/ServiceManager';
import { m1PerformanceMonitor } from '../services/m1PerformanceMonitor';
import { safeLog, safeError } from '../utils/safeLogger';

export function registerServiceHandlers(
  container: DependencyContainer, 
  Security: any
): void {

  /**
   * Check Ollama service status
   */
  ipcMain.handle('check-ollama-status', async () => {
    try {
      const ollamaService = container.get('ollamaService');
      const health = await ollamaService.healthCheck();
      
      return {
        success: true,
        connected: health.status === 'healthy',
        message: health.message,
        version: health.details?.version || 'unknown',
        responseTime: health.responseTime
      };
    } catch (error: any) {
      safeError('❌ check-ollama-status error:', error);
      return {
        success: false,
        connected: false,
        message: `Status check failed: ${error.message}`
      };
    }
  });

  /**
   * Start Ollama service
   */
  ipcMain.handle('start-ollama', async () => {
    try {
      const result = await serviceManager.start('ollama');
      return { success: result.success, message: result.message };
    } catch (error: any) {
      safeError('❌ start-ollama error:', error);
      return { success: false, message: `Failed to start Ollama: ${error.message}` };
    }
  });

  /**
   * Check ChromaDB service status
   */
  ipcMain.handle('check-chroma-status', async () => {
    try {
      const chromaService = container.get('chromaService');
      const health = await chromaService.healthCheck();
      
      return {
        success: true,
        connected: health.status === 'healthy',
        message: health.message,
        version: health.details?.version || 'unknown',
        responseTime: health.responseTime
      };
    } catch (error: any) {
      safeError('❌ check-chroma-status error:', error);
      return {
        success: false,
        connected: false,
        message: `ChromaDB status check failed: ${error.message}`
      };
    }
  });

  /**
   * Start ChromaDB service
   */
  ipcMain.handle('start-chroma', async () => {
    try {
      const result = await serviceManager.start('chroma');
      return { success: result.success, message: result.message };
    } catch (error: any) {
      safeError('❌ start-chroma error:', error);
      return { success: false, message: `Failed to start ChromaDB: ${error.message}` };
    }
  });

  /**
   * Get comprehensive service metrics
   */
  ipcMain.handle('get-service-metrics', async () => {
    try {
      const systemHealth = container.getSystemHealth();
      const performanceData = m1PerformanceMonitor.getPerformanceSummary();
      
      // Get service-specific metrics
      const ollamaService = container.get('ollamaService');
      const ollamaMetrics = ollamaService.getMetrics();
      
      // Calculate overall health score
      let overallScore = 50; // Base score
      
      if (systemHealth.status === 'healthy') {
        overallScore = Math.max(overallScore, 80);
      } else if (systemHealth.status === 'warning') {
        overallScore = Math.max(overallScore, 60);
      } else if (systemHealth.status === 'critical') {
        overallScore = Math.min(overallScore, 40);
      }
      
      // Adjust based on performance
      if (performanceData.overall) {
        overallScore = (overallScore + performanceData.overall) / 2;
      }
      
      return {
        ...performanceData,
        overall: Math.round(overallScore),
        systemHealth,
        serviceMetrics: {
          ollama: ollamaMetrics
        },
        serviceStatus: {
          ollama: systemHealth.status !== 'down',
          chroma: systemHealth.servicesUp > 1
        },
        servicesUp: systemHealth.servicesUp,
        servicesDown: systemHealth.servicesDown,
        criticalServicesDown: systemHealth.criticalServicesDown,
        isM1Optimized: process.platform === 'darwin' && process.arch === 'arm64',
        platform: process.platform === 'darwin' && process.arch === 'arm64' ? 'Apple Silicon' : process.platform
      };
    } catch (error: any) {
      safeError('❌ get-service-metrics error:', error);
      return {
        overall: 20,
        performance: 15,
        memory: 95,
        temperature: 80,
        uptime: 0,
        responseTime: 0,
        tokensPerSecond: 0,
        errors: 10,
        status: 'critical',
        modelCount: 0,
        recommendations: ['Service monitoring failed'],
        isM1Optimized: false,
        platform: process.platform,
        serviceStatus: { ollama: false, chroma: false }
      };
    }
  });

  /**
   * Get detailed performance metrics
   */
  ipcMain.handle('get-performance-metrics', async () => {
    try {
      const latestMetrics = m1PerformanceMonitor.getLatestMetrics();
      
      if (!latestMetrics) {
        return {
          success: false,
          error: 'Performance monitoring not started',
          message: 'Start performance monitoring to get real-time metrics'
        };
      }
      
      return {
        success: true,
        metrics: latestMetrics,
        recommendations: m1PerformanceMonitor.getRecommendations(),
        isM1: process.platform === 'darwin' && process.arch === 'arm64',
        monitoring: true
      };
    } catch (error: any) {
      safeError('❌ get-performance-metrics error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get performance metrics'
      };
    }
  });

  /**
   * Get service health status
   */
  ipcMain.handle('get-service-health', async () => {
    try {
      const healthStatuses = container.getHealthStatus();
      const systemHealth = container.getSystemHealth();
      
      return {
        success: true,
        services: Object.fromEntries(healthStatuses),
        system: systemHealth
      };
    } catch (error: any) {
      safeError('❌ get-service-health error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Get system health summary
   */
  ipcMain.handle('get-system-health', async () => {
    try {
      const systemHealth = container.getSystemHealth();
      return {
        success: true,
        health: systemHealth
      };
    } catch (error: any) {
      safeError('❌ get-system-health error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  safeLog('✅ Service handlers registered');
}
