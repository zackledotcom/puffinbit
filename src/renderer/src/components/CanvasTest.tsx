// CanvasTest.tsx - Test Canvas functionality
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCanvasModeStore } from '@/stores/useCanvasModeStore'
import { detectCodeInMessage, shouldSuggestCanvas } from '@/utils/codeDetection'

export default function CanvasTest() {
  const [testMessage, setTestMessage] = useState(`function greet(name: string) {
  console.log(\`Hello, \${name}!\`)
  return \`Welcome \${name}\`
}

const user = "Puffin"
greet(user)`)

  const { canvasMode, setCanvasMode, autoTriggerEnabled, autoTriggerThreshold } = useCanvasModeStore()

  const testCodeDetection = () => {
    console.log('🧪 TESTING CODE DETECTION')
    const detected = detectCodeInMessage(testMessage)
    const shouldTrigger = shouldSuggestCanvas(testMessage)
    
    console.log('Results:', {
      detected: detected.length,
      shouldTrigger,
      confidence: detected[0]?.confidence,
      threshold: autoTriggerThreshold
    })
  }

  const testManualTrigger = () => {
    console.log('🧪 TESTING MANUAL TRIGGER')
    setCanvasMode(!canvasMode, {
      type: 'manual',
      reason: 'Manual test trigger'
    })
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">🧪 Canvas Test Panel</h2>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Canvas Status:</label>
        <div className="text-lg">
          {canvasMode ? '✅ Canvas ACTIVE' : '❌ Canvas INACTIVE'}
        </div>
        <div className="text-sm text-gray-600">
          Auto-trigger: {autoTriggerEnabled ? 'ON' : 'OFF'} | 
          Threshold: {(autoTriggerThreshold * 100).toFixed(0)}%
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Test Message (edit to test auto-trigger):</label>
        <Textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          rows={8}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={testCodeDetection}>
          🔍 Test Code Detection
        </Button>
        <Button onClick={testManualTrigger}>
          🎨 Toggle Canvas Manually
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        Check the browser console for detailed logs
      </div>
    </div>
  )
}
