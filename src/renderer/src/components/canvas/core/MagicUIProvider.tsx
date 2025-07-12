import React, { createContext, useContext, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MagicUIContextType {
  addEffect: (id: string, effect: EffectType) => void;
  removeEffect: (id: string) => void;
  triggerAnimation: (target: string, animation: AnimationType) => void;
  effects: Map<string, EffectType>;
}

interface EffectType {
  type: 'beam' | 'particles' | 'sparkles' | 'aurora';
  source: [number, number, number];
  target: [number, number, number];
  color: string;
  duration: number;
}

interface AnimationType {
  type: 'fadeIn' | 'slideUp' | 'bounce' | 'scale';
  duration: number;
  delay?: number;
}

const MagicUIContext = createContext<MagicUIContextType | null>(null);

export const useMagicUI = () => {
  const context = useContext(MagicUIContext);
  if (!context) {
    throw new Error('useMagicUI must be used within MagicUIProvider');
  }
  return context;
};

interface MagicUIProviderProps {
  children: React.ReactNode;
}

export const MagicUIProvider: React.FC<MagicUIProviderProps> = ({ children }) => {
  const [effects, setEffects] = useState<Map<string, EffectType>>(new Map());
  const animationRefs = useRef<Map<string, any>>(new Map());

  const addEffect = (id: string, effect: EffectType) => {
    setEffects(prev => new Map(prev).set(id, effect));
  };

  const removeEffect = (id: string) => {
    setEffects(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const triggerAnimation = (target: string, animation: AnimationType) => {
    const ref = animationRefs.current.get(target);
    if (ref?.current) {
      // Trigger framer-motion animation
      ref.current.animate(getAnimationVariants(animation));
    }
  };

  const getAnimationVariants = (animation: AnimationType) => {
    switch (animation.type) {
      case 'fadeIn':
        return { opacity: [0, 1], transition: { duration: animation.duration } };
      case 'slideUp':
        return { y: [20, 0], opacity: [0, 1], transition: { duration: animation.duration } };
      case 'bounce':
        return { 
          scale: [1, 1.2, 1], 
          transition: { duration: animation.duration, repeat: 2 } 
        };
      case 'scale':
        return { scale: [0.8, 1], transition: { duration: animation.duration } };
      default:
        return {};
    }
  };

  const contextValue: MagicUIContextType = {
    addEffect,
    removeEffect,
    triggerAnimation,
    effects,
  };

  return (
    <MagicUIContext.Provider value={contextValue}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full h-full"
      >
        {children}
      </motion.div>
    </MagicUIContext.Provider>
  );
};
