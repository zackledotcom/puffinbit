import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere, Box, Cylinder } from '@react-three/drei';
import { Vector3 } from 'three';
import { useMagicUI } from './MagicUIProvider';

interface InteractiveWorkspaceProps {
  activePanel: 'chat' | 'code' | 'data' | 'agents' | null;
  onPanelChange: (panel: 'chat' | 'code' | 'data' | 'agents' | null) => void;
}

interface NodeProps {
  position: [number, number, number];
  type: 'chat' | 'code' | 'data' | 'agents';
  isActive: boolean;
  onClick: () => void;
}

const InteractiveNode: React.FC<NodeProps> = ({ position, type, isActive, onClick }) => {
  const meshRef = useRef<any>();
  const [hovered, setHovered] = useState(false);
  const { addEffect, removeEffect } = useMagicUI();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      if (isActive) {
        meshRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
      } else {
        meshRef.current.scale.setScalar(hovered ? 1.1 : 1);
      }
    }
  });

  const getNodeColor = () => {
    if (isActive) return '#00ff88';
    if (hovered) return '#88ff00';
    switch (type) {
      case 'chat': return '#3b82f6';
      case 'code': return '#10b981';
      case 'data': return '#f59e0b';
      case 'agents': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getNodeGeometry = () => {
    switch (type) {
      case 'chat':
        return <Sphere args={[1, 16, 16]} />;
      case 'code':
        return <Box args={[1.5, 1.5, 1.5]} />;
      case 'data':
        return <Cylinder args={[1, 1, 2, 8]} />;
      case 'agents':
        return <Sphere args={[1.2, 8, 6]} />;
      default:
        return <Sphere args={[1, 16, 16]} />;
    }
  };

  const handleClick = () => {
    onClick();
    // Add beam effect from center to clicked node
    addEffect(`beam-${type}`, {
      type: 'beam',
      source: [0, 0, 0],
      target: position,
      color: getNodeColor(),
      duration: 1.0,
    });
    
    // Remove effect after duration
    setTimeout(() => removeEffect(`beam-${type}`), 1000);
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        {getNodeGeometry()}
        <meshStandardMaterial
          color={getNodeColor()}
          emissive={isActive ? getNodeColor() : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
          transparent
          opacity={hovered ? 0.9 : 0.7}
        />
      </mesh>
      
      {/* Node Label */}
      <Html
        position={[0, 2, 0]}
        center
        distanceFactor={10}
        className="pointer-events-none"
      >
        <div className="bg-black/80 text-white px-2 py-1 rounded text-sm font-medium">
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </div>
      </Html>
      
      {/* Active indicator */}
      {isActive && (
        <Sphere args={[2, 16, 16]} position={[0, 0, 0]}>
          <meshBasicMaterial
            color={getNodeColor()}
            transparent
            opacity={0.1}
            wireframe
          />
        </Sphere>
      )}
    </group>
  );
};

export const InteractiveWorkspace: React.FC<InteractiveWorkspaceProps> = ({
  activePanel,
  onPanelChange,
}) => {
  const nodes = [
    { type: 'chat' as const, position: [-6, 0, 0] as [number, number, number] },
    { type: 'code' as const, position: [6, 0, 0] as [number, number, number] },
    { type: 'data' as const, position: [0, 0, -6] as [number, number, number] },
    { type: 'agents' as const, position: [0, 0, 6] as [number, number, number] },
  ];

  return (
    <group>
      {/* Central Hub */}
      <Sphere args={[0.5, 16, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffffff" emissive="#4f46e5" emissiveIntensity={0.2} />
      </Sphere>
      
      {/* Interactive Nodes */}
      {nodes.map((node) => (
        <InteractiveNode
          key={node.type}
          position={node.position}
          type={node.type}
          isActive={activePanel === node.type}
          onClick={() => onPanelChange(node.type)}
        />
      ))}
      
      {/* Connection Lines */}
      {activePanel && (
        <group>
          {nodes
            .filter(node => node.type === activePanel)
            .map((node) => (
              <line key={`line-${node.type}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([0, 0, 0, ...node.position])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#00ff88" linewidth={2} />
              </line>
            ))}
        </group>
      )}
    </group>
  );
};
