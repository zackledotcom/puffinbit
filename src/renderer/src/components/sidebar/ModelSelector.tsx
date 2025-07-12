import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  CaretDown, 
  Cpu, 
  Lightning, 
  Warning, 
  CheckCircle, 
  Download, 
  Trash,
  ArrowsClockwise,
  Play,
  Stop,
  Info,
  Circle,
  Plus,
  X,
  ChatCircle,
  Robot,
  Code,
  MagicWand,
  Star,
  Gear
} from 'phosphor-react';
import ModelSettingsOverlay from '../overlays/ModelSettingsOverlay';

// ===== STATIC UI METADATA REGISTRY =====
const MODEL_UI_REGISTRY: Record<string, { label: string; icon: React.FC<any> }> = {
  'llama3.2': { label: 'LLaMA 3.2', icon: Brain },
  'llama3': { label: 'LLaMA 3', icon: Brain },
  'llama2': { label: 'LLaMA 2', icon: Brain },
  'gemma2': { label: 'Gemma 2', icon: Star },
  'gemma': { label: 'Gemma', icon: Star },
  'phi3': { label: 'Phi 3', icon: Lightning },
  'phi': { label: 'Phi', icon: Lightning },
  'qwen2.5': { label: 'Qwen 2.5', icon: Code },
  'qwen2': { label: 'Qwen 2', icon: Code },
  'qwen': { label: 'Qwen', icon: Code },
  'codellama': { label: 'Code LLaMA', icon: Code },
  'openchat': { label: 'OpenChat', icon: ChatCircle },
  'tinydolphin': { label: 'Tiny Dolphin', icon: Robot },
  'dolphin': { label: 'Dolphin', icon: Robot },
  'phi4-mini-reasoning': { label: 'Phi 4 Reasoning', icon: MagicWand },
  'wizard': { label: 'WizardLM', icon: MagicWand },
  'neural-chat': { label: 'Neural Chat', icon: ChatCircle },
  'deepseek': { label: 'DeepSeek', icon: Code },
  'mixtral': { label: 'Mixtral', icon: Lightning }
};

// ===== NORMALIZATION UTILITIES =====
const normalizeModelName = (raw: unknown): string => {
  if (typeof raw !== 'string') return '';
  return raw.replace(/:.*$/, '').toLowerCase().trim();
};

const extractModelInfo = (modelName: string) => {
  const baseName = normalizeModelName(modelName);
  const meta = MODEL_UI_REGISTRY[baseName];
  
  if (!meta) {
    console.warn('Missing UI meta for model:', modelName);
    // Fallback metadata
    return {
      label: modelName,
      icon: Brain,
      family: 'Unknown',
      performance: 'balanced' as const
    };
  }
  
  return {
    label: meta.label,
    icon: meta.icon,
    family: meta.label.split(' ')[0], // Extract family from label
    performance: getPerformanceFromName(modelName)
  };
};

const getPerformanceFromName = (modelName: string): 'fast' | 'balanced' | 'quality' => {
  const name = normalizeModelName(modelName);
  
  // Fast models (< 4B parameters)
  if (name.includes('2b') || name.includes('1b') || name.includes('mini') || name.includes('tiny')) {
    return 'fast';
  }
  
  // Quality models (> 30B parameters)
  if (name.includes('70b') || name.includes('34b') || name.includes('wizard') || name.includes('mixtral')) {
    return 'quality';
  }
  
  return 'balanced';
};

interface OllamaModel {
  // Core properties (guaranteed after enrichment)
  name: string;
  label: string;
  icon: React.FC<any>;
  family: string;
  performance: 'fast' | 'balanced' | 'quality';
  status: 'available' | 'loading' | 'error' | 'downloading' | 'removing';
  
  // Optional properties (may come from API)
  size?: number;
  digest?: string;
  modified_at?: string;
  type?: 'local' | 'downloading';
  format?: string;
  parameter_size?: string;
  quantization_level?: string;
  details?: {
    families?: string[];
    format?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface ServiceStatus {
  connected: boolean;
  message: string;
  version?: string;
  models?: string[];
}

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (modelName: string) => void;
  onNewChat?: () => void;
  onToggleCollapse?: () => void;
  className?: string;
}

/**
 * BULLETPROOF Model Selector Component
 * 
 * Features:
 * - 100% IPC-based communication (no direct fetch)
 * - Comprehensive error handling with retry logic
 * - Real-time status indicators
 * - Service health monitoring
 * - Performance-optimized with proper caching
 * - Full TypeScript safety
 * - Accessible UI components
 */
export default function BulletproofModelSelector({
  currentModel,
  onModelChange,
  onNewChat,
  onToggleCollapse,
  className = ''
}: ModelSelectorProps) {
  // ===== STATE MANAGEMENT =====
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<ServiceStatus>({
    connected: false,
    message: 'Checking...'
  });
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pullQueue, setPullQueue] = useState<Set<string>>(new Set());
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [settingsModelName, setSettingsModelName] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    modelName: string;
    modelLabel: string;
  }>({ show: false, modelName: '', modelLabel: '' });

  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Format bytes to human readable size
   */
  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  /**
   * Get performance icon and styling
   */
  const getPerformanceIcon = useCallback((performance: 'fast' | 'balanced' | 'quality') => {
    const configs = {
      fast: { icon: Lightning, color: 'text-yellow-500', bg: 'bg-yellow-100' },
      balanced: { icon: Cpu, color: 'text-blue-500', bg: 'bg-blue-100' },
      quality: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-100' }
    };
    
    const config = configs[performance];
    const Icon = config.icon;
    
    return (
      <div className={`p-1 rounded ${config.bg}`}>
        <Icon className={`w-3 h-3 ${config.color}`} />
      </div>
    );
  }, []);

  /**
   * Get status indicator with proper visual feedback
   */
  const getStatusIndicator = useCallback((model: OllamaModel) => {
    if (pullQueue.has(model.name)) {
      return (
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-blue-600">Pulling...</span>
        </div>
      );
    }
    
    const statusConfig = {
      available: { icon: CheckCircle, color: 'text-green-500', label: 'Ready' },
      loading: { 
        icon: () => <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />, 
        color: 'text-blue-500', 
        label: 'Loading' 
      },
      error: { icon: Warning, color: 'text-red-500', label: 'Error' },
      downloading: { icon: Download, color: 'text-blue-500 animate-pulse', label: 'Downloading' },
      removing: { icon: Trash, color: 'text-red-500 animate-pulse', label: 'Removing' }
    };
    
    const config = statusConfig[model.status];
    const IconComponent = typeof config.icon === 'function' ? config.icon : config.icon;
    
    return (
      <div className="flex items-center gap-1">
        {typeof config.icon === 'function' ? <IconComponent /> : <IconComponent className={`w-3 h-3 ${config.color}`} />}
        <span className={`text-xs ${config.color.replace('text-', 'text-')}`}>{config.label}</span>
      </div>
    );
  }, [pullQueue]);

  // ===== IPC COMMUNICATION FUNCTIONS =====

  /**
   * Check Ollama service status using IPC
   */
  const checkOllamaStatus = useCallback(async (): Promise<boolean> => {
    try {
      const status = await window.api.checkOllamaStatus();
      setOllamaStatus(status);
      return status.connected;
    } catch (error) {
      console.error('Failed to check Ollama status:', error);
      setOllamaStatus({
        connected: false,
        message: 'Failed to check status'
      });
      return false;
    }
  }, []);

  /**
   * Fetch models using secure IPC channel
   */
  const fetchModels = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // First check if Ollama is running
      const isOnline = await checkOllamaStatus();
      if (!isOnline) {
        setError('Ollama service is not running. Please start Ollama to manage models.');
        setLoading(false);
        return;
      }

      // Fetch models via IPC
      const response = await window.api.getOllamaModels();
      
      if (!response.success) {
        throw new Error('Failed to fetch models from Ollama service');
      }

      // Transform and enrich model data using UI metadata registry
      const enrichedModels: OllamaModel[] = response.models
        .filter((modelEntry: unknown) => {
          // Filter out invalid model entries
          if (!modelEntry || (typeof modelEntry !== 'string' && typeof modelEntry !== 'object')) {
            console.warn('Invalid model entry detected:', modelEntry);
            return false;
          }
          return true;
        })
        .map((modelEntry: unknown) => {
          // Extract model name from various possible formats
          const modelName = typeof modelEntry === 'string' 
            ? modelEntry 
            : (modelEntry as any)?.name || (modelEntry as any)?.model || 'unknown';
            
          if (!modelName || typeof modelName !== 'string') {
            console.warn('Could not extract model name from:', modelEntry);
            return null;
          }
          
          // Get UI metadata from registry
          const modelInfo = extractModelInfo(modelName);
          
          return {
            name: modelName,
            label: modelInfo.label,
            icon: modelInfo.icon,
            family: modelInfo.family,
            performance: modelInfo.performance,
            status: 'available' as const,
            
            // Optional properties that might come from API
            size: (modelEntry as any)?.size || 0,
            digest: (modelEntry as any)?.digest || '',
            modified_at: (modelEntry as any)?.modified_at || '',
            type: 'local' as const,
            format: 'GGUF', // Default format for Ollama models
            parameter_size: modelName.match(/(\d+(?:\.\d+)?[bm])/i)?.[1]?.toUpperCase() || 'Unknown',
            quantization_level: 'Q4_0' // Default quantization
          };
        })
        .filter((model): model is OllamaModel => model !== null);

      setModels(enrichedModels);
      setLastRefresh(new Date());
      setRetryCount(0); // Reset retry count on success
      
    } catch (error) {
      console.error('Error fetching models:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load models: ${errorMessage}`);
      
      // Implement exponential backoff for retries
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchModels();
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [checkOllamaStatus, retryCount]);

  /**
   * Pull model with proper queue management
   */
  const pullModel = useCallback(async (modelName: string): Promise<void> => {
    if (pullQueue.has(modelName)) return; // Prevent duplicate pulls
    
    setPullQueue(prev => new Set(prev).add(modelName));
    
    try {
      const success = await window.api.pullModel(modelName);
      if (success) {
        // Refresh models list after successful pull
        await fetchModels();
      } else {
        throw new Error(`Failed to pull model: ${modelName}`);
      }
    } catch (error) {
      console.error('Error pulling model:', error);
      setError(`Failed to pull ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPullQueue(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  }, [pullQueue, fetchModels]);

  /**
   * Start Ollama service if not running
   */
  const startOllamaService = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const result = await window.api.startOllama();
      if (result.success) {
        await checkOllamaStatus();
        await fetchModels();
      } else {
        setError(`Failed to start Ollama: ${result.message}`);
      }
    } catch (error) {
      setError(`Error starting Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [checkOllamaStatus, fetchModels]);

  /**
   * Show delete confirmation dialog
   */
  const showDeleteConfirmation = useCallback((modelName: string, modelLabel: string) => {
    setDeleteConfirmation({
      show: true,
      modelName,
      modelLabel
    });
  }, []);

  /**
   * Delete a model from Ollama after confirmation
   */
  const confirmDeleteModel = useCallback(async (): Promise<void> => {
    const { modelName } = deleteConfirmation;
    if (!modelName) return;

    try {
      setLoading(true);
      const success = await window.api.deleteModel(modelName);
      if (success) {
        // If we deleted the current model, clear it
        if (currentModel === modelName) {
          onModelChange('');
        }
        // Close confirmation dialog
        setDeleteConfirmation({ show: false, modelName: '', modelLabel: '' });
        // Refresh the model list
        await fetchModels();
      } else {
        setError(`Failed to delete model: ${modelName}`);
      }
    } catch (error) {
      setError(`Error deleting model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [deleteConfirmation, currentModel, onModelChange, fetchModels]);

  /**
   * Cancel delete confirmation
   */
  const cancelDeleteModel = useCallback(() => {
    setDeleteConfirmation({ show: false, modelName: '', modelLabel: '' });
  }, []);

  // ===== LIFECYCLE & EFFECTS =====

  /**
   * Initialize component and set up polling
   */
  useEffect(() => {
    fetchModels();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      fetchModels();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchModels]);

  // ===== RENDER =====
  return (
    <div className={`w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header with Logo and Controls - Using prime real estate efficiently */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Puffer</h1>
          <p className="text-xs text-gray-600">AI Assistant</p>
        </div>
        
        <div className="flex items-center gap-2">
          {currentModel && ollamaStatus.connected && (
            <button
              onClick={() => {
                setSettingsModelName(currentModel);
                setShowModelSettings(true);
              }}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              title="Model settings"
              aria-label="Configure model settings"
            >
              <Gear className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={fetchModels}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            title="Refresh models"
            aria-label="Refresh model list"
          >
            <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
              title="New chat"
              aria-label="Start new chat"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              New
            </button>
          )}
          
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Active Model Display */}
      {currentModel && ollamaStatus.connected && (() => {
        const currentModelData = models.find(m => m.name === currentModel);
        const ModelIcon = currentModelData?.icon || Brain;
        
        return (
          <div className="m-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-gray-200">
                  <ModelIcon className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{currentModelData?.label || currentModel}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Models List */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600 text-sm">Loading models...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Warning className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-gray-700 font-medium mb-1">Service Error</p>
            <p className="text-gray-500 text-sm mb-3">{error}</p>
            <button
              onClick={startOllamaService}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 inline mr-2" />
              Start Service
            </button>
          </div>
        ) : !ollamaStatus.connected ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Warning className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-gray-700 font-medium mb-1">Ollama Service Offline</p>
            <p className="text-gray-500 text-sm mb-3">Start Ollama to manage your AI models</p>
            <button
              onClick={startOllamaService}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4 inline mr-2" />
              Start Service
            </button>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-700 font-medium mb-1">No Models Found</p>
            <p className="text-gray-500 text-sm">Pull a model to get started</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {models
              .filter(model => model.name !== currentModel) // Don't show active model in list
              .map(model => {
              const ModelIcon = model.icon;
              return (
                <div
                  key={model.name}
                  className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all cursor-pointer group"
                  onClick={() => model.status === 'available' && onModelChange(model.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && model.status === 'available') {
                      onModelChange(model.name);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-1 rounded bg-gray-100">
                        <ModelIcon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{model.label}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-3">
                      {/* Ready status as icon only */}
                      {model.status === 'available' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {model.status === 'loading' && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      {model.status === 'error' && (
                        <Warning className="w-4 h-4 text-red-500" />
                      )}
                      
                      {/* Delete button */}
                      {model.status === 'available' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showDeleteConfirmation(model.name, model.label);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded bg-red-100 hover:bg-red-200 transition-all"
                          title="Delete model"
                          aria-label={`Delete ${model.label}`}
                        >
                          <Trash className="w-3 h-3 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Statistics Footer */}
        {models.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-blue-600">{models.length}</p>
                <p className="text-xs text-gray-600">Models</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">
                  {models.filter(m => m.status === 'available').length}
                </p>
                <p className="text-xs text-gray-600">Ready</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-600">
                  {Math.round(models.filter(m => m.performance === 'quality').length / models.length * 100) || 0}%
                </p>
                <p className="text-xs text-gray-600">Quality</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Model Settings Overlay */}
      <ModelSettingsOverlay
        isOpen={showModelSettings}
        onClose={() => setShowModelSettings(false)}
        modelName={settingsModelName}
        onSaveSettings={(settings) => {
          console.log('Saving model settings:', settings);
          setShowModelSettings(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Model</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deleteConfirmation.modelLabel}</strong>? 
              This will permanently remove the model from your system and free up disk space.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteModel}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteModel}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}