import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
}

interface CanvasState {
  // Canvas visibility
  canvasOpen: boolean
  
  // File system
  currentDirectory: string
  fileTree: FileNode[]
  currentFile: {
    path: string
    content: string
    language: string
  } | null
  
  // UI state
  canvasWidth: number
  isLoading: boolean
  
  // Actions
  setCanvasOpen: (open: boolean) => void
  setCurrentDirectory: (path: string) => void
  setFileTree: (tree: FileNode[]) => void
  setCurrentFile: (file: { path: string; content: string; language: string } | null) => void
  setCanvasWidth: (width: number) => void
  setLoading: (loading: boolean) => void
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      // Initial state
      canvasOpen: false,
      currentDirectory: '',
      fileTree: [],
      currentFile: null,
      canvasWidth: 400,
      isLoading: false,
      
      // Actions
      setCanvasOpen: (open: boolean) => set({ canvasOpen: open }),
      setCurrentDirectory: (path: string) => set({ currentDirectory: path }),
      setFileTree: (tree: FileNode[]) => set({ fileTree: tree }),
      setCurrentFile: (file) => set({ currentFile: file }),
      setCanvasWidth: (width: number) => set({ canvasWidth: Math.max(300, Math.min(800, width)) }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'puffin-canvas-store',
      partialize: (state) => ({
        canvasOpen: state.canvasOpen,
        currentDirectory: state.currentDirectory,
        canvasWidth: state.canvasWidth,
      }),
    }
  )
)