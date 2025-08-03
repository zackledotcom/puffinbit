# LangChain Agent Implementation for Puffin

This document describes the complete LangChain agent system that replaces the previous fallback implementation.

## 🎯 Overview

The new implementation provides:
- **Real LangChain Integration**: Uses @langchain/core, @langchain/community, @langchain/langgraph
- **Ollama LLM Integration**: Direct connection to local Ollama models
- **Memory Management**: LangGraph MemorySaver with optional ChromaDB vector storage
- **Tool Integration**: Connected to all existing Puffin services via IPC
- **Session Management**: Multi-conversation thread support
- **Streaming Support**: Real-time response streaming

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                         │
├─────────────────────────────────────────────────────────────┤
│  agentService.ts                                           │
│  ├── LangChainAgentService                                 │
│  │   ├── ChatOllama (LLM)                                 │
│  │   ├── createReactAgent (LangGraph)                     │
│  │   ├── MemorySaver (Session Management)                 │
│  │   └── Tools Integration                                │
│  │                                                        │
│  memoryService.ts                                         │
│  ├── EnhancedMemoryService                               │
│  │   ├── ChromaVectorStore (Optional)                    │
│  │   ├── OllamaEmbeddings                                │
│  │   └── Fallback In-Memory Storage                      │
│  │                                                        │
│  agentIntegration.ts                                      │
│  └── IPC Tools Bridge                                     │
│      ├── File System Tool                                 │
│      ├── Code Generation Tool                             │
│      ├── Ollama Management Tool                           │
│      ├── ChromaDB Tool                                    │
│      ├── System Info Tool                                 │
│      └── Canvas Tool                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                           IPC
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Main Process                             │
├─────────────────────────────────────────────────────────────┤
│  Existing Services:                                        │
│  ├── file-system-handlers.ts                              │
│  ├── code-generation-handlers.ts                          │
│  ├── ollamaService.ts                                     │
│  ├── chromaService.ts                                     │
│  └── Other handlers...                                    │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Dependencies

New packages installed:
- `@langchain/core` - Core LangChain functionality
- `@langchain/community` - Community integrations (ChromaDB, etc.)
- `@langchain/langgraph` - Agent orchestration and memory
- `@langchain/ollama` - Ollama LLM and embeddings integration

## 🚀 Usage

### Basic Agent Usage

```typescript
import { runAgent } from './services/agentService';

// Simple query
const response = await runAgent("Hello, can you help me with coding?");
console.log(response);

// With session management
const response2 = await runAgent("My name is Alice", "session-123");
const response3 = await runAgent("What's my name?", "session-123");
```

### Streaming Responses

```typescript
import { streamAgent } from './services/agentService';

const streamGenerator = streamAgent("Write a Python function to sort a list");

for await (const chunk of streamGenerator) {
  console.log(chunk);
}
```

### Advanced Configuration

```typescript
import { initializeAgentService } from './services/agentService';

const agentService = initializeAgentService({
  modelName: "codellama:13b",
  temperature: 0.3,
  maxTokens: 4096,
  memoryLimit: 15,
  ollamaBaseUrl: "http://localhost:11434"
});
```

### Memory Management

```typescript
import { getMemoryService } from './services/memoryService';

const memoryService = getMemoryService();

// Store information
await memoryService.store("User prefers TypeScript", { 
  type: "preference",
  category: "programming" 
});

// Retrieve relevant context
const context = await memoryService.retrieve("programming preferences");

// Get conversation history
const history = await memoryService.retrieveBySession("session-123");
```

## 🛠️ Available Tools

The agent has access to these tools:

### 1. File System Tool (`file_system`)
- **read**: Read file contents
- **write**: Write content to files
- **list**: List directory contents
- **search**: Search within files
- **move**: Move/rename files

```typescript
// Agent can use these automatically:
"Can you read the package.json file?"
"List all TypeScript files in the src directory"
"Search for 'TODO' comments in the codebase"
```

### 2. Code Generation Tool (`code_generator`)
- Generate code in various languages
- Specify complexity levels
- Different code types (function, class, module, etc.)

```typescript
// Examples:
"Generate a React component for a login form"
"Create a Python function to parse CSV files"
"Write a Rust function for binary search"
```

### 3. Ollama Model Management (`ollama_models`)
- **list**: Show available models
- **pull**: Download new models
- **info**: Get model information
- **generate**: Generate text with specific models
- **status**: Check Ollama service status

### 4. ChromaDB Integration (`chroma_db`)
- **query**: Search vector database
- **add**: Add documents to collections
- **collections**: List all collections
- **delete**: Remove collections
- **status**: Check ChromaDB status

### 5. System Information (`system_info`)
- **processes**: List running processes
- **info**: Get system information
- **memory**: Check memory usage
- **find-process**: Find specific processes

### 6. Canvas Tool (`canvas_tool`)
- **create**: Create new canvas
- **save**: Save canvas state
- **load**: Load existing canvas
- **export**: Export canvas to file

## 🔧 Configuration

### Agent Configuration

```typescript
interface AgentConfig {
  modelName: string;        // Ollama model name
  temperature: number;      // Response creativity (0.0-1.0)
  maxTokens: number;       // Maximum response length
  memoryLimit: number;     // Message history limit
  ollamaBaseUrl: string;   // Ollama server URL
}
```

### Memory Configuration

```typescript
interface MemoryConfig {
  ollamaBaseUrl: string;   // Ollama server for embeddings
  chromaUrl: string;       // ChromaDB server URL
  embeddingModel: string;  // Model for embeddings
  collectionName: string;  // ChromaDB collection name
  maxResults: number;      // Max search results
}
```

## 🔍 Testing & Diagnostics

### Run the Test Suite

```bash
cd /users/jibbro/desktop/wonder/puffin
npx tsx test-langchain-implementation.ts
```

### Manual Connectivity Testing

```typescript
import { getAgentService } from './services/agentService';

const agentService = getAgentService();
const connectivity = await agentService.testConnectivity();

console.log("Connectivity Report:", connectivity);
```

### Memory Service Health Check

```typescript
import { getMemoryService } from './services/memoryService';

const memoryService = getMemoryService();
const health = await memoryService.healthCheck();
const stats = await memoryService.getStats();

console.log("Memory Health:", health);
console.log("Memory Stats:", stats);
```

## 🚨 Troubleshooting

### Common Issues

1. **"Agent not responding"**
   - Check if Ollama is running: `ollama serve`
   - Verify model is available: `ollama list`
   - Check Ollama URL in config

2. **"Tools not working"**
   - Ensure main process IPC handlers are running
   - Check IPC connectivity with `testIPCConnectivity()`
   - Verify file permissions for file operations

3. **"Memory not persisting"**
   - ChromaDB may not be running (fallback to in-memory)
   - Check ChromaDB connection: `docker run -p 8000:8000 chromadb/chroma`
   - Verify embedding model is available in Ollama

4. **"Slow responses"**
   - Use smaller models (e.g., `llama3.2:3b` instead of `llama3.2:8b`)
   - Reduce `maxTokens` and `memoryLimit`
   - Check system resources

### Debug Mode

Enable detailed logging:

```typescript
// Set environment variable
process.env.LANGCHAIN_VERBOSE = "true";

// Or use debug logging in services
console.log("[DEBUG] Agent state:", await agentService.getCurrentSession());
```

## 🔄 Migration from Old Implementation

The new implementation is **drop-in compatible** with the old `runAgent()` function:

```typescript
// Old code still works:
import { runAgent } from './services/agentService';
const response = await runAgent("Hello!");

// But now you also have:
import { streamAgent, getAgentService } from './services/agentService';
```

## 📈 Performance Optimization

1. **Model Selection**: Use appropriate model sizes
   - Development: `llama3.2:3b` (fast, good quality)
   - Production: `llama3.2:8b` (better quality, slower)
   - Coding: `codellama:13b` (specialized for code)

2. **Memory Management**: 
   - Use ChromaDB for better semantic search
   - Adjust `memoryLimit` based on model context window
   - Regular memory cleanup for long-running sessions

3. **Tool Usage**:
   - Tools add latency - only enable needed ones
   - File operations can be slow for large files
   - Cache frequently accessed data

## 🔮 Future Enhancements

- [ ] Custom tool creation interface
- [ ] Multi-model orchestration
- [ ] Advanced RAG with document ingestion
- [ ] Tool usage analytics
- [ ] Performance monitoring dashboard
- [ ] Cloud model fallback support

## 🤝 Integration with Existing Code

The implementation seamlessly integrates with existing Puffin services:

- File operations route to `file-system-handlers.ts`
- Code generation uses `code-generation-handlers.ts`
- Ollama calls use `ollamaService.ts`
- ChromaDB operations use `chromaService.ts`
- All existing security and validation remains in place

## 📝 Examples

See `test-langchain-implementation.ts` for comprehensive usage examples.

---

**Note**: This implementation replaces the fallback agent service with a production-ready LangChain system while maintaining full backward compatibility.
