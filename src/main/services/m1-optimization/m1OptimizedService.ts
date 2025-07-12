/**
 * M1 MacBook Optimization Service for Puffer
 * Optimizes Ollama requests for M1 MacBook with 8GB RAM
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

export interface M1OptimizationConfig {
  modelName: string
  maxMemoryMB: number
  optimalParameters: {
    temperature: number
    top_p: number
    top_k: number
    num_ctx: number
    num_gpu: number
    num_thread: number
    mmap: boolean
    f16: boolean
    low_vram: boolean
  }
}

// M1 8GB optimized configurations
export const M1_CONFIGS: Record<string, M1OptimizationConfig> = {
  'gemma2:2b': {
    modelName: 'gemma2:2b',
    maxMemoryMB: 2048,
    optimalParameters: {
      temperature: 0.1,
      top_p: 0.9,
      top_k: 40,
      num_ctx: 2048,
      num_gpu: 1,
      num_thread: 4,
      mmap: true,
      f16: true,
      low_vram: true
    }
  },
  tinydolphin: {
    modelName: 'tinydolphin:latest',
    maxMemoryMB: 1536,
    optimalParameters: {
      temperature: 0.2,
      top_p: 0.9,
      top_k: 30,
      num_ctx: 1024,
      num_gpu: 1,
      num_thread: 4,
      mmap: true,
      f16: true,
      low_vram: true
    }
  },
  'phi3:mini': {
    modelName: 'phi3:mini',
    maxMemoryMB: 2560,
    optimalParameters: {
      temperature: 0.1,
      top_p: 0.95,
      top_k: 40,
      num_ctx: 2048,
      num_gpu: 1,
      num_thread: 4,
      mmap: true,
      f16: true,
      low_vram: true
    }
  }
}

/**
 * Get memory pressure on macOS
 */
async function getMemoryPressure(): Promise<number> {
  try {
    const { stdout } = await execAsync('memory_pressure')
    const match = stdout.match(/System-wide memory free percentage: (\d+)%/)
    return match ? parseInt(match[1]) : 50
  } catch {
    // Fallback using vm_stat
    try {
      const { stdout } = await execAsync('vm_stat')
      const freeMatch = stdout.match(/Pages free:\s+(\d+)/)
      const activeMatch = stdout.match(/Pages active:\s+(\d+)/)
      const inactiveMatch = stdout.match(/Pages inactive:\s+(\d+)/)

      if (freeMatch && activeMatch && inactiveMatch) {
        const free = parseInt(freeMatch[1])
        const active = parseInt(activeMatch[1])
        const inactive = parseInt(inactiveMatch[1])
        const total = free + active + inactive
        return Math.round((free / total) * 100)
      }
    } catch {}
    return 50 // Default fallback
  }
}

/**
 * Get M1-optimized parameters for a model
 */
export function getM1OptimizedParams(modelName: string) {
  // Find matching configuration
  const configKey = Object.keys(M1_CONFIGS).find((key) =>
    modelName.toLowerCase().includes(key.toLowerCase().split(':')[0])
  )

  if (configKey) {
    return M1_CONFIGS[configKey].optimalParameters
  }

  // Safe defaults for unknown models on M1 8GB
  return {
    temperature: 0.3,
    top_p: 0.9,
    top_k: 40,
    num_ctx: 1024, // Conservative
    num_gpu: 1,
    num_thread: 4,
    mmap: true,
    f16: true,
    low_vram: true
  }
}

/**
 * Get adaptive parameters based on current memory pressure
 */
export async function getAdaptiveM1Params(modelName: string) {
  const baseParams = getM1OptimizedParams(modelName)

  try {
    const memoryFreePercent = await getMemoryPressure()

    console.log(`🧠 Memory free: ${memoryFreePercent}%`)

    if (memoryFreePercent < 30) {
      // High memory pressure - be very conservative
      console.log('⚠️ High memory pressure - using conservative settings')
      return {
        ...baseParams,
        num_ctx: Math.min(baseParams.num_ctx, 512),
        num_thread: 2,
        temperature: Math.min(baseParams.temperature, 0.1)
      }
    } else if (memoryFreePercent < 50) {
      // Moderate pressure - slightly reduce context
      console.log('⚠️ Moderate memory pressure - reducing context window')
      return {
        ...baseParams,
        num_ctx: Math.round(baseParams.num_ctx * 0.75),
        num_thread: 3
      }
    } else if (memoryFreePercent > 70) {
      // Plenty of memory - can be slightly more generous
      console.log('✅ Good memory availability - using optimized settings')
      return {
        ...baseParams,
        num_ctx: Math.min(baseParams.num_ctx * 1.25, 3072)
      }
    }

    // Normal pressure - use base params
    console.log('✅ Normal memory usage - using base settings')
    return baseParams
  } catch (error) {
    console.warn('Could not assess memory pressure, using conservative params:', error)
    return {
      ...baseParams,
      num_ctx: Math.round(baseParams.num_ctx * 0.75) // Be conservative on error
    }
  }
}

/**
 * Create optimized Ollama request for M1 MacBook
 */
export async function createM1OptimizedRequest(
  modelName: string,
  prompt: string,
  customParams?: Partial<M1OptimizationConfig['optimalParameters']>
) {
  const optimizedParams = await getAdaptiveM1Params(modelName)
  const finalParams = { ...optimizedParams, ...customParams }

  console.log(`🚀 M1-optimized request for ${modelName}:`, {
    context_length: finalParams.num_ctx,
    memory_optimized: finalParams.low_vram,
    threads: finalParams.num_thread,
    temperature: finalParams.temperature
  })

  return {
    model: modelName,
    prompt,
    stream: false,
    options: finalParams
  }
}

/**
 * Check if model is suitable for M1 8GB
 */
export function isModelSuitableForM1_8GB(modelName: string): {
  suitable: boolean
  reason?: string
} {
  const modelLower = modelName.toLowerCase()

  // Known good models
  const goodModels = ['gemma2:2b', 'tinydolphin', 'phi3:mini', 'qwen2.5:1.5b']
  if (goodModels.some((good) => modelLower.includes(good.split(':')[0]))) {
    return { suitable: true }
  }

  // Check for size indicators
  if (modelLower.includes('1b') || modelLower.includes('1.1b') || modelLower.includes('1.3b')) {
    return { suitable: true }
  }

  if (modelLower.includes('2b') || modelLower.includes('3b')) {
    return { suitable: true }
  }

  // Likely too large
  if (modelLower.includes('7b') || modelLower.includes('8b') || modelLower.includes('13b')) {
    return {
      suitable: false,
      reason: 'Model too large for 8GB RAM. Consider using gemma2:2b instead.'
    }
  }

  // Unknown size - recommend caution
  return {
    suitable: false,
    reason:
      'Unknown model size. For best performance on M1 8GB, use gemma2:2b, tinydolphin, or phi3:mini.'
  }
}

export default {
  getM1OptimizedParams,
  getAdaptiveM1Params,
  createM1OptimizedRequest,
  isModelSuitableForM1_8GB,
  M1_CONFIGS
}
