import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Badge } from '../ui/badge'
import {
  Code,
  Stack,
  Clock,
  Hash,
  Tag,
  CaretDown,
  CaretRight,
  ArrowsClockwise,
  Copy
} from 'phosphor-react'

interface ContextDebugPanelProps {
  enrichmentInfo?: any
  onRefresh?: () => void
}

export const ContextDebugPanel: React.FC<ContextDebugPanelProps> = ({
  enrichmentInfo,
  onRefresh
}) => {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summaries: false,
    keyFacts: false,
    topics: false,
    prompt: false
  })

  useEffect(() => {
    if (enrichmentInfo) {
      setDebugInfo(enrichmentInfo)
    }
  }, [enrichmentInfo])

  const loadContextInfo = async () => {
    try {
      const result = await window.api.getContextDebugInfo()
      if (result.success) {
        setDebugInfo(result)
      }
    } catch (error) {
      console.error('Failed to load context debug info:', error)
    }
  }

  useEffect(() => {
    loadContextInfo()
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!debugInfo) {
    return (
      <Card className="w-full border-gray-200 dark:border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">Context Debug</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadContextInfo} className="ml-auto">
              <ArrowsClockwise className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No context information available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full border-gray-200 dark:border-gray-800 font-mono text-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg font-sans">Context Debug</CardTitle>
            {debugInfo.contextUsed && (
              <Badge
                variant="default"
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onRefresh?.()} className="h-8 w-8 p-0">
              <ArrowsClockwise className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <CaretDown className="h-4 w-4" /> : <CaretRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Context Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
              <Stack className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-xs text-muted-foreground">Summaries</div>
                <div className="font-semibold">
                  {debugInfo.summariesUsed || debugInfo.totalSummaries || 0}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
              <Hash className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-xs text-muted-foreground">Key Facts</div>
                <div className="font-semibold">
                  {debugInfo.keyFactsUsed || debugInfo.totalKeyFacts || 0}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950 rounded">
              <Tag className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-xs text-muted-foreground">Topics</div>
                <div className="font-semibold">{debugInfo.totalTopics || 0}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950 rounded">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-xs text-muted-foreground">Context Size</div>
                <div className="font-semibold">{debugInfo.contextLength || 0}ch</div>
              </div>
            </div>
          </div>

          {/* Recent Summaries */}
          {debugInfo.recentSummaries && (
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleSection('summaries')}
              >
                {expandedSections.summaries ? (
                  <CaretDown className="h-4 w-4" />
                ) : (
                  <CaretRight className="h-4 w-4" />
                )}
                <span className="font-medium">
                  Recent Summaries ({debugInfo.recentSummaries.length})
                </span>
              </div>

              {expandedSections.summaries && (
                <ScrollArea className="h-48 w-full border rounded p-2">
                  <div className="space-y-2">
                    {debugInfo.recentSummaries.map((summary: any, index: number) => (
                      <div
                        key={summary.id}
                        className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {summary.messageCount} msgs
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(summary.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mb-1">{summary.summary}</div>
                        <div className="flex flex-wrap gap-1">
                          {summary.topics.map((topic: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Debug Output */}
          {debugInfo.debugInfo && (
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleSection('prompt')}
              >
                {expandedSections.prompt ? (
                  <CaretDown className="h-4 w-4" />
                ) : (
                  <CaretRight className="h-4 w-4" />
                )}
                <span className="font-medium">Enriched Prompt</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(debugInfo.debugInfo)
                  }}
                  className="h-6 w-6 p-0 ml-auto"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {expandedSections.prompt && (
                <ScrollArea className="h-32 w-full border rounded">
                  <pre className="p-2 text-xs whitespace-pre-wrap">{debugInfo.debugInfo}</pre>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Status */}
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
            <div className="font-medium mb-1">Status:</div>
            <div className="text-muted-foreground">
              {debugInfo.contextUsed
                ? `Context actively injected (${debugInfo.contextLength} characters)`
                : 'No context injection'}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
