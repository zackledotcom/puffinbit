/**
 * PHASE 1 FIX: Shared Zod Validation Schemas for IPC Safety
 * Ensures type safety across main/renderer process boundary
 */

import { z } from 'zod'

// ======================
// Core Types Validation
// ======================

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system', 'error'])

export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().min(1, 'Message content cannot be empty'),
})

export const ChatHistorySchema = z.array(ChatMessageSchema).max(100, 'Chat history too long')

// ======================
// IPC Request Validation
// ======================

export const ChatRequestSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long (max 10000 characters)'),
  model: z.string()
    .min(1, 'Model name required')
    .regex(/^[a-zA-Z0-9.:_-]+$/, 'Invalid model name format'),
  history: ChatHistorySchema.optional(),
  mode: z.enum(['chat', 'creative', 'precise']).default('chat'),
  memoryOptions: z.object({
    enabled: z.boolean().default(false),
    contextLength: z.number().int().min(0).max(8192).default(2048),
    smartFilter: z.boolean().default(true),
    debugMode: z.boolean().default(false)
  }).optional()
})

export const ModelNameSchema = z.string()
  .min(1, 'Model name cannot be empty')
  .max(100, 'Model name too long')
  .regex(/^[a-zA-Z0-9.:_-]+$/, 'Model name contains invalid characters')

export const SearchQuerySchema = z.string()
  .min(1, 'Search query cannot be empty')
  .max(500, 'Search query too long')

export const SearchLimitSchema = z.number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit cannot exceed 100')

// ======================
// IPC Response Validation
// ======================

export const ServiceStatusResponseSchema = z.object({
  success: z.boolean(),
  connected: z.boolean(),
  message: z.string(),
  version: z.string().optional()
})

export const ModelsResponseSchema = z.object({
  success: z.boolean(),
  models: z.array(z.string()).default([]),
  error: z.string().optional()
})

export const ChatResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  response: z.string().optional(),
  model: z.string().optional(),
  timestamp: z.string().optional(),
  memoryContext: z.any().optional(),
  error: z.string().optional()
})

export const GenericResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional()
})

// ======================
// Validation Helper Functions
// ======================

export function validateChatRequest(data: unknown): { 
  success: true; 
  data: z.infer<typeof ChatRequestSchema> 
} | { 
  success: false; 
  error: string 
} {
  try {
    const validated = ChatRequestSchema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return { success: false, error: `Validation failed: ${errorMessages}` }
    }
    return { success: false, error: 'Unknown validation error' }
  }
}

export function validateModelName(modelName: unknown): { 
  success: true; 
  data: string 
} | { 
  success: false; 
  error: string 
} {
  try {
    const validated = ModelNameSchema.parse(modelName)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid model name' }
    }
    return { success: false, error: 'Model name validation failed' }
  }
}

export function validateSearchQuery(query: unknown, limit: unknown = 5): { 
  success: true; 
  data: { query: string; limit: number } 
} | { 
  success: false; 
  error: string 
} {
  try {
    const validatedQuery = SearchQuerySchema.parse(query)
    const validatedLimit = SearchLimitSchema.parse(limit)
    return { success: true, data: { query: validatedQuery, limit: validatedLimit } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => err.message).join(', ')
      return { success: false, error: errorMessages }
    }
    return { success: false, error: 'Search validation failed' }
  }
}

// ======================
// Type Exports
// ======================

export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type ServiceStatusResponse = z.infer<typeof ServiceStatusResponseSchema>
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export type GenericResponse = z.infer<typeof GenericResponseSchema>
