import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pulsating } from '@/components/ui/pulsating'
import NumberTicker from '@/components/ui/number-ticker'
import { Brain, Play, Stop, Check, X, ArrowsClockwise, Trash } from 'phosphor-react'
import { format } from 'date-fns'

// Types (should match the backend)
interface TuningDataset {
  id: string
  name: string
  description: string
  examples: { input: string; output: string }[]
  createdAt: string
  updatedAt: string
}

interface TuningJob {
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

interface ModelTunerProps {
  className?: string
}

const ModelTuner: React.FC<ModelTunerProps> = ({ className }) => {
  // Data state
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [datasets, setDatasets] = useState<TuningDataset[]>([])
  const [jobs, setJobs] = useState<TuningJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [newModelName, setNewModelName] = useState('')
  const [epochs, setEpochs] = useState(3)
  const [learningRate, setLearningRate] = useState(0.0001)
  const [batchSize, setBatchSize] = useState(8)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Refresh data periodically for jobs
  useEffect(() => {
    const interval = setInterval(() => {
      refreshJobs()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Load all data
  const loadData = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Load models
      const models = await window.api.getAvailableModelsForTuning()
      setAvailableModels(models)

      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0])
      }

      // Load datasets
      const datasets = await window.api.getAllTuningDatasets()
      setDatasets(datasets)

      // Load jobs
      const jobs = await window.api.getAllTuningJobs()
      setJobs(jobs)
    } catch (error) {
      console.error('Failed to load data:', error)
      setError(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh jobs only
  const refreshJobs = async () => {
    try {
      const jobs = await window.api.getAllTuningJobs()
      setJobs(jobs)
    } catch (error) {
      console.error('Failed to refresh jobs:', error)
      // Don't show error for background refresh
    }
  }

  // Start a new tuning job
  const startTuningJob = async () => {
    if (!selectedModel || !selectedDataset || !newModelName.trim()) {
      setError('Please fill out all required fields')
      return
    }

    // Validate model name format
    const modelNameRegex = /^[a-zA-Z0-9_-]+$/
    if (!modelNameRegex.test(newModelName)) {
      setError('Model name can only contain letters, numbers, underscores, and hyphens')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const job = await window.api.startTuningJob({
        baseModel: selectedModel,
        newModelName: newModelName,
        datasetId: selectedDataset,
        epochs,
        learningRate,
        batchSize
      })

      // Add the new job to the list
      setJobs((prev) => [job, ...prev])

      // Reset form
      setNewModelName('')
    } catch (error) {
      console.error('Failed to start tuning job:', error)
      setError(
        `Failed to start tuning job: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Cancel a running job
  const cancelJob = async (jobId: string) => {
    try {
      await window.api.cancelTuningJob(jobId)
      refreshJobs()
    } catch (error) {
      console.error('Failed to cancel job:', error)
      setError(`Failed to cancel job: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Delete a completed or failed job
  const deleteJob = async (jobId: string) => {
    try {
      await window.api.deleteTuningJob(jobId)
      setJobs((prev) => prev.filter((job) => job.id !== jobId))
    } catch (error) {
      console.error('Failed to delete job:', error)
      setError(`Failed to delete job: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Format job timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a')
    } catch (error) {
      return timestamp
    }
  }

  // Get dataset name from ID
  const getDatasetName = (id: string) => {
    const dataset = datasets.find((d) => d.id === id)
    return dataset ? dataset.name : id
  }

  return (
    <Card className="bg-gray-800/80 border-gray-700/50 backdrop-blur-md overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain size={20} className="text-purple-400" />
          Model Tuner
          {isLoading && <Pulsating className="ml-2 text-purple-400" />}
        </CardTitle>
        <CardDescription>Fine-tune models with your custom datasets</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tune" className="w-full">
          <TabsList className="bg-gray-700">
            <TabsTrigger value="tune">New Tuning Job</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="tune">
            <div className="py-2 space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-900/30 text-red-300 p-3 rounded text-sm">{error}</div>
              )}

              {/* Tuning Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Base Model */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Base Model</label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue placeholder="Select base model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dataset */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Training Dataset</label>
                    <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue placeholder="Select dataset" />
                      </SelectTrigger>
                      <SelectContent>
                        {datasets.map((dataset) => (
                          <SelectItem key={dataset.id} value={dataset.id}>
                            {dataset.name} ({dataset.examples.length} examples)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {datasets.length === 0 && (
                      <p className="text-xs text-amber-400 mt-1">
                        No datasets available. Create a dataset first.
                      </p>
                    )}
                  </div>
                </div>

                {/* New Model Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">New Model Name</label>
                  <Input
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="E.g., my-tuned-model"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only use letters, numbers, underscores, and hyphens
                  </p>
                </div>

                {/* Training Parameters */}
                <div className="bg-gray-900/50 p-3 rounded space-y-4">
                  <h3 className="text-sm font-medium text-gray-300">Training Parameters</h3>

                  {/* Epochs */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-gray-400">Epochs</label>
                      <span className="text-sm text-white">{epochs}</span>
                    </div>
                    <Slider
                      value={[epochs]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={([value]) => setEpochs(value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Higher values = better results but longer training time
                    </p>
                  </div>

                  {/* Learning Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-gray-400">Learning Rate</label>
                      <span className="text-sm text-white">{learningRate}</span>
                    </div>
                    <Slider
                      value={[learningRate * 10000]} // Scale for slider
                      min={1}
                      max={100}
                      step={1}
                      onValueChange={([value]) => setLearningRate(value / 10000)}
                    />
                  </div>

                  {/* Batch Size */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-gray-400">Batch Size</label>
                      <span className="text-sm text-white">{batchSize}</span>
                    </div>
                    <Slider
                      value={[batchSize]}
                      min={1}
                      max={32}
                      step={1}
                      onValueChange={([value]) => setBatchSize(value)}
                    />
                  </div>
                </div>

                {/* Actions */}
                <Button
                  onClick={startTuningJob}
                  disabled={
                    isLoading ||
                    !selectedModel ||
                    !selectedDataset ||
                    !newModelName.trim() ||
                    datasets.length === 0
                  }
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Play size={16} className="mr-2" />
                  Start Tuning
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            <div className="py-2">
              <ScrollArea className="h-[400px] pr-4">
                {jobs.length > 0 ? (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className={`bg-gray-900 rounded p-3 border ${
                          job.status === 'completed'
                            ? 'border-green-600/30'
                            : job.status === 'failed'
                              ? 'border-red-600/30'
                              : job.status === 'running'
                                ? 'border-blue-600/30'
                                : 'border-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-white font-medium">{job.newModelName}</h3>
                            <p className="text-xs text-gray-400">
                              Base: {job.baseModel} | Dataset: {getDatasetName(job.datasetId)}
                            </p>
                          </div>
                          <div
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              job.status === 'completed'
                                ? 'bg-green-900/30 text-green-400'
                                : job.status === 'failed'
                                  ? 'bg-red-900/30 text-red-400'
                                  : job.status === 'running'
                                    ? 'bg-blue-900/30 text-blue-400'
                                    : 'bg-gray-900/30 text-gray-400'
                            }`}
                          >
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {job.status === 'running' || job.status === 'preparing' ? (
                          <div className="mb-2">
                            <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                              <div
                                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-blue-400">
                                <NumberTicker value={job.progress} /> %
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelJob(job.id)}
                                className="h-6 px-2 text-xs text-gray-400 hover:text-red-400"
                              >
                                <Stop size={12} className="mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              {job.status === 'completed' ? (
                                <Check size={16} className="text-green-400 mr-1" />
                              ) : (
                                <X size={16} className="text-red-400 mr-1" />
                              )}
                              <span className="text-xs text-gray-300">
                                {job.status === 'completed'
                                  ? 'Training completed successfully'
                                  : job.error || 'Training failed'}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteJob(job.id)}
                              className="h-6 px-2 text-xs text-gray-400 hover:text-red-400"
                            >
                              <Trash size={12} className="mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="text-xs text-gray-500">
                          Started: {formatTimestamp(job.startedAt)}
                          {job.completedAt && (
                            <span> | Completed: {formatTimestamp(job.completedAt)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-10">
                    No tuning jobs yet. Start a new job from the "New Tuning Job" tab.
                  </div>
                )}
              </ScrollArea>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshJobs}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <ArrowsClockwise size={14} className="mr-2" />
                  Refresh Jobs
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default ModelTuner
