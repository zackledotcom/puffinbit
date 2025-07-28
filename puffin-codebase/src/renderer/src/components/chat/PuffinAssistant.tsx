import React from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/react-ai-sdk'
import { Thread } from '../assistant-ui/thread'

interface PuffinAssistantProps {
  selectedModel: string
}

const PuffinAssistant: React.FC<PuffinAssistantProps> = ({ selectedModel }) => {
  // Create a custom API endpoint that bridges to Puffin's existing chatWithAI
  const runtime = useChatRuntime({
    api: async ({ messages }) => {
      try {
        // Get the last user message
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage || lastMessage.role !== 'user') {
          throw new Error('No user message found')
        }

        // Call existing Puffin API
        const response = await window.api?.chatWithAI?.({
          message: lastMessage.content,
          model: selectedModel,
          history: messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          mode: 'chat'
        })

        if (response?.success) {
          // Return in the format expected by useChatRuntime
          return new Response(JSON.stringify({
            choices: [{
              message: {
                role: 'assistant',
                content: response.message || response.response || 'No response generated'
              }
            }]
          }), {
            headers: { 'Content-Type': 'application/json' }
          })
        } else {
          throw new Error(response?.message || 'AI service error')
        }
      } catch (error) {
        console.error('Puffin API error:', error)
        // Return error as assistant message
        return new Response(JSON.stringify({
          choices: [{
            message: {
              role: 'assistant', 
              content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure your AI services are running.`
            }
          }]
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  )
}

export default PuffinAssistant