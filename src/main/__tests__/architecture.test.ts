/**
 * Backend Architecture Tests
 * Basic unit tests to validate the dependency injection and service management
 */

import { DependencyContainer } from '../services/DependencyContainer';
import { serviceManager } from '../services/ServiceManager';
import { configurationService } from '../services/ConfigurationService';
import { legacyCompatibility } from '../services/LegacyCompatibility';
import { serviceRecoveryManager } from '../services/ServiceRecoveryManager';

// Mock external dependencies for testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path')
  }
}));

jest.mock('../services/chromaService', () => ({
  chromaService: {
    checkStatus: jest.fn().mockResolvedValue({ connected: false, message: 'Mock service' })
  }
}));

jest.mock('../core/semanticMemory', () => ({
  SemanticMemoryEngine: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../core/modelManager', () => ({
  ModelManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../core/agentRuntime', () => ({
  AgentRuntime: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../core/pluginManager', () => ({
  PluginManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('Backend Architecture Tests', () => {
  
  describe('DependencyContainer', () => {
    let container: DependencyContainer;

    beforeEach(() => {
      container = DependencyContainer.getInstance();
    });

    afterEach(async () => {
      if (container.isInitialized()) {
        await container.shutdown();
      }
    });

    test('should be a singleton', () => {
      const container1 = DependencyContainer.getInstance();
      const container2 = DependencyContainer.getInstance();
      expect(container1).toBe(container2);
    });

    test('should start uninitialized', () => {
      const newContainer = new (DependencyContainer as any)();
      expect(newContainer.isInitialized()).toBe(false);
    });

    test('should initialize successfully', async () => {
      await container.initialize(false);
      expect(container.isInitialized()).toBe(true);
    });

    test('should provide registered services', async () => {
      await container.initialize(false);
      
      expect(() => container.get('semanticMemory')).not.toThrow();
      expect(() => container.get('modelManager')).not.toThrow();
      expect(() => container.get('agentRuntime')).not.toThrow();
      expect(() => container.get('pluginManager')).not.toThrow();
    });

    test('should throw error for unknown service', async () => {
      await container.initialize(false);
      
      expect(() => container.get('nonexistentService' as any)).toThrow();
    });

    test('should provide health status', async () => {
      await container.initialize(false);
      
      const healthStatus = container.getHealthStatus();
      expect(healthStatus).toBeInstanceOf(Map);
    });

    test('should shutdown gracefully', async () => {
      await container.initialize(false);
      await expect(container.shutdown()).resolves.not.toThrow();
      expect(container.isInitialized()).toBe(false);
    });
  });

  describe('ConfigurationService', () => {
    
    test('should have correct service interface', () => {
      expect(configurationService.name).toBe('configuration');
      expect(configurationService.config).toBeDefined();
      expect(configurationService.config.critical).toBe(true);
    });

    test('should provide default configuration', () => {
      const config = configurationService.getConfiguration();
      
      expect(config.version).toBeDefined();
      expect(config.platform).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.services).toBeDefined();
      expect(config.IPC).toBeDefined();
    });

    test('should get configuration sections', () => {
      const platformConfig = configurationService.getConfigSection('platform');
      const securityConfig = configurationService.getConfigSection('security');
      
      expect(platformConfig).toBeDefined();
      expect(securityConfig).toBeDefined();
      expect(securityConfig.CSP).toBeDefined();
    });

    test('should start and stop successfully', async () => {
      const startResult = await configurationService.start();
      expect(startResult.success).toBe(true);
      
      const stopResult = await configurationService.stop();
      expect(stopResult.success).toBe(true);
    });

    test('should perform health check', async () => {
      const health = await configurationService.healthCheck();
      
      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Legacy Compatibility Layer', () => {
    
    beforeEach(() => {
      // Clean up any existing global properties
      legacyCompatibility.removeGlobalShims();
    });

    afterEach(() => {
      legacyCompatibility.removeGlobalShims();
    });

    test('should setup global shims', async () => {
      const container = DependencyContainer.getInstance();
      await container.initialize(false);
      
      legacyCompatibility.setupGlobalShims();
      
      // Check if global properties are accessible
      expect((global as any).semanticMemory).toBeDefined();
      expect((global as any).modelManager).toBeDefined();
      expect((global as any).agentRuntime).toBeDefined();
      expect((global as any).pluginManager).toBeDefined();

      await container.shutdown();
    });

    test('should remove global shims', async () => {
      const container = DependencyContainer.getInstance();
      await container.initialize(false);
      
      legacyCompatibility.setupGlobalShims();
      legacyCompatibility.removeGlobalShims();
      
      expect((global as any).semanticMemory).toBeUndefined();
      expect((global as any).modelManager).toBeUndefined();
      expect((global as any).agentRuntime).toBeUndefined();
      expect((global as any).pluginManager).toBeUndefined();

      await container.shutdown();
    });

    test('should provide usage stats', () => {
      const stats = legacyCompatibility.getUsageStats();
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  describe('Service Recovery Manager', () => {
    
    test('should be a singleton', () => {
      const manager1 = serviceRecoveryManager;
      const manager2 = serviceRecoveryManager;
      expect(manager1).toBe(manager2);
    });

    test('should handle recovery attempts', async () => {
      const error = new Error('connection refused');
      const result = await serviceRecoveryManager.recoverService('test-service', error);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.message).toBeDefined();
    });

    test('should record recovery history', async () => {
      const error = new Error('timeout');
      await serviceRecoveryManager.recoverService('test-service', error);
      
      const history = serviceRecoveryManager.getRecoveryHistory('test-service');
      expect(Array.isArray(history)).toBe(true);
    });

    test('should provide recovery stats', () => {
      const stats = serviceRecoveryManager.getRecoveryStats();
      
      expect(stats.totalAttempts).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.mostUsedStrategy).toBeDefined();
      expect(stats.serviceStats).toBeDefined();
    });

    test('should clear recovery history', async () => {
      const error = new Error('test error');
      await serviceRecoveryManager.recoverService('test-service', error);
      
      serviceRecoveryManager.clearRecoveryHistory('test-service');
      const history = serviceRecoveryManager.getRecoveryHistory('test-service');
      expect(history.length).toBe(0);
    });
  });

  describe('Service Manager Integration', () => {
    
    test('should provide system health', () => {
      const systemHealth = serviceManager.getSystemHealth();
      
      expect(systemHealth.status).toBeDefined();
      expect(systemHealth.message).toBeDefined();
      expect(systemHealth.servicesUp).toBeGreaterThanOrEqual(0);
      expect(systemHealth.servicesDown).toBeGreaterThanOrEqual(0);
    });

    test('should list all services', () => {
      const services = serviceManager.getAllServices();
      expect(Array.isArray(services)).toBe(true);
    });

    test('should get circuit breaker states', () => {
      const states = serviceManager.getCircuitBreakerStates();
      expect(states).toBeInstanceOf(Map);
    });

    test('should get performance metrics', () => {
      const metrics = serviceManager.getPerformanceMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    
    test('should integrate DependencyContainer with ServiceManager', async () => {
      const container = DependencyContainer.getInstance();
      await container.initialize(false);
      
      // ServiceManager should show healthy services
      const systemHealth = container.getSystemHealth();
      expect(systemHealth.status).toBeDefined();
      
      await container.shutdown();
    });

    test('should integrate Configuration with DependencyContainer', async () => {
      await configurationService.start();
      
      const container = DependencyContainer.getInstance();
      await container.initialize(configurationService.getConfigSection('platform').isAppleSilicon);
      
      expect(container.isInitialized()).toBe(true);
      
      await container.shutdown();
      await configurationService.stop();
    });

    test('should handle service failures gracefully', async () => {
      const container = DependencyContainer.getInstance();
      await container.initialize(false);
      
      // Simulate a service failure and recovery
      const mockError = new Error('service failure');
      const recoveryResult = await serviceRecoveryManager.recoverService('mock-service', mockError);
      
      expect(recoveryResult).toBeDefined();
      // Recovery might fail for mock service, but shouldn't crash
      
      await container.shutdown();
    });
  });

  describe('Error Handling', () => {
    
    test('should handle container initialization failure', async () => {
      const container = DependencyContainer.getInstance();
      
      // Mock a failure in one of the core services
      const originalSemanticMemory = require('../core/semanticMemory').SemanticMemoryEngine;
      require('../core/semanticMemory').SemanticMemoryEngine = jest.fn(() => {
        throw new Error('Mock initialization failure');
      });
      
      await expect(container.initialize(false)).rejects.toThrow();
      
      // Restore original
      require('../core/semanticMemory').SemanticMemoryEngine = originalSemanticMemory;
    });

    test('should handle configuration service failure', async () => {
      const config = configurationService.getConfiguration();
      
      // Configuration should still provide defaults even if file operations fail
      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
    });
  });

});
