// Test script to run in browser console (F12)
// Copy and paste this into the console to test Ollama connectivity

console.log('🧪 Testing Ollama connectivity...')

// Test 1: Check if Ollama is running
fetch('http://127.0.0.1:11434/api/tags')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json()
  })
  .then(data => {
    console.log('✅ Ollama is running!')
    console.log('Available models:', data.models.map(m => m.name))
    
    // Test 2: Try a simple generation
    return fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        prompt: 'Say hello in one word',
        stream: false
      })
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Generation failed: HTTP ${response.status}`)
    }
    return response.json()
  })
  .then(data => {
    console.log('✅ Generation test successful!')
    console.log('Response:', data.response)
  })
  .catch(error => {
    console.error('❌ Test failed:', error)
    console.log('Troubleshooting:')
    console.log('1. Make sure Ollama is running: ollama serve')
    console.log('2. Check available models: ollama list')
    console.log('3. Try pulling a model: ollama pull llama3.2')
  })
