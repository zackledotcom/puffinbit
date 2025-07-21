import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function toast({ title, description, variant = 'default' }: Omit<Toast, 'id'>) {
  console.log(`Toast: ${title} - ${description}`)
  // For now, just log to console. You can implement actual toast UI later
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { ...toast, id }])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  return {
    toast: addToast,
    toasts,
    dismiss: (id: string) => setToasts(prev => prev.filter(t => t.id !== id))
  }
}