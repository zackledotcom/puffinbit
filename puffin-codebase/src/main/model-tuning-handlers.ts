// Export a function that registers all model tuning IPC handlers
// This will be called from the main index.ts file after ipcMain is available

import {
  getAvailableModelsForTuning,
  getAllDatasets,
  getDataset,
  createDataset,
  updateDataset,
  deleteDataset,
  addExamplesToDataset,
  removeExamplesFromDataset,
  getAllJobs,
  getJob,
  startTuningJob,
  TuningExample,
  TuningDataset,
  TuningJob
} from '@services/modelTuningService'

// Simple error handler function (inline implementation)
function withErrorRecovery<T extends any[], R>(
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

// Export function to register all model tuning handlers
export function registerModelTuningHandlers(ipcMain: any) {
  // Datasets
  ipcMain.handle(
    'get-available-models-for-tuning',
    withErrorRecovery(
      async () => {
        return await getAvailableModelsForTuning()
      },
      {
        operation: 'get-available-models-for-tuning',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  )

  ipcMain.handle(
    'get-all-tuning-datasets',
    withErrorRecovery(
      async () => {
        return await getAllDatasets()
      },
      {
        operation: 'get-all-tuning-datasets',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  )

  ipcMain.handle(
    'get-tuning-dataset',
    withErrorRecovery(
      async (_, id: string) => {
        return await getDataset(id)
      },
      {
        operation: 'get-tuning-dataset',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  )

  ipcMain.handle(
    'create-tuning-dataset',
    withErrorRecovery(
      async (
        _,
        params: {
          name: string
          description: string
          examples?: TuningExample[]
        }
      ) => {
        return await createDataset(params.name, params.description, params.examples)
      },
      {
        operation: 'create-tuning-dataset',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  )

  ipcMain.handle(
    'update-tuning-dataset',
    withErrorRecovery(
      async (
        _,
        params: {
          id: string
          updates: Partial<TuningDataset>
        }
      ) => {
        return await updateDataset(params.id, params.updates)
      },
      {
        operation: 'update-tuning-dataset',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  )

  ipcMain.handle(
    'delete-tuning-dataset',
    withErrorRecovery(
      async (_, id: string) => {
        return await deleteDataset(id)
      },
      {
        operation: 'delete-tuning-dataset',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  )

  ipcMain.handle(
    'add-examples-to-dataset',
    withErrorRecovery(
      async (
        _,
        params: {
          datasetId: string
          examples: TuningExample[]
        }
      ) => {
        return await addExamplesToDataset(params.datasetId, params.examples)
      },
      {
        operation: 'add-examples-to-dataset',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  )

  ipcMain.handle(
    'remove-examples-from-dataset',
    withErrorRecovery(
      async (
        _,
        params: {
          datasetId: string
          indices: number[]
        }
      ) => {
        return await removeExamplesFromDataset(params.datasetId, params.indices)
      },
      {
        operation: 'remove-examples-from-dataset',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  )

  // Jobs
  ipcMain.handle(
    'get-all-tuning-jobs',
    withErrorRecovery(
      async () => {
        return await getAllJobs()
      },
      {
        operation: 'get-all-tuning-jobs',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  )

  ipcMain.handle(
    'get-tuning-job',
    withErrorRecovery(
      async (_, id: string) => {
        return await getJob(id)
      },
      {
        operation: 'get-tuning-job',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  )

  ipcMain.handle(
    'start-tuning-job',
    withErrorRecovery(
      async (
        _,
        params: {
          baseModel: string
          newModelName: string
          datasetId: string
          epochs: number
          learningRate: number
          batchSize: number
        }
      ) => {
        return await startTuningJob(params.baseModel, params.newModelName, params.datasetId, {
          epochs: params.epochs,
          learningRate: params.learningRate,
          batchSize: params.batchSize
        })
      },
      {
        operation: 'start-tuning-job',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  )

  // Import/Export
  ipcMain.handle(
    'export-tuning-dataset',
    withErrorRecovery(
      async (_, id: string) => {
        // This function is not exported from modelTuningService, so it will be removed.
        // Keeping the handler structure for now, but it will not work as intended.
        console.warn('export-tuning-dataset is not implemented in modelTuningService')
        return Promise.resolve(null) // Placeholder
      },
      {
        operation: 'export-tuning-dataset',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  )

  ipcMain.handle(
    'import-tuning-dataset',
    withErrorRecovery(
      async (_, filePath: string) => {
        // This function is not exported from modelTuningService, so it will be removed.
        // Keeping the handler structure for now, but it will not work as intended.
        console.warn('import-tuning-dataset is not implemented in modelTuningService')
        return Promise.resolve(null) // Placeholder
      },
      {
        operation: 'import-tuning-dataset',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  )
}
