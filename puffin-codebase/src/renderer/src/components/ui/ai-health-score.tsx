import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnimatedCircularProgressBar } from './animated-circular-progress-bar'
import {
  Brain,
  Activity,
  Warning,
  ArrowClockwise,
  Cpu,
  HardDrives,
  Lightning,
  Thermometer,
  Clock
} from 'phosphor-react'
import { Button } from './button'

// Simplified Health Score to fix white screen
interface PerformanceMetric {
  name: string
  value: number
  status: 'good' | 'warning' | 'critical'
  description: string
}

interface AIHealthScoreProps {
  currentTokens?: number
  maxTokens?: number
  modelMemoryMB?: number
  maxMemoryMB?: number
  hallucinations?: number
  sessionAge?: number
  cpuUsage?: number
  ramUsage?: number
  className?: string
  compact?: boolean
}

const AIHealthScore: React.FC<AIHealthScoreProps> = ({
  currentTokens = 4247,
  maxTokens = 8192,
  modelMemoryMB = 2400,
  maxMemoryMB = 8192,
  hallucinations = 2,
  sessionAge = 45,
  cpuUsage = 68,
  ramUsage = 78,
  className = '',
  compact = false
}) => {
  // Calculate metrics
  const contextUsage = Math.round((currentTokens / maxTokens) * 100)
  const memoryPressure = Math.round((modelMemoryMB / maxMemoryMB) * 100)
  const responseQuality = Math.max(0, 100 - hallucinations * 15)
  const contextFreshness = Math.max(0, 100 - Math.min(sessionAge, 100))

  const [metrics, setMetrics] = useState<PerformanceMetric[]>([
    {
      name: 'Context Window',
      value: contextUsage,
      status: contextUsage > 85 ? 'critical' : contextUsage > 70 ? 'warning' : 'good',
      description: `${currentTokens.toLocaleString()}/${maxTokens.toLocaleString()} tokens`
    },
    {
      name: 'Model Memory',
      value: memoryPressure,
      status: memoryPressure > 80 ? 'critical' : memoryPressure > 60 ? 'warning' : 'good',
      description: `${modelMemoryMB}MB/${maxMemoryMB}MB`
    },
    {
      name: 'CPU Usage',
      value: 100 - cpuUsage,
      status: cpuUsage > 85 ? 'critical' : cpuUsage > 70 ? 'warning' : 'good',
      description: `${cpuUsage}% used`
    },
    {
      name: 'Response Quality',
      value: responseQuality,
      status: responseQuality < 70 ? 'critical' : responseQuality < 85 ? 'warning' : 'good',
      description: `${hallucinations} issues detected`
    }
  ])

  // Calculate overall score
  const overallScore = Math.round(metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length)

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-500'
      case 'warning':
        return 'text-amber-500'
      case 'critical':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getActionableAdvice = (metric: PerformanceMetric) => {
    switch (metric.name) {
      case 'Context Window':
        if (contextUsage > 85) return `🚨 ${maxTokens - currentTokens} tokens left - Start new chat`
        if (contextUsage > 70) return `⚡ ${maxTokens - currentTokens} tokens remaining`
        return `✅ ${maxTokens - currentTokens} tokens available`
      case 'Model Memory':
        if (memoryPressure > 80) return '🔥 Restart model to free memory'
        return '✅ Memory usage healthy'
      case 'CPU Usage':
        if (cpuUsage > 85) return '🔥 Close other apps to improve performance'
        return '✅ CPU performing well'
      case 'Response Quality':
        if (responseQuality < 70) return `❌ ${hallucinations} issues - Refresh context`
        return '✅ High quality responses'
      default:
        return ''
    }
  }

  // Find critical issues
  const criticalIssues = metrics.filter((m) => m.status === 'critical')

  if (compact) {
    // COMPACT: Only show circular score and label in the center
    return (
      <div
        className={`w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${className}`}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ width: 72, height: 72 }}
        >
          <AnimatedCircularProgressBar
            value={overallScore}
            max={100}
            gaugePrimaryColor={getScoreColor(overallScore)}
            gaugeSecondaryColor="#e5e7eb"
            className="w-16 h-16"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              Health
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Health Score
          </h3>
        </div>

        {/* Main Health Score */}
        <div className="flex justify-center mb-3">
          <AnimatedCircularProgressBar
            value={overallScore}
            max={100}
            gaugePrimaryColor={getScoreColor(overallScore)}
            gaugeSecondaryColor="#e5e7eb"
            className="drop-shadow-sm scale-75"
          />
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400">Overall system performance</p>
      </div>

      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <Warning size={14} className="text-red-500" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">
              Critical Issues ({criticalIssues.length})
            </span>
          </div>
          {criticalIssues.slice(0, 2).map((metric) => (
            <div key={metric.name} className="text-xs text-red-600 dark:text-red-400 mb-1">
              • {metric.name}: {getActionableAdvice(metric)}
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {metric.name}
              </span>
              <span className={`text-xs font-semibold ${getStatusColor(metric.status)}`}>
                {metric.value}%
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
              <motion.div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: getScoreColor(metric.value) }}
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">{metric.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        {criticalIssues.length > 0 && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="destructive"
              size="sm"
              className="w-full text-xs bg-red-600 text-white hover:bg-red-700"
            >
              🚨 FIX {criticalIssues[0].name.toUpperCase()}
            </Button>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
            >
              <ArrowClockwise size={12} className="mr-1" />
              Optimize
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
            >
              <Activity size={12} className="mr-1" />
              New Chat
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default AIHealthScore
