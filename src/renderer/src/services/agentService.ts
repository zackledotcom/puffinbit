import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { trimMessages } from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import { createRetrieverTool } from "langchain/tools/retriever";
import { ChromaVectorStore } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { v4 as uuidv4 } from 'uuid';
import { createAllIntegratedTools, testIPCConnectivity } from './agentIntegration';

// Configuration interfaces
interface AgentConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  memoryLimit: number;
  ollamaBaseUrl: string;
}

interface AgentMemory {
  threadId: string;
  config: any;
}

// Default configuration
const DEFAULT_CONFIG: AgentConfig = {
  modelName: "llama3.2:3b",
  temperature: 0.7,
  maxTokens: 2048,
  memoryLimit: 10,
  ollamaBaseUrl: "http://127.0.0.1:11434"
};

class LangChainAgentService {
  private llm: ChatOllama;
  private embeddings: OllamaEmbeddings;
  private memorySaver: MemorySaver;
  private agent: any;
  private vectorStore: ChromaVectorStore | null = null;
  private config: AgentConfig;
  private currentSession: AgentMemory | null = null;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memorySaver = new MemorySaver();
    
    // Initialize Ollama LLM
    this.llm = new ChatOllama({
      baseUrl: this.config.ollamaBaseUrl,
      model: this.config.modelName,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    // Initialize Ollama embeddings
    this.embeddings = new OllamaEmbeddings({
      baseUrl: this.config.ollamaBaseUrl,
      model: "nomic-embed-text", // Good embedding model for general use
    });

    this.initializeAgent();
  }

  private async initializeVectorStore() {
    try {
      this.vectorStore = new ChromaVectorStore(this.embeddings, {
        collectionName: "puffin_memory",
        url: "http://127.0.0.1:8000", // Default ChromaDB URL
      });
      console.log("[AgentService] ChromaDB vector store initialized");
    } catch (error) {
      console.warn("[AgentService] ChromaDB not available, using in-memory fallback:", error);
      this.vectorStore = null;
    }
  }

  private createTools() {
    const tools = [];

    // Add integrated tools that connect to main process services
    const integratedTools = createAllIntegratedTools();
    tools.push(...integratedTools);

    // Memory/Context Retrieval Tool (if ChromaDB is available)
    if (this.vectorStore) {
      const retrieverTool = createRetrieverTool(
        this.vectorStore.asRetriever({ k: 5 }),
        {
          name: "memory_search",
          description: "Search through conversation history and stored memories for relevant context. Use this when you need to recall past conversations or information.",
        }
      );
      tools.push(retrieverTool);
    }

    return tools;
  }

  private async initializeAgent() {
    await this.initializeVectorStore();
    const tools = this.createTools();

    // Create state modifier for message trimming (memory management)
    const stateModifier = async (messages: BaseMessage[]): Promise<BaseMessage[]> => {
      return trimMessages(
        messages,
        {
          tokenCounter: (msgs) => msgs.length,
          maxTokens: this.config.memoryLimit,
          strategy: "last",
          startOn: "human",
          includeSystem: true,
          allowPartial: false,
        }
      );
    };

    // Create the agent with memory and tools
    this.agent = createReactAgent({
      llm: this.llm,
      tools,
      checkpointSaver: this.memorySaver,
      messageModifier: stateModifier,
    });

    console.log("[AgentService] LangChain agent initialized with", tools.length, "tools");
  }

  // Start a new conversation session
  async startSession(): Promise<string> {
    const threadId = uuidv4();
    this.currentSession = {
      threadId,
      config: { configurable: { thread_id: threadId } }
    };
    console.log("[AgentService] Started new session:", threadId);
    return threadId;
  }

  // Switch to an existing session
  async switchSession(threadId: string): Promise<void> {
    this.currentSession = {
      threadId,
      config: { configurable: { thread_id: threadId } }
    };
    console.log("[AgentService] Switched to session:", threadId);
  }

  // Main agent invocation method
  async runAgent(userInput: string, threadId?: string): Promise<string> {
    try {
      // Ensure we have an active session
      if (!this.currentSession || (threadId && this.currentSession.threadId !== threadId)) {
        if (threadId) {
          await this.switchSession(threadId);
        } else {
          await this.startSession();
        }
      }

      if (!this.agent) {
        throw new Error("Agent not initialized");
      }

      // Store user input in vector store if available
      if (this.vectorStore) {
        try {
          await this.vectorStore.addDocuments([{
            pageContent: `User: ${userInput}`,
            metadata: { 
              timestamp: new Date().toISOString(),
              type: "user_input",
              sessionId: this.currentSession!.threadId 
            }
          }]);
        } catch (error) {
          console.warn("[AgentService] Failed to store in vector store:", error);
        }
      }

      // Invoke the agent
      const result = await this.agent.invoke(
        {
          messages: [{ role: "user", content: userInput }]
        },
        this.currentSession!.config
      );

      // Extract the response from the agent result
      const response = result.messages[result.messages.length - 1]?.content || "No response generated.";

      // Store agent response in vector store if available
      if (this.vectorStore && response !== "No response generated.") {
        try {
          await this.vectorStore.addDocuments([{
            pageContent: `Assistant: ${response}`,
            metadata: { 
              timestamp: new Date().toISOString(),
              type: "assistant_response",
              sessionId: this.currentSession!.threadId 
            }
          }]);
        } catch (error) {
          console.warn("[AgentService] Failed to store response in vector store:", error);
        }
      }

      return response;

    } catch (error) {
      console.error("[AgentService] Agent execution failed:", error);
      return `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure Ollama is running on localhost:11434 with the model '${this.config.modelName}' available.`;
    }
  }

  // Stream agent responses for real-time interaction
  async *streamAgent(userInput: string, threadId?: string): AsyncGenerator<string, void, unknown> {
    try {
      // Ensure we have an active session
      if (!this.currentSession || (threadId && this.currentSession.threadId !== threadId)) {
        if (threadId) {
          await this.switchSession(threadId);
        } else {
          await this.startSession();
        }
      }

      if (!this.agent) {
        throw new Error("Agent not initialized");
      }

      // Store user input in vector store if available
      if (this.vectorStore) {
        try {
          await this.vectorStore.addDocuments([{
            pageContent: `User: ${userInput}`,
            metadata: { 
              timestamp: new Date().toISOString(),
              type: "user_input",
              sessionId: this.currentSession!.threadId 
            }
          }]);
        } catch (error) {
          console.warn("[AgentService] Failed to store in vector store:", error);
        }
      }

      // Stream the agent response
      const stream = await this.agent.stream(
        {
          messages: [{ role: "user", content: userInput }]
        },
        { 
          ...this.currentSession!.config,
          streamMode: "values" as const 
        }
      );

      let fullResponse = "";
      for await (const event of stream) {
        const lastMessage = event.messages[event.messages.length - 1];
        if (lastMessage?.content) {
          const content = lastMessage.content;
          fullResponse = content;
          yield content;
        }
      }

      // Store final response in vector store if available
      if (this.vectorStore && fullResponse) {
        try {
          await this.vectorStore.addDocuments([{
            pageContent: `Assistant: ${fullResponse}`,
            metadata: { 
              timestamp: new Date().toISOString(),
              type: "assistant_response",
              sessionId: this.currentSession!.threadId 
            }
          }]);
        } catch (error) {
          console.warn("[AgentService] Failed to store response in vector store:", error);
        }
      }

    } catch (error) {
      console.error("[AgentService] Agent streaming failed:", error);
      yield `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure Ollama is running on localhost:11434 with the model '${this.config.modelName}' available.`;
    }
  }

  // Get current session info
  getCurrentSession(): AgentMemory | null {
    return this.currentSession;
  }

  // Update agent configuration
  async updateConfig(newConfig: Partial<AgentConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize with new config
    this.llm = new ChatOllama({
      baseUrl: this.config.ollamaBaseUrl,
      model: this.config.modelName,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    await this.initializeAgent();
    console.log("[AgentService] Configuration updated and agent reinitialized");
  }

  // Check if Ollama is available
  async checkOllamaStatus(): Promise<{ available: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/tags`);
      if (response.ok) {
        return { available: true };
      } else {
        return { available: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get available models from Ollama
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((model: any) => model.name) || [];
      }
      return [];
    } catch (error) {
      console.error("[AgentService] Failed to fetch models:", error);
      return [];
    }
  }

  // Test connectivity to all integrated services
  async testConnectivity(): Promise<{
    ollama: { available: boolean; models?: string[]; error?: string };
    ipcServices: { available: string[]; unavailable: string[]; errors: Record<string, string> };
    vectorStore: boolean;
    agent: boolean;
    tools: number;
  }> {
    const result = {
      ollama: { available: false } as any,
      ipcServices: { available: [], unavailable: [], errors: {} } as any,
      vectorStore: this.vectorStore !== null,
      agent: this.agent !== null,
      tools: 0
    };

    // Test Ollama
    const ollamaStatus = await this.checkOllamaStatus();
    result.ollama.available = ollamaStatus.available;
    if (ollamaStatus.available) {
      result.ollama.models = await this.getAvailableModels();
    } else {
      result.ollama.error = ollamaStatus.error;
    }

    // Test IPC services
    result.ipcServices = await testIPCConnectivity();

    // Count tools
    if (this.agent) {
      const tools = this.createTools();
      result.tools = tools.length;
    }

    return result;
  }
}

// Global instance
let agentService: LangChainAgentService | null = null;

// Initialize the service
export function initializeAgentService(config?: Partial<AgentConfig>): LangChainAgentService {
  if (!agentService) {
    agentService = new LangChainAgentService(config);
  }
  return agentService;
}

// Get the current service instance
export function getAgentService(): LangChainAgentService {
  if (!agentService) {
    agentService = new LangChainAgentService();
  }
  return agentService;
}

// Legacy compatibility - this is the main function called by the UI
export async function runAgent(userInput: string, threadId?: string): Promise<string> {
  const service = getAgentService();
  return await service.runAgent(userInput, threadId);
}

// Streaming version for real-time responses
export async function* streamAgent(userInput: string, threadId?: string): AsyncGenerator<string, void, unknown> {
  const service = getAgentService();
  yield* service.streamAgent(userInput, threadId);
}

// Export types for external use
export type { AgentConfig, AgentMemory };
