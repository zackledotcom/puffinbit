// Export a function that registers all code generation IPC handlers
// This will be called from the main index.ts file after ipcMain is available

import {
  getAvailableModels,
  selectBestCodeModel,
  generateCode
} from '@services/codeGenerationService'

// Simple error handler function (inline implementation)
export function withErrorRecovery<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: {
    operation: string
    component: string
    severity: 'info' | 'warning' | 'error'
  }
) {
  return async (...args: T): Promise<R> => {
    try {
      console.log(`🔧 ${options.operation} - Starting...`)
      const result = await handler(...args)
      console.log(`✅ ${options.operation} - Success`)
      return result
    } catch (error) {
      console.error(`❌ ${options.operation} - Failed:`, error)
      throw error
    }
  }
}

// Export function to register all code generation handlers
export function registerCodeGenerationHandlers(ipcMain: any) {
  // Add the IPC handlers for code generation
  ipcMain.handle(
    'get-available-models',
    withErrorRecovery(
      async () => {
        return await getAvailableModels()
      },
      {
        operation: 'get-available-models',
        component: 'code-generation',
        severity: 'info'
      }
    )
  )

  ipcMain.handle(
    'select-best-code-model',
    withErrorRecovery(
      async () => {
        return await selectBestCodeModel()
      },
      {
        operation: 'select-best-code-model',
        component: 'code-generation',
        severity: 'info'
      }
    )
  )

  ipcMain.handle(
    'generate-code',
    withErrorRecovery(
      async (_, { task, language, modelName }) => {
        if (!task || !language) {
          throw new Error('Task and language are required')
        }

        return await generateCode(task, language, modelName)
      },
      {
        operation: 'generate-code',
        component: 'code-generation',
        severity: 'warning'
      }
    )
  )
}
