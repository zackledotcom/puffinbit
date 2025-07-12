import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pulsating } from '@/components/ui/pulsating'
import { Plus, Trash, ArrowsClockwise, FloppyDisk, Export, Upload } from 'phosphor-react'

// Types (should match the backend)
interface TuningExample {
  input: string
  output: string
}

interface TuningDataset {
  id: string
  name: string
  description: string
  examples: TuningExample[]
  createdAt: string
  updatedAt: string
}

interface DatasetEditorProps {
  className?: string
  onDatasetCreated?: (dataset: TuningDataset) => void
  selectedDataset?: TuningDataset | null
}

const DatasetEditor: React.FC<DatasetEditorProps> = ({
  className,
  onDatasetCreated,
  selectedDataset
}) => {
  // Dataset state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [examples, setExamples] = useState<TuningExample[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentDataset, setCurrentDataset] = useState<TuningDataset | null>(null)

  // Create/edit example state
  const [currentInput, setCurrentInput] = useState('')
  const [currentOutput, setCurrentOutput] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Load dataset if provided
  useEffect(() => {
    if (selectedDataset) {
      setCurrentDataset(selectedDataset)
      setName(selectedDataset.name)
      setDescription(selectedDataset.description)
      setExamples(selectedDataset.examples)
    } else {
      resetForm()
    }
  }, [selectedDataset])

  // Reset the form
  const resetForm = () => {
    setName('')
    setDescription('')
    setExamples([])
    setCurrentInput('')
    setCurrentOutput('')
    setEditingIndex(null)
    setError('')
    setCurrentDataset(null)
  }

  // Save dataset
  const saveDataset = async () => {
    if (!name.trim()) {
      setError('Dataset name is required')
      return
    }

    if (examples.length === 0) {
      setError('Dataset must have at least one example')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let result

      if (currentDataset) {
        // Update existing dataset
        result = await window.api.updateTuningDataset({
          id: currentDataset.id,
          updates: {
            name,
            description,
            examples
          }
        })
      } else {
        // Create new dataset
        result = await window.api.createTuningDataset({
          name,
          description,
          examples
        })
      }

      setCurrentDataset(result)
      onDatasetCreated?.(result)

      if (!currentDataset) {
        // Reset form after creating a new dataset
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save dataset:', error)
      setError(`Failed to save dataset: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Add or update example
  const addOrUpdateExample = () => {
    if (!currentInput.trim() || !currentOutput.trim()) {
      setError('Both input and output are required')
      return
    }

    const example: TuningExample = {
      input: currentInput,
      output: currentOutput
    }

    if (editingIndex !== null && editingIndex >= 0 && editingIndex < examples.length) {
      // Update existing example
      const updatedExamples = [...examples]
      updatedExamples[editingIndex] = example
      setExamples(updatedExamples)
    } else {
      // Add new example
      setExamples([...examples, example])
    }

    // Reset form
    setCurrentInput('')
    setCurrentOutput('')
    setEditingIndex(null)
    setError('')
  }

  // Delete example
  const deleteExample = (index: number) => {
    const updatedExamples = examples.filter((_, i) => i !== index)
    setExamples(updatedExamples)

    if (editingIndex === index) {
      setCurrentInput('')
      setCurrentOutput('')
      setEditingIndex(null)
    }
  }

  // Edit example
  const editExample = (index: number) => {
    const example = examples[index]
    setCurrentInput(example.input)
    setCurrentOutput(example.output)
    setEditingIndex(index)
  }

  // Export dataset
  const exportDataset = async () => {
    if (!currentDataset) return

    try {
      const filePath = await window.api.exportTuningDataset(currentDataset.id)
      console.log(`Dataset exported to ${filePath}`)
    } catch (error) {
      console.error('Failed to export dataset:', error)
      setError(
        `Failed to export dataset: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return (
    <Card className="bg-gray-800/80 border-gray-700/50 backdrop-blur-md overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-white">
          {currentDataset ? 'Edit Dataset' : 'Create New Dataset'}
          {isLoading && <Pulsating className="ml-2 text-blue-400" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Dataset Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dataset Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Python Helper, JavaScript Tutor, etc."
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this dataset is for..."
                className="bg-gray-900 border-gray-700 text-white h-20 resize-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="bg-red-900/30 text-red-300 p-3 rounded text-sm">{error}</div>}

          {/* Examples Section */}
          <div className="pt-2">
            <Tabs defaultValue="examples" className="w-full">
              <TabsList className="bg-gray-700">
                <TabsTrigger value="examples">Examples ({examples.length})</TabsTrigger>
                <TabsTrigger value="add">Add Example</TabsTrigger>
              </TabsList>

              <TabsContent value="examples">
                <div className="py-2">
                  <ScrollArea className="h-[300px] pr-4">
                    {examples.length > 0 ? (
                      <div className="space-y-4">
                        {examples.map((example, index) => (
                          <div
                            key={index}
                            className="bg-gray-900 rounded p-3 border border-gray-700"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm text-blue-400 font-medium">
                                Example #{index + 1}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => editExample(index)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                >
                                  <FloppyDisk size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteExample(index)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                                >
                                  <Trash size={14} />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <div className="text-xs text-gray-400 mb-1">Input:</div>
                                <div className="text-sm text-white bg-gray-800 p-2 rounded overflow-auto max-h-24">
                                  {example.input}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs text-gray-400 mb-1">Output:</div>
                                <div className="text-sm text-white bg-gray-800 p-2 rounded overflow-auto max-h-24">
                                  {example.output}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-10">
                        No examples added yet. Click "Add Example" to create your first example.
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="add">
                <div className="py-2 space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      {editingIndex !== null
                        ? `Editing Example #${editingIndex + 1}`
                        : 'Input (Prompt)'}
                    </label>
                    <Textarea
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder="Enter the input prompt..."
                      className="bg-gray-900 border-gray-700 text-white h-[100px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Output (Response)</label>
                    <Textarea
                      value={currentOutput}
                      onChange={(e) => setCurrentOutput(e.target.value)}
                      placeholder="Enter the desired output response..."
                      className="bg-gray-900 border-gray-700 text-white h-[100px] resize-none"
                    />
                  </div>

                  <Button
                    onClick={addOrUpdateExample}
                    disabled={!currentInput.trim() || !currentOutput.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingIndex !== null ? (
                      <>
                        <FloppyDisk size={16} className="mr-2" />
                        Update Example
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Add Example
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={saveDataset}
              disabled={isLoading || !name.trim() || examples.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <FloppyDisk size={16} className="mr-2" />
              {currentDataset ? 'Update Dataset' : 'Save Dataset'}
            </Button>

            {currentDataset && (
              <Button onClick={exportDataset} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Export size={16} className="mr-2" />
                Export
              </Button>
            )}

            <Button
              onClick={resetForm}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ArrowsClockwise size={16} className="mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DatasetEditor
