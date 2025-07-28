import { create } from 'zustand'

interface ServiceMetrics {
  serviceName: string
  status: 'running' | 'degraded' | 'failed' | 'starting'
  latency: {
    p50: number
    p95: number
    p99: number
    average: number
  }
  throughput: {
    rps: number
    rpm: number
  }
  errors: {
    errorRate: number
    totalErrors: number
  }
  resources: {
    memoryMB: number
    maxMemoryMB: number
    connections: number
    maxConnections: number
  }
  circuitBreaker: {
    state: 'closed' | 'open' | 'half-open'
    failures: number
  }
}

interface GoogleMonitoringState {
  // Service metrics
  services: ServiceMetrics[]
  lastUpdate: Date | null
  
  // Performance tracking
  chatLatencies: number[]
  totalRequests: number
  totalErrors: number
  
  // Dashboard state
  showDashboard: boolean
  autoRefresh: boolean
  refreshInterval: number
  
  // Actions
  updateServiceMetrics: (metrics: ServiceMetrics[]) => void
  recordChatLatency: (latency: number) => void
  recordChatError: () => void
  toggleDashboard: () => void
  setAutoRefresh: (enabled: boolean) => void
  
  // Async actions
  fetchMetrics: () => Promise<void>
  startAutoRefresh: () => void
  stopAutoRefresh: () => void
}

export const useGoogleMonitoringStore = create<GoogleMonitoringState>((set, get) => {
  let refreshTimer: NodeJS.Timeout | null = null

  return {
    // State
    services: [],
    lastUpdate: null,
    chatLatencies: [],
    totalRequests: 0,
    totalErrors: 0,
    showDashboard: false,
    autoRefresh: true,
    refreshInterval: 5000,

    // Actions
    updateServiceMetrics: (metrics: ServiceMetrics[]) => set({
      services: metrics,
      lastUpdate: new Date()
    }),

    recordChatLatency: (latency: number) => set((state) => ({
      chatLatencies: [...state.chatLatencies.slice(-99), latency], // Keep last 100
      totalRequests: state.totalRequests + 1
    })),

    recordChatError: () => set((state) => ({
      totalErrors: state.totalErrors + 1
    })),

    toggleDashboard: () => set((state) => ({
      showDashboard: !state.showDashboard
    })),

    setAutoRefresh: (enabled: boolean) => {
      set({ autoRefresh: enabled })
      if (enabled) {
        get().startAutoRefresh()
      } else {
        get().stopAutoRefresh()
      }
    },

    // Async actions
    fetchMetrics: async () => {
      try {
        const metrics = await window.api.getGooglePerformanceMetrics()
        get().updateServiceMetrics(metrics.services || [])
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      }
    },

    startAutoRefresh: () => {
      const { fetchMetrics, refreshInterval } = get()
      
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
      
      refreshTimer = setInterval(() => {
        fetchMetrics()
      }, refreshInterval)
    },

    stopAutoRefresh: () => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
        refreshTimer = null
      }
    }
  }
})