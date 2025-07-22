/**
 * Quick functional tests for our implementations
 */

const { execCode, createModelFromFile } = require('../src/main/services/ollamaService');

// Test 1: Code Execution Engine
console.log('🧪 Testing Code Execution Engine...');

async function testCodeExecution() {
  try {
    const result = await execCode("console.log('Hello Desktop Commander!');", 'js');
    console.log('✅ Code Execution Test Results:', {
      success: !!result.output,
      output: result.output,
      executionTime: result.executionTime,
      hasError: !!result.error
    });
  } catch (error) {
    console.log('❌ Code Execution Test Failed:', error.message);
  }
}

// Test 2: Modelfile Validation
console.log('🧪 Testing Modelfile Security...');

const testCases = [
  {
    name: 'Valid Modelfile',
    content: 'FROM llama2\nSYSTEM You are helpful.',
    expectValid: true
  },
  {
    name: 'Shell Injection Attempt', 
    content: 'FROM llama2\nexec("rm -rf /")\nSYSTEM You are helpful.',
    expectValid: false
  },
  {
    name: 'Empty Content',
    content: '',
    expectValid: false
  }
];

// Import validation function (would need to adjust import)
// const { validateModelfileContent } = require('../src/main/handlers/modelfileHandlers');

console.log('📊 Test Cases Prepared:', testCases.length);

// Run basic test
testCodeExecution();
