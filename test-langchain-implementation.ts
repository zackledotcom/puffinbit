import { 
  initializeAgentService, 
  getAgentService, 
  runAgent, 
  streamAgent 
} from '../src/renderer/src/services/agentService';
import { 
  initializeMemoryService, 
  getMemoryService 
} from '../src/renderer/src/services/memoryService';
import { testIPCConnectivity } from '../src/renderer/src/services/agentIntegration';

/**
 * Test suite for the new LangChain agent implementation
 * Run this to verify the system is working correctly
 */

async function testBasicFunctionality() {
  console.log("🧪 Testing LangChain Agent Implementation");
  console.log("=" .repeat(50));

  // Test 1: Service Initialization
  console.log("\n1️⃣ Initializing Services...");
  try {
    const agentService = initializeAgentService({
      modelName: "llama3.2:3b",
      temperature: 0.7,
      ollamaBaseUrl: "http://127.0.0.1:11434"
    });
    
    const memoryService = initializeMemoryService();
    console.log("✅ Services initialized successfully");
  } catch (error) {
    console.error("❌ Service initialization failed:", error);
    return;
  }

  // Test 2: Connectivity Check
  console.log("\n2️⃣ Testing Connectivity...");
  try {
    const agentService = getAgentService();
    const connectivity = await agentService.testConnectivity();
    
    console.log("Ollama:", connectivity.ollama.available ? "✅" : "❌", 
                connectivity.ollama.error || `${connectivity.ollama.models?.length || 0} models`);
    console.log("Vector Store:", connectivity.vectorStore ? "✅" : "❌");
    console.log("Agent:", connectivity.agent ? "✅" : "❌");
    console.log("Tools Available:", connectivity.tools);
    console.log("IPC Services Available:", connectivity.ipcServices.available.join(", ") || "None");
    
    if (connectivity.ipcServices.unavailable.length > 0) {
      console.log("IPC Services Unavailable:", connectivity.ipcServices.unavailable.join(", "));
    }
  } catch (error) {
    console.error("❌ Connectivity test failed:", error);
  }

  // Test 3: Memory Service
  console.log("\n3️⃣ Testing Memory Service...");
  try {
    const memoryService = getMemoryService();
    
    // Store some test memories
    await memoryService.store("The user likes pizza", { type: "preference" });
    await memoryService.store("Today we discussed LangChain implementation", { type: "conversation" });
    
    // Retrieve memories
    const results = await memoryService.retrieve("pizza");
    console.log("✅ Memory retrieval:", results.length, "results found");
    
    // Get stats
    const stats = await memoryService.getStats();
    console.log("Memory Stats:", JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error("❌ Memory service test failed:", error);
  }

  // Test 4: Basic Agent Interaction
  console.log("\n4️⃣ Testing Basic Agent Interaction...");
  try {
    const response = await runAgent("Hello! Can you tell me what tools you have available?");
    console.log("Agent Response:", response);
    console.log("✅ Basic agent interaction successful");
  } catch (error) {
    console.error("❌ Basic agent interaction failed:", error);
  }

  // Test 5: Tool Usage (if available)
  console.log("\n5️⃣ Testing Tool Usage...");
  try {
    const agentService = getAgentService();
    const ollamaStatus = await agentService.checkOllamaStatus();
    
    if (ollamaStatus.available) {
      const response = await runAgent("Can you list the available Ollama models?");
      console.log("Tool Usage Response:", response);
      console.log("✅ Tool usage test successful");
    } else {
      console.log("⚠️ Ollama not available, skipping tool usage test");
    }
  } catch (error) {
    console.error("❌ Tool usage test failed:", error);
  }

  // Test 6: Streaming Response
  console.log("\n6️⃣ Testing Streaming Response...");
  try {
    console.log("Streaming response:");
    const streamGenerator = streamAgent("Tell me a short joke about programming");
    
    for await (const chunk of streamGenerator) {
      process.stdout.write(chunk);
    }
    console.log("\n✅ Streaming test successful");
  } catch (error) {
    console.error("❌ Streaming test failed:", error);
  }

  // Test 7: Memory Persistence
  console.log("\n7️⃣ Testing Memory Persistence...");
  try {
    const agentService = getAgentService();
    const sessionId = await agentService.startSession();
    
    await runAgent("My name is Bob", sessionId);
    const response = await runAgent("What is my name?", sessionId);
    
    console.log("Memory Persistence Response:", response);
    console.log("✅ Memory persistence test completed");
  } catch (error) {
    console.error("❌ Memory persistence test failed:", error);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Test Suite Complete!");
  console.log("If you see mostly ✅ marks above, the LangChain implementation is working correctly.");
  console.log("\nNext steps:");
  console.log("1. Ensure Ollama is running: ollama serve");
  console.log("2. Pull a model: ollama pull llama3.2:3b");
  console.log("3. Optional: Start ChromaDB for enhanced memory: docker run -p 8000:8000 chromadb/chroma");
}

// Export for use in other modules
export { testBasicFunctionality };

// Run tests if this file is executed directly
if (require.main === module) {
  testBasicFunctionality().catch(console.error);
}
