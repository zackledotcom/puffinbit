// AppLayout.tsx
import { useCanvasModeStore } from '@/stores/useCanvasModeStore'
import LeftSidebar from '@/components/layout/LeftSidebar'
import TopBar from '@/components/layout/TopBar'
import BottomBar from '@/components/layout/BottomBar'
import ChatInterface from '@/components/chat/ChatInterface'
import CanvasPanel from '@/components/canvas/CanvasPanel'
import FileTree from '@/components/filetree/FileTree'
export default function AppLayout() {
  const canvasMode = useCanvasModeStore((s) => s.canvasMode)
  return (
    <div className="flex h-screen w-screen flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {!canvasMode && <LeftSidebar />}
        <main className="flex flex-1 flex-col overflow-hidden">
          {canvasMode ? <CanvasPanel /> : <ChatInterface />}
        </main>
        {canvasMode && <FileTree />}
      </div>
      <BottomBar />
    </div>
  )
}
