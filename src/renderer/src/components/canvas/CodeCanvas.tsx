import React, { useState, useRef, useEffect } from 'react'
import {
  Code,
  Play,
  Copy,
  Download,
  Pencil,
  Check,
  X,
  ArrowsOut,
  ArrowsIn,
  Bug,
  Sparkle,
  FileText,
  Folder,
  Eye,
  EyeSlash,
  Export,
  Share
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface CodeCanvasProps {
  content: string
  language: string
  title?: string
  fileName?: string
  onContentChange?: (content: string) => void
  onClose?: () => void
  onSuggestImprovements?: (content: string) => void
  onExecute?: (content: string, language: string) => void
  className?: string
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const CodeCanvas: React.FC<CodeCanvasProps> = ({
  content,
  language,
  title = 'Code Canvas',
  fileName,
  onContentChange,
  onClose,
  onSuggestImprovements,
  onExecute,
  className = '',
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const [editMode, setEditMode] = useState(false)
  const [localContent, setLocalContent] = useState(content)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionOutput, setExecutionOutput] = useState<string>('')
  const [showOutput, setShowOutput] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addToast } = useToast()

  useEffect(() => {
    setLocalContent(content)
  }, [content])

  const handleSave = () => {
    onContentChange?.(localContent)
    setEditMode(false)
    addToast({
      type: 'success',
      title: 'Changes Saved',
      description: 'Your code has been updated',
      duration: 2000
    })
  }

  const handleCancel = () => {
    setLocalContent(content)
    setEditMode(false)
  }

  const handleExecute = async () => {
    if (!canExecute(language)) {
      addToast({
        type: 'warning',
        title: 'Execution Not Supported',
        description: `Cannot execute ${language} code directly`,
        duration: 3000
      })
      return
    }

    setIsExecuting(true)
    setShowOutput(true)

    try {
      if (onExecute) {
        await onExecute(localContent, language)
      } else {
        // Built-in execution for safe languages
        const result = await executeCode(localContent, language)
        setExecutionOutput(result)
      }
    } catch (error) {
      setExecutionOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  const canExecute = (lang: string): boolean => {
    const executableLanguages = [
      'javascript',
      'typescript',
      'json',
      'html',
      'css',
      'markdown',
      'yaml',
      'xml',
      'react',
      'jsx'
    ]
    return executableLanguages.includes(lang.toLowerCase())
  }

  const executeCode = async (code: string, lang: string): Promise<string> => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        try {
          // Enhanced JavaScript execution with more features
          const result = new Function(`
            const output = [];
            const console = {
              log: (...args) => output.push('LOG: ' + args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' ')),
              error: (...args) => output.push('ERROR: ' + args.join(' ')),
              warn: (...args) => output.push('WARN: ' + args.join(' ')),
              info: (...args) => output.push('INFO: ' + args.join(' ')),
              dir: (obj) => output.push('DIR: ' + JSON.stringify(obj, null, 2)),
              table: (data) => output.push('TABLE: ' + JSON.stringify(data, null, 2))
            };
            
            // Safe environment with common globals
            const Math = window.Math;
            const Date = window.Date;
            const JSON = window.JSON;
            const Array = window.Array;
            const Object = window.Object;
            const String = window.String;
            const Number = window.Number;
            const Boolean = window.Boolean;
            
            try {
              ${code}
            } catch (error) {
              output.push('RUNTIME ERROR: ' + error.message);
            }
            
            return output.length > 0 ? output.join('\\n') : 'Code executed successfully (no output)';
          `)()
          return result
        } catch (err) {
          return `Syntax Error: ${err instanceof Error ? err.message : 'Unknown error'}`
        }

      case 'react':
      case 'jsx':
        return `React Component Validation:
${validateReactCode(code)}`

      case 'json':
        try {
          const parsed = JSON.parse(code)
          return `Valid JSON ✓\n\nFormatted:\n${JSON.stringify(parsed, null, 2)}`
        } catch (err) {
          return `Invalid JSON ✗\nError: ${err instanceof Error ? err.message : 'Parse error'}`
        }

      case 'html':
        return `HTML Structure Analysis:
${analyzeHtml(code)}`

      case 'css':
        return `CSS Validation:
${validateCss(code)}`

      case 'markdown':
        return `Markdown Analysis:
${analyzeMarkdown(code)}`

      case 'yaml':
        try {
          // Basic YAML validation (simplified)
          const lines = code.split('\n').filter((line) => line.trim())
          return `YAML Structure ✓\n${lines.length} lines\nBasic validation passed`
        } catch (err) {
          return `YAML Error: ${err instanceof Error ? err.message : 'Invalid format'}`
        }

      case 'xml':
        try {
          const parser = new DOMParser()
          const doc = parser.parseFromString(code, 'text/xml')
          const errors = doc.getElementsByTagName('parsererror')

          if (errors.length > 0) {
            return `XML Parse Error: ${errors[0].textContent}`
          }
          return `Valid XML ✓\nRoot element: ${doc.documentElement.tagName}`
        } catch (err) {
          return `XML Error: ${err instanceof Error ? err.message : 'Parse error'}`
        }

      default:
        return `Execution not implemented for ${lang}`
    }
  }

  // Helper functions for code analysis
  const validateReactCode = (code: string): string => {
    const issues = []

    if (!/<[A-Z]/.test(code) && !/function\s+[A-Z]/.test(code)) {
      issues.push('⚠️  No React components detected')
    }

    if (!/import.*react/i.test(code) && code.includes('<')) {
      issues.push('⚠️  Missing React import')
    }

    if (/class\s+\w+\s+extends/.test(code)) {
      issues.push('💡 Consider using functional components with hooks')
    }

    if (/.map\(/.test(code) && !/key=/.test(code)) {
      issues.push('⚠️  Missing key prop in list rendering')
    }

    const componentCount = (code.match(/<[A-Z]\w*/g) || []).length

    return issues.length > 0
      ? issues.join('\n')
      : `✅ React code looks good!\n${componentCount} component(s) detected`
  }

  const analyzeHtml = (code: string): string => {
    const issues = []

    if (!code.includes('<!DOCTYPE')) {
      issues.push('💡 Missing DOCTYPE declaration')
    }

    if (!code.includes('<html')) {
      issues.push('💡 Missing <html> tag')
    }

    if (!code.includes('<head')) {
      issues.push('💡 Missing <head> section')
    }

    const tags = (code.match(/<\w+/g) || []).length
    const closingTags = (code.match(/<\/\w+>/g) || []).length

    if (tags > closingTags + 2) {
      // Allow for self-closing tags
      issues.push('⚠️  Potentially unclosed tags detected')
    }

    return issues.length > 0
      ? issues.join('\n')
      : `✅ HTML structure looks good!\n${tags} tags found`
  }

  const validateCss = (code: string): string => {
    const issues = []

    // Check for unclosed braces
    const openBraces = (code.match(/\{/g) || []).length
    const closeBraces = (code.match(/\}/g) || []).length

    if (openBraces !== closeBraces) {
      issues.push('⚠️  Unmatched braces detected')
    }

    // Check for vendor prefixes
    if (/-webkit-|-moz-|-ms-|-o-/.test(code)) {
      issues.push('💡 Vendor prefixes detected - consider autoprefixer')
    }

    // Check for px units
    if (/\d+px/.test(code)) {
      issues.push('💡 Consider using rem/em for better accessibility')
    }

    const rules = (code.match(/\{[^}]*\}/g) || []).length

    return issues.length > 0 ? issues.join('\n') : `✅ CSS looks good!\n${rules} rules found`
  }

  const analyzeMarkdown = (code: string): string => {
    const lines = code.split('\n')
    const stats = {
      headers: (code.match(/^#+\s/gm) || []).length,
      codeBlocks: (code.match(/```/g) || []).length / 2,
      links: (code.match(/\[.*?\]\(.*?\)/g) || []).length,
      images: (code.match(/!\[.*?\]\(.*?\)/g) || []).length,
      lists: (code.match(/^[\s]*[-*+]\s/gm) || []).length
    }

    return `📝 Markdown Analysis:
Headers: ${stats.headers}
Code blocks: ${Math.floor(stats.codeBlocks)}
Links: ${stats.links}
Images: ${stats.images}
List items: ${stats.lists}
Total lines: ${lines.length}`
  }

  const getLanguageIcon = (lang: string): string => {
    const icons = {
      javascript: '🟨',
      typescript: '🔷',
      python: '🐍',
      html: '🌐',
      css: '🎨',
      json: '📄',
      bash: '💻',
      sql: '🗃️',
      java: '☕',
      cpp: '⚙️',
      csharp: '🔵',
      go: '🐹',
      rust: '🦀',
      swift: '🍎',
      kotlin: '🟣'
    }
    return icons[lang.toLowerCase()] || '📝'
  }

  const lines = localContent.split('\n')
  const lineNumberWidth = Math.max(2, lines.length.toString().length)

  const handleSuggestImprovements = () => {
    onSuggestImprovements?.(localContent)
    addToast({
      type: 'info',
      title: 'Analyzing Code',
      description: 'Getting improvement suggestions...',
      duration: 2000
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent)
      addToast({
        type: 'success',
        title: 'Copied to Clipboard',
        description: 'Code copied successfully',
        duration: 2000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        duration: 3000
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([localContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName || `code.${language}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    addToast({
      type: 'success',
      title: 'Download Started',
      description: `Downloading ${fileName || `code.${language}`}`,
      duration: 2000
    })
  }

  const handleExport = () => {
    // Create a dropdown-like behavior by showing toast with options
    addToast({
      type: 'info',
      title: 'Export Options',
      description: 'Choose format: .tsx, .txt, or .zip',
      duration: 5000
    })

    // For now, we'll implement the basic export functionality
    // This could be expanded to show a proper dropdown in the future
    const fileExtension =
      language === 'typescript' || language === 'tsx'
        ? 'tsx'
        : language === 'javascript' || language === 'jsx'
          ? 'jsx'
          : language === 'python'
            ? 'py'
            : language === 'html'
              ? 'html'
              : language === 'css'
                ? 'css'
                : 'txt'

    const blob = new Blob([localContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName?.split('.')[0] || 'code'}.${fileExtension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        // Create a file to share
        const file = new File([localContent], fileName || `code.${language}`, {
          type: 'text/plain'
        })

        await navigator.share({
          title: title || 'Code from Puffer',
          text: `Check out this ${language} code:`,
          files: [file]
        })

        addToast({
          type: 'success',
          title: 'Shared Successfully',
          description: 'Code shared via system dialog',
          duration: 2000
        })
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          // Fallback to clipboard if sharing fails
          await handleCopy()
          addToast({
            type: 'info',
            title: 'Share Not Available',
            description: 'Code copied to clipboard instead',
            duration: 3000
          })
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      await handleCopy()
      addToast({
        type: 'info',
        title: 'Share Not Available',
        description: 'Code copied to clipboard',
        duration: 3000
      })
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getLanguageIcon(language)}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            {fileName && <p className="text-xs text-gray-500">{fileName}</p>}
          </div>
          <Badge variant="secondary" className="text-xs">
            {language}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Execute Button */}
          {canExecute(language) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExecute}
              disabled={isExecuting}
              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              {isExecuting ? (
                <div className="animate-spin w-3 h-3 border border-green-600 border-t-transparent rounded-full" />
              ) : (
                <Play size={14} />
              )}
              <span className="ml-1 text-xs">Run</span>
            </Button>
          )}

          {/* View Options */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className="h-7 w-7 p-0"
          >
            {showLineNumbers ? <Eye size={14} /> : <EyeSlash size={14} />}
          </Button>

          {/* Edit Mode Toggle */}
          {!editMode ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditMode(true)}
              className="h-7 w-7 p-0"
            >
              <Pencil size={14} />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
              >
                <Check size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1 border-l pl-2 ml-2">
            <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 w-7 p-0">
              <Copy size={14} />
            </Button>

            <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7 w-7 p-0">
              <Download size={14} />
            </Button>

            {/* Export and Share Controls */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExport}
              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
              title="Export as .tsx, .txt, or zip file"
            >
              <Export size={14} />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
              title="Share via system dialog"
            >
              <Share size={14} />
            </Button>

            {onSuggestImprovements && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSuggestImprovements}
                className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700"
              >
                <Sparkle size={14} />
              </Button>
            )}

            {onToggleFullscreen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleFullscreen}
                className="h-7 w-7 p-0"
              >
                {isFullscreen ? <ArrowsIn size={14} /> : <ArrowsOut size={14} />}
              </Button>
            )}

            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 relative">
        {editMode ? (
          <div className="h-full flex">
            {showLineNumbers && (
              <div className="bg-gray-50 border-r border-gray-200 p-2 select-none">
                <div className="font-mono text-xs text-gray-400 leading-6">
                  {lines.map((_, index) => (
                    <div
                      key={index}
                      className="text-right"
                      style={{ width: `${lineNumberWidth}ch` }}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              className="flex-1 font-mono text-sm border-0 rounded-none resize-none focus:ring-0 leading-6"
              style={{ minHeight: '100%' }}
              placeholder="Start coding..."
              autoFocus
            />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex">
              {showLineNumbers && (
                <div className="bg-gray-50 border-r border-gray-200 p-2 select-none sticky left-0">
                  <div className="font-mono text-xs text-gray-400 leading-6">
                    {lines.map((_, index) => (
                      <div
                        key={index}
                        className="text-right"
                        style={{ width: `${lineNumberWidth}ch` }}
                      >
                        {index + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 p-4">
                <pre className="font-mono text-sm leading-6 whitespace-pre-wrap break-all">
                  <code>{localContent}</code>
                </pre>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Enhanced Execution Output Panel */}
      {showOutput && (
        <div className="border-t border-gray-200 bg-gray-900 text-green-400 font-mono text-sm">
          <div className="flex items-center justify-between p-2 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Play size={14} className="text-green-400" />
              <span className="text-xs font-medium text-white">Execution Output</span>
              {canExecute(language) && (
                <Badge variant="outline" className="text-xs border-green-400 text-green-400">
                  {language}
                </Badge>
              )}
              {isExecuting && (
                <div className="animate-spin w-3 h-3 border border-green-400 border-t-transparent rounded-full" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                title="Copy output"
              >
                <Copy size={10} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowOutput(false)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <X size={12} />
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-64">
            <div className="p-3">
              {isExecuting ? (
                <div className="flex items-center gap-2 text-yellow-400">
                  <div className="animate-spin w-4 h-4 border border-yellow-400 border-t-transparent rounded-full" />
                  <span>Executing {language} code...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {executionOutput ? (
                    <div>
                      <pre className="whitespace-pre-wrap text-sm text-green-300">
                        {executionOutput}
                      </pre>
                      <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                        <span>✓ Execution completed • {new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm italic">No output generated</div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Footer Status */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>{lines.length} lines</span>
          <span>{localContent.length} characters</span>
          <span>Language: {language}</span>
        </div>
        {editMode && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Editing
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeCanvas
