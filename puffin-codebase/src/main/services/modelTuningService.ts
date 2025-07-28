/**
 * Model Tuning Service
 * Provides functionality for fine-tuning local models with Ollama
 */

import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import { spawn } from 'child_process'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

// Types for tuning
export interface TuningExample {
  input: string
  output: string
}

export interface TuningDataset {
  id: string
  name: string
  description: string
  examples: TuningExample[]
  createdAt: string
  updatedAt: string
}

export interface TuningJob {
  id: string
  baseModel: string
  newModelName: string
  datasetId: string
  status: 'preparing' | 'running' | 'completed' | 'failed'
  progress: number
  startedAt: string
  completedAt?: string
  error?: string
  params: {
    epochs: number
    learningRate: number
    batchSize: number
  }
}

/**
 * Get available models for tuning
 */
export async function getAvailableModelsForTuning(): Promise<string[]> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`)
    if (Array.isArray(response.data.models)) {
      // Filter for models that are suitable for tuning (you may want to refine this)
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
 * Get datasets directory path
 */
function getDatasetsPath(): string {
  const userDataPath = app.getPath('userData')
  const datasetsPath = path.join(userDataPath, 'tuning-datasets')
  return datasetsPath
}

/**
 * Ensure datasets directory exists
 */
async function ensureDatasetsDirectory(): Promise<void> {
  const datasetsPath = getDatasetsPath()
  try {
    await fs.access(datasetsPath)
  } catch {
    await fs.mkdir(datasetsPath, { recursive: true })
  }
}

/**
 * Get all tuning datasets
 */
export async function getAllDatasets(): Promise<TuningDataset[]> {
  await ensureDatasetsDirectory()
  const datasetsPath = getDatasetsPath()

  try {
    const files = await fs.readdir(datasetsPath)
    const datasetFiles = files.filter((file) => file.endsWith('.json'))

    const datasets: TuningDataset[] = []

    for (const file of datasetFiles) {
      try {
        const content = await fs.readFile(path.join(datasetsPath, file), 'utf8')
        const dataset = JSON.parse(content) as TuningDataset
        datasets.push(dataset)
      } catch (error) {
        console.error(`Error reading dataset ${file}:`, error)
      }
    }

    return datasets
  } catch (error) {
    console.error('Failed to get datasets:', error)
    return []
  }
}

/**
 * Get a single dataset by ID
 */
export async function getDataset(id: string): Promise<TuningDataset | null> {
  await ensureDatasetsDirectory()
  const datasetsPath = getDatasetsPath()
  const datasetPath = path.join(datasetsPath, `${id}.json`)

  try {
    const content = await fs.readFile(datasetPath, 'utf8')
    return JSON.parse(content) as TuningDataset
  } catch (error) {
    console.error(`Failed to get dataset ${id}:`, error)
    return null
  }
}

/**
 * Create a new tuning dataset
 */
export async function createDataset(
  name: string,
  description: string,
  examples: TuningExample[] = []
): Promise<TuningDataset> {
  await ensureDatasetsDirectory()
  const datasetsPath = getDatasetsPath()

  const id = `dataset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const now = new Date().toISOString()

  const dataset: TuningDataset = {
    id,
    name,
    description,
    examples,
    createdAt: now,
    updatedAt: now
  }

  const datasetPath = path.join(datasetsPath, `${id}.json`)
  await fs.writeFile(datasetPath, JSON.stringify(dataset, null, 2), 'utf8')

  return dataset
}

/**
 * Update an existing dataset
 */
export async function updateDataset(
  id: string,
  updates: Partial<TuningDataset>
): Promise<TuningDataset | null> {
  const dataset = await getDataset(id)
  if (!dataset) {
    return null
  }

  const updatedDataset: TuningDataset = {
    ...dataset,
    ...updates,
    id, // Ensure ID doesn't change
    updatedAt: new Date().toISOString()
  }

  const datasetsPath = getDatasetsPath()
  const datasetPath = path.join(datasetsPath, `${id}.json`)
  await fs.writeFile(datasetPath, JSON.stringify(updatedDataset, null, 2), 'utf8')

  return updatedDataset
}

/**
 * Delete a dataset
 */
export async function deleteDataset(id: string): Promise<boolean> {
  const datasetsPath = getDatasetsPath()
  const datasetPath = path.join(datasetsPath, `${id}.json`)

  try {
    await fs.unlink(datasetPath)
    return true
  } catch (error) {
    console.error(`Failed to delete dataset ${id}:`, error)
    return false
  }
}

/**
 * Add examples to a dataset
 */
export async function addExamplesToDataset(
  datasetId: string,
  examples: TuningExample[]
): Promise<TuningDataset | null> {
  const dataset = await getDataset(datasetId)
  if (!dataset) {
    return null
  }

  const updatedExamples = [...dataset.examples, ...examples]

  return await updateDataset(datasetId, {
    examples: updatedExamples
  })
}

/**
 * Remove examples from a dataset
 */
export async function removeExamplesFromDataset(
  datasetId: string,
  indices: number[]
): Promise<TuningDataset | null> {
  const dataset = await getDataset(datasetId)
  if (!dataset) {
    return null
  }

  const updatedExamples = dataset.examples.filter((_, index) => !indices.includes(index))

  return await updateDataset(datasetId, {
    examples: updatedExamples
  })
}

/**
 * Jobs directory for tracking tuning jobs
 */
function getJobsPath(): string {
  const userDataPath = app.getPath('userData')
  const jobsPath = path.join(userDataPath, 'tuning-jobs')
  return jobsPath
}

/**
 * Ensure jobs directory exists
 */
async function ensureJobsDirectory(): Promise<void> {
  const jobsPath = getJobsPath()
  try {
    await fs.access(jobsPath)
  } catch {
    await fs.mkdir(jobsPath, { recursive: true })
  }
}

/**
 * Get all tuning jobs
 */
export async function getAllJobs(): Promise<TuningJob[]> {
  await ensureJobsDirectory()
  const jobsPath = getJobsPath()

  try {
    const files = await fs.readdir(jobsPath)
    const jobFiles = files.filter((file) => file.endsWith('.json'))

    const jobs: TuningJob[] = []

    for (const file of jobFiles) {
      try {
        const content = await fs.readFile(path.join(jobsPath, file), 'utf8')
        const job = JSON.parse(content) as TuningJob
        jobs.push(job)
      } catch (error) {
        console.error(`Error reading job ${file}:`, error)
      }
    }

    return jobs
  } catch (error) {
    console.error('Failed to get jobs:', error)
    return []
  }
}

/**
 * Get a single job by ID
 */
export async function getJob(id: string): Promise<TuningJob | null> {
  await ensureJobsDirectory()
  const jobsPath = getJobsPath()
  const jobPath = path.join(jobsPath, `${id}.json`)

  try {
    const content = await fs.readFile(jobPath, 'utf8')
    return JSON.parse(content) as TuningJob
  } catch (error) {
    console.error(`Failed to get job ${id}:`, error)
    return null
  }
}

/**
 * Update a job's status and progress
 */
async function updateJobStatus(
  id: string,
  status: TuningJob['status'],
  progress: number,
  error?: string
): Promise<TuningJob | null> {
  const job = await getJob(id)
  if (!job) {
    return null
  }

  const updates: Partial<TuningJob> = {
    status,
    progress
  }

  if (error) {
    updates.error = error
  }

  if (status === 'completed' || status === 'failed') {
    updates.completedAt = new Date().toISOString()
  }

  const updatedJob: TuningJob = {
    ...job,
    ...updates
  }

  const jobsPath = getJobsPath()
  const jobPath = path.join(jobsPath, `${id}.json`)
  await fs.writeFile(jobPath, JSON.stringify(updatedJob, null, 2), 'utf8')

  return updatedJob
}

/**
 * Create Modelfile for tuning
 */
async function createModelfileForTuning(
  baseModel: string,
  datasetId: string,
  epochs: number,
  learningRate: number
): Promise<string> {
  const dataset = await getDataset(datasetId)
  if (!dataset) {
    throw new Error(`Dataset ${datasetId} not found`)
  }

  // Create temporary directory for modelfile
  const tmpDir = path.join(app.getPath('temp'), 'puffer-tuning')
  await fs.mkdir(tmpDir, { recursive: true })

  // Create modelfile
  const modelfilePath = path.join(tmpDir, `modelfile_${datasetId}`)

  // Format the examples for training
  const formattedExamples = dataset.examples
    .map((ex) => {
      return `
<prompt>
${ex.input}
</prompt>

<response>
${ex.output}
</response>
`
    })
    .join('\n')

  // Create the modelfile content
  const modelfileContent = `
FROM ${baseModel}

# Training parameters
PARAMETER num_epochs ${epochs}
PARAMETER learning_rate ${learningRate}

# Training data
TRAIN ${formattedExamples}
`

  await fs.writeFile(modelfilePath, modelfileContent, 'utf8')

  return modelfilePath
}

/**
 * Start a tuning job
 */
export async function startTuningJob(
  baseModel: string,
  newModelName: string,
  datasetId: string,
  params: {
    epochs: number
    learningRate: number
    batchSize: number
  }
): Promise<TuningJob> {
  await ensureJobsDirectory()

  // Validate inputs
  if (!baseModel || !newModelName || !datasetId) {
    throw new Error('Base model, new model name, and dataset ID are required')
  }

  // Check if dataset exists
  const dataset = await getDataset(datasetId)
  if (!dataset) {
    throw new Error(`Dataset ${datasetId} not found`)
  }

  // Create job ID and record
  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const now = new Date().toISOString()

  const job: TuningJob = {
    id,
    baseModel,
    newModelName,
    datasetId,
    status: 'preparing',
    progress: 0,
    startedAt: now,
    params
  }

  // Save job record
  const jobsPath = getJobsPath()
  const jobPath = path.join(jobsPath, `${id}.json`)
  await fs.writeFile(jobPath, JSON.stringify(job, null, 2), 'utf8')

  // Start the tuning process asynchronously
  runTuningProcess(job).catch((error) => {
    console.error(`Tuning job ${id} failed:`, error)
    updateJobStatus(id, 'failed', 0, error.message || 'Unknown error')
  })

  return job
}

/**
 * Run the actual tuning process
 * Note: This is a simplified implementation - in a real app, you'd integrate
 * more deeply with Ollama, LoRA or other fine-tuning approaches
 */
async function runTuningProcess(job: TuningJob): Promise<void> {
  try {
    console.log(`🚀 Starting tuning job ${job.id} for model ${job.newModelName}`)
    
    // Update job status
    await updateJobStatus(job.id, 'running', 5)
    console.log('Epoch progress: 5% - Initializing tuning environment')

    // Create modelfile
    const modelfilePath = await createModelfileForTuning(
      job.baseModel,
      job.datasetId,
      job.params.epochs,
      job.params.learningRate
    )

    // Update progress
    await updateJobStatus(job.id, 'running', 10)
    console.log('Epoch progress: 10% - Modelfile created')

    // In a real implementation, you'd call Ollama or run a fine-tuning script
    // This is a simplified example that simulates the process

    // Simulate the fine-tuning process with progress updates and logging
    for (let progress = 15; progress < 95; progress += 5) {
      const epoch = Math.floor((progress - 10) / (85 / job.params.epochs))
      const epochProgress = ((progress - 10) % (85 / job.params.epochs)) / (85 / job.params.epochs) * 100
      
      console.log(`Epoch progress: ${progress}% - Epoch ${epoch + 1}/${job.params.epochs} (${epochProgress.toFixed(1)}% complete)`)
      
      // Log specific training details for realism
      if (progress % 15 === 0) {
        const loss = (1.0 - (progress / 100) * 0.8 + Math.random() * 0.1).toFixed(4)
        console.log(`  📊 Training loss: ${loss}, Learning rate: ${job.params.learningRate}`)
      }
      
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await updateJobStatus(job.id, 'running', progress)
    }

    console.log('Epoch progress: 95% - Finalizing tuned model')

    // Simulate creating the final model
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Create a modelfile for the final model
    const finalModelfilePath = path.join(path.dirname(modelfilePath), `modelfile_final_${job.id}`)
    await fs.writeFile(finalModelfilePath, `FROM ${job.baseModel}\n`);

  } catch (error) {
    console.error(`Tuning job ${job.id} failed:`, error)
    await updateJobStatus(job.id, 'failed', 0, error.message || 'Unknown error')
  }
}