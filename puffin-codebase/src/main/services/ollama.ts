import axios from 'axios'
import path from 'path'
import fs from 'fs/promises'
import { z } from 'zod'
import { trackPerformanceEvent, shouldCollectTelemetry } from '@utils/telemetryUtils'
import { encrypt, decrypt } from '@utils/encryption'
import type { Message, MemorySummary } from '../../types/chat'

// Force IPv4 to avoid IPv6 connection issues
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

// Create axios instance with IPv4 preference
const ollamaAxios = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 30000,
  family: 4 // Force IPv4
})
const SUMMARIZATION_MODEL = 'tinydolphin:latest' // Fast model for summarization
const PROMPT_VERSION = '1.2'
const AUDIT_LOG_PATH = path.resolve(__dirname, 'summarization_audit.log')

/**
 * Zod schema for Message type validation
 */
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'error']),
  content: z.string(),
  id: z.string().optional(),
  timestamp: z.string().optional()
})

/**
 * Zod schema for MemorySummary validation
 */
const MemorySummarySchema = z.object({
  id: z.string(),
  summary: z.string(),
  topics: z.array(z.string()),
  keyFacts: z.array(z.string()),
  createdAt: z.string(),
  messageCount: z.number().int().nonnegative()
})

/**
 * Zod schema for summarization model response validation
 */
const SummarizationModelResponseSchema = z.object({
  summary: z.string(),
  keyFacts: z.array(z.string()),
  topics: z.array(z.string())
})

/**
 * Interface for summarization result with validation
 */
interface SummarizationResult {
  success: boolean
  summary?: MemorySummary
  error?: string
}

/**
 * Append an encrypted audit log entry asynchronously.
 * Logs prompt, model, user info, response or error, timestamp, and prompt version.
 * @param entry Object containing audit log details including promptVersion
 */
async function appendAuditLog(entry: {
  prompt: string
  model: string
  user: string
  response?: string
  error?: string
  timestamp: string
  promptVersion: string
}): Promise<void> {
  try {
    const serialized = JSON.stringify(entry)
    const encrypted = await encrypt(serialized)
    await fs.appendFile(AUDIT_LOG_PATH, encrypted + '\n', { encoding: 'utf-8' })
  } catch (logError) {
    // Audit logging failure should not interrupt main flow
    console.error('Failed to write audit log:', logError)
  }
}

/**
 * Sanitize content to remove potential PII only - NO content filtering or modification.
 * This function scrubs emails, phone numbers, SSNs, and credit card numbers transparently.
 * @param content Raw message content string
 * @returns Sanitized content string with PII replaced by placeholders
 */
function sanitizeContent(content: string): string {
  // ONLY remove PII patterns - preserve all other content exactly as is
  let sanitized = content
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    // Remove phone numbers (US format, basic)
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
    // Remove SSN patterns
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]')
    // Remove credit card patterns (Visa, MC, AmEx generic pattern)
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD]')
  // DO NOT modify any other content - preserve exact meaning and intent
  return sanitized
}

/**
 * Extract topics from validated message content.
 * Uses frequency of words longer than 4 characters excluding common keywords.
 * @param messages Array of validated Message objects
 * @returns Array of top 5 topic strings
 */
function extractTopics(messages: Message[]): string[] {
  const content = messages.map((m) => m.content).join(' ')
  const words = content.toLowerCase().split(/\W+/)
  const excludedWords = new Set(['function', 'return', 'const', 'variable'])
  const topicWords = words.filter((word) => word.length > 4 && !excludedWords.has(word))

  const frequency = topicWords.reduce<Record<string, number>>((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {})

  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word)
}

/**
 * Generate summarization prompt - NO alignment filters or content modification.
 * Preserves semantics and intent transparently.
 * Includes prompt version header for tracking.
 * @param messages Array of validated Message objects
 * @returns Prompt string for summarization model including version header
 */
function createSummarizationPrompt(messages: Message[]): string {
  const sanitizedMessages = messages.map((msg) => ({
    ...msg,
    content: sanitizeContent(msg.content) // Only PII removal, nothing else
  }))

  const conversationText = sanitizedMessages.map((msg) => `${msg.type}: ${msg.content}`).join('\n')

  return `Prompt-Version: ${PROMPT_VERSION}

You are a conversation summarizer. Create an accurate summary of this conversation preserving the exact meaning and intent.

INSTRUCTIONS:
- Summarize the conversation accurately without modification
- Preserve the original topics, viewpoints, and intent exactly as expressed
- Extract key facts and preferences as stated, without interpretation
- Keep summary under 200 words
- Identify main topics discussed
- Do not add commentary, moral judgments, or filters

Conversation:
${conversationText}

Respond with JSON in this exact format:
{
  "summary": "Accurate summary preserving original meaning and intent",
  "keyFacts": ["fact1", "fact2", "fact3"],
  "topics": ["topic1", "topic2", "topic3"]
}

JSON Response:`
}

/**
 * Send telemetry data for summarization events.
 *
 * This function collects the following data:
 * - Duration of summarization operations (in milliseconds)
 * - Estimated token count processed
 * - Success/failure status of the operation
 *
 * No personal data or message content is collected. All telemetry is anonymous
 * and used only to improve application performance and reliability.
 *
 * Telemetry is opt-in and can be disabled in application settings.
 *
 * @param params Object containing duration (ms), tokenCount (estimated), and success status
 */
async function trackSummaryEvent(params: {
  duration: number
  tokenCount: number
  success: boolean
}): Promise<void> {
  try {
    // Check if telemetry collection is enabled using the centralized utility
    const shouldCollect = await shouldCollectTelemetry()
    if (!shouldCollect) {
      return
    }

    // Track the performance event using the centralized telemetry system
    await trackPerformanceEvent(params)
  } catch (error) {
    // Silently fail if telemetry collection fails - should never block main functionality
    console.error('Telemetry collection failed:', error)
  }
}

/**
 * Retrieve the list of available models from Ollama API.
 * @returns Promise resolving to array of available model name strings
 */
async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await ollamaAxios.get('/api/tags')
    if (Array.isArray(response.data.models)) {
      return response.data.models
        .map((m: any) => (m && typeof m.name === 'string' ? m.name : null))
        .filter((name: string | null): name is string => name !== null)
    }
    return []
  } catch (error) {
    console.error('Failed to fetch available models:', error)
    return []
  }
}

/**
 * Determine the best summarization model to use.
 * Prefers the default SUMMARIZATION_MODEL if available, otherwise falls back to 'llama3:latest'.
 * @returns Promise resolving to the chosen model name string
 */
async function getBestSummaryModel(): Promise<string> {
  const availableModels = await getAvailableModels()
  if (availableModels.includes(SUMMARIZATION_MODEL)) {
    return SUMMARIZATION_MODEL
  }
  if (availableModels.includes('llama3:latest')) {
    return 'llama3:latest'
  }
  // If no preferred models found, fallback to default SUMMARIZATION_MODEL anyway
  return SUMMARIZATION_MODEL
}

/**
 * Summarize an array of messages using Ollama with retries and backoff.
 * Logs all attempts with encrypted audit logs.
 * Sends telemetry data after each attempt with duration, token count, and success status.
 * Uses best available summarization model with fallback.
 * @param messages Array of Message objects to summarize
 * @param model Optional model name string (default: SUMMARIZATION_MODEL) - ignored, best model is used internally
 * @param user Optional user identifier string for audit logging (default: 'unknown_user')
 * @returns Promise resolving to SummarizationResult object
 */
export async function summarizeMessages(
  messages: Message[],
  model: string = SUMMARIZATION_MODEL,
  user: string = 'unknown_user'
): Promise<SummarizationResult> {
  // Validate input messages array and each message
  if (!Array.isArray(messages) || messages.length === 0) {
    return { success: false, error: 'No messages to summarize' }
  }
  try {
    messages.forEach((msg, i) => {
      const parsed = MessageSchema.safeParse(msg)
      if (!parsed.success) {
        throw new Error(`Invalid message at index ${i}: ${parsed.error.message}`)
      }
    })
  } catch (validationError) {
    return {
      success: false,
      error: `Message validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`
    }
  }

  // Filter user and assistant messages only
  const userAndAssistantMessages = messages.filter(
    (msg) => msg.type === 'user' || msg.type === 'assistant'
  )

  if (userAndAssistantMessages.length < 2) {
    return { success: false, error: 'Insufficient conversation for summarization' }
  }

  const prompt = createSummarizationPrompt(userAndAssistantMessages)
  const timestamp = new Date().toISOString()

  const maxRetries = 3
  let attempt = 0
  let lastError: unknown = null

  // Determine best model to use
  const chosenModel = await getBestSummaryModel()

  // Estimate token count based on message content lengths / 4
  const totalContentLength = userAndAssistantMessages.reduce(
    (sum, msg) => sum + msg.content.length,
    0
  )
  const estimatedTokenCount = Math.ceil(totalContentLength / 4)

  while (attempt < maxRetries) {
    const startTime = Date.now()
    try {
      attempt++
      console.log(`🧠 Summarizing attempt ${attempt} with model ${chosenModel}...`)

      const response = await ollamaAxios.post(
        '/api/generate',
        {
          model: chosenModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent summaries
            top_p: 0.8,
            top_k: 20,
            num_predict: 300 // Limit response length
          }
        },
        { timeout: 30000 }
      )

      if (!response.data?.response) {
        throw new Error('No response from summarization model')
      }

      // Extract JSON substring safely
      const jsonMatch = response.data.response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in model response')
      }

      let parsedResponse: unknown
      try {
        parsedResponse = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        throw new Error('Invalid JSON response from model')
      }

      // Validate response schema strictly
      const parsed = SummarizationModelResponseSchema.safeParse(parsedResponse)
      if (!parsed.success) {
        throw new Error(`Invalid summary structure: ${parsed.error.message}`)
      }

      // Create memory summary object
      const memorySummary: MemorySummary = {
        id: `summary_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        content: userAndAssistantMessages.map((msg) => msg.content).join(' '),
        summary: parsed.data.summary,
        topics: parsed.data.topics,
        keyFacts: parsed.data.keyFacts,
        timestamp: new Date(timestamp),
        importance: 1
      }

      // Validate memory summary before returning
      const memSummaryValidation = MemorySummarySchema.safeParse(memorySummary)
      if (!memSummaryValidation.success) {
        throw new Error(
          `Generated memory summary validation failed: ${memSummaryValidation.error.message}`
        )
      }

      // Audit log success with encrypted prompt and response including prompt version
      await appendAuditLog({
        prompt,
        model: chosenModel,
        user,
        response: JSON.stringify(parsed.data),
        timestamp,
        promptVersion: PROMPT_VERSION
      })

      const duration = Date.now() - startTime
      await trackSummaryEvent({ duration, tokenCount: estimatedTokenCount, success: true })

      console.log('✅ Successfully created memory summary')
      return { success: true, summary: memorySummary }
    } catch (error) {
      lastError = error
      const duration = Date.now() - startTime
      await trackSummaryEvent({ duration, tokenCount: estimatedTokenCount, success: false })

      console.error(`❌ Summarization attempt ${attempt} failed:`, error)
      // Audit log failure with encrypted prompt and error including prompt version
      await appendAuditLog({
        prompt,
        model: chosenModel,
        user,
        error: error instanceof Error ? error.message : String(error),
        timestamp,
        promptVersion: PROMPT_VERSION
      })
      // Exponential backoff delay before retrying
      if (attempt < maxRetries) {
        const delayMs = 1000 * 2 ** (attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  // After retries exhausted, return failure
  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : 'Unknown summarization error'
  }
}

/**
 * Check if Ollama model supports summarization by validating model existence.
 * @param model Model name string to validate
 * @returns Promise resolving to boolean indicating model availability
 */
export async function validateSummarizationModel(model: string): Promise<boolean> {
  try {
    const response = await ollamaAxios.get('/api/tags')
    const availableModels = Array.isArray(response.data.models)
      ? response.data.models.map((m: any) => m.name).filter((n: unknown) => typeof n === 'string')
      : []
    return availableModels.includes(model)
  } catch (error) {
    console.error('Failed to validate summarization model:', error)
    return false
  }
}

/**
 * Generate context-enriched prompt for chat by transparently injecting memory summaries and key facts.
 * Does not modify or filter any content, preserving original semantics.
 * @param userPrompt Raw user prompt string
 * @param memorySummaries Array of validated MemorySummary objects
 * @returns Enriched prompt string with transparent context injection
 */
export function enrichPromptWithMemory(
  userPrompt: string,
  memorySummaries: MemorySummary[]
): string {
  if (!Array.isArray(memorySummaries) || memorySummaries.length === 0) {
    return userPrompt
  }

  // Validate each memory summary before use
  for (let i = 0; i < memorySummaries.length; i++) {
    const validation = MemorySummarySchema.safeParse(memorySummaries[i])
    if (!validation.success) {
      console.warn(`Invalid memory summary at index ${i}: ${validation.error.message}`)
      // Skip invalid summaries from injection
      memorySummaries.splice(i, 1)
      i--
    }
  }

  if (memorySummaries.length === 0) {
    return userPrompt
  }

  // Use recent summaries for context - inject transparently without modification
  const contextSummaries = memorySummaries.slice(-3) // Last 3 summaries
  const keyFacts = memorySummaries.flatMap((summary) => summary.keyFacts).slice(-10) // Last 10 key facts

  let enrichedPrompt = userPrompt

  // Transparently inject memory context at the beginning
  if (contextSummaries.length > 0) {
    const contextText = contextSummaries.map((summary) => summary.summary).join('\n')
    enrichedPrompt = `[Previous conversation context: ${contextText}]\n\n${userPrompt}`
  }

  if (keyFacts.length > 0) {
    enrichedPrompt = `[Key context from past conversations: ${keyFacts.join('; ')}]\n\n${enrichedPrompt}`
  }

  return enrichedPrompt
}
