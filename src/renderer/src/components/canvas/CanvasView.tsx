import React, { useState } from 'react'
import { Eye, EyeSlash, MagnifyingGlass, Code, Robot, FileText, Graph } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import CodeCanvasView from './CodeCanvasView'
import ChatCanvas from '../chat/ChatCanvas'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
}

interface CanvasViewProps {
  className?: string
  fileTree?: FileNode[]
  currentFile?: {
    path: string
    content: string
    language: string
  } | null
  currentDirectory?: string
  isLoading?: boolean
  onFileTreeChange?: (tree: FileNode[]) => void
  onCurrentFileChange?: (file: { path: string; content: string; language: string } | null) => void
  onDirectoryChange?: (path: string) => void
  onLoadDirectory?: (path?: string) => void
  onSetLoading?: (loading: boolean) => void
}

const CanvasView: React.FC<CanvasViewProps> = ({ 
  className,
  fileTree = [],
  currentFile,
  currentDirectory,
  isLoading = false,
  onFileTreeChange,
  onCurrentFileChange,
  onDirectoryChange,
  onLoadDirectory,
  onSetLoading
}) => {
  const [showInspector, setShowInspector] = useState(true)

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Canvas Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur">
        <div>
          <h2 className="font-semibold">Canvas View</h2>
          <p className="text-sm text-muted-foreground">Multi-mode workspace for development</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Inspector Toggle */}
          <Button
            variant={showInspector ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowInspector(!showInspector)}
          >
            {showInspector ? <EyeSlash size={16} /> : <Eye size={16} />}
            Inspector
          </Button>
        </div>
      </div>

      {/* Tabs Canvas Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <Tabs defaultValue="code" className="h-full flex flex-col">
            <div className="border-b border-border px-4">
              <TabsList className="h-12">
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code size={16} />
                  Code
                </TabsTrigger>
                <TabsTrigger value="agents" className="flex items-center gap-2">
                  <Robot size={16} />
                  Agents
                </TabsTrigger>
                <TabsTrigger value="data" className="flex items-center gap-2">
                  <FileText size={16} />
                  Data
                </TabsTrigger>
                <TabsTrigger value="graph" className="flex items-center gap-2">
                  <Graph size={16} />
                  Graph
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="code" className="h-full m-0 p-0">
                <CodeCanvasView 
                  fileTree={fileTree}
                  currentFile={currentFile}
                  currentDirectory={currentDirectory}
                  isLoading={isLoading}
                  onFileTreeChange={onFileTreeChange}
                  onCurrentFileChange={onCurrentFileChange}
                  onDirectoryChange={onDirectoryChange}
                  onLoadDirectory={onLoadDirectory}
                  onSetLoading={onSetLoading}
                />
              </TabsContent>

              <TabsContent value="agents" className="h-full m-0 p-0">
                <AgentCanvasView />
              </TabsContent>

              <TabsContent value="data" className="h-full m-0 p-0">
                <DataCanvasView />
              </TabsContent>

              <TabsContent value="graph" className="h-full m-0 p-0">
                <GraphCanvasView />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Inspector Panel */}
        {showInspector && (
          <div className="w-80 border-l border-border bg-muted/30">
            <CanvasInspector />
          </div>
        )}
      </div>
    </div>
  )
}

const AgentCanvasView: React.FC = () => (
  <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
    <div className="text-center space-y-4">
      <Robot size={64} className="mx-auto text-blue-500 opacity-50" />
      <div>
        <h3 className="font-medium">Agent Visualization</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive agent network and skill mapping
        </p>
        <Badge variant="outline" className="mt-2">
          Coming Soon
        </Badge>
      </div>
    </div>
  </div>
)

const DataCanvasView: React.FC = () => (
  <div className="h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
    <div className="text-center space-y-4">
      <FileText size={64} className="mx-auto text-green-500 opacity-50" />
      <div>
        <h3 className="font-medium">Data Inspector</h3>
        <p className="text-sm text-muted-foreground mt-1">File content preview and data analysis</p>
        <Badge variant="outline" className="mt-2">
          Coming Soon
        </Badge>
      </div>
    </div>
  </div>
)

const GraphCanvasView: React.FC = () => (
  <div className="h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-50">
    <div className="text-center space-y-4">
      <Graph size={64} className="mx-auto text-purple-500 opacity-50" />
      <div>
        <h3 className="font-medium">Knowledge Graph</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Relationship visualization and graph analysis
        </p>
        <Badge variant="outline" className="mt-2">
          Coming Soon
        </Badge>
      </div>
    </div>
  </div>
)

const CanvasInspector: React.FC = () => (
  <div className="h-full p-4">
    <div className="space-y-4">
      <div>
        <h3 className="font-medium flex items-center">
          <MagnifyingGlass size={16} className="mr-2" />
          Inspector
        </h3>
        <p className="text-sm text-muted-foreground">Context-aware analysis tools</p>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-background rounded border border-border">
          <h4 className="font-medium text-sm mb-2">Selected Item</h4>
          <p className="text-sm text-muted-foreground">No item selected</p>
        </div>

        <div className="p-3 bg-background rounded border border-border">
          <h4 className="font-medium text-sm mb-2">Properties</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span>--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span>--</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-background rounded border border-border">
          <h4 className="font-medium text-sm mb-2">Actions</h4>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full" disabled>
              Inspect Details
            </Button>
            <Button variant="outline" size="sm" className="w-full" disabled>
              Edit Properties
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default CanvasView
