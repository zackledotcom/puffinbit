import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { registerModelTuningHandlers } from './handlers/modelTuningHandlers';
import { registerChatHandlers } from './handlers/chatHandlers';
import { registerBrowserHandlers } from './handlers/browserHandlers';
import { registerModelfileHandlers } from './handlers/modelfileHandlers';
import { m1PerformanceMonitor } from './services/m1PerformanceMonitor';
import { dependencyContainer } from './services/DependencyContainer';
import { serviceManager } from './services/ServiceManager';
import { configurationService } from './services/ConfigurationService';
import { legacyCompatibility } from './services/LegacyCompatibility';
import { serviceRecoveryManager } from './services/ServiceRecoveryManager';
import { ipcSecurity } from './security/ipcSecurity';
import { credentialStorage } from './security/credentialStorage';
import { safeLog, safeError, safeInfo } from './utils/safeLogger';

/**
 * Phase 0 Security Hardening - Enhanced Security Integration
 */

/**
 * Create the main application window
 */
function createWindow(config: any): BrowserWindow {
  const mainWindow = new BrowserWindow(config.security.windowDefaults);

  // Set secure CSP headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [config.security.CSP]
      }
    });
  });

  // Handle external URL opening securely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isAllowed = config.security.allowedExternalURLs.some((allowed: string) => 
      url.startsWith(allowed)
    );
    
    if (!isAllowed) {
      return { action: 'deny' };
    }
    
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

/**
 * Application startup sequence with Phase 0 Security Hardening
 */
async function initializeApplication(): Promise<void> {
  try {
    // Set app user model ID
    electronApp.setAppUserModelId('com.electron.puffer');

    // Step 1: Initialize Configuration Service
    safeInfo('🔧 Starting Configuration Service...');
    const configStartResult = await configurationService.start();
    if (!configStartResult.success) {
      throw new Error(`Configuration service failed: ${configStartResult.message}`);
    }

    // Register configuration service with ServiceManager
    serviceManager.register('configuration', () => configurationService);

    // Get configuration
    const config = configurationService.getConfiguration();
    
    // Step 2: Initialize Security Systems (Phase 0)
    safeInfo('🔐 Initializing security systems...');
    
    // Initialize credential storage
    if (!credentialStorage.isInitialized()) {
      safeError('❌ Credential storage failed to initialize');
      throw new Error('Security initialization failed');
    }
    
    // Initialize IPC security
    const securityContext = ipcSecurity.createSession('main-session', ['*']); // Main session with all permissions
    safeInfo('✅ IPC security initialized');

    // Step 3: Platform-specific setup
    if (config.platform.isAppleSilicon) {
      safeInfo('🍎 Apple Silicon detected - M1/M2 optimizations enabled');
      safeInfo('⚡ MLX fallback available for enhanced performance');
    } else {
      safeInfo('🖥️ Standard platform detected');
    }

    // Step 4: Start performance monitoring
    m1PerformanceMonitor.startMonitoring();
    safeInfo('📊 Performance monitoring started');

    // Step 5: Initialize dependency container with all services
    await dependencyContainer.initialize(config.platform.isAppleSilicon);

    // Step 6: Register critical services with health monitoring
    safeInfo('🏥 Registering services with health monitoring...');
    await registerCriticalServices();

    // Step 7: Setup legacy compatibility layer for existing code
    safeInfo('🔄 Setting up legacy compatibility layer...');
    legacyCompatibility.setupGlobalShims();

    // Step 8: Setup service recovery manager
    safeInfo('🛡️ Initializing service recovery manager...');
    serviceRecoveryManager.on('recovery:success', (event) => {
      safeInfo(`✅ Service recovery successful: ${event.serviceName} using ${event.strategy}`);
    });
    
    serviceRecoveryManager.on('recovery:failed', (event) => {
      safeError(`❌ Service recovery failed: ${event.serviceName} - ${event.result.message}`);
    });

    // Step 9: Register all secure IPC handlers
    await registerAllSecureHandlers();

    // Step 10: Create the main window
    createWindow(config);

    safeInfo('🚀 Application initialized successfully with Phase 0 Security Hardening');

  } catch (error) {
    safeError('❌ App startup failed:', error);
    app.quit();
  }
}

/**
 * Register critical services with health monitoring and circuit breakers
 */
async function registerCriticalServices(): Promise<void> {
  // Register Ollama service with health monitoring
  serviceManager.register('ollama', () => ({
    name: 'ollama',
    config: {
      name: 'ollama',
      displayName: 'Ollama AI Service',
      description: 'Local AI model hosting service',
      dependencies: [],
      healthCheckInterval: 30000, // 30 seconds
      timeout: 10000,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      autoRestart: true,
      critical: true
    },
    async healthCheck() {
      try {
        const ollamaService = dependencyContainer.get('ollamaService');
        const result = await ollamaService.getHealthStatus();
        return {
          status: result.success ? 'healthy' : 'critical',
          message: result.success ? 'Ollama running' : 'Ollama not responding',
          timestamp: new Date(),
          responseTime: result.responseTime || 0
        };
      } catch (error: any) {
        return {
          status: 'down',
          message: error.message,
          timestamp: new Date(),
          responseTime: 0
        };
      }
    },
    async start() {
      try {
        const ollamaService = dependencyContainer.get('ollamaService');
        await ollamaService.start();
        return { success: true, message: 'Ollama started' };
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    },
    async stop() {
      try {
        const ollamaService = dependencyContainer.get('ollamaService');
        await ollamaService.stop();
        return { success: true, message: 'Ollama stopped' };
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    },
    async restart() {
      const stopResult = await this.stop();
      if (!stopResult.success) return stopResult;
      await new Promise(resolve => setTimeout(resolve, 2000));
      return this.start();
    },
    getMetrics() {
      return {
        uptime: process.uptime(),
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0
      };
    }
  }));

  // Register ChromaDB service with health monitoring
  serviceManager.register('chromadb', () => ({
    name: 'chromadb',
    config: {
      name: 'chromadb',
      displayName: 'ChromaDB Vector Database',
      description: 'Vector database for semantic memory',
      dependencies: [],
      healthCheckInterval: 30000,
      timeout: 10000,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      autoRestart: true,
      critical: false
    },
    async healthCheck() {
      try {
        const chromaService = dependencyContainer.get('chromaService');
        const result = await chromaService.getHealthStatus();
        return {
          status: result.success ? 'healthy' : 'warning',
          message: result.success ? 'ChromaDB running' : 'ChromaDB not responding',
          timestamp: new Date(),
          responseTime: result.responseTime || 0
        };
      } catch (error: any) {
        return {
          status: 'down',
          message: error.message,
          timestamp: new Date(),
          responseTime: 0
        };
      }
    },
    async start() {
      try {
        const chromaService = dependencyContainer.get('chromaService');
        await chromaService.start();
        return { success: true, message: 'ChromaDB started' };
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    },
    async stop() {
      try {
        const chromaService = dependencyContainer.get('chromaService');
        await chromaService.stop();
        return { success: true, message: 'ChromaDB stopped' };
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    },
    async restart() {
      const stopResult = await this.stop();
      if (!stopResult.success) return stopResult;
      await new Promise(resolve => setTimeout(resolve, 2000));
      return this.start();
    },
    getMetrics() {
      return {
        uptime: process.uptime(),
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0
      };
    }
  }));

  // Start critical services
  await serviceManager.start('ollama');
  await serviceManager.start('chromadb');
}

/**
 * Register all secure IPC handlers with zero-trust validation
 */
async function registerAllSecureHandlers(): Promise<void> {
  // Create security service instance
  const securityService = {
    validatePermission: (operation: string, context: any): boolean => {
      return ipcSecurity.validatePermission(operation, context);
    },
    sanitizeInput: (input: string): string => {
      return ipcSecurity.sanitizeInput(input);
    },
    logSecurityEvent: (event: string, details: any): void => {
      ipcSecurity.logSecurityEvent(event, details);
    }
  };

  try {
    // Register chat handlers with enhanced security
    registerChatHandlers(dependencyContainer, securityService);
    
    // Register browser handlers with security
    registerBrowserHandlers(dependencyContainer, securityService);
    
    // Register model tuning handlers
    registerModelTuningHandlers();
    
    // Register modelfile handlers
    registerModelfileHandlers();

    // Register secure health status handler
    ipcSecurity.registerSecureHandler(
      'get-health-status',
      async () => {
        const systemHealth = serviceManager.getSystemHealth();
        const securityStats = ipcSecurity.getSecurityStats();
        
        return {
          success: true,
          system: systemHealth,
          security: securityStats,
          timestamp: new Date().toISOString()
        };
      },
      {
        maxRate: 120, // 2 requests per second max
        requiresAuth: false,
        capabilities: []
      }
    );

    // Register secure credential management handlers
    ipcSecurity.registerSecureHandler(
      'credential-store',
      async (request) => {
        return await credentialStorage.storeCredential(request);
      },
      {
        maxRate: 10,
        requiresAuth: true,
        capabilities: ['credentials:write'],
        validation: (args) => {
          const [request] = args;
          return request && request.service && request.account && request.credential;
        }
      }
    );

    ipcSecurity.registerSecureHandler(
      'credential-get',
      async (service: string, account: string) => {
        const credential = await credentialStorage.getCredential(service, account);
        return credential ? { success: true, credential } : { success: false, error: 'Not found' };
      },
      {
        maxRate: 60,
        requiresAuth: true,
        capabilities: ['credentials:read']
      }
    );

    safeInfo('✅ All secure IPC handlers registered');

  } catch (error) {
    safeError('❌ Failed to register secure handlers:', error);
    throw error;
  }
}
  const { registerCoreHandlers } = await import('./handlers/coreHandlers');
  const { registerServiceHandlers } = await import('./handlers/serviceHandlers');
  const { registerMemoryHandlers } = await import('./handlers/memoryHandlers');
  const { registerModelHandlers } = await import('./handlers/modelHandlers');
  const { registerAgentHandlers } = await import('./handlers/agentHandlers');
  const { registerPluginHandlers } = await import('./handlers/pluginHandlers');
  const { registerBrowserHandlers } = await import('./handlers/browserHandlers');
  const { registerMonitoringHandlers } = await import('./handlers/monitoringHandlers');

  // Register all handler modules
  registerCoreHandlers(dependencyContainer, Security);
  registerServiceHandlers(dependencyContainer, Security);
  registerMemoryHandlers(dependencyContainer, Security);
  registerModelHandlers(dependencyContainer, Security);
  registerAgentHandlers(dependencyContainer, Security);
  registerPluginHandlers(dependencyContainer, Security);
  registerBrowserHandlers(dependencyContainer, Security);
  registerMonitoringHandlers(dependencyContainer, Security);

  // Legacy handlers (to be refactored)
/**
 * Application event handlers with Phase 0 Security Hardening
 */
app.whenReady().then(initializeApplication).catch(error => {
  safeError('❌ App ready handler failed:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  safeInfo('🛑 Application shutting down...');
  
  // Stop performance monitoring
  m1PerformanceMonitor.stopMonitoring();
  
  // Remove legacy compatibility shims
  legacyCompatibility.removeGlobalShims();
  
  // Shutdown security systems
  await ipcSecurity.shutdown?.();
  await credentialStorage.clearAllCredentials?.();
  
  // Graceful shutdown of all services
  try {
    await serviceManager.shutdown();
    await dependencyContainer.shutdown();
    await configurationService.stop();
    safeInfo('✅ Graceful shutdown complete with security cleanup');
  } catch (error) {
    safeError('❌ Error during shutdown:', error);
  }
});

// Enhanced error handling
process.on('uncaughtException', (error) => {
  safeError('🚨 Uncaught Exception:', error);
  // Log security event for potential security issues
  ipcSecurity.logSecurityEvent('uncaught_exception', { error: error.message });
});

process.on('unhandledRejection', (reason, promise) => {
  safeError('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Log security event for potential security issues
  ipcSecurity.logSecurityEvent('unhandled_rejection', { reason: String(reason) });
});
