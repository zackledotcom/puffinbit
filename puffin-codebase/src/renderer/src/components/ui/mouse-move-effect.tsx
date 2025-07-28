import React, { useEffect, useState } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

const MouseMoveEffect: React.FC = () => {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div
        className="absolute h-56 w-56 bg-red-500/10 rounded-full blur-3xl transition-all duration-300 ease-out"
        style={{
          left: mousePosition.x - 112, // Center the 224px (w-56) circle
          top: mousePosition.y - 112,
          transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
        }}
      />
    </div>
  );
};

export default MouseMoveEffect;
