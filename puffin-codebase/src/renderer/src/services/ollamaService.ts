// A minimal renderer-side wrapper for Ollama operations.
// This prevents module-not-found TypeScript errors inside renderer code.
// At runtime, you should replace these stubs with real IPC calls to the
// main‐process Ollama service (e.g., via electron preload).

export interface GenerateResponseOptions {
  model: string;
  prompt: string;
}

export interface GenerateResponseResult {
  response: string;
}

export const ollamaService = {
  async generateResponse({ model, prompt }: GenerateResponseOptions): Promise<GenerateResponseResult> {
    // TODO: wire up to main-process via `window.electronAPI` or similar.
    console.warn('[ollamaService] Called stub generateResponse(). Model:', model);
    return { response: '' }; // empty stub response
  },
};
