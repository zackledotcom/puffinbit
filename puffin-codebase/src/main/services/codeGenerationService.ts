/**
 * Enhanced Code Generation Service
 * Optimized service for code generation with various models
 */

import axios from 'axios'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

/**
 * Get all available models from Ollama
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`)
    if (Array.isArray(response.data.models)) {
      return response.data.models
        .map((m: any) => (m && typeof m.name === 'string' ? m.name : null))
        .filter((name: string | null): name is string => name !== null)
    }
    return []
  } catch (error) {
    console.error('Failed to fetch available models:', error)
    return []
  }
}

/**
 * Select the best code-focused model from available models
 */
export async function selectBestCodeModel(): Promise<string> {
  const models = await getAvailableModels()

  // Prioritize these models for code generation if available
  const codeOptimizedModels = [
    'gemma-coder', // Our custom Gemma model
    'deepseek-coder', // Specialized for code
    'phi4-mini-reasoning', // Good at reasoning tasks including code
    'codellama', // Specialized for code
    'wizardcoder', // Specialized for code
    'mistral', // Good general model
    'openchat', // Good general model
    'llama3' // Good general model
  ]

  // Find the first matching model
  for (const preferred of codeOptimizedModels) {
    const match = models.find((m) => m.toLowerCase().includes(preferred.toLowerCase()))
    if (match) {
      return match
    }
  }

  // If no preferred models found, return the first available model
  return models[0] || 'unknown'
}

/**
 * Generate code using the best available model
 */
export async function generateCode(
  task: string,
  language: string,
  modelName?: string
): Promise<string> {
  if (!task || !language) {
    throw new Error('Task and language are required')
  }

  // Select the model to use - either specified or best available
  const model = modelName || (await selectBestCodeModel())

  if (!model || model === 'unknown') {
    throw new Error('No suitable model available. Please pull a model with Ollama first.')
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

  // Determine optimal parameters based on the model
  const isGemmaCoder = model.toLowerCase().includes('gemma-coder')
  const isSmallModel =
    model.toLowerCase().includes('1b') ||
    model.toLowerCase().includes('1.3b') ||
    model.toLowerCase().includes('tiny')

  // Set parameters based on model size and type
  const options = {
    temperature: 0.2, // Low temperature for deterministic output
    top_p: 0.95, // Allow some variation but not too much
    top_k: 40, // Slightly higher for code generation
    max_tokens: isSmallModel ? 1000 : 2000, // Adjust based on model size
    num_ctx: isGemmaCoder ? 2048 : 4096, // Limit context for optimized models
    stop: ['```'] // Stop at code block end
  }

  // Add M1 optimization parameters for Gemma
  if (isGemmaCoder) {
    Object.assign(options, {
      num_gpu: 1, // Use GPU but limit to 1 layer
      num_thread: 4, // Limit CPU threads
      mmap: true, // Memory-mapped IO for efficiency
      f16: true, // Use half-precision for memory efficiency
      low_vram: true // Optimize for low VRAM
    })
  }

  try {
    // Generate the code
    console.log(`🧠 Generating code with model: ${model}`)

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options
      },
      { timeout: 60000 } // Allow up to 60 seconds for code generation
    )

    if (!response.data?.response) {
      throw new Error(`No response from model: ${model}`)
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
    console.log(`✅ Generated ${code.length / 4} tokens of ${language} code with ${model}`)

    return code
  } catch (error) {
    console.error(`Failed to generate code with ${model}:`, error)
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
