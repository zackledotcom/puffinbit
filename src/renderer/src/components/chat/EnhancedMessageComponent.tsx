import React, { useState } from 'react'
import { Brain, CaretDown, CaretUp, Eye, Clock } from 'phosphor-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Message } from '../../stores/useMessageStore'

interface Props {
  message: Message
}

export default function EnhancedMessageComponent({ message }: Props) {
  const [showMemoryInfluence, setShowMemoryInfluence] = useState(false)
  const isUser = message.role === 'user'
  const hasMemoryContext = message.memoryContext && message.memoryContext.length > 0

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`px-4 py-2 md:px-6 md:py-4 ${isUser ? 'text-right' : 'text-left'}`}>
      {isUser ? (
        <div className="chatgpt-message-user inline-block max-w-full">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <div className="text-xs text-muted-foreground mt-1">
            {formatTime(message.timestamp)}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>{formatTime(message.timestamp)}</span>
            
            {message.model && (
              <>
                <span>•</span>
                <span>{message.model}</span>
              </>
            )}
            
            {hasMemoryContext && (
              <>
                <span>•</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => setShowMemoryInfluence(!showMemoryInfluence)}
                >
                  <Brain size={12} className="mr-1" />
                  {message.memoryContext.length} memories used
                  {showMemoryInfluence ? <CaretUp size={12} className="ml-1" /> : <CaretDown size={12} className="ml-1" />}
                </Button>
              </>
            )}
          </div>

          {hasMemoryContext && (
            <Collapsible open={showMemoryInfluence} onOpenChange={setShowMemoryInfluence}>
              <CollapsibleContent className="space-y-1">
                <Card className="bg-blue-50/50 border-blue-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={14} className="text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Memory Influence</span>
                      <Badge variant="outline" className="text-xs">
                        {message.memoryContext.length} context{message.memoryContext.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {message.memoryContext.map((context, index) => (
                        <div key={index} className="text-xs p-2 bg-white rounded border border-blue-100">
                          <div className="flex items-start gap-2">
                            <Eye size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 leading-relaxed">{context}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-blue-600 mt-2">
                      This response was influenced by the above memories
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  )
}
