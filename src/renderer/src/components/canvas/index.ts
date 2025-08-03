// ChatGPT-Style Canvas Implementation
// Main Canvas Panel for side-by-side IDE experience

// Primary Canvas Component
export { default as CanvasPanel } from './CanvasPanel';

// Monaco Editor Integration
export { default as MonacoCanvasEditor } from './MonacoCanvasEditor';

// Canvas Views
export { default as CanvasView } from './CanvasView';
export { default as CodeCanvasView } from './CodeCanvasView';

// Test Component
export { default as CanvasTest } from './CanvasTest';

// Legacy Components (deprecated - use CanvasPanel instead)
export { default as CodeCanvas } from './CodeCanvas';

// Types
export interface CanvasMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  position?: [number, number, number];
}

export interface CanvasState {
  activePanel: 'chat' | 'code' | 'data' | 'agents' | null;
  cameraPosition: [number, number, number];
  showAI: boolean;
  collaborationMode: boolean;
}
