/**
 * GemmaCoder Enhanced Service
 * Specialized service for the Gemma 3.4B abliterated model
 * Optimized for code generation on MacBook M1 with 8GB RAM
 */

import axios from 'axios'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

/**
 * Check if the GemmaCoder model is available in Ollama
 */
export async function checkGemmaCoderAvailable(): Promise<boolean> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`)
    if (Array.isArray(response.data.models)) {
      const models = response.data.models
        .map((m: any) => (m && typeof m.name === 'string' ? m.name : null))
        .filter((name: string | null): name is string => name !== null)

      return models.includes('gemma-coder')
    }
    return false
  } catch (error) {
    console.error('Failed to check for GemmaCoder model:', error)
    return false
  }
}

/**
 * Initialize GemmaCoder model with optimized settings for M1 MacBook
 */
export async function initializeGemmaCoder(): Promise<boolean> {
  try {
    // Check if model exists first
    const isAvailable = await checkGemmaCoderAvailable()

    if (!isAvailable) {
      console.log('GemmaCoder model not found. Please create it first.')
      return false
    }

    // Pre-load the model to minimize first-request latency
    await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: 'gemma-coder',
        prompt: 'Hello',
        stream: false,
        options: {
          temperature: 0.1,
          max_tokens: 10,
          num_ctx: 2048,
          num_gpu: 1,
          num_thread: 4,
          mmap: true,
          f16: true,
          low_vram: true
        }
      },
      { timeout: 10000 }
    )

    console.log('✅ GemmaCoder model initialized and ready')
    return true
  } catch (error) {
    console.error('Failed to initialize GemmaCoder model:', error)
    return false
  }
}

/**
 * Generate code using the GemmaCoder model with optimized settings
 */
export async function generateCodeWithGemma(task: string, language: string): Promise<string> {
  if (!task || !language) {
    throw new Error('Task and language are required')
  }

  // Construct an optimized prompt for code generation
  const prompt = `
Write complete, working ${language} code for the following task:

${task}

The code should:
1) Be fully functional and complete
2) Include proper error handling
3) Follow best practices for ${language}
4) Be well-commented

Only provide the code, without explanations:
`

  try {
    // First check if model is available
    const isAvailable = await checkGemmaCoderAvailable()
    if (!isAvailable) {
      throw new Error(
        'GemmaCoder model not available. Please run the Ollama command to create it first.'
      )
    }

    // Set parameters optimized for code generation on limited resources
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: 'gemma-coder',
        prompt,
        stream: false,
        options: {
          temperature: 0.2, // Low temperature for deterministic output
          top_p: 0.95, // Allow some variation but not too much
          top_k: 40, // Slightly higher for code generation
          max_tokens: 1500, // Limit to conserve memory
          num_ctx: 2048, // Limited context for M1 with 8GB
          num_gpu: 1, // Use GPU but limit to 1 layer
          num_thread: 4, // Limit CPU threads
          mmap: true, // Memory-mapped IO for efficiency
          f16: true, // Use half-precision for memory efficiency
          low_vram: true, // Optimize for low VRAM
          stop: ['```'] // Stop at code block end
        }
      },
      { timeout: 60000 } // Allow up to 60 seconds for code generation
    )

    if (!response.data?.response) {
      throw new Error('No response from GemmaCoder model')
    }

    // Clean up the response to ensure it's only code
    let code = response.data.response.trim()

    // Remove any markdown code block delimiters
    if (code.startsWith('```')) {
      const startIndex = code.indexOf('\n')
      if (startIndex !== -1) {
        code = code.substring(startIndex + 1)
      }
    }

    if (code.endsWith('```')) {
      code = code.substring(0, code.lastIndexOf('```')).trim()
    }

    // Remove any language specification from the start
    const langPattern = new RegExp(`^${language}\\s*`, 'i')
    code = code.replace(langPattern, '')

    // Log success with token stats
    console.log(`✅ Generated ${code.length / 4} tokens of ${language} code with GemmaCoder`)

    return code
  } catch (error) {
    console.error('Failed to generate code with GemmaCoder:', error)
    throw new Error(
      `Code generation failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Check if code appears incomplete and attempt to fix it
 */
export function completeCode(code: string, language: string): string {
  // Basic checks for common incompleteness markers
  let fixedCode = code

  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript': {
      // Check for unbalanced braces
      const openBraces = (code.match(/\{/g) || []).length
      const closeBraces = (code.match(/\}/g) || []).length

      if (openBraces > closeBraces) {
        fixedCode += '\n' + '}'.repeat(openBraces - closeBraces)
      }
      break
    }

    case 'python': {
      // Python is harder to auto-complete properly
      // Check for incomplete functions with missing return
      if (
        (code.match(/def\s+\w+\s*\(/g) || []).length > (code.match(/\s+return\s+/g) || []).length
      ) {
        fixedCode += '\n    return None'
      }
      break
    }

    // Add handlers for other languages as needed
  }

  return fixedCode
}
