import React, { useState } from 'react';
import { PuffinCanvas3D, CanvasMessage } from './canvas';

const PuffinCanvasDemo: React.FC = () => {
  const [messages, setMessages] = useState<CanvasMessage[]>([
    {
      id: '1',
      type: 'user',
      content: 'Hello! Welcome to the enhanced Puffin Canvas 3D experience.',
      timestamp: new Date(),
      position: [0, 1, 0],
    },
    {
      id: '2',
      type: 'ai',
      content: 'Welcome to the future of development! This 3D canvas is 10x better than Pelicanos with Magic UI integration.',
      timestamp: new Date(),
      position: [0, 2.5, 0],
    },
    {
      id: '3',
      type: 'system',
      content: 'System initialized. Ready for spatial computing interactions.',
      timestamp: new Date(),
      position: [0, 4, 0],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = (content: string) => {
    const newMessage: CanvasMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date(),
      position: [Math.random() * 4 - 2, messages.length * 1.5, Math.random() * 2 - 1],
    };

    setMessages(prev => [...prev, newMessage]);
    
    // Simulate AI response
    setIsLoading(true);
    setTimeout(() => {
      const aiResponse: CanvasMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `Processing your request: "${content}". This is a spatial response in 3D space!`,
        timestamp: new Date(),
        position: [Math.random() * 4 - 2, (messages.length + 1) * 1.5, Math.random() * 2 - 1],
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Puffin Canvas 3D</h1>
            <p className="text-white/70 text-sm">Enhanced 3D Development Environment</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white/70 text-sm">
              Messages: {messages.length}
            </div>
            <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
          </div>
        </div>
      </div>

      {/* Enhanced Canvas */}
      <div className="pt-20 h-full">
        <PuffinCanvas3D
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          selectedModel="GPT-4"
          className="w-full h-full"
        />
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-t border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="text-white/70 text-sm">
            🚀 Enhanced with Magic UI • React Three Fiber • Spatial Computing
          </div>
          <div className="text-white/70 text-sm">
            10x Better than Pelicanos • Built with ❤️ for Puffin
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuffinCanvasDemo;
