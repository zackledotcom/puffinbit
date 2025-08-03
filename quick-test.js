// Quick test to verify LangChain agent is working
const { runAgent } = require('./src/renderer/src/services/agentService');

async function testAgent() {
  console.log('🧪 Testing LangChain Agent...');
  
  try {
    const response = await runAgent('Hello! Can you tell me what tools you have available?');
    console.log('✅ Agent Response:', response);
  } catch (error) {
    console.error('❌ Agent Error:', error.message);
  }
}

testAgent();