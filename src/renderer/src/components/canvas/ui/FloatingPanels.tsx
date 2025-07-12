import React from 'react';
import { Html } from '@react-three/drei';

interface FloatingPanelsProps {
  activePanel: 'chat' | 'code' | 'data' | 'agents' | null;
  onPanelChange: (panel: 'chat' | 'code' | 'data' | 'agents' | null) => void;
}

export const FloatingPanels: React.FC<FloatingPanelsProps> = ({
  activePanel,
  onPanelChange,
}) => {
  return (
    <div className="absolute bottom-4 right-4 z-50">
      <div className="bg-black/80 p-4 rounded-lg backdrop-blur-md border border-white/20">
        <h3 className="text-white text-sm font-medium mb-2">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onPanelChange(activePanel === 'chat' ? null : 'chat')}
            className={`p-2 rounded text-xs transition-colors ${
              activePanel === 'chat'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => onPanelChange(activePanel === 'code' ? null : 'code')}
            className={`p-2 rounded text-xs transition-colors ${
              activePanel === 'code'
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Code
          </button>
          <button
            onClick={() => onPanelChange(activePanel === 'data' ? null : 'data')}
            className={`p-2 rounded text-xs transition-colors ${
              activePanel === 'data'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Data
          </button>
          <button
            onClick={() => onPanelChange(activePanel === 'agents' ? null : 'agents')}
            className={`p-2 rounded text-xs transition-colors ${
              activePanel === 'agents'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Agents
          </button>
        </div>
      </div>
    </div>
  );
};
