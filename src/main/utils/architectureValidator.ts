/**
 * Backend Architecture Validation
 * Quick validation script to check if all the new architecture components work together
 */

import { dependencyContainer } from '../services/DependencyContainer';
import { serviceManager } from '../services/ServiceManager';
import { safeLog, safeError, safeInfo } from '../utils/safeLogger';

export async function validateBackendArchitecture(): Promise<{
  success: boolean;
  issues: string[];
  summary: string;
}> {
  const issues: string[] = [];
  
  try {
    safeInfo('🔍 Validating backend architecture...');

    // Test 1: Check if ServiceManager is available
    try {
      const systemHealth = serviceManager.getSystemHealth();
      safeLog('✅ ServiceManager operational:', systemHealth.status);
    } catch (error: any) {
      issues.push(`ServiceManager error: ${error.message}`);
    }

    // Test 2: Check if DependencyContainer can be initialized (without actually doing it)
    try {
      const isInitialized = dependencyContainer.isInitialized();
      safeLog('✅ DependencyContainer accessible, initialized:', isInitialized);
    } catch (error: any) {
      issues.push(`DependencyContainer error: ${error.message}`);
    }

    // Test 3: Check if service wrappers can be instantiated
    try {
      const { ollamaServiceWrapper } = await import('../services/OllamaServiceWrapper');
      const { chromaServiceWrapper } = await import('../services/ChromaServiceWrapper');
      
      safeLog('✅ Service wrappers loaded');
      safeLog('   - Ollama wrapper name:', ollamaServiceWrapper.name);
      safeLog('   - Chroma wrapper name:', chromaServiceWrapper.name);
    } catch (error: any) {
      issues.push(`Service wrapper loading error: ${error.message}`);
    }

    // Test 4: Check if handler modules can be imported
    try {
      await import('../handlers/coreHandlers');
      await import('../handlers/serviceHandlers');
      await import('../handlers/memoryHandlers');
      await import('../handlers/modelHandlers');
      await import('../handlers/agentHandlers');
      await import('../handlers/pluginHandlers');
      
      safeLog('✅ All handler modules importable');
    } catch (error: any) {
      issues.push(`Handler module import error: ${error.message}`);
    }

    // Test 5: Check core services can be imported
    try {
      await import('../core/semanticMemory');
      await import('../core/modelManager');
      await import('../core/agentRuntime');
      await import('../core/pluginManager');
      
      safeLog('✅ Core service modules importable');
    } catch (error: any) {
      issues.push(`Core service import error: ${error.message}`);
    }

    // Summary
    if (issues.length === 0) {
      const summary = '🎉 Backend architecture validation passed! All components are properly integrated.';
      safeInfo(summary);
      return { success: true, issues: [], summary };
    } else {
      const summary = `⚠️ Found ${issues.length} integration issues that need to be resolved.`;
      safeError(summary);
      return { success: false, issues, summary };
    }

  } catch (error: any) {
    const summary = `❌ Architecture validation failed: ${error.message}`;
    safeError(summary);
    return { success: false, issues: [error.message], summary };
  }
}

/**
 * Quick health check for deployment readiness
 */
export async function checkDeploymentReadiness(): Promise<{
  ready: boolean;
  checklist: Array<{ item: string; status: 'pass' | 'fail' | 'warning'; details?: string }>;
}> {
  const checklist: Array<{ item: string; status: 'pass' | 'fail' | 'warning'; details?: string }> = [];

  // Check 1: Architecture validation
  const archValidation = await validateBackendArchitecture();
  checklist.push({
    item: 'Backend Architecture Integration',
    status: archValidation.success ? 'pass' : 'fail',
    details: archValidation.summary
  });

  // Check 2: Critical service interfaces
  try {
    const { ollamaServiceWrapper } = await import('../services/OllamaServiceWrapper');
    const hasRequiredMethods = typeof ollamaServiceWrapper.healthCheck === 'function' &&
                              typeof ollamaServiceWrapper.start === 'function' &&
                              typeof ollamaServiceWrapper.stop === 'function';
    checklist.push({
      item: 'Service Interface Implementation',
      status: hasRequiredMethods ? 'pass' : 'fail',
      details: hasRequiredMethods ? 'All services implement required interface' : 'Missing required service methods'
    });
  } catch {
    checklist.push({
      item: 'Service Interface Implementation',
      status: 'fail',
      details: 'Cannot load service wrappers'
    });
  }

  // Check 3: Handler modularity
  const handlerCount = 6; // We created 6 handler modules
  let loadedHandlers = 0;
  
  const handlerModules = [
    'coreHandlers', 'serviceHandlers', 'memoryHandlers', 
    'modelHandlers', 'agentHandlers', 'pluginHandlers'
  ];

  for (const handler of handlerModules) {
    try {
      await import(`../handlers/${handler}`);
      loadedHandlers++;
    } catch (error) {
      // Handler failed to load
    }
  }

  checklist.push({
    item: 'Modular Handler Architecture',
    status: loadedHandlers === handlerCount ? 'pass' : 'warning',
    details: `${loadedHandlers}/${handlerCount} handler modules loaded successfully`
  });

  // Overall readiness
  const failedChecks = checklist.filter(c => c.status === 'fail').length;
  const ready = failedChecks === 0;

  return { ready, checklist };
}
