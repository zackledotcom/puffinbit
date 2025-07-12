import React from 'react'
import {
  BatteryMedium as Battery,
  BatteryLow,
  Warning,
  CheckCircle,
  Clock,
  Brain
} from 'phosphor-react'
import { Badge } from './ui/badge'
import type { MemoryStore } from '../types/chat'

interface MemoryHealthIndicatorProps {
  memoryStore: MemoryStore | null
  className?: string
}

interface MemoryHealth {
  level: number // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical' | 'unknown'
  indicators: {
    utilization: number // 0-100
    freshness: number // 0-100, based on last update
    coherence: number // 0-100, based on summary count vs threshold
    hallucination_risk: number // 0-100, based on age and density
  }
  recommendations: string[]
  color: string
  icon: React.ReactNode
}

const MemoryHealthIndicator: React.FC<MemoryHealthIndicatorProps> = ({
  memoryStore,
  className = ''
}) => {
  const calculateMemoryHealth = (store: MemoryStore): MemoryHealth => {
    const now = new Date()
    const lastUpdated = new Date(store.lastUpdated)
    const expiresAt = new Date(store.expiresAt)

    // Calculate utilization (0-100)
    const utilization = Math.min((store.summaries.length / store.maxSummaries) * 100, 100)

    // Calculate freshness (0-100, decreases over time)
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)
    const freshness = Math.max(0, 100 - (hoursSinceUpdate / 24) * 10) // Decrease 10% per day

    // Calculate coherence (0-100, based on summary density)
    const avgMessagesPerSummary =
      store.summaries.length > 0
        ? store.summaries.reduce((acc, s) => acc + s.messageCount, 0) / store.summaries.length
        : 0
    const coherence = Math.min((avgMessagesPerSummary / 20) * 100, 100) // Optimal around 20 messages per summary

    // Calculate hallucination risk (0-100, higher = more risk)
    const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    const ageRisk = Math.max(0, ((30 - daysUntilExpiry) / 30) * 40) // Age contributes up to 40%
    const densityRisk = utilization > 80 ? (utilization - 80) * 3 : 0 // High density adds risk
    const staleRisk = freshness < 50 ? (50 - freshness) * 0.6 : 0 // Staleness adds risk
    const hallucination_risk = Math.min(ageRisk + densityRisk + staleRisk, 100)

    // Calculate overall health level
    const level = Math.round(freshness * 0.3 + coherence * 0.3 + (100 - hallucination_risk) * 0.4)

    // Determine status
    let status: MemoryHealth['status']
    let color: string
    let icon: React.ReactNode

    if (!store.enabled) {
      status = 'unknown'
      color = 'gray'
      icon = <Brain className="w-4 h-4" />
    } else if (level >= 80) {
      status = 'excellent'
      color = 'green'
      icon = <CheckCircle className="w-4 h-4" />
    } else if (level >= 60) {
      status = 'good'
      color = 'blue'
      icon = <Battery className="w-4 h-4" />
    } else if (level >= 40) {
      status = 'warning'
      color = 'yellow'
      icon = <BatteryLow className="w-4 h-4" />
    } else {
      status = 'critical'
      color = 'red'
      icon = <Warning className="w-4 h-4" />
    }

    // Generate recommendations
    const recommendations: string[] = []
    if (utilization > 90)
      recommendations.push('Memory nearly full - consider clearing old summaries')
    if (freshness < 30)
      recommendations.push('Memory is stale - new conversations will help refresh context')
    if (hallucination_risk > 70)
      recommendations.push('High hallucination risk - verify important responses')
    if (coherence < 40)
      recommendations.push('Memory fragmentation detected - auto-summarization may help')
    if (daysUntilExpiry < 7)
      recommendations.push('Memory expires soon - extend retention or backup important context')

    return {
      level,
      status,
      indicators: {
        utilization,
        freshness,
        coherence,
        hallucination_risk
      },
      recommendations,
      color,
      icon
    }
  }

  if (!memoryStore) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Brain className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Memory Loading...</span>
      </div>
    )
  }

  const health = calculateMemoryHealth(memoryStore)

  const getBatteryIcon = () => {
    const level = health.level
    if (level >= 75) return <Battery className="w-4 h-4" />
    if (level >= 50) return <Battery className="w-4 h-4" />
    if (level >= 25) return <BatteryLow className="w-4 h-4" />
    return <Warning className="w-4 h-4" />
  }

  const getStatusColor = () => {
    switch (health.status) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      title={`Memory Health: ${health.level}%`}
    >
      {/* Battery-style indicator */}
      <div className="relative flex items-center">
        {getBatteryIcon()}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-3 h-1 rounded-sm ${
              health.color === 'green'
                ? 'bg-green-400'
                : health.color === 'blue'
                  ? 'bg-blue-400'
                  : health.color === 'yellow'
                    ? 'bg-yellow-400'
                    : health.color === 'red'
                      ? 'bg-red-400'
                      : 'bg-gray-400'
            }`}
            style={{ width: `${Math.max(health.level * 0.12, 0.2)}rem` }}
          />
        </div>
      </div>

      {/* Status badge */}
      <Badge variant="outline" className={`text-xs px-2 py-1 ${getStatusColor()}`}>
        {health.level}%
      </Badge>

      {/* Detailed tooltip content for advanced users */}
      <div className="hidden group-hover:block absolute z-50 w-64 p-3 bg-white border rounded-lg shadow-lg">
        <div className="space-y-2">
          <div className="font-medium">Memory Health Details</div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Utilization:</span>
              <span className="ml-1 font-medium">{health.indicators.utilization.toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Freshness:</span>
              <span className="ml-1 font-medium">{health.indicators.freshness.toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Coherence:</span>
              <span className="ml-1 font-medium">{health.indicators.coherence.toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Risk:</span>
              <span className="ml-1 font-medium">
                {health.indicators.hallucination_risk.toFixed(0)}%
              </span>
            </div>
          </div>

          {health.recommendations.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs font-medium text-gray-700 mb-1">Recommendations:</div>
              <ul className="text-xs space-y-1">
                {health.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-gray-600">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MemoryHealthIndicator
