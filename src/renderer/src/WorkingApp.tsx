// src/renderer/src/WorkingApp.tsx - SIMPLE WORKING APP
import React, { useState, useEffect } from 'react'
import SimpleChat from './components/chat/SimpleChat'
import { Settings, Zap, Wifi, WifiOff, AlertCircle } from 'lucide-react'

interface AppState {
  selectedModel: string
  availableModels: string[]
  connectionStatus: 'online' | 'offline' | 'checking'
  showSettings: boolean
  systemHealth: {
    ollama: boolean
    chroma: boolean
  }
}

const WorkingApp: React.FC = () => {
  const [state, setState] = useState<AppState>({
    selectedModel: 'llama3.2:latest',
    availableModels: ['llama3.2:latest'],
    connectionStatus: 'checking',
    showSettings: false,
    systemHealth: {
      ollama: false,
      chroma: false
    }
  })

  // Check system status on mount
  useEffect(() => {
    console.log('🔍 Checking system status...')
    checkSystemStatus()
    loadAvailableModels()
  }, [])

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const checkSystemStatus = async () => {
    try {
      console.log('📡 Checking Ollama status...')
      const ollamaStatus = await window.api.checkOllamaStatus()
      
      console.log('📡 Checking ChromaDB status...')
      const chromaStatus = await window.api.checkChromaStatus()
      
      updateState({
        connectionStatus: ollamaStatus.success ? 'online' : 'offline',
        systemHealth: {
          ollama: ollamaStatus.success,
          chroma: chromaStatus.success
        }
      })
      
      console.log('✅ System status check complete:', {
        ollama: ollamaStatus.success,
        chroma: chromaStatus.success
      })
      
    } catch (error) {
      console.error('❌ System status check failed:', error)
      updateState({ connectionStatus: 'offline' })
    }
  }

  const loadAvailableModels = async () => {
    try {
      console.log('📦 Loading available models...')
      const response = await window.api.getAvailableModels()
      
      if (response.success && response.models.length > 0) {
        updateState({ 
          availableModels: response.models,
          selectedModel: response.models[0] // Use first available model
        })
        console.log('✅ Models loaded:', response.models)
      } else {
        console.warn('⚠️ No models available, using fallback')
      }
    } catch (error) {
      console.error('❌ Failed to load models:', error)
    }
  }

  const StatusIndicator = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
      state.connectionStatus === 'online' 
        ? 'bg-green-100 text-green-700'
        : state.connectionStatus === 'offline'
          ? 'bg-red-100 text-red-700'
          : 'bg-yellow-100 text-yellow-700'
    }`}>
      {state.connectionStatus === 'online' ? (
        <Wifi size={12} />
      ) : state.connectionStatus === 'offline' ? (
        <WifiOff size={12} />
      ) : (
        <AlertCircle size={12} />
      )}
      <span>
        {state.connectionStatus === 'online' ? 'Connected' : 
         state.connectionStatus === 'offline' ? 'Offline' : 'Checking...'}
      </span>
    </div>
  )

  const ModelSelector = () => (
    <div className="relative">
      <select
        value={state.selectedModel}
        onChange={(e) => updateState({ selectedModel: e.target.value })}
        className="appearance-none bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 pr-8 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {state.availableModels.map(model => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </div>
  )

  const SettingsPanel = () => (
    state.showSettings && (
      <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[300px]">
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">System Status</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Ollama Service:</span>
              <span className={`font-medium ${
                state.systemHealth.ollama ? 'text-green-600' : 'text-red-600'
              }`}>
                {state.systemHealth.ollama ? '✅ Running' : '❌ Stopped'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>ChromaDB Service:</span>
              <span className={`font-medium ${
                state.systemHealth.chroma ? 'text-green-600' : 'text-red-600'
              }`}>
                {state.systemHealth.chroma ? '✅ Running' : '❌ Stopped'}
              </span>
            </div>
          </div>
          
          <div className="border-t border-gray-100 mt-3 pt-3">
            <button
              onClick={() => {
                checkSystemStatus()
                loadAvailableModels()
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <Zap size={14} />
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    )
  )

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (state.showSettings && !target.closest('.relative')) {
        updateState({ showSettings: false })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [state.showSettings])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">🐡 Puffin AI</h1>
          <StatusIndicator />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Model:</span>
            <ModelSelector />
          </div>
          
          <div className="relative">
            <button
              onClick={() => updateState({ showSettings: !state.showSettings })}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <SettingsPanel />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {state.connectionStatus === 'offline' ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <WifiOff size={48} className="text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-gray-700 mb-2">
                Services Offline
              </h2>
              <p className="text-gray-500 mb-4">
                Please make sure Ollama is running and try refreshing the connection.
              </p>
              <button
                onClick={checkSystemStatus}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <SimpleChat 
            selectedModel={state.selectedModel}
            className="h-full"
          />
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 bg-white border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>🔒 Local AI • Privacy-first • No data sent to servers</span>
          <span>Puffin v1.0.0</span>
        </div>
      </footer>
    </div>
  )
}

export default WorkingApp
