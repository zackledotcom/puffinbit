/**
 * Telemetry Utilities for Puffer
 *
 * Provides centralized telemetry settings management to resolve
 * circular dependency issues in the codebase.
 *
 * @author Puffer Engineering Team
 * @version 1.0.0
 */

import { logger } from './logger'

export interface TelemetryEventParams {
  duration: number
  tokenCount: number
  success: boolean
}

/**
 * Check if telemetry collection is enabled and allowed
 */
export async function shouldCollectTelemetry(): Promise<boolean> {
  try {
    const { loadSettings } = require('@main/storage')
    const settings = await loadSettings()

    return !!(settings?.telemetry?.enabled && settings?.telemetry?.collectUsageStats)
  } catch (error) {
    logger.warn('Failed to check telemetry settings, defaulting to disabled', error, 'telemetry')
    return false
  }
}

/**
 * Track performance metrics
 */
export async function trackPerformanceEvent(params: TelemetryEventParams): Promise<void> {
  try {
    const shouldCollect = await shouldCollectTelemetry()

    if (!shouldCollect) {
      return
    }

    logger.debug(
      'Performance event tracked',
      {
        duration: params.duration,
        tokenCount: params.tokenCount,
        success: params.success
      },
      'telemetry'
    )
  } catch (error) {
    logger.warn('Failed to track telemetry event', error, 'telemetry')
  }
}
