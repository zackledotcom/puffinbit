/**
 * Real Assistant UI Integration for Puffer
 * 
 * This is the actual 5-line solution using @assistant-ui/react
 */

import React from 'react'
import { AssistantRuntimeProvider, ThreadPrimitive, ComposerPrimitive } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/react-ai-sdk'

interface PufferAssistantUIProps {
  className?: string
  showControls?: boolean
}

// Create a simple API endpoint that works with Puffer
const createPufferAPI = async (url: string, options: RequestInit) => {
  if (!options.body) {
    throw new Error('Request body required')
  }

  try {
    const request = JSON.parse(options.body as string)
    
    // Extract the user message
    const userMessage = request.messages[request.messages.length - 1]?.content || ''
    
    // Simulate calling Puffer's backend (for now, just echo back)
    const response = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: `Echo from Puffer: ${userMessage}\n\nThis is the real Assistant UI interface! 🎉\n\nNext steps:\n1. Connect to your Ollama service\n2. Integrate ChromaDB memory\n3. Add agent capabilities`
          },
          finish_reason: 'stop'
        }
      ]
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: { message: error.message || 'API Error', type: 'api_error' }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export const PufferAssistantUI: React.FC<PufferAssistantUIProps> = ({ 
  className,
  showControls = false 
}) => {
  // The magic 5-line solution (enhanced for Puffer)
  const runtime = useChatRuntime({
    api: createPufferAPI
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className={className}>
        {showControls && (
          <div className="p-4 bg-blue-50 border-b text-center">
            <p className="text-blue-800 font-medium">🎯 Real Assistant UI Active</p>
            <p className="text-blue-600 text-sm">Powered by @assistant-ui/react</p>
          </div>
        )}
        
        {/* The real Assistant UI Thread */}
        <ThreadPrimitive.Root className="h-full flex flex-col">
          <ThreadPrimitive.Viewport className="flex-1 p-4">
            <ThreadPrimitive.Empty>
              <div className="text-center py-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  ✨ Assistant UI Integration
                </h2>
                <p className="text-gray-600">
                  This is the real @assistant-ui/react interface!
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Start a conversation to test the integration.
                </p>
              </div>
            </ThreadPrimitive.Empty>
            
            <ThreadPrimitive.Messages />
          </ThreadPrimitive.Viewport>
          
          {/* Input area */}
          <div className="border-t p-4">
            <ComposerPrimitive.Root className="flex gap-2">
              <ComposerPrimitive.Input 
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ComposerPrimitive.Send asChild>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Send
                </button>
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </div>
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  )
}

export const PufferAssistantUIWithControls: React.FC<PufferAssistantUIProps> = (props) => {
  return <PufferAssistantUI {...props} showControls={true} />
}

export default PufferAssistantUI
