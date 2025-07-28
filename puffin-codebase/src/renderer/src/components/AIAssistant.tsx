import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import {
  Lightning,
  ArrowClockwise,
  Trash,
  Download,
  Robot,
  User,
  Brain,
  Terminal,
  Sparkle,
  Activity,
  Settings
} from 'phosphor-react'
import { useAllServices, useStreamingChatService } from '../hooks/useServices'
import AgentManagementPanel from './agents/AgentManagementPanel'
import SystemHealthMonitor from './diagnostics/SystemHealthMonitor'

interface Message {
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  memoryContext?: any
  isStreaming?: boolean
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'agents' | 'health' | 'settings'>('chat')
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [agentMode, setAgentMode] = useState('manual')
  const [streamingEnabled, setStreamingEnabled] = useState(false)

  const { ollama, chroma, chat, memory, allServicesConnected } = useAllServices()

  const streamingChat = useStreamingChatService()

  useEffect(() => {
    if (allServicesConnected) {
      memory.loadMemoryStore()
    }
  }, [allServicesConnected, memory])

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || chat.isThinking || streamingChat.isStreaming) return

    const userMessage: Message = {
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    const messageContent = currentMessage.trim()
    setCurrentMessage('')

    const selectedModel = ollama.models[0] || 'tinydolphin:latest'

    try {
      if (streamingEnabled) {
        // Use streaming chat
        const streamingMessage: Message = {
          type: 'ai',
          content: '',
          timestamp: new Date(),
          isStreaming: true
        }
        setMessages((prev) => [...prev, streamingMessage])

        await streamingChat.startStreamingChat(
          messageContent,
          selectedModel,
          (chunk) => {
            setMessages((prev) =>
              prev.map((msg, index) =>
                index === prev.length - 1 && msg.isStreaming
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            )
          },
          (fullText) => {
            setMessages((prev) =>
              prev.map((msg, index) =>
                index === prev.length - 1 && msg.isStreaming
                  ? { ...msg, content: fullText, isStreaming: false }
                  : msg
              )
            )
          },
          (error) => {
            console.error('Streaming error:', error)
            setMessages((prev) =>
              prev.map((msg, index) =>
                index === prev.length - 1 && msg.isStreaming
                  ? { ...msg, content: `Error: ${error}`, isStreaming: false }
                  : msg
              )
            )
          }
        )
      } else {
        // Use regular memory-enhanced chat
        const response = await chat.sendMessage(messageContent, selectedModel, messages, {
          mode: agentMode,
          memoryOptions: {
            enabled: memoryEnabled,
            contextLength: 3,
            smartFilter: true,
            debugMode: false
          }
        })

        if (response.success) {
          const aiMessage: Message = {
            type: 'ai',
            content: response.message,
            timestamp: new Date(),
            memoryContext: response.memoryContext
          }
          setMessages((prev) => [...prev, aiMessage])

          // Create memory summary for long conversations
          if (messages.length > 0 && messages.length % 10 === 0) {
            try {
              await memory.createMemorySummary(messages.slice(-10))
            } catch (error) {
              console.warn('Failed to create memory summary:', error)
            }
          }
        } else {
          const errorMessage: Message = {
            type: 'ai',
            content: response.error || 'Sorry, I encountered an error processing your request.',
            timestamp: new Date()
          }
          setMessages((prev) => [...prev, errorMessage])
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain size={28} className="text-blue-600" />
            Puffer AI Assistant
          </h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${ollama.status.connected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-sm font-medium">Ollama</span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${chroma.status.connected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-sm font-medium">ChromaDB</span>
            </div>

            <div className="flex items-center gap-2">
              <Sparkle
                size={16}
                className={`${memoryEnabled ? 'text-purple-600' : 'text-gray-400'}`}
              />
              <span className="text-sm font-medium">Memory</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
          <Button
            variant={activeTab === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('chat')}
            className="flex-1"
          >
            <Brain size={16} className="mr-2" />
            Chat
          </Button>
          <Button
            variant={activeTab === 'agents' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('agents')}
            className="flex-1"
          >
            <Robot size={16} className="mr-2" />
            Agents
          </Button>
          <Button
            variant={activeTab === 'health' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('health')}
            className="flex-1"
          >
            <Activity size={16} className="mr-2" />
            Health
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="flex-1"
          >
            <Settings size={16} className="mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' && (
          <>
            {/* Chat Controls Row - only show for chat tab */}
            <div className="flex items-center gap-4 p-4 bg-white border-b">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Agent Mode:</label>
                <Select value={agentMode} onValueChange={setAgentMode}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="autonomous">Autonomous</SelectItem>
                    <SelectItem value="collaborative">Collaborative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="memory-enabled"
                  checked={memoryEnabled}
                  onChange={(e) => setMemoryEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="memory-enabled" className="text-sm font-medium">
                  Enable Memory
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="streaming-enabled"
                  checked={streamingEnabled}
                  onChange={(e) => setStreamingEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="streaming-enabled" className="text-sm font-medium">
                  Streaming
                </label>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="flex items-center gap-2"
              >
                <Trash size={16} />
                Clear Chat
              </Button>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="max-w-md">
                      <Robot size={64} className="mx-auto mb-4 text-blue-400" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Chat!</h3>
                      <p className="text-gray-500">Ask me anything using the input below.</p>
                      {memoryEnabled && (
                        <p className="text-purple-600 text-sm mt-2 flex items-center justify-center gap-1">
                          <Sparkle size={14} />
                          Memory-enhanced conversations active
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 p-6">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-4 max-w-4xl ${message.type === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {message.type === 'ai' && (
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                              <span className="text-xs font-bold text-white">AI</span>
                            </div>
                          </div>
                        )}

                        <div
                          className={`flex-1 space-y-2 ${message.type === 'user' ? 'text-right' : ''}`}
                        >
                          <div className="max-w-none">
                            <p className="m-0 whitespace-pre-wrap leading-relaxed text-gray-800">
                              {message.content}
                              {message.isStreaming && (
                                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
                              )}
                            </p>
                          </div>
                          <div
                            className={`text-xs flex items-center justify-between ${message.type === 'user' ? 'text-blue-600' : 'text-gray-500'}`}
                          >
                            <span>
                              {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime()) 
                                ? message.timestamp.toLocaleTimeString() 
                                : new Date().toLocaleTimeString()}
                            </span>
                            {message.memoryContext && message.memoryContext.contextUsed && (
                              <div className="flex items-center gap-1">
                                <Sparkle size={12} className="text-purple-500" />
                                <span className="text-xs">
                                  Memory: {message.memoryContext.summariesUsed} contexts
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {message.type === 'user' && (
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-blue-600">
                            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                              <span className="text-xs font-bold text-white">You</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {chat.isThinking && !streamingEnabled && (
                      <div className="flex gap-4 max-w-4xl">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                            <span className="text-xs font-bold text-white">AI</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="bg-white rounded-xl p-4 border border-gray-200 inline-block">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <div
                                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                                style={{ animationDelay: '0.2s' }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                                style={{ animationDelay: '0.4s' }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 bg-white/60 backdrop-blur-sm border-t border-gray-200">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Textarea
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Type your message here... ${memoryEnabled ? '(Memory Enhanced)' : ''}`}
                      className="resize-none bg-white/80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      rows={3}
                      disabled={chat.isThinking || streamingChat.isStreaming}
                    />
                    {memoryEnabled && (
                      <div className="absolute top-2 right-2">
                        <Sparkle size={16} className="text-purple-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        !currentMessage.trim() || chat.isThinking || streamingChat.isStreaming
                      }
                      className="bg-blue-600 hover:bg-blue-700 px-6"
                    >
                      {streamingChat.isStreaming ? 'Streaming...' : 'Send'}
                    </Button>
                    {streamingChat.isStreaming && (
                      <Button
                        onClick={() => streamingChat.stopStreaming()}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 border-red-300"
                      >
                        Stop
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>Model: {ollama.models[0] || 'Not selected'}</span>
                    <span>Mode: {agentMode}</span>
                    {memoryEnabled && (
                      <span className="flex items-center gap-1">
                        <Sparkle size={12} />
                        Memory Active
                      </span>
                    )}
                  </div>
                  {chroma.status.connected && (
                    <span className="text-green-600">Vector DB Connected</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'agents' && (
          <div className="flex-1 p-6">
            <AgentManagementPanel />
          </div>
        )}

        {activeTab === 'health' && (
          <div className="flex-1 p-6">
            <SystemHealthMonitor />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Settings panel coming soon...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIAssistant
