/**
 * SAFE ASSISTANT UI TEST COMPONENT
 * This component tests Assistant UI integration with your existing Puffin backend
 * without touching your working PremiumChatInterface
 */

import React from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/react-ai-sdk'
import { Thread } from '@/components/assistant-ui/thread'

interface AssistantUITestProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

const AssistantUITest: React.FC<AssistantUITestProps> = ({ 
  selectedModel, 
  onModelChange 
}) => {
  console.log('🧪 Testing Assistant UI with model:', selectedModel)

  // Create a runtime that uses your existing Puffin API
  const runtime = useChatRuntime({
    api: async (url, options) => {
      try {
        console.log('🔌 Assistant UI making API call...')
        
        if (!options.body) {
          throw new Error('Request body required')
        }

        const request = JSON.parse(options.body as string)
        console.log('📤 Request:', request)
        
        // Extract the user message from Assistant UI format
        const userMessage = request.messages[request.messages.length - 1]?.content || ''
        console.log('💬 User message:', userMessage)
        
        // Call your REAL Puffin API (same as PremiumChatInterface uses)
        const response = await window.api.chatWithAI({
          message: userMessage,
          model: selectedModel,
          history: request.messages.slice(0, -1).map((m: any) => ({ 
            role: m.role, 
            content: m.content 
          })),
          mode: 'chat'
        })
        
        console.log('📥 Puffin API response:', response)
        
        if (response.success) {
          // Convert Puffin response to Assistant UI format
          const assistantUIResponse = {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: response.message || response.response || 'No response generated'
                },
                finish_reason: 'stop'
              }
            ]
          }
          
          console.log('✅ Converted to Assistant UI format:', assistantUIResponse)
          
          return new Response(JSON.stringify(assistantUIResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        } else {
          throw new Error(response.message || 'AI service error')
        }
      } catch (error) {
        console.error('❌ Assistant UI API Error:', error)
        
        return new Response(JSON.stringify({
          error: { 
            message: error instanceof Error ? error.message : 'Unknown error', 
            type: 'api_error' 
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  })

  return (
    <div className="h-full flex flex-col bg-black text-white">
      {/* Test Header */}
      <div className="bg-blue-600 text-white p-3 text-center">
        <h2 className="text-lg font-semibold">🧪 Assistant UI Test Mode</h2>
        <p className="text-sm opacity-90">Testing with {selectedModel}</p>
        <p className="text-xs opacity-75">Using your existing Puffin backend</p>
      </div>
      
      {/* Assistant UI Runtime */}
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex-1 min-h-0">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    </div>
  )
}

export default AssistantUITest
