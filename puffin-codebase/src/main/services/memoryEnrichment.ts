import { MemorySummary, Message } from '../../types/chat'

export interface ContextEnrichmentOptions {
  enabled: boolean
  maxSummaries: number
  maxKeyFacts: number
  includeTopics: boolean
  debugMode: boolean
}

export interface EnrichmentResult {
  enrichedPrompt: string
  injectedContext: {
    summaries: MemorySummary[]
    keyFacts: string[]
    topics: string[]
  }
  originalPrompt: string
  contextLength: number
}

/**
 * Universal memory enrichment for ALL model calls
 * This is the core RAG function that should be used everywhere
 */
export function enrichPromptWithMemory(
  userPrompt: string,
  memorySummaries: MemorySummary[],
  options: Partial<ContextEnrichmentOptions> = {}
): EnrichmentResult {
  const opts: ContextEnrichmentOptions = {
    enabled: true,
    maxSummaries: 3,
    maxKeyFacts: 10,
    includeTopics: true,
    debugMode: false,
    ...options
  }

  const result: EnrichmentResult = {
    enrichedPrompt: userPrompt,
    injectedContext: {
      summaries: [],
      keyFacts: [],
      topics: []
    },
    originalPrompt: userPrompt,
    contextLength: 0
  }

  if (!opts.enabled || memorySummaries.length === 0) {
    return result
  }

  // Get recent relevant summaries
  const recentSummaries = memorySummaries
    .slice(-opts.maxSummaries)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Extract key facts across all summaries
  const allKeyFacts = memorySummaries
    .flatMap((summary) => summary.keyFacts)
    .slice(-opts.maxKeyFacts)

  // Extract unique topics
  const allTopics = [...new Set(memorySummaries.flatMap((summary) => summary.topics))]

  result.injectedContext = {
    summaries: recentSummaries,
    keyFacts: allKeyFacts,
    topics: allTopics
  }

  // Build enriched prompt with structured context injection
  let contextBlocks: string[] = []

  // Add conversation context
  if (recentSummaries.length > 0) {
    const contextText = recentSummaries.map((summary) => `• ${summary.summary}`).join('\n')
    contextBlocks.push(`[Previous conversation context:\n${contextText}]`)
  }

  // Add key facts
  if (allKeyFacts.length > 0) {
    const factsText = allKeyFacts.map((fact) => `• ${fact}`).join('\n')
    contextBlocks.push(`[Key context from past conversations:\n${factsText}]`)
  }

  // Add topics (if enabled)
  if (opts.includeTopics && allTopics.length > 0) {
    const topicsText = allTopics.slice(0, 8).join(', ')
    contextBlocks.push(`[Related topics: ${topicsText}]`)
  }

  // Construct final prompt
  if (contextBlocks.length > 0) {
    const contextSection = contextBlocks.join('\n\n')
    result.enrichedPrompt = `${contextSection}\n\n${userPrompt}`
    result.contextLength = contextSection.length
  }

  return result
}

/**
 * Create debug-friendly context display for UI
 */
export function createContextDebugInfo(enrichmentResult: EnrichmentResult): string {
  const { injectedContext, contextLength } = enrichmentResult

  const lines = [
    `Context injected: ${contextLength} characters`,
    `Summaries used: ${injectedContext.summaries.length}`,
    `Key facts used: ${injectedContext.keyFacts.length}`,
    `Topics available: ${injectedContext.topics.length}`,
    '',
    'Injected summaries:',
    ...injectedContext.summaries.map((s) => `  • ${s.summary.substring(0, 100)}...`),
    '',
    'Key facts:',
    ...injectedContext.keyFacts.map((f) => `  • ${f}`),
    '',
    'Topics:',
    `  ${injectedContext.topics.join(', ')}`
  ]

  return lines.join('\n')
}

/**
 * Smart context filtering based on prompt relevance
 */
export function filterRelevantContext(
  userPrompt: string,
  memorySummaries: MemorySummary[]
): MemorySummary[] {
  const promptLower = userPrompt.toLowerCase()
  const promptWords = promptLower.split(/\s+/).filter((word) => word.length > 3)

  // Score summaries by relevance to current prompt
  const scoredSummaries = memorySummaries.map((summary) => {
    let score = 0
    const summaryText =
      `${summary.summary} ${summary.keyFacts.join(' ')} ${summary.topics.join(' ')}`.toLowerCase()

    // Word overlap scoring
    promptWords.forEach((word) => {
      if (summaryText.includes(word)) {
        score += 1
      }
    })

    // Topic relevance scoring
    summary.topics.forEach((topic) => {
      if (promptLower.includes(topic.toLowerCase())) {
        score += 2
      }
    })

    // Recency bonus (more recent = slightly higher score)
    const ageInDays = (Date.now() - new Date(summary.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    const recencyBonus = Math.max(0, 1 - ageInDays / 30) * 0.5 // Decay over 30 days
    score += recencyBonus

    return { summary, score }
  })

  // Return top relevant summaries
  return scoredSummaries
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.summary)
}

/**
 * Universal enrichment wrapper for ANY model call
 */
export async function withMemoryEnrichment<T>(
  operation: (enrichedPrompt: string) => Promise<T>,
  userPrompt: string,
  memorySummaries: MemorySummary[],
  options: Partial<ContextEnrichmentOptions> = {}
): Promise<{
  result: T
  enrichmentInfo: EnrichmentResult
}> {
  const enrichmentResult = enrichPromptWithMemory(userPrompt, memorySummaries, options)
  const result = await operation(enrichmentResult.enrichedPrompt)

  return {
    result,
    enrichmentInfo: enrichmentResult
  }
}
