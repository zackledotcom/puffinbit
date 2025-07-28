import React, { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  FastForward,
  Activity,
  Hash,
  Clock
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TokenStreamingDisplayProps {
  isStreaming: boolean
  streamContent: string
  model: string
  className?: string
}

interface TokenInfo {
  current: number
  total: number
  rate: number // tokens per second
  startTime: number
}

const TokenStreamingDisplay: React.FC<TokenStreamingDisplayProps> = ({
  isStreaming,
  streamContent,
  model,
  className
}) => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    current: 0,
    total: 0,
    rate: 0,
    startTime: Date.now()
  })

  const [replayMode, setReplayMode] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const [replayPosition, setReplayPosition] = useState(0)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  // Update token info when streaming
  useEffect(() => {
    if (isStreaming && streamContent) {
      const tokens = streamContent.split(/\s+/).length
      const elapsed = (Date.now() - tokenInfo.startTime) / 1000
      const rate = elapsed > 0 ? tokens / elapsed : 0

      setTokenInfo((prev) => ({
        ...prev,
        current: tokens,
        rate
      }))
    }
  }, [streamContent, isStreaming, tokenInfo.startTime])

  // Start new streaming session
  useEffect(() => {
    if (isStreaming) {
      setTokenInfo({
        current: 0,
        total: 0,
        rate: 0,
        startTime: Date.now()
      })
      setReplayMode(false)
      setReplayPosition(0)
    } else if (streamContent) {
      // Streaming finished, update total
      const totalTokens = streamContent.split(/\s+/).length
      setTokenInfo((prev) => ({
        ...prev,
        total: totalTokens
      }))
    }
  }, [isStreaming])

  const handleReplayToggle = () => {
    setReplayMode(!replayMode)
    if (!replayMode) {
      setReplayPosition(0)
    }
  }

  const handleReplaySpeedChange = () => {
    const speeds = [0.5, 1, 2, 4]
    const currentIndex = speeds.indexOf(replaySpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setReplaySpeed(speeds[nextIndex])
  }

  const formatTokenRate = (rate: number) => {
    return rate > 0 ? `${rate.toFixed(1)} tok/s` : '-- tok/s'
  }

  const getReplayContent = () => {
    if (!replayMode || !streamContent) return streamContent

    const words = streamContent.split(' ')
    const targetIndex = Math.floor((replayPosition / 100) * words.length)
    return words.slice(0, targetIndex).join(' ')
  }

  return (
    <div className={cn('border-t border-border bg-muted/30 backdrop-blur', className)}>
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity
              size={16}
              className={cn(isStreaming ? 'text-green-500 animate-pulse' : 'text-muted-foreground')}
            />
            <span className="font-medium text-sm">Token Streaming</span>
            <Badge variant="outline" className="text-xs">
              {model}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDebugInfo(!showDebugInfo)}>
              Debug
            </Button>

            {!isStreaming && streamContent && (
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" onClick={handleReplayToggle}>
                  {replayMode ? <Pause size={14} /> : <Play size={14} />}
                </Button>

                <Button variant="ghost" size="sm" onClick={handleReplaySpeedChange}>
                  <FastForward size={14} />
                  {replaySpeed}x
                </Button>

                <Button variant="ghost" size="sm" onClick={() => setReplayPosition(0)}>
                  <ArrowCounterClockwise size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Token Info Bar */}
        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
          <div className="flex items-center space-x-2">
            <Hash size={14} className="text-muted-foreground" />
            <span>Tokens: {tokenInfo.current}</span>
            {tokenInfo.total > 0 && tokenInfo.total !== tokenInfo.current && (
              <span className="text-muted-foreground">/ {tokenInfo.total}</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Activity size={14} className="text-muted-foreground" />
            <span>Rate: {formatTokenRate(tokenInfo.rate)}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Clock size={14} className="text-muted-foreground" />
            <span>Time: {((Date.now() - tokenInfo.startTime) / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Progress Bar for Replay */}
        {replayMode && (
          <div className="mb-3">
            <Progress value={replayPosition} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>{replayPosition.toFixed(0)}%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Stream Content Preview */}
        {(isStreaming || streamContent) && (
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-sm font-mono text-muted-foreground mb-1">Stream Preview:</div>
            <div className="text-sm max-h-20 overflow-y-auto">
              {getReplayContent()}
              {isStreaming && <span className="animate-pulse">|</span>}
            </div>
          </div>
        )}

        {/* Debug Information */}
        {showDebugInfo && (
          <div className="mt-3 p-3 bg-background rounded-lg border border-border">
            <div className="text-sm font-medium mb-2">Debug Information</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Model: {model}</div>
              <div>Streaming: {isStreaming ? 'Yes' : 'No'}</div>
              <div>Content Length: {streamContent.length} chars</div>
              <div>Word Count: {streamContent.split(/\s+/).length}</div>
              <div>Start Time: {new Date(tokenInfo.startTime).toLocaleTimeString()}</div>
              <div>Replay Mode: {replayMode ? 'On' : 'Off'}</div>
            </div>
          </div>
        )}

        {/* Correction Replay Controls */}
        {!isStreaming && streamContent && (
          <div className="mt-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-800">
              💡 <strong>Correction Replay:</strong> Edit the message above to replay token
              generation with corrections
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TokenStreamingDisplay
