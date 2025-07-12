import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';

export const LightingSystem: React.FC = () => {
  const spotLight1Ref = useRef<any>();
  const spotLight2Ref = useRef<any>();
  const pointLightRef = useRef<any>();

  useFrame((state) => {
    // Dynamic lighting effects
    if (spotLight1Ref.current) {
      spotLight1Ref.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 10;
      spotLight1Ref.current.position.z = Math.cos(state.clock.elapsedTime * 0.5) * 10;
    }

    if (spotLight2Ref.current) {
      spotLight2Ref.current.position.x = Math.cos(state.clock.elapsedTime * 0.3) * 8;
      spotLight2Ref.current.position.z = Math.sin(state.clock.elapsedTime * 0.3) * 8;
    }

    if (pointLightRef.current) {
      pointLightRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <>
      {/* Ambient Light */}
      <ambientLight intensity={0.3} color="#ffffff" />
      
      {/* Main Directional Light */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Dynamic Spot Lights */}
      <spotLight
        ref={spotLight1Ref}
        position={[10, 15, 0]}
        angle={Math.PI / 6}
        penumbra={1}
        intensity={0.8}
        color="#3b82f6"
        castShadow
      />
      
      <spotLight
        ref={spotLight2Ref}
        position={[-10, 15, 0]}
        angle={Math.PI / 6}
        penumbra={1}
        intensity={0.8}
        color="#10b981"
        castShadow
      />
      
      {/* Point Light for AI Assistant */}
      <pointLight
        ref={pointLightRef}
        position={[0, 5, 0]}
        intensity={0.5}
        color="#8b5cf6"
        distance={10}
        decay={2}
      />
      
      {/* Rim Lighting */}
      <hemisphereLight
        skyColor="#ffffff"
        groundColor="#1e293b"
        intensity={0.4}
      />
    </>
  );
};
