// src/renderer/src/components/CanvasLayout.tsx
import React, { useState, useEffect } from 'react'
import ChatMessageList from './chat/components/ChatMessageList'
import InputBar from './chat/InputBar'

// Temporarily commented out Monaco Editor to test basic layout
// import Editor, { OnChange } from '@monaco-editor/react'

// Props for passing chat state and send-handler
export interface CanvasLayoutProps {
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  isLoading?: boolean
  selectedModel?: string
}

// Define ChatMessage interface for this component
interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  model?: string
}

// Two-pane split: chat on left, simple editor on right
export default function CanvasLayout(props: CanvasLayoutProps) {
  const { messages, onSendMessage, isLoading = false, selectedModel = 'tinydolphin' } = props
  const [code, setCode] = useState(
    '// Start coding here\nconsole.log("Hello from Puffer Canvas!");'
  )
  const [inputValue, setInputValue] = useState('')

  console.log('CanvasLayout rendered with', { messages: messages.length, isLoading, selectedModel })

  const handleRun = () => {
    console.log('Running code:', code)
    if (window.electronAPI?.executeCode) {
      window.electronAPI.executeCode(code)
    } else {
      // Fallback for local execution
      try {
        const result = new Function(
          'console',
          `
          const logs = [];
          const mockConsole = {
            log: (...args) => logs.push('LOG: ' + args.join(' ')),
            error: (...args) => logs.push('ERROR: ' + args.join(' ')),
            warn: (...args) => logs.push('WARN: ' + args.join(' '))
          };
          ${code}
          return logs.join('\\n') || 'Code executed successfully (no output)';
        `
        )(console)
        onSendMessage(`Local Execution:\n\`\`\`\n${result}\n\`\`\``)
      } catch (error) {
        onSendMessage(
          `Execution Error:\n\`\`\`\n${error instanceof Error ? error.message : 'Unknown error'}\n\`\`\``
        )
      }
    }
  }

  const handleSendChat = (message: string) => {
    setInputValue('')
    onSendMessage(message)
  }

  return (
    <div className="h-full flex bg-blue-50">
      <div className="absolute top-2 left-2 bg-green-500 text-white p-2 rounded z-50">
        CANVAS MODE ACTIVE
      </div>

      {/* Left pane: Chat */}
      <div className="w-1/2 flex flex-col border-r-4 border-red-500 bg-white">
        <div className="bg-blue-500 text-white p-2 text-center">CHAT PANE</div>
        <div className="flex-1 overflow-hidden">
          <ChatMessageList
            messages={messages}
            onMessageCorrection={() => {}}
            onMessageReaction={() => {}}
            isThinking={isLoading}
          />
        </div>
        <div className="border-t border-gray-200 p-4">
          <InputBar
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendChat}
            isLoading={isLoading}
            placeholder={`Message ${selectedModel.replace(':latest', '')}...`}
          />
        </div>
      </div>

      {/* Right pane: Simple text editor for now */}
      <div className="w-1/2 flex flex-col bg-gray-900">
        <div className="bg-purple-500 text-white p-2 text-center">CODE EDITOR PANE</div>
        <div className="flex-1 p-4">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full bg-gray-800 text-green-400 font-mono text-sm p-4 border-0 resize-none"
            placeholder="// Write your code here"
          />
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-800 flex justify-between items-center">
          <div className="text-sm text-gray-300">Simple Editor • Will be Monaco</div>
          <button
            onClick={handleRun}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>
    </div>
  )
}
