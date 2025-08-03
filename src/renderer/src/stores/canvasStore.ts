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
  
  // Scratchpad mode
  isScratchpad: boolean
  
  // AI diff overlay
  showDiffOverlay: boolean
  aiSuggestion: {
    originalCode: string
    suggestedCode: string
  } | null
  
  // UI state
  canvasWidth: number
  isLoading: boolean
  
  // Actions
  setCanvasOpen: (open: boolean) => void
  setCurrentDirectory: (path: string) => void
  setFileTree: (tree: FileNode[]) => void
  setCurrentFile: (file: { path: string; content: string; language: string } | null) => void
  openScratchpad: (content?: string, language?: string) => void
  showAISuggestion: (originalCode: string, suggestedCode: string) => void
  hideDiffOverlay: () => void
  acceptAISuggestion: () => void
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
      isScratchpad: false,
      showDiffOverlay: false,
      aiSuggestion: null,
      canvasWidth: 400,
      isLoading: false,
      
      // Actions
      setCanvasOpen: (open: boolean) => set({ canvasOpen: open }),
      setCurrentDirectory: (path: string) => set({ currentDirectory: path }),
      setFileTree: (tree: FileNode[]) => set({ fileTree: tree }),
      setCurrentFile: (file) => set({ currentFile: file }),
      openScratchpad: (content = '', language = 'javascript') => {
        const scratchpadFile = {
          path: 'scratchpad.tsx',
          content: content || `// Scratchpad - Start coding here
import React from 'react';

const Component = () => {
  return (
    <div>
      <h1>Hello from Canvas!</h1>
    </div>
  );
};

export default Component;`,
          language
        };
        set({ 
          currentFile: scratchpadFile, 
          canvasOpen: true, 
          isScratchpad: true 
        });
      },
      showAISuggestion: (originalCode: string, suggestedCode: string) => {
        set({ 
          showDiffOverlay: true,
          aiSuggestion: { originalCode, suggestedCode }
        });
      },
      hideDiffOverlay: () => {
        set({ showDiffOverlay: false, aiSuggestion: null });
      },
      acceptAISuggestion: () => {
        const { currentFile, aiSuggestion } = get();
        if (currentFile && aiSuggestion) {
          set({ 
            currentFile: { ...currentFile, content: aiSuggestion.suggestedCode },
            showDiffOverlay: false,
            aiSuggestion: null
          });
        }
      },
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