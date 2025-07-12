import React, { useState } from 'react'
import { Eye, EyeSlash, MagnifyingGlass, GridFour, Graph, FileText, Robot, Code } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import MonacoCanvasEditor from './MonacoCanvasEditor'

interface CanvasViewProps {
  className?: string
}

const CanvasView: React.FC<CanvasViewProps> = ({ className }) => {
  const [viewMode, setViewMode] = useState<'agents' | 'data' | 'graph' | 'code'>('code')
  const [showInspector, setShowInspector] = useState(true)

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Canvas Header */}
      <div className="p-4 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Canvas View</h2>
            <p className="text-sm text-muted-foreground">Agent and data visualization workspace</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Selector */}
            <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'code' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('code')}
              >
                <Code size={16} className="mr-1" />
                Code
              </Button>
              <Button
                variant={viewMode === 'agents' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('agents')}
              >
                <Robot size={16} className="mr-1" />
                Agents
              </Button>
              <Button
                variant={viewMode === 'data' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('data')}
              >
                <FileText size={16} className="mr-1" />
                Data
              </Button>
              <Button
                variant={viewMode === 'graph' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('graph')}
              >
                <Graph size={16} className="mr-1" />
                Graph
              </Button>
            </div>

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
      </div>

      {/* Canvas Content */}
      <div className="flex-1 flex">
        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          {viewMode === 'code' && <CodeCanvasView />}
          {viewMode === 'agents' && <AgentCanvasView />}
          {viewMode === 'data' && <DataCanvasView />}
          {viewMode === 'graph' && <GraphCanvasView />}
        </div>

        {/* Inspector Panel */}
        {showInspector && (
          <div className="w-80 border-l border-border bg-muted/30">
            <CanvasInspector viewMode={viewMode} />
          </div>
        )}
      </div>
    </div>
  )
}

const CodeCanvasView: React.FC = () => {
  const [currentFile, setCurrentFile] = useState({
    filename: 'example.tsx',
    content: `import React from 'react';

interface WelcomeProps {
  name: string;
}

const Welcome: React.FC<WelcomeProps> = ({ name }) => {
  return (
    <div className="p-4">
      <h1>Hello, {name}!</h1>
      <p>Welcome to Puffer Canvas Mode with Monaco Editor!</p>
    </div>
  );
};

export default Welcome;`
  });

  const handleContentChange = (newContent: string) => {
    setCurrentFile(prev => ({
      ...prev,
      content: newContent
    }));
  };

  return (
    <div className="h-full p-4">
      <MonacoCanvasEditor
        filename={currentFile.filename}
        content={currentFile.content}
        onContentChange={handleContentChange}
        height="calc(100vh - 200px)"
        theme="vs-dark"
        minimap={true}
      />
    </div>
  );
};

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
          TODO: Agent Canvas
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
          TODO: Data Canvas
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
          TODO: Graph Canvas
        </Badge>
      </div>
    </div>
  </div>
)

const CanvasInspector: React.FC<{ viewMode: string }> = ({ viewMode }) => (
  <div className="h-full p-4">
    <div className="space-y-4">
      <div>
        <h3 className="font-medium flex items-center">
          <MagnifyingGlass size={16} className="mr-2" />
          Inspector
        </h3>
        <p className="text-sm text-muted-foreground">{viewMode} analysis tools</p>
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
