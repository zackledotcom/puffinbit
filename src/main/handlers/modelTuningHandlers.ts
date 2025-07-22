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
} from '@services/modelTuningService';

// Enhanced error wrapper with retries and metrics
function withErrorRecovery<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: {
    operation: string;
    component: string;
    severity: 'info' | 'warning' | 'error';
    maxRetries?: number;
  }
) {
  let metrics = { requests: 0, errors: 0, avgTime: 0 };

  return async (...args: T): Promise<R> => {
    metrics.requests++;
    const start = Date.now();
    for (let attempt = 0; attempt < (options.maxRetries || 1); attempt++) {
      try {
        console.log(`🔧 ${options.operation} - Attempt ${attempt + 1}`);
        const result = await handler(...args);
        const time = Date.now() - start;
        metrics.avgTime = (metrics.avgTime * (metrics.requests - 1) + time) / metrics.requests;
        console.log(`✅ ${options.operation} - Success in ${time}ms`);
        return result;
      } catch (error) {
        metrics.errors++;
        console.error(`❌ ${options.operation} - Failed on attempt ${attempt + 1}:`, error);
        if (attempt === (options.maxRetries || 1) - 1) throw error;
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); // Backoff
      }
    }
    throw new Error('Retries exhausted');
  };
}

// Register all model tuning handlers with recovery
export function registerModelTuningHandlers(ipcMain: any) {
  // Datasets
  ipcMain.handle(
    'get-available-models-for-tuning',
    withErrorRecovery(
      async () => await getAvailableModelsForTuning(),
      {
        operation: 'get-available-models-for-tuning',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  );

  ipcMain.handle(
    'get-all-tuning-datasets',
    withErrorRecovery(
      async () => await getAllDatasets(),
      {
        operation: 'get-all-tuning-datasets',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  );

  ipcMain.handle(
    'get-tuning-dataset',
    withErrorRecovery(
      async (_, id: string) => await getDataset(id),
      {
        operation: 'get-tuning-dataset',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  );

  ipcMain.handle(
    'create-tuning-dataset',
    withErrorRecovery(
      async (
        _,
        params: {
          name: string;
          description: string;
          examples?: TuningExample[];
        }
      ) => await createDataset(params.name, params.description, params.examples),
      {
        operation: 'create-tuning-dataset',
        component: 'model-tuning',
        severity: 'warning',
        maxRetries: 2
      }
    )
  );

  ipcMain.handle(
    'update-tuning-dataset',
    withErrorRecovery(
      async (
        _,
        params: {
          id: string;
          updates: Partial<TuningDataset>;
        }
      ) => await updateDataset(params.id, params.updates),
      {
        operation: 'update-tuning-dataset',
        component: 'model-tuning',
        severity: 'warning',
        maxRetries: 2
      }
    )
  );

  ipcMain.handle(
    'delete-tuning-dataset',
    withErrorRecovery(
      async (_, id: string) => await deleteDataset(id),
      {
        operation: 'delete-tuning-dataset',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  );

  ipcMain.handle(
    'add-examples-to-dataset',
    withErrorRecovery(
      async (
        _,
        params: {
          datasetId: string;
          examples: TuningExample[];
        }
      ) => await addExamplesToDataset(params.datasetId, params.examples),
      {
        operation: 'add-examples-to-dataset',
        component: 'model-tuning',
        severity: 'warning',
        maxRetries: 2
      }
    )
  );

  ipcMain.handle(
    'remove-examples-from-dataset',
    withErrorRecovery(
      async (
        _,
        params: {
          datasetId: string;
          indices: number[];
        }
      ) => await removeExamplesFromDataset(params.datasetId, params.indices),
      {
        operation: 'remove-examples-from-dataset',
        component: 'model-tuning',
        severity: 'warning'
      }
    )
  );

  // Jobs
  ipcMain.handle(
    'get-all-tuning-jobs',
    withErrorRecovery(
      async () => await getAllJobs(),
      {
        operation: 'get-all-tuning-jobs',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  );

  ipcMain.handle(
    'get-tuning-job',
    withErrorRecovery(
      async (_, id: string) => await getJob(id),
      {
        operation: 'get-tuning-job',
        component: 'model-tuning',
        severity: 'info'
      }
    )
  );

  ipcMain.handle(
    'start-tuning-job',
    withErrorRecovery(
      async (
        _,
        params: {
          baseModel: string;
          newModelName: string;
          datasetId: string;
          epochs: number;
          learningRate: number;
          batchSize: number;
        }
      ) => await startTuningJob(params.baseModel, params.newModelName, params.datasetId, {
        epochs: params.epochs,
        learningRate: params.learningRate,
        batchSize: params.batchSize
      }),
      {
        operation: 'start-tuning-job',
        component: 'model-tuning',
        severity: 'warning',
        maxRetries: 2
      }
    )
  );
}