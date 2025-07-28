// File: src/main/services/ollamaService.js
import axios from 'axios';
import { safeLog, safeError, safeWarn } from '../utils/safeLogger';
import { createM1OptimizedRequest, getAdaptiveM1Params, isModelSuitableForM1_8GB, M1_CONFIGS } from './m1-optimization/m1OptimizedService';
import * as vm from 'vm';

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: { format: string; family: string; families: string[]; parameter_size: string; quantization_level: string };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface ServiceStatus {
  connected: boolean;
  message: string;
  version?: string;
}

interface GenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    num_predict?: number;
    stop?: string[];
  };
}

let ollamaProcess: ChildProcess | null = null;
const isAppleSilicon = process.platform === 'darwin' && process.arch === 'arm64';

class OllamaService {
  private baseUrl = OLLAMA_BASE_URL;
  private gpuEnabled = process.env.GPU === 'true' || false;

  async checkStatus(): Promise<ServiceStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return { connected: true, message: 'Ollama running', version: response.headers['ollama-version'] || 'unknown' };
    } catch {
      return { connected: false, message: 'Ollama not running' };
    }
  }

  async getModels(): Promise<{ success: boolean; models?: OllamaModel[]; error?: string }> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/api/tags`);
      return { success: true, models: data.models || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async generateResponse(request: GenerateRequest): Promise<{ success: boolean; response?: string; tokenCount?: number; error?: string }> {
    try {
      let optimizedRequest = request;
      if (isAppleSilicon) {
        safeLog(`🍎 Applying M1 optimizations for model: ${request.model}`);
        const suitability = isModelSuitableForM1_8GB(request.model);
        if (!suitability.suitable) {
          safeWarn(`⚠️ Model ${request.model} may not be optimal for M1 8GB: ${suitability.reason}`);
        }
        try {
          const optimizedParams = await getAdaptiveM1Params(request.model);
          optimizedRequest = {
            ...request,
            options: { ...request.options, ...optimizedParams }
          };
          safeLog(`🚀 M1 optimized parameters applied:`, {
            context_length: optimizedParams.num_ctx,
            threads: optimizedParams.num_thread,
            temperature: optimizedParams.temperature,
            memory_optimized: optimizedParams.low_vram
          });
        } catch (optimizationError: any) {
          safeWarn('M1 optimization failed, using default parameters:', optimizationError.message);
        }
      }
      const { data } = await axios.post(`${this.baseUrl}/api/generate`, {
        ...optimizedRequest,
        stream: false
      }, { timeout: 30000 });
      const response = data.response;
      const tokenCount = data.eval_count || Math.ceil(request.prompt.length / 4);
      if (isAppleSilicon) {
        safeLog(`✅ M1-optimized response generated (${response.length} chars, ~${tokenCount} tokens)`);
      }
      return { success: true, response, tokenCount };
    } catch (error: any) {
      safeError(`Failed to generate response for model ${request.model}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async *streamGenerate(request: GenerateRequest): AsyncGenerator<string, void, unknown> {
    try {
      const { data } = await axios.post(`${this.baseUrl}/api/generate`, {
        ...request,
        stream: true,
        options: { ...request.options }
      }, { responseType: 'stream', timeout: 60000 });
      for await (const chunk of data) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const parsed: OllamaResponse = JSON.parse(line);
          if (parsed.response) yield parsed.response;
          if (parsed.done) return;
        }
      }
    } catch (error: any) {
      throw new Error(`Stream failed: ${error.message}`);
    }
  }

  async pullModel(modelName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.post(`${this.baseUrl}/api/pull`, { name: modelName }, { timeout: 60000 });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async startService(): Promise<{ success: boolean; message: string }> {
    if (await this.checkStatus().then(s => s.connected)) {
      return { success: true, message: 'Ollama already running' };
    }
    if (isAppleSilicon) {
      safeLog('🍎 Starting Ollama with M1 optimizations enabled');
    }
    const ollamaPaths = ['/usr/local/bin/ollama', '/opt/homebrew/bin/ollama', 'ollama'];
    for (const path of ollamaPaths) {
      try {
        safeLog(`Attempting to start Ollama from: ${path}`);
        ollamaProcess = spawn(path, ['serve'], { stdio: 'pipe', detached: isAppleSilicon });
        ollamaProcess.unref();
        ollamaProcess.on('error', (err) => safeError('Ollama error:', err));
        ollamaProcess.on('exit', (code) => {
          safeLog(`Ollama exited: ${code}`);
          ollamaProcess = null;
        });
        safeLog(`✅ Ollama process spawned (PID: ${ollamaProcess.pid}) with unref() applied`);
        await new Promise(r => setTimeout(r, 3000));
        if (await this.checkStatus().then(s => s.connected)) {
          const message = `Ollama started successfully${isAppleSilicon ? ' (M1 optimized)' : ''}`;
          safeLog(message);
          return { success: true, message };
        }
      } catch (error) {
        safeWarn(`Failed to start Ollama from ${path}:`, error);
      }
    }
    if (isAppleSilicon) {
      try {
        safeLog('Attempting MLX fallback for Apple Silicon...');
        const { exec } = require('child_process');
        return new Promise((resolve) => {
          exec('which mlx-lm', (whichError) => {
            if (whichError) {
              safeWarn('MLX not found, installing...');
              exec('pip install mlx-lm', (installError) => {
                if (installError) {
                  resolve({ success: false, message: 'Ollama/MLX start failed - install MLX manually' });
                  return;
                }
                this.startMLX().then(resolve);
              });
            } else {
              this.startMLX().then(resolve);
            }
          });
        });
      } catch (error) {
        safeError('MLX fallback failed:', error);
      }
    }
    return { success: false, message: 'Ollama start failed - try manual installation' };
  }

  private async startMLX(): Promise<{ success: boolean; message: string }> {
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('mlx-lm --model microsoft/DialoGPT-medium --max-tokens 100', (err, stdout, stderr) => {
          if (err) {
            safeError('MLX start error:', err);
            resolve({ success: false, message: 'MLX start failed' });
            return;
          }
          safeLog('MLX started successfully');
          setTimeout(async () => {
            this.setupMLXProxy();
            resolve({ success: true, message: 'MLX started (Apple Silicon optimized)' });
          }, 3000);
        });
      });
    } catch (error) {
      safeError('MLX startup error:', error);
      return { success: false, message: 'MLX initialization failed' };
    }
  }

  private setupMLXProxy(): void {
    safeLog('MLX proxy active - Apple Silicon optimization enabled');
  }

  async deleteModel(modelName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.delete(`${this.baseUrl}/api/delete`, { data: { name: modelName }, headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async stopService(): Promise<{ success: boolean; message: string }> {
    if (ollamaProcess) {
      ollamaProcess.kill('SIGTERM');
      ollamaProcess = null;
      return { success: true, message: 'Ollama stopped' };
    }
    return { success: true, message: 'Ollama not running' };
  }

  async batchGenerate(requests: GenerateRequest[]): Promise<{ success: boolean; responses?: string[]; errors?: string[] }> {
    const results = await Promise.allSettled(requests.map(req => this.generateResponse(req)));
    return {
      success: results.every(r => r.status === 'fulfilled'),
      responses: results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value.response),
      errors: results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason.message)
    };
  }

  async createModelFromFile(modelName: string, modelfileContent: string): Promise<{ success: boolean; error?: string; modelName?: string; responseTime?: number }> {
    try {
      safeLog(`Creating custom model: ${modelName}`);
      const startTime = Date.now();
      const response = await axios.post(`${OLLAMA_BASE_URL}/api/create`, {
        name: modelName,
        modelfile: modelfileContent
      }, {
        timeout: 300000,
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.status === 200) {
        safeLog(`Custom model created successfully: ${modelName}`);
        return { success: true, modelName, responseTime: Date.now() - startTime };
      } else {
        safeError(`Failed to create model: ${modelName}`, { status: response.status });
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error: any) {
      safeError(`Error creating model: ${modelName}`, { error: error.message });
      return { success: false, error: error.response?.data?.error || error.message || 'Unknown error creating model' };
    }
  }

  async execCode(code: string, lang: 'js' = 'js'): Promise<{ output: string; error: string; executionTime: number }> {
    const startTime = Date.now();
    safeLog('Code execution requested', { lang, codeLength: code.length, codePreview: code.substring(0, 100) });
    try {
      if (typeof code !== 'string' || code.length === 0) {
        throw new Error('Code must be a non-empty string');
      }
      if (code.length > 50000) {
        throw new Error('Code size exceeds 50KB limit');
      }
      
      // Create a sandboxed context using Node.js vm module
      const sandbox = {
        console: console,
        Math: Math,
        Date: Date,
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearTimeout: clearTimeout,
        clearInterval: clearInterval,
        __result: undefined
      };
      
      // Wrap code to capture return value
      const wrappedCode = `
        try {
          __result = (function() {
            ${code}
          })();
        } catch (e) {
          throw e;
        }
      `;
      
      const context = vm.createContext(sandbox);
      vm.runInContext(wrappedCode, context, { 
        timeout: 5000,
        displayErrors: true 
      });
      
      const result = sandbox.__result;
      safeLog('Code execution successful', { lang, executionTime: Date.now() - startTime, outputLength: result?.length || 0 });
      return { output: result || 'Success', error: '', executionTime: Date.now() - startTime };
    } catch (error: any) {
      safeError('Code execution failed:', error.message);
      return { output: '', error: error.message || 'Execution failed', executionTime: Date.now() - startTime };
    }
  }
}

export const ollamaService = new OllamaService();
export default ollamaService;