import React, { createContext, useContext, ReactNode } from 'react'

// Simple Toast System - minimal implementation to get app working
interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Simple console log for now - can be enhanced later
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  return <ToastContext.Provider value={{ showToast }}>{children}</ToastContext.Provider>
}
