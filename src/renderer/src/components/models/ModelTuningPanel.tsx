import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Brain,
  Database,
  Play,
  Stop,
  Upload,
  Download,
  Trash,
  Plus,
  Eye,
  Settings
} from 'phosphor-react'

interface TuningDataset {
  id: string
  name: string
  description: string
  examples: TuningExample[]
  created_at: string
  updated_at: string
  size: number
}

interface TuningExample {
  id: string
  input: string
  output: string
  metadata?: Record<string, any>
}

interface TuningJob {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  dataset_id: string
  base_model: string
  progress: number
  created_at: string
  completed_at?: string
  error?: string
  metrics?: Record<string, number>
}

const ModelTuningPanel: React.FC = () => {
  const [datasets, setDatasets] = useState<TuningDataset[]>([])
  const [tuningJobs, setTuningJobs] = useState<TuningJob[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Dataset creation form
  const [newDatasetForm, setNewDatasetForm] = useState({
    name: '',
    description: '',
    examples: [] as TuningExample[]
  })

  // Job creation form
  const [newJobForm, setNewJobForm] = useState({
    name: '',
    dataset_id: '',
    base_model: '',
    hyperparameters: {
      learning_rate: 0.0001,
      batch_size: 4,
      epochs: 3
    }
  })

  useEffect(() => {
    loadTuningData()
  }, [])

  const loadTuningData = async () => {
    setLoading(true)
    try {
      // BACKEND READY - activate these calls
      const models = await window.api.getAvailableModelsForTuning()
      setAvailableModels(models)

      const allDatasets = await window.api.getAllTuningDatasets()
      setDatasets(allDatasets)

      const allJobs = await window.api.getAllTuningJobs()
      setTuningJobs(allJobs)

      console.log('✅ Loaded tuning data:', {
        models: models.length,
        datasets: allDatasets.length,
        jobs: allJobs.length
      })
    } catch (error) {
      console.error('❌ Failed to load tuning data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDataset = async () => {
    try {
      const dataset = await window.api.createTuningDataset({
        name: newDatasetForm.name,
        description: newDatasetForm.description,
        examples: newDatasetForm.examples
      })

      console.log('✅ Created dataset:', dataset.id)
      await loadTuningData()

      // Reset form
      setNewDatasetForm({ name: '', description: '', examples: [] })
    } catch (error) {
      console.error('❌ Failed to create dataset:', error)
    }
  }

  const startTuningJob = async () => {
    try {
      const job = await window.api.startTuningJob({
        name: newJobForm.name,
        dataset_id: newJobForm.dataset_id,
        base_model: newJobForm.base_model,
        hyperparameters: newJobForm.hyperparameters
      })

      console.log('✅ Started tuning job:', job.id)
      await loadTuningData()

      // Reset form
      setNewJobForm({
        name: '',
        dataset_id: '',
        base_model: '',
        hyperparameters: { learning_rate: 0.0001, batch_size: 4, epochs: 3 }
      })
    } catch (error) {
      console.error('❌ Failed to start tuning job:', error)
    }
  }

  const cancelTuningJob = async (jobId: string) => {
    try {
      await window.api.cancelTuningJob(jobId)
      console.log('✅ Cancelled tuning job:', jobId)
      await loadTuningData()
    } catch (error) {
      console.error('❌ Failed to cancel job:', error)
    }
  }

  const deleteDataset = async (datasetId: string) => {
    try {
      await window.api.deleteDataset(datasetId)
      console.log('✅ Deleted dataset:', datasetId)
      await loadTuningData()
    } catch (error) {
      console.error('❌ Failed to delete dataset:', error)
    }
  }

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Model Tuning</h2>
          <p className="text-muted-foreground">
            Create datasets and fine-tune models for specialized tasks
          </p>
        </div>
        <Button onClick={loadTuningData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <Tabs defaultValue="datasets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="datasets">Datasets ({datasets.length})</TabsTrigger>
          <TabsTrigger value="jobs">Tuning Jobs ({tuningJobs.length})</TabsTrigger>
          <TabsTrigger value="models">Available Models ({availableModels.length})</TabsTrigger>
        </TabsList>

        {/* Datasets Tab */}
        <TabsContent value="datasets" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Training Datasets</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Create Dataset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Training Dataset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Dataset Name</Label>
                    <Input
                      value={newDatasetForm.name}
                      onChange={(e) =>
                        setNewDatasetForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g., Code Generation Examples"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newDatasetForm.description}
                      onChange={(e) =>
                        setNewDatasetForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Describe the purpose and content of this dataset"
                    />
                  </div>
                  <Button onClick={createDataset} className="w-full">
                    Create Dataset
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <Card key={dataset.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{dataset.name}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => deleteDataset(dataset.id)}>
                      <Trash size={16} />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{dataset.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Examples:</span>
                      <Badge variant="secondary">{dataset.examples?.length || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Size:</span>
                      <span className="text-muted-foreground">
                        {(dataset.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <Button variant="outline" size="sm">
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.api.exportDataset(dataset.id)}
                      >
                        <Download size={14} className="mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tuning Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tuning Jobs</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Play size={16} className="mr-2" />
                  Start New Job
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Tuning Job</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Job Name</Label>
                    <Input
                      value={newJobForm.name}
                      onChange={(e) => setNewJobForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dataset</Label>
                    <Select
                      value={newJobForm.dataset_id}
                      onValueChange={(value) =>
                        setNewJobForm((prev) => ({ ...prev, dataset_id: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select dataset" />
                      </SelectTrigger>
                      <SelectContent>
                        {datasets.map((dataset) => (
                          <SelectItem key={dataset.id} value={dataset.id}>
                            {dataset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Model</Label>
                    <Select
                      value={newJobForm.base_model}
                      onValueChange={(value) =>
                        setNewJobForm((prev) => ({ ...prev, base_model: value }))
                      }
                    >
                      <SelectTrigger>
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
                  <Button onClick={startTuningJob} className="w-full">
                    Start Tuning
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {tuningJobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{job.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getJobStatusColor(job.status)}>{job.status}</Badge>
                      {job.status === 'running' && (
                        <Button variant="outline" size="sm" onClick={() => cancelTuningJob(job.id)}>
                          <Stop size={14} className="mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Base Model:</span>
                        <p className="font-medium">{job.base_model}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dataset:</span>
                        <p className="font-medium">
                          {datasets.find((d) => d.id === job.dataset_id)?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {job.status === 'running' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress:</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="w-full" />
                      </div>
                    )}

                    {job.metrics && (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {Object.entries(job.metrics).map(([key, value]) => (
                          <div key={key} className="text-center p-2 bg-muted rounded">
                            <div className="font-medium">
                              {typeof value === 'number' ? value.toFixed(4) : value}
                            </div>
                            <div className="text-xs text-muted-foreground">{key}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {job.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        Error: {job.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Available Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <h3 className="text-lg font-semibold">Available Base Models</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableModels.map((model) => (
              <Card key={model}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <Brain size={20} className="mr-2" />
                    {model}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">Ready for fine-tuning</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Use for Tuning
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ModelTuningPanel
