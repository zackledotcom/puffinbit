/**
 * Service Health Monitoring System for Puffer
 *
 * @author Puffer Engineering Team
 * @version 1.0.0
 */

import { logger } from '@utils/logger'

export interface ServiceConfig {
  name: string
  url: string
  healthEndpoint: string
  timeout: number
}

export class HealthMonitor {
  private static instance: HealthMonitor

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor()
    }
    return HealthMonitor.instance
  }

  async checkServiceHealth(config: ServiceConfig): Promise<boolean> {
    try {
      const axios = require('axios')
      await axios.get(config.url + config.healthEndpoint, { timeout: config.timeout })
      return true
    } catch (error) {
      logger.warn(`Health check failed for ${config.name}`, error, 'health-monitor')
      return false
    }
  }
}

export function initializeHealthMonitoring(): HealthMonitor {
  const monitor = HealthMonitor.getInstance()
  logger.success('Health monitoring system initialized', undefined, 'health-monitor')
  return monitor
}

export const healthMonitor = HealthMonitor.getInstance()
