import React, { useState } from 'react'
import {
  Code,
  FileText,
  FolderOpen,
  MagnifyingGlass,
  SlidersHorizontal as SplitHorizontal, // Fixed: SplitHorizontal → SlidersHorizontal
  X,
  FloppyDisk,
  Play,
  Terminal
} from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface OpenFile {
  id: string
  name: string
  path: string
  content: string
  language: string
  modified: boolean
}

interface FileCanvasProps {
  files: OpenFile[]
  onOpenFile: (path: string) => void
  onSaveFile: (id: string, content: string) => void
  onCloseFile: (id: string) => void
  onRunFile: (id: string) => void
  className?: string
}

export default function FileCanvas({
  files,
  onOpenFile,
  onSaveFile,
  onCloseFile,
  onRunFile,
  className
}: FileCanvasProps) {
  const [activeFile, setActiveFile] = useState<string | null>(files[0]?.id || null)
  const [searchTerm, setSearchTerm] = useState('')
  const [splitView, setSplitView] = useState(false)
  const [secondaryFile, setSecondaryFile] = useState<string | null>(null)

  const activeFileData = files.find((f) => f.id === activeFile)
  const secondaryFileData = files.find((f) => f.id === secondaryFile)

  const getLanguageColor = (language: string) => {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return 'bg-yellow-500'
      case 'python':
        return 'bg-blue-500'
      case 'html':
        return 'bg-orange-500'
      case 'css':
        return 'bg-blue-600'
      case 'json':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const FileEditor = ({ file }: { file: OpenFile }) => (
    <div className="flex flex-col h-full">
      {/* File header */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">{file.name}</span>
          {file.modified && (
            <Badge variant="secondary" className="text-xs">
              Modified
            </Badge>
          )}
          <Badge className={cn('text-xs text-white', getLanguageColor(file.language))}>
            {file.language}
          </Badge>
        </div>

        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSaveFile(file.id, file.content)}
            className="h-6 w-6 p-0"
            title="Save"
          >
            <FloppyDisk className="w-3 h-3" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRunFile(file.id)}
            className="h-6 w-6 p-0"
            title="Run"
          >
            <Play className="w-3 h-3" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCloseFile(file.id)}
            className="h-6 w-6 p-0"
            title="Close"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Textarea
          value={file.content}
          onChange={(e) => {
            // Update file content
            const updatedFile = { ...file, content: e.target.value, modified: true }
            // This would typically update the file in state
          }}
          className="h-full resize-none border-0 font-mono text-sm"
          placeholder="Start typing..."
        />
      </div>
    </div>
  )

  return (
    <Card className={cn('h-96', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Code className="w-4 h-4" />
            File Canvas
          </CardTitle>

          <div className="flex gap-1">
            <Button
              size="sm"
              variant={splitView ? 'default' : 'ghost'}
              onClick={() => setSplitView(!splitView)}
              className="h-6 px-2"
              title="Split view"
            >
              <SplitHorizontal className="w-3 h-3" />
            </Button>

            <Button size="sm" variant="ghost" className="h-6 px-2" title="Open terminal">
              <Terminal className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search in files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col h-80">
        {/* File tabs */}
        {files.length > 0 && (
          <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
            {files.map((file) => (
              <Button
                key={file.id}
                size="sm"
                variant={activeFile === file.id ? 'default' : 'ghost'}
                onClick={() => setActiveFile(file.id)}
                className="h-6 px-2 text-xs whitespace-nowrap"
              >
                <FileText className="w-3 h-3 mr-1" />
                {file.name}
                {file.modified && <span className="ml-1">•</span>}
              </Button>
            ))}
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 flex">
          {files.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No files open</p>
                <p className="text-xs">Use the file explorer to open files</p>
              </div>
            </div>
          ) : (
            <>
              {/* Primary editor */}
              {activeFileData && (
                <div className={cn('flex-1', splitView && 'border-r')}>
                  <FileEditor file={activeFileData} />
                </div>
              )}

              {/* Secondary editor (split view) */}
              {splitView && (
                <div className="flex-1">
                  {secondaryFileData ? (
                    <FileEditor file={secondaryFileData} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <SplitHorizontal className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Select a file for split view</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between p-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex gap-4">
            {activeFileData && (
              <>
                <span>Line 1, Column 1</span>
                <span>{activeFileData.language}</span>
                <span>UTF-8</span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <span>{files.length} files open</span>
            {files.filter((f) => f.modified).length > 0 && (
              <span>{files.filter((f) => f.modified).length} unsaved</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
