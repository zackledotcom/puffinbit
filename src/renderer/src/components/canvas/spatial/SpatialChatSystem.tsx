import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere, Box } from '@react-three/drei';
import { Vector3 } from 'three';
import { TextReveal } from '../../magicui/text-reveal';
import { BoxReveal } from '../../magicui/box-reveal';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  position?: [number, number, number];
}

interface SpatialChatSystemProps {
  messages: Message[];
  onSendMessage?: (message: string) => void;
  isVisible: boolean;
  position: [number, number, number];
}

interface FloatingMessageProps {
  message: Message;
  index: number;
  isVisible: boolean;
}

const FloatingMessage: React.FC<FloatingMessageProps> = ({ message, index, isVisible }) => {
  const meshRef = useRef<any>();
  const [expanded, setExpanded] = useState(false);

  useFrame((state) => {
    if (meshRef.current && isVisible) {
      // Gentle floating animation
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + index) * 0.01;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime + index) * 0.1;
    }
  });

  const getMessageColor = () => {
    switch (message.type) {
      case 'user': return '#3b82f6';
      case 'ai': return '#10b981';
      case 'system': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const messagePosition: [number, number, number] = [
    message.position?.[0] || 0,
    message.position?.[1] || index * 1.5,
    message.position?.[2] || 0,
  ];

  return (
    <group position={messagePosition} visible={isVisible}>
      <mesh
        ref={meshRef}
        onClick={() => setExpanded(!expanded)}
        onPointerEnter={() => setExpanded(true)}
        onPointerLeave={() => setExpanded(false)}
      >
        <Sphere args={[0.3, 16, 16]}>
          <meshStandardMaterial
            color={getMessageColor()}
            emissive={getMessageColor()}
            emissiveIntensity={0.2}
            transparent
            opacity={0.8}
          />
        </Sphere>
      </mesh>

      {/* Message Content */}
      <Html
        position={[1, 0, 0]}
        distanceFactor={8}
        className={`transition-all duration-300 ${expanded ? 'opacity-100' : 'opacity-0'}`}
      >
        <BoxReveal boxColor={getMessageColor()}>
          <div className="bg-black/90 text-white p-3 rounded-lg max-w-xs border"
               style={{ borderColor: getMessageColor() }}>
            <div className="text-xs opacity-70 mb-1">
              {message.type} • {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime()) 
                ? message.timestamp.toLocaleTimeString() 
                : new Date().toLocaleTimeString()}
            </div>
            <div className="text-sm">{message.content}</div>
          </div>
        </BoxReveal>
      </Html>
    </group>
  );
};

export const SpatialChatSystem: React.FC<SpatialChatSystemProps> = ({
  messages,
  onSendMessage,
  isVisible,
  position,
}) => {
  const [inputValue, setInputValue] = useState('');
  const groupRef = useRef<any>();

  useFrame((state) => {
    if (groupRef.current && isVisible) {
      // Gentle breathing effect for the chat system
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      groupRef.current.scale.setScalar(scale);
    }
  });

  const handleSendMessage = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <group ref={groupRef} position={position} visible={isVisible}>
      {/* Chat Container */}
      <Box args={[8, 6, 0.2]} position={[0, 0, -0.1]}>
        <meshStandardMaterial
          color="#1a1a1a"
          transparent
          opacity={0.9}
          roughness={0.1}
          metalness={0.5}
        />
      </Box>

      {/* Chat Border */}
      <Box args={[8.2, 6.2, 0.1]} position={[0, 0, -0.2]}>
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.3}
          transparent
          opacity={0.3}
        />
      </Box>

      {/* Messages */}
      {messages.map((message, index) => (
        <FloatingMessage
          key={message.id}
          message={message}
          index={index}
          isVisible={isVisible}
        />
      ))}

      {/* Input Interface */}
      <Html
        position={[0, -2.5, 0.2]}
        distanceFactor={8}
        center
      >
        <div className="bg-black/80 p-4 rounded-lg backdrop-blur-md border border-blue-500/30">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="bg-white/10 text-white px-3 py-2 rounded border border-white/20 w-64 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </Html>

      {/* Title */}
      <Html
        position={[0, 3.5, 0.2]}
        center
        distanceFactor={10}
      >
        <TextReveal>Spatial Chat System</TextReveal>
      </Html>
    </group>
  );
};
