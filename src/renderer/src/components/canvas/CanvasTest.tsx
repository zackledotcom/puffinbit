// Simple Canvas Test Component
import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Button } from '@/components/ui/button';
import { Code, Zap, X } from 'lucide-react';

const CanvasTest: React.FC = () => {
  const { 
    canvasOpen, 
    setCanvasOpen, 
    currentFile, 
    openScratchpad, 
    showDiffOverlay,
    aiSuggestion,
    showAISuggestion,
    hideDiffOverlay,
    acceptAISuggestion 
  } = useCanvasStore();

  const testAutoDetection = () => {
    const testCode = `function hello() {
  console.log("Hello from Canvas!");
  return "test";
}`;
    openScratchpad(testCode, 'javascript');
  };

  const testAISuggestion = () => {
    const original = `function hello() {
  console.log("Hello");
}`;
    const improved = `/**
 * Greets the user with a friendly message
 */
function hello(): string {
  console.log("Hello from Canvas!");
  return "Hello, World!";
}`;
    showAISuggestion(original, improved);
  };

  return (
    <div className="p-6 bg-[#1A1A1A] text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">🧪 Canvas Integration Test</h1>
      
      <div className="space-y-4 max-w-md">
        <div className="bg-[#303030] p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Canvas State</h3>
          <div className="text-sm space-y-1 text-white/70">
            <p>Canvas Open: <span className={canvasOpen ? 'text-green-400' : 'text-red-400'}>{canvasOpen ? 'Yes' : 'No'}</span></p>
            <p>Current File: <span className="text-[#93b3f3]">{currentFile?.path || 'None'}</span></p>
            <p>Diff Overlay: <span className={showDiffOverlay ? 'text-green-400' : 'text-gray-400'}>{showDiffOverlay ? 'Visible' : 'Hidden'}</span></p>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={testAutoDetection}
            className="w-full bg-[#93b3f3] hover:bg-[#7da3f3] text-black flex items-center gap-2"
          >
            <Code size={16} />
            Test Canvas Opening
          </Button>

          <Button 
            onClick={testAISuggestion}
            className="w-full bg-green-600 hover:bg-green-500 text-white flex items-center gap-2"
          >
            <Zap size={16} />
            Test AI Diff Overlay
          </Button>

          {canvasOpen && (
            <Button 
              onClick={() => setCanvasOpen(false)}
              variant="outline"
              className="w-full border-red-400 text-red-400 hover:bg-red-500/10 flex items-center gap-2"
            >
              <X size={16} />
              Close Canvas
            </Button>
          )}

          {showDiffOverlay && (
            <div className="space-y-2">
              <Button 
                onClick={acceptAISuggestion}
                className="w-full bg-green-600 hover:bg-green-500 text-white"
              >
                Accept AI Suggestion
              </Button>
              <Button 
                onClick={hideDiffOverlay}
                variant="outline"
                className="w-full"
              >
                Hide Diff Overlay
              </Button>
            </div>
          )}
        </div>

        <div className="bg-[#232c3d] p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Integration Status</h3>
          <div className="text-sm space-y-1 text-white/70">
            ✅ Canvas Store Connected<br/>
            ✅ State Management Working<br/>
            ✅ Auto-detection Logic<br/>
            ✅ AI Diff Overlay<br/>
            ⚠️ Monaco Editor (requires CanvasPanel)<br/>
            ⚠️ Chat Integration (coming soon)
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasTest;