import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, Warning, Info, WarningCircle } from 'phosphor-react'
import { cn } from '@/lib/utils'

export interface Toast {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: React.ReactNode
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }

    setToasts((prev) => [...prev, newToast])

    // Auto dismiss after duration
    if (toast.duration !== Infinity) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const dismissToast = useCallback(
    (id: string) => {
      removeToast(id)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

interface ToastComponentProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const ToastComponent: React.FC<ToastComponentProps> = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" weight="fill" />
      case 'error':
        return <WarningCircle size={20} className="text-red-500" weight="fill" />
      case 'warning':
        return <Warning size={20} className="text-orange-500" weight="fill" />
      case 'info':
      default:
        return <Info size={20} className="text-blue-500" weight="fill" />
    }
  }

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-green-500'
      case 'error':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-orange-500'
      case 'info':
      default:
        return 'border-l-blue-500'
    }
  }

  return (
    <div
      className={cn(
        'glass-card border-l-4 p-4 rounded-xl shadow-lg animate-in slide-in-from-top-2 fade-in duration-300',
        getBorderColor()
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-foreground text-sm mb-1">{toast.title}</div>
          )}
          {toast.description && <div className="text-grey-dark text-sm">{toast.description}</div>}
          {toast.action && <div className="mt-3">{toast.action}</div>}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="glass-button h-6 w-6 p-0 rounded-lg hover:bg-grey-medium/50 transition-colors duration-200"
        >
          <X size={14} className="text-grey-dark" />
        </button>
      </div>
    </div>
  )
}
