// Simple, direct Ollama service - no complex imports or frameworks
async function directOllamaCall(userInput: string): Promise<string> {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        prompt: userInput,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || 'No response from model';
    
  } catch (error) {
    console.error('[DirectOllama] Error:', error);
    return `Ollama connection failed: ${error.message}. Make sure Ollama is running on localhost:11434`;
  }
}

async function* directOllamaStream(userInput: string): AsyncGenerator<string, void, unknown> {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        prompt: userInput,
        stream: true
      })
    });

    if (!response.ok) {
      yield `Ollama HTTP error: ${response.status}`;
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield 'No response stream available';
      return;
    }

    const decoder = new TextDecoder();
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            accumulated += data.response;
            yield accumulated;
          }
          if (data.done) {
            return;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  } catch (error) {
    yield `Ollama streaming failed: ${error.message}`;
  }
}

export { directOllamaCall as runAgent, directOllamaStream as streamAgent };