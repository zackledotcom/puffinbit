/**
 * Real Assistant UI with inline basic styling and working API
 */

import React from 'react'
import { AssistantRuntimeProvider, ThreadPrimitive, ComposerPrimitive } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/react-ai-sdk'

// Create a mock API that actually responds
const mockAPI = async (url: string, options: RequestInit) => {
  if (!options.body) {
    return new Response(JSON.stringify({ error: 'No body' }), { status: 400 })
  }

  const request = JSON.parse(options.body as string)
  const userMessage = request.messages[request.messages.length - 1]?.content || 'Hello'

  // Mock response
  const response = {
    choices: [{
      message: {
        role: 'assistant',
        content: `Echo: ${userMessage}\n\n✅ This is the REAL Assistant UI Thread component!\n\n🎯 Working with @assistant-ui/react library\n\n🔧 Next: Connect to your Ollama backend`
      },
      finish_reason: 'stop'
    }]
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const RealAssistantUI: React.FC = () => {
  const runtime = useChatRuntime({ 
    api: mockAPI
  })
  
  return (
    <div style={{ 
      height: '100%', 
      border: '2px solid #3b82f6', 
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#3b82f6', 
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        🎯 REAL ASSISTANT UI ACTIVE
      </div>
      
      <AssistantRuntimeProvider runtime={runtime}>
        <div style={{ flex: 1, padding: '16px' }}>
          <ThreadPrimitive.Root style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <ThreadPrimitive.Viewport style={{ flex: 1, overflow: 'auto' }}>
              <ThreadPrimitive.Empty>
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  💬 Start a conversation to test the real Assistant UI!
                </div>
              </ThreadPrimitive.Empty>
              <ThreadPrimitive.Messages />
            </ThreadPrimitive.Viewport>
            <ComposerPrimitive.Root style={{ borderTop: '1px solid #ccc', padding: '10px' }}>
              <ComposerPrimitive.Input 
                placeholder="Type your message here..."
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #ccc', 
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}
              />
              <ComposerPrimitive.Send asChild>
                <button style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}>
                  Send Message
                </button>
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.Root>
        </div>
      </AssistantRuntimeProvider>
    </div>
  )
}

export default RealAssistantUI
