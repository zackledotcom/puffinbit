// Quick Integration Test - Add this to test the Canvas
import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Button } from '@/components/ui/button';
import CanvasTest from '@/components/canvas/CanvasTest';

// Add this to your app for testing
const QuickCanvasTest = () => {
  const { canvasOpen, openScratchpad, showAISuggestion } = useCanvasStore();

  const testBasicOpen = () => {
    console.log('🧪 Testing basic canvas open...');
    openScratchpad(`function test() {
  console.log("Canvas is working!");
}`, 'javascript');
  };

  const testAIDiff = () => {
    console.log('🧪 Testing AI diff overlay...');
    const original = 'function hello() { console.log("hi"); }';
    const improved = 'function hello(): void {\n  console.log("Hello, World!");\n}';
    showAISuggestion(original, improved);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <Button onClick={testBasicOpen} className="bg-blue-600 text-white">
        Test Canvas Open
      </Button>
      <Button onClick={testAIDiff} className="bg-green-600 text-white">
        Test AI Diff
      </Button>
      {canvasOpen && (
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
          ✅ Canvas is open!
        </div>
      )}
    </div>
  );
};

export default QuickCanvasTest;