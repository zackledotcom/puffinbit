// MessageComponent.tsx
import { useState, useEffect } from 'react'
import { Message } from '@/types/chat'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { FileCode, ChevronDown, ChevronRight } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { logAnalyticsEvent } from '@/lib/analytics'
interface Props {
  message: Message
}
function detectLang(path?: string): string {
  if (!path) return 'tsx'
  if (path.endsWith('.ts')) return 'typescript'
  if (path.endsWith('.tsx')) return 'tsx'
  if (path.endsWith('.js')) return 'javascript'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.md')) return 'markdown'
  return 'text'
}
export default function MessageComponent({ message }: Props) {
  const isCanvas = message.type === 'canvas'
  const isUser = message.role === 'user'
  const [expanded, setExpanded] = useState(false)
  const lang = detectLang(message.path)
  useEffect(() => {
    // Log when canvas message is rendered (if needed for analytics)
    if (isCanvas) {
      logAnalyticsEvent({
        type: 'feature_usage',
        feature: 'canvas_mode',
        action: 'canvas_message_viewed',
        model: message.model || 'unknown',
        path: message.path || 'unknown',
        timestamp: Date.now()
      })
    }
  }, [isCanvas, message])
  return (
    <div className={cn('px-4 py-2 md:px-6 md:py-4', isUser ? 'text-right' : 'text-left')}>
      <Card className="p-4 md:p-6 bg-muted rounded-2xl shadow-sm border border-border">
        <div className="flex items-center justify-between mb-3">
          <Badge
            variant={isCanvas ? 'outline' : 'secondary'}
            className="text-xs px-2 py-0.5 rounded-full"
          >
            {isCanvas ? 'Canvas' : message.role === 'user' ? 'You' : 'AI'}
          </Badge>
          {isCanvas && message.path && (
            <div className="flex items-center text-xs text-muted-foreground font-mono">
              <FileCode className="w-3 h-3 mr-1" />
              {message.path}
            </div>
          )}
        </div>
        {isCanvas ? (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center mb-3 transition-colors"
            >
              {expanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
              {expanded ? 'Collapse code' : 'Expand code'}
            </button>
            {expanded && (
              <ScrollArea className="max-h-96 rounded-md border border-border bg-background">
                <SyntaxHighlighter
                  language={lang}
                  style={atomOneDark}
                  wrapLongLines
                  customStyle={{ backgroundColor: 'transparent', fontSize: '0.85rem', padding: '1rem' }}
                >
                  {message.content}
                </SyntaxHighlighter>
              </ScrollArea>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {message.content}
          </p>
        )}
      </Card>
    </div>
  )
}
