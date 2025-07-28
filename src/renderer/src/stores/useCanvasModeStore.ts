// stores/useCanvasModeStore.ts
import { create } from 'zustand'
interface CanvasModeState {
  canvasMode: boolean
  toggleCanvasMode: () => void
  setCanvasMode: (on: boolean) => void
}
export const useCanvasModeStore = create<CanvasModeState>((set) => ({
  canvasMode: false,
  toggleCanvasMode: () => set((state) => ({ canvasMode: !state.canvasMode })),
  setCanvasMode: (on) => set(() => ({ canvasMode: on })),
}))
