import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere, Torus, Box } from '@react-three/drei';
import { Vector3 } from 'three';

interface AIAssistantAvatarProps {
  position: [number, number, number];
  isActive: boolean;
  selectedModel: string;
}

export const AIAssistantAvatar: React.FC<AIAssistantAvatarProps> = ({
  position,
  isActive,
  selectedModel,
}) => {
  const avatarRef = useRef<any>();
  const orbitRef = useRef<any>();
  const [isThinking, setIsThinking] = useState(false);

  useFrame((state) => {
    if (avatarRef.current) {
      // Main avatar rotation
      avatarRef.current.rotation.y += 0.005;
      
      // Breathing effect
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      avatarRef.current.scale.setScalar(breathe);
      
      // Active state effects
      if (isActive) {
        avatarRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      }
    }

    if (orbitRef.current) {
      // Orbiting particles
      orbitRef.current.rotation.y += 0.02;
      orbitRef.current.rotation.x += 0.01;
    }
  });

  const getAvatarColor = () => {
    if (isActive) return '#00ff88';
    switch (selectedModel.toLowerCase()) {
      case 'gpt-4': return '#10b981';
      case 'claude': return '#f59e0b';
      case 'gemini': return '#3b82f6';
      default: return '#8b5cf6';
    }
  };

  return (
    <group position={position}>
      {/* Main Avatar Body */}
      <mesh ref={avatarRef}>
        <Sphere args={[1, 32, 32]}>
          <meshStandardMaterial
            color={getAvatarColor()}
            emissive={getAvatarColor()}
            emissiveIntensity={isActive ? 0.4 : 0.2}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </Sphere>
      </mesh>

      {/* Orbiting Elements */}
      <group ref={orbitRef}>
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const radius = 2;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          
          return (
            <Sphere key={i} args={[0.1, 8, 8]} position={[x, 0, z]}>
              <meshStandardMaterial
                color={getAvatarColor()}
                emissive={getAvatarColor()}
                emissiveIntensity={0.5}
              />
            </Sphere>
          );
        })}
      </group>

      {/* Neural Network Rings */}
      <Torus args={[1.8, 0.05, 8, 16]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={getAvatarColor()}
          emissive={getAvatarColor()}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </Torus>
      
      <Torus args={[2.2, 0.03, 8, 16]} rotation={[0, Math.PI / 4, Math.PI / 3]}>
        <meshStandardMaterial
          color={getAvatarColor()}
          emissive={getAvatarColor()}
          emissiveIntensity={0.2}
          transparent
          opacity={0.4}
        />
      </Torus>

      {/* Status Display */}
      <Html
        position={[0, -2.5, 0]}
        center
        distanceFactor={8}
      >
        <div className="text-center">
          <div className="bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-md border"
               style={{ borderColor: getAvatarColor() }}>
            <div className="text-sm font-medium">{selectedModel}</div>
            <div className="text-xs opacity-70">
              {isActive ? 'Processing...' : 'Ready'}
            </div>
          </div>
          {isActive && (
            <div className="mt-2 flex justify-center">
              <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div>
            </div>
          )}
        </div>
      </Html>

      {/* Voice Indicator */}
      {isActive && (
        <group position={[0, 1.5, 0]}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box 
              key={i} 
              args={[0.1, Math.random() * 0.5 + 0.2, 0.1]} 
              position={[(i - 2) * 0.3, 0, 0]}
            >
              <meshStandardMaterial
                color={getAvatarColor()}
                emissive={getAvatarColor()}
                emissiveIntensity={0.6}
              />
            </Box>
          ))}
        </group>
      )}
    </group>
  );
};
