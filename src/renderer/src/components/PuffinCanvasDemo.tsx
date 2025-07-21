import React, { useState } from 'react';
import { CanvasPanel } from './canvas';

const PuffinCanvasDemo: React.FC = () => {
  // This demo is deprecated - use the integrated CanvasPanel in OptimizedChatInterface instead

  return (
    <div className="w-full h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Canvas Demo Deprecated</h1>
        <p className="text-muted-foreground">
          The Canvas is now integrated directly into the chat interface.
          <br />
          Use the Code button in the chat input to access Canvas Mode.
        </p>
      </div>
    </div>
  );
};

export default PuffinCanvasDemo;
