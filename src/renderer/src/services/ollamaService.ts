// Fallback ollama service that works without external dependencies
export interface GenerateResponseOptions {
  model: string;
  prompt: string;
}

export interface GenerateResponseResult {
  response: string;
}

// Simple HTTP client for Ollama API
export const ollamaModel = {
  async invoke(prompt: string): Promise<string> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: prompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.response || 'No response from Ollama';
    } catch (error) {
      console.error('[ollamaModel] Error:', error);
      throw new Error('Could not connect to Ollama. Make sure Ollama is running on localhost:11434');
    }
  }
};

export const ollamaService = {
  async generateResponse({ model, prompt }: GenerateResponseOptions): Promise<GenerateResponseResult> {
    try {
      const response = await ollamaModel.invoke(prompt);
      return { response };
    } catch (error: any) {
      console.error('[ollamaService] Error:', error);
      return { 
        response: `Error: ${error.message}\n\nTo enable AI responses:\n1. Install Ollama\n2. Run: ollama pull llama3.2:latest\n3. Start Ollama service` 
      };
    }
  },
};
