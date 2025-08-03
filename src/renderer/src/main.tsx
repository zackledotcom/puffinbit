// src/renderer/src/main.tsx - TRAE AI OPTIMIZED
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './globals.css'
import './styles/magic-ui.css'

console.log('🎨 Starting Trae AI Optimized...')

// Error boundary for development
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 React Error Boundary caught error:', error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 React Error Details:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#1A1A1A',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px'
        }}>
          <div style={{
            backgroundColor: '#303030',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              ⚠️ Application Error
            </h1>
            <p style={{ fontSize: '14px', color: '#E5E5E5', marginBottom: '16px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: 'white',
                color: 'black',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM ready, mounting optimized React app...')
  
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    console.error('❌ Root element not found!')
    return
  }

  const root = ReactDOM.createRoot(rootElement)
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
  
  console.log('✅ Optimized React app mounted successfully')
})

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason)
})