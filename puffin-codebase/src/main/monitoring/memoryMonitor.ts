/**
 * Memory Monitoring System for Puffer
 *
 * @author Puffer Engineering Team
 * @version 1.0.0
 */

import { logger } from '@utils/logger'

export interface MemoryMetrics {
  heapUsed: number
  heapTotal: number
  heapUsedPercent: number
  timestamp: Date
}

export class MemoryMonitor {
  private static instance: MemoryMonitor
  private isMonitoring = false

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor()
    }
    return MemoryMonitor.instance
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true

    setInterval(() => {
      this.collectMetrics()
    }, intervalMs)

    logger.success(
      `Memory monitoring started with ${intervalMs}ms interval`,
      undefined,
      'memory-monitor'
    )
  }

  private collectMetrics(): void {
    const usage = process.memoryUsage()
    const metrics: MemoryMetrics = {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      heapUsedPercent: (usage.heapUsed / usage.heapTotal) * 100,
      timestamp: new Date()
    }

    if (metrics.heapUsedPercent > 80) {
      logger.warn(
        `High memory usage: ${metrics.heapUsedPercent.toFixed(1)}%`,
        metrics,
        'memory-monitor'
      )

      if (global.gc) {
        global.gc()
        logger.info('Forced garbage collection', undefined, 'memory-monitor')
      }
    }
  }

  getMemoryStats(): MemoryMetrics {
    const usage = process.memoryUsage()
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      heapUsedPercent: (usage.heapUsed / usage.heapTotal) * 100,
      timestamp: new Date()
    }
  }
}

export function initializeMemoryMonitoring(): MemoryMonitor {
  const monitor = MemoryMonitor.getInstance()
  monitor.startMonitoring(30000)
  logger.success('Memory monitoring system initialized', undefined, 'memory-monitor')
  return monitor
}

export const memoryMonitor = MemoryMonitor.getInstance()
