// Import the gemmaCoderService functions
import {
  checkGemmaCoderAvailable,
  initializeGemmaCoder,
  generateCodeWithGemma
} from '@services/gemmaCoderService'
import { app, ipcMain } from 'electron'
import { withErrorRecovery } from './code-generation-handlers'

// Add this to the beginning of your ipcMain handler section
// --------------------------------------------------------

// Initialize the GemmaCoder model when app starts
app.whenReady().then(async () => {
  // Your existing app.whenReady() code here...

  // Try to initialize GemmaCoder model
  try {
    const isAvailable = await checkGemmaCoderAvailable()
    if (isAvailable) {
      console.log('🧠 GemmaCoder model found, initializing...')
      await initializeGemmaCoder()
    } else {
      console.log('ℹ️ GemmaCoder model not found. Run Ollama command to create it.')
    }
  } catch (error) {
    console.error('Failed to initialize GemmaCoder:', error)
  }
})

// Add the IPC handler for code generation with Gemma
ipcMain.handle(
  'generate-code-with-gemma',
  withErrorRecovery(
    async (_, { task, language }) => {
      if (!task || !language) {
        throw new Error('Task and language are required')
      }

      // Check if model is available
      const isAvailable = await checkGemmaCoderAvailable()
      if (!isAvailable) {
        throw new Error('GemmaCoder model not available. Please create it with Ollama first.')
      }

      // Generate code with optimized model
      const code = await generateCodeWithGemma(task, language)
      return code
    },
    {
      operation: 'generate-code-with-gemma',
      component: 'service',
      severity: 'warning'
    }
  )
)
