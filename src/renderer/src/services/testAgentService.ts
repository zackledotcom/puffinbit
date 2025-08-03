// Simple test function that doesn't use LangChain imports
// This will help us debug what's failing

async function testRunAgent(userInput: string): Promise<string> {
  try {
    console.log('[TestAgent] Starting simple test...')
    
    // Use the correct model name that actually exists
    const modelName = 'llama3.2:latest' // This exists in the ollama list
    
    // First test - can we make a basic HTTP request to Ollama?
    try {
      const testResponse = await fetch('http://127.0.0.1:11434/api/tags')
      if (!testResponse.ok) {
        throw new Error(`Ollama not accessible: ${testResponse.status}`)
      }
      console.log('[TestAgent] Ollama is accessible')
    } catch (fetchError) {
      console.error('[TestAgent] Fetch to Ollama failed:', fetchError)
      throw new Error(`Cannot connect to Ollama: ${fetchError.message}`)
    }
    
    // Second test - can we make a simple generation request?
    try {
      const generateResponse = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: userInput,
          stream: false
        })
      })
      
      if (!generateResponse.ok) {
        const errorText = await generateResponse.text()
        throw new Error(`Ollama generation failed: ${generateResponse.status} - ${errorText}`)
      }
      
      const result = await generateResponse.json()
      console.log('[TestAgent] Got response from Ollama')
      
      return result.response || 'No response from model'
    } catch (generateError) {
      console.error('[TestAgent] Generation request failed:', generateError)
      throw new Error(`Generation failed: ${generateError.message}`)
    }
    
  } catch (error) {
    console.error('[TestAgent] Error:', error)
    return `Test agent error: ${error.message}. Check that Ollama is running on localhost:11434`
  }
}

// Simple streaming test
async function* testStreamAgent(userInput: string): AsyncGenerator<string, void, unknown> {
  try {
    console.log('[TestAgent] Starting streaming test...')
    
    const modelName = 'llama3.2:latest' // Use the correct model name
    
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: userInput,
        stream: true
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ollama streaming failed: ${response.status} - ${errorText}`)
    }
    
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }
    
    const decoder = new TextDecoder()
    let accumulated = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.response) {
            accumulated += data.response
            yield accumulated
          }
          if (data.done) {
            console.log('[TestAgent] Streaming completed')
            return
          }
        } catch (e) {
          // Skip invalid JSON lines
          console.warn('[TestAgent] Skipping invalid JSON:', line)
        }
      }
    }
    
  } catch (error) {
    console.error('[TestAgent] Streaming error:', error)
    yield `Streaming test error: ${error.message}. Make sure Ollama is running and llama3.2:latest model is available.`
  }
}

// Export for use in the message store
export { testRunAgent as runAgent, testStreamAgent as streamAgent };