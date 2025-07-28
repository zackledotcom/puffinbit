// ChatInterface.tsx
import { useCanvasModeStore } from '@/stores/useCanvasModeStore'
import { useModelStore } from '@/stores/useModelStore'
import InputBar from '@/components/chat/InputBar'
import MessageList from '@/components/chat/MessageList'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
export default function ChatInterface() {
  const canvasMode = useCanvasModeStore((s) => s.canvasMode)
  const model = useModelStore((s) => s.activeModel)
  const isOnline = useModelStore((s) => s.online)
  if (canvasMode) return null
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5">
            {model?.name || 'Model Unknown'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isOnline ? (
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-green-500" /> Online
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <WifiOff className="w-3 h-3 text-red-500" /> Offline
            </div>
          )}
        </div>
      </div>
      <MessageList />
      <InputBar />
    </div>
  )
}
