// src/renderer/src/stores/useCanvasModeStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { subscribeWithSelector } from 'zustand/middleware'

interface CanvasTrigger {
  id: string
  type: 'auto' | 'manual'
  reason: string
  timestamp: Date
  chatMessageId?: string
  codeSnippet?: string
  confidence?: number
}

interface CanvasModeState {
  // Core canvas mode state
  canvasMode: boolean
  
  // Triggering system
  triggers: CanvasTrigger[]
  autoTriggerEnabled: boolean
  autoTriggerThreshold: number // confidence threshold for auto-triggering
  
  // Canvas integration settings
  bidirectionalSync: boolean
  instantTransitions: boolean
  securityMode: 'strict' | 'standard' | 'permissive'
  
  // Mode switching
  lastModeSwitch: Date | null
  transitionInProgress: boolean
  
  // Actions
  setCanvasMode: (enabled: boolean, trigger?: Omit<CanvasTrigger, 'id' | 'timestamp'>) => void
  toggleCanvasMode: () => void
  enableAutoTrigger: (enabled: boolean) => void
  setAutoTriggerThreshold: (threshold: number) => void
  setSecurityMode: (mode: 'strict' | 'standard' | 'permissive') => void
  setBidirectionalSync: (enabled: boolean) => void
  setInstantTransitions: (enabled: boolean) => void
  addTrigger: (trigger: Omit<CanvasTrigger, 'id' | 'timestamp'>) => void
  clearTriggers: () => void
  getLastTrigger: () => CanvasTrigger | null
}

export const useCanvasModeStore = create<CanvasModeState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        canvasMode: false,
        triggers: [],
        autoTriggerEnabled: true,
        autoTriggerThreshold: 0.5, // 50% confidence threshold - more sensitive
        bidirectionalSync: true,
        instantTransitions: true,
        securityMode: 'standard',
        lastModeSwitch: null,
        transitionInProgress: false,
        
        // Core canvas mode control
        setCanvasMode: (enabled: boolean, trigger) => {
          const currentState = get()
          
          // Prevent rapid toggling
          if (currentState.transitionInProgress) {
            console.warn('🔄 Canvas mode transition already in progress')
            return
          }
          
          set({ transitionInProgress: true })
          
          // Add trigger to history if provided
          if (trigger) {
            const newTrigger: CanvasTrigger = {
              ...trigger,
              id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date()
            }
            
            set(state => ({ 
              triggers: [...state.triggers.slice(-9), newTrigger] // Keep last 10 triggers
            }))
          }
          
          // Apply mode change with smooth transition
          if (currentState.instantTransitions) {
            set({ 
              canvasMode: enabled, 
              lastModeSwitch: new Date(),
              transitionInProgress: false 
            })
          } else {
            // Delayed transition for smoother UX
            setTimeout(() => {
              set({ 
                canvasMode: enabled, 
                lastModeSwitch: new Date(),
                transitionInProgress: false 
              })
            }, 150)
          }
          
          console.log(`🎨 Canvas mode ${enabled ? 'activated' : 'deactivated'}`, trigger?.reason)
        },
        
        toggleCanvasMode: () => {
          const { canvasMode, setCanvasMode } = get()
          setCanvasMode(!canvasMode, {
            type: 'manual',
            reason: 'User manually toggled Canvas mode'
          })
        },
        
        // Auto-trigger configuration
        enableAutoTrigger: (enabled: boolean) => {
          set({ autoTriggerEnabled: enabled })
          console.log(`🤖 Auto-trigger ${enabled ? 'enabled' : 'disabled'}`)
        },
        
        setAutoTriggerThreshold: (threshold: number) => {
          const clampedThreshold = Math.max(0.1, Math.min(1.0, threshold))
          set({ autoTriggerThreshold: clampedThreshold })
          console.log(`🎯 Auto-trigger threshold set to ${clampedThreshold}`)
        },
        
        // Security configuration
        setSecurityMode: (mode: 'strict' | 'standard' | 'permissive') => {
          set({ securityMode: mode })
          console.log(`🔒 Security mode set to ${mode}`)
        },
        
        // Integration settings
        setBidirectionalSync: (enabled: boolean) => {
          set({ bidirectionalSync: enabled })
          console.log(`🔄 Bidirectional sync ${enabled ? 'enabled' : 'disabled'}`)
        },
        
        setInstantTransitions: (enabled: boolean) => {
          set({ instantTransitions: enabled })
          console.log(`⚡ Instant transitions ${enabled ? 'enabled' : 'disabled'}`)
        },
        
        // Trigger management
        addTrigger: (trigger) => {
          const newTrigger: CanvasTrigger = {
            ...trigger,
            id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
          }
          
          set(state => ({ 
            triggers: [...state.triggers.slice(-9), newTrigger] // Keep last 10 triggers
          }))
        },
        
        clearTriggers: () => {
          set({ triggers: [] })
          console.log('🗑️ Canvas triggers cleared')
        },
        
        getLastTrigger: () => {
          const { triggers } = get()
          return triggers.length > 0 ? triggers[triggers.length - 1] : null
        }
      }),
      {
        name: 'puffin-canvas-mode',
        partialize: (state) => ({
          autoTriggerEnabled: state.autoTriggerEnabled,
          autoTriggerThreshold: state.autoTriggerThreshold,
          bidirectionalSync: state.bidirectionalSync,
          instantTransitions: state.instantTransitions,
          securityMode: state.securityMode,
          triggers: state.triggers.slice(-5) // Persist only last 5 triggers
        }),
      }
    )
  )
)
