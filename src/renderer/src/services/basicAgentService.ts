// Completely basic agent service - no fetch, no external dependencies
// This will test if the message system itself is working

async function basicRunAgent(userInput: string): Promise<string> {
  console.log('[BasicAgent] Received input:', userInput)
  
  // Simulate a short delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return `Echo: You said "${userInput}". This proves the message system is working! Next step: connect to Ollama.`
}

async function* basicStreamAgent(userInput: string): AsyncGenerator<string, void, unknown> {
  console.log('[BasicAgent] Starting stream for:', userInput)
  
  const response = `Echo: You said "${userInput}". This proves streaming is working! Next step: connect to Ollama.`
  const words = response.split(' ')
  
  let accumulated = ''
  
  for (const word of words) {
    accumulated += (accumulated ? ' ' : '') + word
    yield accumulated
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// Export for use in the message store
export { basicRunAgent as runAgent, basicStreamAgent as streamAgent };