import React, { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html, Environment } from '@react-three/drei';
import { cn } from '@/lib/utils';
import { MagicUIProvider } from './core/MagicUIProvider';
import { InteractiveWorkspace } from './core/InteractiveWorkspace';
import { SpatialChatSystem } from './spatial/SpatialChatSystem';
import { SmartCodeEditor } from './editors/SmartCodeEditor';
import { AIAssistantAvatar } from './spatial/AIAssistantAvatar';
import { CollaborationLayer } from './spatial/CollaborationLayer';
import { FloatingPanels } from './ui/FloatingPanels';
import { LightingSystem } from './effects/LightingSystem';
import { ParticleSystem } from './effects/ParticleSystem';

export interface PuffinCanvas3DProps {
  className?: string;
  messages?: any[];
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
  selectedModel?: string;
}

interface CanvasState {
  activePanel: 'chat' | 'code' | 'data' | 'agents' | null;
  cameraPosition: [number, number, number];
  showAI: boolean;
  collaborationMode: boolean;
}

export const PuffinCanvas3D: React.FC<PuffinCanvas3DProps> = ({
  className,
  messages = [],
  onSendMessage,
  isLoading = false,
  selectedModel = 'gpt-4',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    activePanel: null,
    cameraPosition: [0, 0, 10],
    showAI: true,
    collaborationMode: false,
  });

  const handlePanelChange = (panel: CanvasState['activePanel']) => {
    setCanvasState(prev => ({
      ...prev,
      activePanel: panel,
    }));
  };
          ref={canvasRef}
          className="w-full h-full"
          shadows
          camera={{ position: canvasState.cameraPosition, fov: 75 }}
        >
          <Suspense fallback={<Html center>Loading...</Html>}>
            {/* Lighting System */}
            <LightingSystem />
            
            {/* Environment */}
            <Environment preset="city" />
            
            {/* Camera Controls */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={5}
              maxDistance={50}
            />
            
            {/* Interactive Workspace */}
            <InteractiveWorkspace
              activePanel={canvasState.activePanel}
              onPanelChange={handlePanelChange}
            />
            
            {/* Spatial Chat System */}
            <SpatialChatSystem
              messages={messages}
              onSendMessage={onSendMessage}
              isVisible={canvasState.activePanel === 'chat'}
              position={[-8, 0, 0]}
            />
            
            {/* Smart Code Editor */}
            <SmartCodeEditor
              isVisible={canvasState.activePanel === 'code'}
              position={[8, 0, 0]}
            />
            
            {/* AI Assistant Avatar */}
            {canvasState.showAI && (
              <AIAssistantAvatar
                position={[0, 3, 0]}
                isActive={isLoading}
                selectedModel={selectedModel}
              />
            )}
            
            {/* Collaboration Layer */}
            <CollaborationLayer
              isEnabled={canvasState.collaborationMode}
            />
            
            {/* Particle Effects */}
            <ParticleSystem />
            
          </Suspense>
        </Canvas>
        
        {/* Floating UI Panels */}
        <FloatingPanels
          activePanel={canvasState.activePanel}
          onPanelChange={handlePanelChange}
        />
      </div>
    </MagicUIProvider>
  );
};

export default PuffinCanvas3D;