import { chromaService } from './chromaService'
import { ollamaService } from './ollamaService'
import type { Message, MemorySummary } from '../../types/chat'

interface MemoryEnrichmentOptions {
  enabled: boolean
  contextLength: number
  smartFilter: boolean
  debugMode: boolean
}

interface EnrichmentResult {
  enrichedPrompt: string
  contextUsed: boolean
  contextLength: number
  summariesUsed: number
  keyFactsUsed: number
  debugInfo?: any
}

class MemoryService {
  async enrichPromptWithMemory(
    originalPrompt: string,
    options: MemoryEnrichmentOptions = {
      enabled: true,
      contextLength: 3,
      smartFilter: true,
      debugMode: false
    }
  ): Promise<EnrichmentResult> {
    if (!options.enabled) {
      return {
        enrichedPrompt: originalPrompt,
        contextUsed: false,
        contextLength: 0,
        summariesUsed: 0,
        keyFactsUsed: 0
      }
    }

    try {
      // Search for relevant context in ChromaDB
      const searchResult = await chromaService.searchChatHistory(
        originalPrompt,
        options.contextLength
      )

      if (!searchResult.success || !searchResult.results || searchResult.results.length === 0) {
        return {
          enrichedPrompt: originalPrompt,
          contextUsed: false,
          contextLength: 0,
          summariesUsed: 0,
          keyFactsUsed: 0
        }
      }

      // Build context from relevant conversations
      const relevantContext = searchResult.results.slice(0, options.contextLength).join('\n---\n')

      // Enrich the prompt with context
      const enrichedPrompt = `
Context from previous conversations:
${relevantContext}

Current question: ${originalPrompt}

Please use the context above to provide a more informed response.`

      return {
        enrichedPrompt,
        contextUsed: true,
        contextLength: relevantContext.length,
        summariesUsed: searchResult.results.length,
        keyFactsUsed: 0, // Placeholder
        debugInfo: options.debugMode
          ? {
              originalPrompt,
              contextSources: searchResult.results
            }
          : undefined
      }
    } catch (error) {
      console.error('Memory enrichment failed:', error)

      // Return original prompt if enrichment fails
      return {
        enrichedPrompt: originalPrompt,
        contextUsed: false,
        contextLength: 0,
        summariesUsed: 0,
        keyFactsUsed: 0
      }
    }
  }

  async createMemorySummary(
    messages: Message[]
  ): Promise<{ success: boolean; summary?: MemorySummary; error?: string }> {
    try {
      if (messages.length === 0) {
        return {
          success: false,
          error: 'No messages provided for summarization'
        }
      }

      // Convert messages to conversation text
      const conversationText = messages
        .map((msg) => `${msg.type === 'user' ? 'Human' : 'AI'}: ${msg.content}`)
        .join('\n')

      // Use AI to create summary
      const summaryPrompt = `Please summarize this conversation and extract key facts:

${conversationText}

Provide:
1. A brief summary of the main topics discussed
2. Key facts or decisions made
3. Important information for future reference

Format as JSON:
{
  "summary": "Brief summary here",
  "topics": ["topic1", "topic2"],
  "keyFacts": ["fact1", "fact2"]
}`

      const result = await ollamaService.generateResponse({
        model: 'tinydolphin:latest', // Use fast model for summarization
        prompt: summaryPrompt
      })

      if (!result.success || !result.response) {
        return {
          success: false,
          error: 'Failed to generate summary'
        }
      }

      try {
        // Parse AI response as JSON
        const parsed = JSON.parse(result.response)

        const summary: MemorySummary = {
          id: `summary_${Date.now()}`,
          content: parsed.summary || 'Summary unavailable',
          summary: parsed.summary || 'Summary unavailable',
          timestamp: new Date(),
          importance: 5, // Default importance
          topics: parsed.topics || [],
          keyFacts: parsed.keyFacts || [],
          metadata: {
            messageCount: messages.length,
            createdAt: new Date().toISOString(),
            model: 'tinydolphin:latest'
          }
        }

        return {
          success: true,
          summary
        }
      } catch (parseError) {
        // If JSON parsing fails, create basic summary
        const summary: MemorySummary = {
          id: `summary_${Date.now()}`,
          content: result.response.substring(0, 500),
          summary: result.response.substring(0, 500),
          timestamp: new Date(),
          importance: 3,
          topics: ['conversation'],
          keyFacts: [],
          metadata: {
            messageCount: messages.length,
            createdAt: new Date().toISOString(),
            rawResponse: result.response
          }
        }

        return {
          success: true,
          summary
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async searchMemory(
    query: string,
    limit: number = 5
  ): Promise<{ success: boolean; results?: string[]; error?: string }> {
    return await chromaService.searchChatHistory(query, limit)
  }
}

// Export singleton instance
export const memoryService = new MemoryService()
export default memoryService
