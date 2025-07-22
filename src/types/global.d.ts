/**
 * Global type declarations for UMSL (Unified Memory & Storage Layer)
 * Phase 1 Agent Platform + Phase 2A Plugin Architecture types
 */

import { SemanticMemoryEngine } from '../main/core/semanticMemory'
import { ModelManager } from '../main/core/modelManager'
import { AgentRuntime } from '../main/core/agentRuntime'
import { PluginManager } from '../main/core/pluginManager'

declare global {
  var semanticMemory: SemanticMemoryEngine
  var modelManager: ModelManager
  var agentRuntime: AgentRuntime
  var pluginManager: PluginManager
  
  namespace NodeJS {
    interface Global {
      semanticMemory: SemanticMemoryEngine
      modelManager: ModelManager
      agentRuntime: AgentRuntime
      pluginManager: PluginManager
    }
  }
}

export {}
