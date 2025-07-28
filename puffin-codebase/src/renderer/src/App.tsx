import React, { useState, useCallback, useEffect } from 'react'

// Core Chat Components
import PuffinAssistant from './components/chat/PuffinAssistant'
import HybridChatInterface from './components/chat/HybridChatInterface'
import { EfficientSidebar } from './components/layout/EfficientSidebar'
import SimpleTest from './components/SimpleTest'

// Assistant UI Components  
import RealAssistantUI from './components/assistant-ui/RealAssistantUI'
import AssistantUITest from './components/AssistantUITest'

// Global Systems
import { ToastProvider } from './components/ui/toast'

import './globals.css'

interface AppState {
  showLeftSidebar: boolean
  showSettings: boolean
  showDeveloper: boolean
  showSystemStatus: boolean
  showAgentManager: boolean
  showAdvancedMemory: boolean
  selectedModel: string
  availableModels: string[] // Added for dynamic
  theme: 'light' | 'dark' | 'system'
  showDemo: boolean
}

// PHASE 1 FIX: Enhanced Error Boundary with IPC Safety
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component Error:', error, errorInfo)
    
    // PHASE 1 FIX: Check for IPC-related errors
    if (error.message.includes('window.api') || error.message.includes('ipc')) {
      console.error('🔴 IPC Error Detected - Check main process handlers:', error)
    }
    
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto mt-8">
            <h3 className="text-red-800 font-semibold mb-2">Application Error</h3>
            <p className="text-red-600 text-sm mb-4">{this.state.error?.message}</p>
            {this.state.error?.message.includes('window.api') && (
              <div className="bg-red-100 p-3 rounded border-l-4 border-red-500 mb-4">
                <p className="text-red-700 text-sm font-medium">
                  🔧 IPC Connection Issue Detected
                </p>
                <p className="text-red-600 text-xs mt-1">
                  The main process IPC handlers may not be properly registered. Check console for details.
                </p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        )
      )
    }

    return <>{this.props.children}</>
  }
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    showLeftSidebar: false,
    showSettings: false,
    showDeveloper: false,
    showSystemStatus: false,
    showAgentManager: false,
    showAdvancedMemory: false,
    selectedModel: 'tinydolphin:latest',
    availableModels: [], // Dynamic load
    theme: 'system',
    showDemo: false
  })

  // PHASE 1 FIX: IPC Safety and API Availability Check
  const [apiReady, setApiReady] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  
  // Move all remaining useState hooks to top level
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({ responseTime: 234, tokens: 1247, modelLoad: 89 })
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  // Check window.api availability on mount
  useEffect(() => {
    const checkAPI = async () => {
      try {
        if (typeof window === 'undefined') {
          throw new Error('Window object not available')
        }
        
        if (!window.api) {
          throw new Error('window.api is undefined - IPC bridge not loaded')
        }

        // Test basic IPC functionality
        console.log('🔧 Testing IPC connection...')
        const testResult = await window.api.checkOllamaStatus().catch(err => {
          console.warn('Ollama status check failed (expected on first run):', err.message)
          return { success: false, message: 'Service not running' }
        })
        
        console.log('✅ IPC bridge connected successfully')
        setApiReady(true)
        setApiError(null)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown API error'
        console.error('🔴 IPC API Error:', errorMessage)
        setApiError(errorMessage)
        setApiReady(false)
        
        // Retry after 2 seconds
        setTimeout(checkAPI, 2000)
      }
    }

    checkAPI()
  }, [])

  // PHASE 1 FIX: Load dynamic models with proper error handling
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('🔧 Loading available models...')
        const response = await window.api.getOllamaModels()
        
        if (response.success && response.models) {
          const models = response.models
          console.log(`✅ Loaded ${models.length} models:`, models)
          setState(prev => ({ 
            ...prev, 
            availableModels: models, 
            selectedModel: models[0] || prev.selectedModel 
          }))
        } else {
          console.warn('⚠️ Failed to load models:', response.error)
          // Keep default model if loading fails
          setState(prev => ({ 
            ...prev, 
            availableModels: [prev.selectedModel] 
          }))
        }
      } catch (error) {
        console.error('🔴 Error loading models:', error)
        // Fallback to default model
        setState(prev => ({ 
          ...prev, 
          availableModels: [prev.selectedModel] 
        }))
      }
    }

    loadModels()
  }, [apiReady]) // Only load models after API is ready

  // Show loading state while API initializes
  if (!apiReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <h2 className="text-xl font-semibold mb-2">Initializing Puffer AI</h2>
          {apiError ? (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 max-w-md">
              <p className="text-red-400 text-sm mb-2">IPC Connection Error:</p>
              <p className="text-red-300 text-xs">{apiError}</p>
              <p className="text-gray-400 text-xs mt-2">Retrying connection...</p>
            </div>
          ) : (
            <p className="text-gray-400">Loading IPC bridge...</p>
          )}
        </div>
      </div>
    )
  }

  // Add state for PremiumChatInterface
  type MessageType = 'user' | 'assistant' | 'system';
  interface ChatMessage {
    id: string | number;
    type: MessageType;
    content: string;
    timestamp: Date;
    model?: string;
    responseTime?: number;
  }
  // REAL MESSAGE HANDLING - Connect to actual Puffin API
  const handleSendMessage = async (content: string) => {
    setIsLoading(true);
    const startTime = Date.now();
    
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Call the REAL Puffin API
      const response = await window.api.chatWithAI({
        message: content,
        model: state.selectedModel,
        history: messages.map(m => ({ role: m.type, content: m.content })),
        mode: 'chat'
      });
      
      if (response.success) {
        const responseTime = Date.now() - startTime;
        const aiMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: response.message || response.response || 'No response generated',
          timestamp: new Date(),
          model: state.selectedModel,
          responseTime
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setStats(prev => ({ ...prev, responseTime }));
      } else {
        throw new Error(response.message || 'AI service error');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure your AI services are running.`,
        timestamp: new Date(),
        model: state.selectedModel,
        responseTime: Date.now() - startTime
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const toggleSidebar = () => {
    console.log('Toggling sidebar from:', state.showLeftSidebar, 'to:', !state.showLeftSidebar)
    updateState({ showLeftSidebar: !state.showLeftSidebar })
  }

  const handleLeftEdgeHover = () => {
    if (!state.showLeftSidebar) {
      const timeout = setTimeout(() => {
        updateState({ showLeftSidebar: true })
      }, 300)
      setHoverTimeout(timeout)
    }
  }

  const handleLeftEdgeLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
  }

  const handleNewChat = () => {
    console.log('🆕 New chat initiated')
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#1a1a1a] overflow-hidden">

        {/* Main Area */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <ErrorBoundary
            fallback={
              <div className="flex-1 bg-red-50 flex items-center justify-center text-red-600">
                Interface Error
              </div>
            }
          >
            {state.showDemo ? (
              <SimpleTest />
            ) : (
              <div className="h-full flex flex-col">
                {/* Model indicator */}
                <div className="px-4 py-2">
                  <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Model: {state.selectedModel}
                      </span>
                      
                      {/* Theme Toggle */}
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-gray-500">Theme:</span>
                        <button
                          onClick={() => updateState({ 
                            theme: state.theme === 'light' ? 'dark' : 'light' 
                          })}
                          className="px-2 py-1 text-xs rounded transition-colors bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        >
                          {state.theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      🔒 Privacy-first • Local processing
                    </div>
                  </div>
                </div>
                
                {/* Chat Interface - HybridChatInterface Only */}
                <div className="flex-1 min-h-0">
                  {state.showDemo ? (
                    <SimpleTest />
                  ) : (
                    <HybridChatInterface
                      selectedModel={state.selectedModel}
                      onModelChange={(model) => updateState({ selectedModel: model })}
                      onSendMessage={handleSendMessage}
                      messages={messages}
                      isLoading={isLoading}
                      stats={stats}
                    />
                  )}
                </div>
              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>
    </ToastProvider>
  )
}

export default App