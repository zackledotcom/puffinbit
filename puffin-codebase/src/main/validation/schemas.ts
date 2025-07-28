/**
 * Input Validation System for Puffer
 *
 * @author Puffer Security Team
 * @version 1.0.0
 */

import { z } from 'zod'
import { logger } from '@utils/logger'

// Chat message validation
export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(50000),
  model: z.string().min(1).max(100),
  history: z.array(z.any()).optional(),
  memoryOptions: z.object({}).optional()
})

// Settings validation
export const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().length(2).optional(),
  telemetry: z
    .object({
      enabled: z.boolean().optional(),
      collectUsageStats: z.boolean().optional()
    })
    .optional()
})

export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
  }
}

export async function validateChatMessage(data: unknown): Promise<ValidationResult> {
  try {
    const result = ChatMessageSchema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: error.issues[0].message,
          code: 'VALIDATION_ERROR'
        }
      }
    }
    return {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'UNKNOWN_ERROR'
      }
    }
  }
}

export async function validateSettings(data: unknown): Promise<ValidationResult> {
  try {
    const result = SettingsSchema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: error.issues[0].message,
          code: 'VALIDATION_ERROR'
        }
      }
    }
    return {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'UNKNOWN_ERROR'
      }
    }
  }
}

export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (event: any, validatedData: T) => Promise<any>
) {
  return async (event: any, data: unknown) => {
    try {
      const validatedData = schema.parse(data)
      return await handler(event, validatedData)
    } catch (error) {
      logger.warn('Validation failed', { error }, 'validation')
      return {
        success: false,
        error: {
          message: 'Invalid input data',
          code: 'VALIDATION_ERROR'
        }
      }
    }
  }
}
