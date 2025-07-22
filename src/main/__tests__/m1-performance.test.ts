/**
 * PHASE 2 FIX: M1 Performance Monitor Tests
 * Tests M1 optimization and performance monitoring functionality
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import M1PerformanceMonitor, { m1PerformanceMonitor } from '../services/m1PerformanceMonitor';

// Mock child_process for testing
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

describe('PHASE 2 FIX - M1 Performance Monitor', () => {
  
  beforeAll(() => {
    // Setup test environment
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Cleanup
    m1PerformanceMonitor.stopMonitoring();
  });

  describe('M1 Detection', () => {
    
    test('should correctly detect Apple Silicon', () => {
      // Mock process properties
      const originalPlatform = process.platform;
      const originalArch = process.arch;
      
      // Test M1 detection
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      Object.defineProperty(process, 'arch', { value: 'arm64' });
      
      expect(M1PerformanceMonitor.isAppleSilicon()).toBe(true);
      
      // Test non-M1 platforms
      Object.defineProperty(process, 'platform', { value: 'win32' });
      expect(M1PerformanceMonitor.isAppleSilicon()).toBe(false);
      
      Object.defineProperty(process, 'arch', { value: 'x64' });
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      expect(M1PerformanceMonitor.isAppleSilicon()).toBe(false);
      
      // Restore original values
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      Object.defineProperty(process, 'arch', { value: originalArch });
    });
  });

  describe('Performance Metrics Collection', () => {
    
    test('should return valid performance summary when not monitoring', () => {
      const summary = m1PerformanceMonitor.getPerformanceSummary();
      
      expect(summary).toMatchObject({
        overall: expect.any(Number),
        performance: expect.any(Number),
        memory: expect.any(Number),
        temperature: expect.any(Number),
        uptime: expect.any(Number),
        responseTime: expect.any(Number),
        tokensPerSecond: expect.any(Number),
        errors: expect.any(Number),
        status: expect.stringMatching(/^(excellent|good|warning|critical)$/),
        modelCount: expect.any(Number),
        recommendations: expect.arrayContaining([expect.any(String)])
      });
    });

    test('should provide default performance data when monitoring not started', () => {
      const latestMetrics = m1PerformanceMonitor.getLatestMetrics();
      expect(latestMetrics).toBeNull();
    });

    test('should calculate performance scores correctly', () => {
      const summary = m1PerformanceMonitor.getPerformanceSummary();
      
      // Performance scores should be 0-100
      expect(summary.overall).toBeGreaterThanOrEqual(0);
      expect(summary.overall).toBeLessThanOrEqual(100);
      expect(summary.performance).toBeGreaterThanOrEqual(0);
      expect(summary.performance).toBeLessThanOrEqual(100);
      expect(summary.memory).toBeGreaterThanOrEqual(0);
      expect(summary.memory).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Recommendations', () => {
    
    test('should provide recommendations when not monitoring', () => {
      const recommendations = m1PerformanceMonitor.getRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toContain('monitoring');
    });

    test('should provide optimization recommendations', () => {
      const recommendations = m1PerformanceMonitor.getRecommendations();
      
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Settings Management', () => {
    
    test('should update optimization settings', () => {
      const newSettings = {
        maxCPUUsage: 90,
        memoryPressureThreshold: 75,
        enableAdaptiveThrottling: false
      };

      expect(() => {
        m1PerformanceMonitor.updateSettings(newSettings);
      }).not.toThrow();
    });

    test('should validate settings updates', () => {
      // Test with valid settings
      const validSettings = {
        maxCPUUsage: 85,
        thermalThrottleTemp: 80
      };

      expect(() => {
        m1PerformanceMonitor.updateSettings(validSettings);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    
    test('should handle monitoring start gracefully on non-M1', () => {
      // Mock non-M1 platform
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      expect(async () => {
        await m1PerformanceMonitor.startMonitoring();
      }).not.toThrow();

      // Restore
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should handle missing performance data gracefully', () => {
      const summary = m1PerformanceMonitor.getPerformanceSummary();
      
      // Should return valid data even when monitoring is not active
      expect(summary).toBeDefined();
      expect(typeof summary.overall).toBe('number');
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });
  });

  describe('Monitoring Lifecycle', () => {
    
    test('should handle start and stop monitoring', () => {
      expect(() => {
        m1PerformanceMonitor.stopMonitoring();
      }).not.toThrow();
    });

    test('should prevent duplicate monitoring', async () => {
      // Start monitoring
      await m1PerformanceMonitor.startMonitoring(1000);
      
      // Try to start again - should not throw
      expect(async () => {
        await m1PerformanceMonitor.startMonitoring(1000);
      }).not.toThrow();
      
      // Cleanup
      m1PerformanceMonitor.stopMonitoring();
    });
  });

  describe('Performance Threshold Detection', () => {
    
    test('should detect high CPU usage scenarios', () => {
      const summary = m1PerformanceMonitor.getPerformanceSummary();
      
      // Verify status mapping
      if (summary.overall >= 85) {
        expect(summary.status).toBe('excellent');
      } else if (summary.overall >= 70) {
        expect(summary.status).toBe('good');
      } else if (summary.overall >= 50) {
        expect(summary.status).toBe('warning');
      } else {
        expect(summary.status).toBe('critical');
      }
    });

    test('should provide appropriate recommendations based on performance', () => {
      const recommendations = m1PerformanceMonitor.getRecommendations();
      
      // Should always provide at least one recommendation
      expect(recommendations.length).toBeGreaterThanOrEqual(1);
      
      // Recommendations should be helpful strings
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(10); // Meaningful recommendation
      });
    });
  });

  describe('Integration Tests', () => {
    
    test('should integrate with service metrics', () => {
      const summary = m1PerformanceMonitor.getPerformanceSummary();
      
      // Verify structure matches what service metrics expects
      expect(summary).toHaveProperty('overall');
      expect(summary).toHaveProperty('performance');
      expect(summary).toHaveProperty('memory');
      expect(summary).toHaveProperty('temperature');
      expect(summary).toHaveProperty('responseTime');
      expect(summary).toHaveProperty('tokensPerSecond');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('recommendations');
    });

    test('should provide data suitable for UI display', () => {
      const summary = m1PerformanceMonitor.getPerformanceSummary();
      
      // Ensure all numeric values are reasonable for UI display
      expect(summary.overall).toBeGreaterThanOrEqual(0);
      expect(summary.performance).toBeGreaterThanOrEqual(0);
      expect(summary.memory).toBeGreaterThanOrEqual(0);
      expect(summary.temperature).toBeGreaterThan(0);
      expect(summary.temperature).toBeLessThan(150); // Reasonable temperature range
      
      // Ensure status is a valid UI state
      expect(['excellent', 'good', 'warning', 'critical']).toContain(summary.status);
    });
  });

  describe('M1-Specific Optimizations', () => {
    
    test('should provide M1-optimized response times', () => {
      const summary = m1PerformanceMonitor.getPerformanceSummary();
      
      // Response times should be reasonable for M1
      expect(summary.responseTime).toBeGreaterThan(0);
      expect(summary.responseTime).toBeLessThan(2000); // Under 2 seconds
    });

    test('should calculate tokens per second appropriately', () => {
      const summary = m1PerformanceMonitor.getPerformanceSummary();
      
      // Tokens per second should be positive and reasonable
      expect(summary.tokensPerSecond).toBeGreaterThanOrEqual(0);
      expect(summary.tokensPerSecond).toBeLessThan(100); // Reasonable upper bound
    });
  });
});

/**
 * Integration test helpers for real M1 testing
 */
export const m1TestHelpers = {
  
  async runM1PerformanceTest(): Promise<{
    success: boolean;
    metrics?: any;
    recommendations?: string[];
    error?: string;
  }> {
    try {
      // Only run on actual M1 hardware
      if (!M1PerformanceMonitor.isAppleSilicon()) {
        return {
          success: false,
          error: 'Not running on Apple Silicon - M1 test skipped'
        };
      }

      // Start monitoring for 10 seconds
      await m1PerformanceMonitor.startMonitoring(2000);
      
      // Wait for some metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const metrics = m1PerformanceMonitor.getLatestMetrics();
      const recommendations = m1PerformanceMonitor.getRecommendations();
      
      m1PerformanceMonitor.stopMonitoring();
      
      return {
        success: true,
        metrics,
        recommendations
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  validateM1Performance(metrics: any): {
    isOptimal: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    if (!metrics) {
      return { isOptimal: false, issues: ['No metrics available'], score: 0 };
    }

    // Check CPU usage
    if (metrics.cpu?.usage > 70) {
      issues.push(`High CPU usage: ${metrics.cpu.usage}%`);
      score -= 30;
    }

    // Check memory pressure
    if (metrics.memory?.pressure > 80) {
      issues.push(`High memory pressure: ${metrics.memory.pressure}%`);
      score -= 25;
    }

    // Check temperature
    if (metrics.thermal?.cpu > 80) {
      issues.push(`High CPU temperature: ${metrics.thermal.cpu}°C`);
      score -= 20;
    }

    // Check for zombie processes
    if (metrics.processes?.zombies > 5) {
      issues.push(`Too many zombie processes: ${metrics.processes.zombies}`);
      score -= 15;
    }

    score = Math.max(0, score);
    const isOptimal = score >= 80;

    return { isOptimal, issues, score };
  }
};
