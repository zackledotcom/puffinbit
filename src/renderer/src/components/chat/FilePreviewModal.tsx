import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import {
  File,
  Image as ImageIcon,
  Code,
  FileText,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  ArrowClockwise,
  Copy,
  Eye
} from 'phosphor-react'
import { cn } from '@/lib/utils'

interface FilePreviewModalProps {
  file: File | null
  isOpen: boolean
  onClose: () => void
  onAddToContext?: (file: File) => void
}

interface FileContent {
  type: 'text' | 'image' | 'binary' | 'error'
  content: string | ArrayBuffer | null
  error?: string
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onAddToContext
}) => {
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageZoom, setImageZoom] = useState(100)
  const [imageRotation, setImageRotation] = useState(0)

  // Reset state when file changes
  useEffect(() => {
    if (!file) {
      setFileContent(null)
      setImageZoom(100)
      setImageRotation(0)
      return
    }

    loadFileContent(file)
  }, [file])

  const loadFileContent = async (file: File) => {
    setLoading(true)
    try {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setFileContent({
          type: 'image',
          content: url
        })
      } else if (
        file.type.startsWith('text/') ||
        file.name.match(/\.(js|ts|jsx|tsx|py|html|css|json|md|txt|csv|xml|yaml|yml|log)$/i)
      ) {
        const text = await file.text()
        setFileContent({
          type: 'text',
          content: text
        })
      } else {
        setFileContent({
          type: 'binary',
          content: null
        })
      }
    } catch (error) {
      setFileContent({
        type: 'error',
        content: null,
        error: error instanceof Error ? error.message : 'Failed to load file'
      })
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = () => {
    if (!file) return <File className="w-5 h-5" />
    
    if (file.type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />
    if (file.type.startsWith('text/') || file.name.match(/\.(js|ts|py|html|css|json|md)$/)) {
      return <Code className="w-5 h-5" />
    }
    return <FileText className="w-5 h-5" />
  }

  const getFileTypeColor = () => {
    if (!file) return 'bg-gray-500'
    
    if (file.type.startsWith('image/')) return 'bg-green-500'
    if (file.type.startsWith('text/') || file.name.match(/\.(js|ts|py|html|css|json|md)$/)) {
      return 'bg-blue-500'
    }
    if (file.name.endsWith('.csv')) return 'bg-orange-500'
    if (file.name.match(/\.(pdf|doc|docx)$/)) return 'bg-purple-500'
    return 'bg-gray-500'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleCopyContent = () => {
    if (fileContent?.type === 'text' && typeof fileContent.content === 'string') {
      navigator.clipboard.writeText(fileContent.content)
    }
  }

  const handleDownload = () => {
    if (!file) return
    
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (!fileContent) return null

    switch (fileContent.type) {
      case 'image':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImageZoom(Math.max(25, imageZoom - 25))}
                disabled={imageZoom <= 25}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{imageZoom}%</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImageZoom(Math.min(200, imageZoom + 25))}
                disabled={imageZoom >= 200}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
              >
                <ArrowClockwise className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex justify-center bg-muted rounded-lg p-4">
              <img
                src={fileContent.content as string}
                alt={file?.name}
                style={{
                  transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain'
                }}
                className="transition-transform duration-200"
              />
            </div>
          </div>
        )

      case 'text':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyContent}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Badge variant="secondary" className="text-xs">
                {(fileContent.content as string).split('\n').length} lines
              </Badge>
            </div>
            <Card className="p-4">
              <ScrollArea className="h-96">
                <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                  {fileContent.content as string}
                </pre>
              </ScrollArea>
            </Card>
          </div>
        )

      case 'binary':
        return (
          <div className="text-center py-8">
            <File className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Binary file - preview not available
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Use download button to save the file
            </p>
          </div>
        )

      case 'error':
        return (
          <div className="text-center py-8">
            <X className="w-16 h-16 mx-auto text-destructive mb-4" />
            <p className="text-destructive font-medium">Failed to load file</p>
            <p className="text-sm text-muted-foreground mt-2">
              {fileContent.error}
            </p>
          </div>
        )

      default:
        return null
    }
  }

  if (!file) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                getFileTypeColor()
              )}
            >
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{file.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{file.type || 'Unknown type'}</span>
                <span>•</span>
                <span>Modified: {new Date(file.lastModified).toLocaleDateString()}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {onAddToContext && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onAddToContext(file)
                    onClose()
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Add to Context
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FilePreviewModal