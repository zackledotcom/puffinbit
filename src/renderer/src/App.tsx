// src/renderer/src/App.tsx
import React, { useEffect, Component, ReactNode } from 'react'
import { initializeStores } from '@/stores'
import AppLayout from '@/components/AppLayout'

// Simple Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#1A1A1A]">
          <div className="text-center p-8 bg-[#303030] rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-300 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-[#93b3f3] text-white rounded hover:bg-[#7da3f3] transition-colors mr-2"
            >
              Try again
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  // Initialize stores when app starts
  useEffect(() => {
    initializeStores().catch(console.error)
  }, [])

  return (
    <ErrorBoundary>
      <AppLayout />
    </ErrorBoundary>
  )
}

export default App