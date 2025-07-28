import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Code, Play, Copy, Download, MagicWand, FileCode, Lightning, Robot } from 'phosphor-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface GenerationRequest {
  task: string
  language: string
  context?: string
  requirements?: string[]
}

interface GenerationResult {
  code: string
  explanation: string
  language: string
  confidence: number
  suggestions?: string[]
}

const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'java',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'html',
  'css',
  'sql',
  'shell',
  'yaml',
  'json'
]

const COMMON_TASKS = [
  'Create a React component',
  'Write a REST API endpoint',
  'Implement a sorting algorithm',
  'Build a database schema',
  'Create unit tests',
  'Write utility functions',
  'Implement authentication',
  'Create data validation',
  'Build CLI tool',
  'Write documentation'
]

const CodeGeneratorPanel: React.FC = () => {
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [generationRequest, setGenerationRequest] = useState<GenerationRequest>({
    task: '',
    language: 'typescript',
    context: '',
    requirements: []
  })
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<GenerationRequest & { result: GenerationResult }>>(
    []
  )

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      // BACKEND READY - activate model loading
      const models = await window.api.getAvailableModels()
      setAvailableModels(models)

      // Auto-select best code model
      const bestModel = await window.api.selectBestCodeModel()
      setSelectedModel(bestModel)

      console.log('✅ Loaded code generation models:', models.length)
    } catch (error) {
      console.error('❌ Failed to load models:', error)
    }
  }

  const generateCode = async () => {
    if (!generationRequest.task || !generationRequest.language) {
      return
    }

    setLoading(true)
    try {
      // BACKEND EXISTS - activate code generation
      const result = await window.api.generateCode({
        task: generationRequest.task,
        language: generationRequest.language,
        context: generationRequest.context,
        requirements: generationRequest.requirements,
        modelName: selectedModel
      })

      setGenerationResult(result)

      // Add to history
      setHistory((prev) => [
        {
          ...generationRequest,
          result
        },
        ...prev.slice(0, 9)
      ]) // Keep last 10

      console.log('✅ Generated code successfully')
    } catch (error) {
      console.error('❌ Failed to generate code:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // TODO: Add toast notification
  }

  const downloadCode = (code: string, language: string) => {
    const extensions = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      rust: 'rs',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      swift: 'swift',
      kotlin: 'kt',
      html: 'html',
      css: 'css',
      sql: 'sql',
      shell: 'sh',
      yaml: 'yml'
    }

    const extension = extensions[language] || 'txt'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generated_code.${extension}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadFromHistory = (item: any) => {
    setGenerationRequest({
      task: item.task,
      language: item.language,
      context: item.context,
      requirements: item.requirements
    })
    setGenerationResult(item.result)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Code size={28} className="mr-3" />
            Code Generator
          </h2>
          <p className="text-muted-foreground">
            Generate code with AI assistance for any programming task
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center">
          <Robot size={14} className="mr-1" />
          {selectedModel || 'No model selected'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MagicWand size={20} className="mr-2" />
              Generation Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
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

            <div className="space-y-2">
              <Label>Programming Language</Label>
              <Select
                value={generationRequest.language}
                onValueChange={(value) =>
                  setGenerationRequest((prev) => ({ ...prev, language: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Task Description</Label>
              <Textarea
                value={generationRequest.task}
                onChange={(e) =>
                  setGenerationRequest((prev) => ({ ...prev, task: e.target.value }))
                }
                placeholder="Describe what you want to generate..."
                className="h-24"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Context (Optional)</Label>
              <Textarea
                value={generationRequest.context}
                onChange={(e) =>
                  setGenerationRequest((prev) => ({ ...prev, context: e.target.value }))
                }
                placeholder="Provide any additional context or constraints..."
                className="h-20"
              />
            </div>

            <div className="space-y-2">
              <Label>Common Tasks</Label>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_TASKS.map((task) => (
                  <Button
                    key={task}
                    variant="outline"
                    size="sm"
                    onClick={() => setGenerationRequest((prev) => ({ ...prev, task }))}
                    className="justify-start text-left h-auto py-2"
                  >
                    {task}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={generateCode}
              disabled={loading || !generationRequest.task}
              className="w-full"
            >
              {loading ? (
                'Generating...'
              ) : (
                <>
                  <Lightning size={16} className="mr-2" />
                  Generate Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileCode size={20} className="mr-2" />
                Generated Code
              </CardTitle>
              {generationResult && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generationResult.code)}
                  >
                    <Copy size={14} className="mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCode(generationResult.code, generationResult.language)}
                  >
                    <Download size={14} className="mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generationResult ? (
              <Tabs defaultValue="code" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="explanation">Explanation</TabsTrigger>
                </TabsList>

                <TabsContent value="code">
                  <ScrollArea className="h-96 w-full rounded border">
                    <SyntaxHighlighter
                      language={generationResult.language}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        borderRadius: '0.375rem'
                      }}
                    >
                      {generationResult.code}
                    </SyntaxHighlighter>
                  </ScrollArea>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant="secondary">
                      Confidence: {(generationResult.confidence * 100).toFixed(1)}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Language: {generationResult.language}
                    </span>
                  </div>
                </TabsContent>

                <TabsContent value="explanation">
                  <ScrollArea className="h-96 w-full">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm leading-relaxed">{generationResult.explanation}</p>

                      {generationResult.suggestions && generationResult.suggestions.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Suggestions:</h4>
                          <ul className="space-y-1">
                            {generationResult.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-muted-foreground">
                                • {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Code size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Generated code will appear here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generation History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded border hover:bg-muted cursor-pointer"
                    onClick={() => loadFromHistory(item)}
                  >
                    <div>
                      <span className="font-medium text-sm">{item.task.substring(0, 50)}...</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {item.language}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      Load
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CodeGeneratorPanel
