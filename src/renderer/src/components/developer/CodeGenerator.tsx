import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Lightning, ArrowsClockwise, Code } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Pulsating } from '@/components/ui/pulsating'

interface CodeGeneratorProps {
  className?: string
  onCodeGenerated?: (code: string, language: string) => void
}

const CodeGenerator: React.FC<CodeGeneratorProps> = ({ className, onCodeGenerated }) => {
  const [task, setTask] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [error, setError] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Load available models when component mounts
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true)
      try {
        const models = await window.api.invoke('get-available-models')
        setAvailableModels(models)

        // Get best code model suggestion
        const bestModel = await window.api.invoke('select-best-code-model')
        setSelectedModel(bestModel)
      } catch (error) {
        console.error('Failed to load models:', error)
      } finally {
        setIsLoadingModels(false)
      }
    }

    loadModels()
  }, [])

  const handleGenerate = async () => {
    if (!task.trim()) return

    setIsGenerating(true)
    setGeneratedCode('')
    setError('')

    try {
      // Call the backend service
      const response = await window.api.invoke('generate-code', {
        task,
        language,
        modelName: selectedModel
      })

      setGeneratedCode(response)
      onCodeGenerated?.(response, language)
    } catch (error) {
      console.error('Code generation failed:', error)
      setError(`Error generating code: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="bg-gray-800/80 border-gray-700/50 backdrop-blur-md overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-white">
          <Code size={20} className="text-blue-400" />
          Code Generator
          <div className="ml-auto flex items-center">
            {isGenerating && <Pulsating className="text-blue-400" />}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Describe what code you need</label>
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="E.g., Create a function to convert CSV to JSON with error handling"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-none h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="c++">C++</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Model</label>
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={isLoadingModels}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue
                    placeholder={isLoadingModels ? 'Loading models...' : 'Select model'}
                  />
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
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !task.trim() || !selectedModel}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <>
                <Lightning size={16} className="mr-2 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" />
                Generate Code
              </>
            )}
          </Button>

          {error && <div className="bg-red-900/30 text-red-300 p-3 rounded text-sm">{error}</div>}

          {generatedCode && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-gray-400">Generated Code</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode)
                  }}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                >
                  Copy
                </Button>
              </div>
              <pre className="bg-gray-900 p-4 rounded text-sm font-mono text-white overflow-auto max-h-64">
                {generatedCode}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CodeGenerator
