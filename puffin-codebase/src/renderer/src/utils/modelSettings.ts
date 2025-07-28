// Model settings utilities
export interface ModelSettings {
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;
  max_tokens: number;
  seed?: number;
  system_prompt: string;
  stop_sequences: string[];
  context_length: number;
  memory_enabled: boolean;
  personality: 'professional' | 'friendly' | 'casual' | 'bro' | 'technical' | 'creative' | 'custom';
  response_style: 'concise' | 'detailed' | 'balanced';
  mirostat: number;
  mirostat_eta: number;
  mirostat_tau: number;
  tfs_z: number;
  typical_p: number;
}

const DEFAULT_SETTINGS: ModelSettings = {
  temperature: 0.7,          // ✅ Better default - not too boring, not too chaotic
  top_p: 0.9,               // ✅ Good variety
  top_k: 40,
  repeat_penalty: 1.1,
  max_tokens: 2000,         // ✅ Reasonable length
  system_prompt: "You are a helpful, knowledgeable AI assistant. Provide accurate, detailed responses while maintaining a professional yet approachable tone. Focus on being genuinely helpful and thorough in your explanations.",
  stop_sequences: [],
  context_length: 4096,
  memory_enabled: true,
  personality: 'professional',
  response_style: 'detailed',
  mirostat: 0,
  mirostat_eta: 0.1,
  mirostat_tau: 5.0,
  tfs_z: 1.0,
  typical_p: 1.0
};

/**
 * Get model settings for a specific model
 */
export function getModelSettings(modelName: string): ModelSettings {
  const settingsKey = `model-settings-${modelName}`;
  const saved = localStorage.getItem(settingsKey);
  
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to parse saved model settings:', e);
    }
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Save model settings for a specific model
 */
export function saveModelSettings(modelName: string, settings: ModelSettings): void {
  const settingsKey = `model-settings-${modelName}`;
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}

/**
 * Convert model settings to Ollama API format
 */
export function settingsToOllamaOptions(settings: ModelSettings) {
  return {
    temperature: settings.temperature,
    top_p: settings.top_p,
    top_k: settings.top_k,
    repeat_penalty: settings.repeat_penalty,
    num_predict: settings.max_tokens,
    seed: settings.seed,
    stop: settings.stop_sequences,
    mirostat: settings.mirostat,
    mirostat_eta: settings.mirostat_eta,
    mirostat_tau: settings.mirostat_tau,
    tfs_z: settings.tfs_z,
    typical_p: settings.typical_p,
  };
}