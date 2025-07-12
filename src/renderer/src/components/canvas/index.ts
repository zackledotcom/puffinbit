// Enhanced Puffin Canvas 3D System
// 10x better than Pelicanos with Magic UI and Three.js integration

// Main Canvas Component
export { default as PuffinCanvas3D } from './PuffinCanvas3D';

// Core Components
export { MagicUIProvider, useMagicUI } from './core/MagicUIProvider';
export { InteractiveWorkspace } from './core/InteractiveWorkspace';

// Spatial Components
export { SpatialChatSystem } from './spatial/SpatialChatSystem';
export { AIAssistantAvatar } from './spatial/AIAssistantAvatar';
export { CollaborationLayer } from './spatial/CollaborationLayer';

// Editor Components
export { SmartCodeEditor } from './editors/SmartCodeEditor';

// Effect Components
export { LightingSystem } from './effects/LightingSystem';
export { ParticleSystem } from './effects/ParticleSystem';

// UI Components
export { FloatingPanels } from './ui/FloatingPanels';

// Magic UI Components
export { Marquee } from '../magicui/marquee';
export { TextReveal } from '../magicui/text-reveal';
export { BoxReveal } from '../magicui/box-reveal';

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
