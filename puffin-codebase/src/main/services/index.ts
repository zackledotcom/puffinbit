// Enhanced Barrel file for services - Backend Infrastructure Complete
// Export all necessary functions and classes from service files

// EXISTING SERVICES
// =================

// From ollama.ts
export { summarizeMessages, enrichPromptWithMemory } from './ollama'

// From memoryEnrichment.ts
export {
  withMemoryEnrichment,
  createContextDebugInfo,
  filterRelevantContext
} from './memoryEnrichment'

// From agents.ts
export {
  loadAgentRegistry,
  createAgent,
  updateAgent,
  deleteAgent,
  cloneAgent,
  setActiveAgent,
  getActiveAgent,
  getAllAgents,
  getAvailableTools,
  validateToolKey
} from './agents'

// From mcpService.ts
export { mcpService } from './mcpService'
export type {
  MCPServerConfig,
  MCPMessage,
  MCPResponse
} from './mcpService'

// From redditBotAgent.ts
export { redditBotAgent } from './redditBotAgent'
export type {
  BotConfig,
  BotStats,
  ProcessedMessage
} from './redditBotAgent'

// From ollamaService.ts  
export { ollamaService } from './ollamaService'

// From chromaService.ts (if exists)
export * from './chromaService'

// Other existing services
export * from './avatarService'
export * from './crypto'
export * from './memoryService'
export * from './modelTuningService'
export * from './reddit'
export * from './redditAgent'

// Selective exports to avoid conflicts
export { 
  type MemorySearchResult as DatabaseMemorySearchResult 
} from './database'

export { 
  geminiMemoryService,
  type MemorySearchResult as GeminiMemorySearchResult 
} from './geminiMemory'

export { 
  generateCodeWithGemma,
  completeCode as completeCodeWithGemma 
} from './gemmaCoderService'

export { 
  generateCode,
  completeCode as completeCodeGeneric 
} from './codeGenerationService'
