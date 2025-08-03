// AppLayout.tsx
import { useCanvasModeStore } from '@/stores/useCanvasModeStore'
import TopBar from '@/components/layout/TopBar'
import BottomBar from '@/components/layout/BottomBar'
import ChatInterface from '@/components/ChatInterface'
import CanvasPanel from '@/components/canvas/CanvasPanel'

export default function AppLayout() {
  const canvasMode = useCanvasModeStore((s) => s.canvasMode)
  
  return (
    <div className="flex h-screen w-screen flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden">
          {canvasMode ? <CanvasPanel /> : <ChatInterface />}
        </main>
      </div>
      <BottomBar />
    </div>
  )
}