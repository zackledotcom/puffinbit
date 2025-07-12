import React, { useState } from 'react'
import { Code, Upload, Download, Play, Trash, FileCode, Plus, Gear } from 'phosphor-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface Plugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  type: 'tool' | 'agent' | 'integration' | 'workflow'
  status: 'active' | 'inactive' | 'error'
  code?: string
  config?: any
}

interface PluginUploaderProps {
  plugins: Plugin[]
  onUploadPlugin: (plugin: Omit<Plugin, 'id'>) => void
  onTogglePlugin: (id: string) => void
  onDeletePlugin: (id: string) => void
  onTestPlugin: (id: string) => void
  className?: string
}

export default function PluginUploader({
  plugins,
  onUploadPlugin,
  onTogglePlugin,
  onDeletePlugin,
  onTestPlugin,
  className
}: PluginUploaderProps) {
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [newPlugin, setNewPlugin] = useState({
    name: '',
    version: '1.0.0',
    author: '',
    description: '',
    type: 'tool' as Plugin['type'],
    code: ''
  })

  const getStatusBadge = (status: Plugin['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="text-xs">Active</Badge>
      case 'inactive':
        return (
          <Badge variant="secondary" className="text-xs">
            Inactive
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        )
    }
  }

  const getTypeIcon = (type: Plugin['type']) => {
    switch (type) {
      case 'tool':
        return <Gear className="w-4 h-4" />
      case 'agent':
        return <Code className="w-4 h-4" />
      case 'integration':
        return <Upload className="w-4 h-4" />
      case 'workflow':
        return <Play className="w-4 h-4" />
    }
  }

  const handleCreatePlugin = () => {
    if (newPlugin.name && newPlugin.code) {
      onUploadPlugin({
        ...newPlugin,
        status: 'inactive'
      })
      setNewPlugin({
        name: '',
        version: '1.0.0',
        author: '',
        description: '',
        type: 'tool',
        code: ''
      })
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <Upload className="w-4 h-4" />
          Plugins
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Plugin Manager
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="installed" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="installed">Installed Plugins</TabsTrigger>
            <TabsTrigger value="create">Create Plugin</TabsTrigger>
          </TabsList>

          <div className="overflow-auto max-h-[70vh] mt-4">
            {/* Installed Plugins */}
            <TabsContent value="installed" className="space-y-4">
              <div className="flex gap-4">
                {/* Plugin List */}
                <div className="flex-1 space-y-2">
                  <ScrollArea className="h-96">
                    {plugins.map((plugin) => (
                      <Card
                        key={plugin.id}
                        className={cn(
                          'cursor-pointer transition-colors mb-2',
                          selectedPlugin?.id === plugin.id && 'border-primary'
                        )}
                        onClick={() => setSelectedPlugin(plugin)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(plugin.type)}
                              <CardTitle className="text-sm">{plugin.name}</CardTitle>
                            </div>
                            {getStatusBadge(plugin.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>{plugin.description}</p>
                            <div className="flex gap-2">
                              <span>v{plugin.version}</span>
                              <span>by {plugin.author}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {plugin.type}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {plugins.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No plugins installed</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Plugin Details */}
                {selectedPlugin && (
                  <div className="w-80 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getTypeIcon(selectedPlugin.type)}
                          {selectedPlugin.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm space-y-2">
                          <p>{selectedPlugin.description}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline">v{selectedPlugin.version}</Badge>
                            <Badge variant="outline">{selectedPlugin.author}</Badge>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={selectedPlugin.status === 'active' ? 'destructive' : 'default'}
                            onClick={() => onTogglePlugin(selectedPlugin.id)}
                          >
                            {selectedPlugin.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onTestPlugin(selectedPlugin.id)}
                          >
                            Test
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeletePlugin(selectedPlugin.id)}
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Code Preview */}
                        {selectedPlugin.code && (
                          <div>
                            <h4 className="font-medium mb-2">Code</h4>
                            <ScrollArea className="h-40">
                              <pre className="p-3 bg-muted/50 rounded text-xs font-mono">
                                {selectedPlugin.code}
                              </pre>
                            </ScrollArea>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Create Plugin */}
            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create New Plugin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={newPlugin.name}
                        onChange={(e) =>
                          setNewPlugin((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Plugin name"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Version</label>
                      <Input
                        value={newPlugin.version}
                        onChange={(e) =>
                          setNewPlugin((prev) => ({ ...prev, version: e.target.value }))
                        }
                        placeholder="1.0.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Author</label>
                    <Input
                      value={newPlugin.author}
                      onChange={(e) =>
                        setNewPlugin((prev) => ({ ...prev, author: e.target.value }))
                      }
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newPlugin.description}
                      onChange={(e) =>
                        setNewPlugin((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="What does this plugin do?"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Code</label>
                    <Textarea
                      value={newPlugin.code}
                      onChange={(e) => setNewPlugin((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="// Plugin code here..."
                      className="font-mono text-xs"
                      rows={12}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={handleCreatePlugin}
                      disabled={!newPlugin.name || !newPlugin.code}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Plugin
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
