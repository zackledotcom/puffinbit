import React from 'react'
import PremiumChatInterface from './PremiumChatInterface'
import { Message } from '../../../types/chat'

interface ChatIntegrationProps {
  // Existing Puffin props
  selectedModel: string
  onModelChange: (model: string) => void
  messages: Message[]
  isLoading: boolean
  onSendMessage: (content: string) => Promise<void>
  stats?: {
    responseTime: number
    tokens: number
    modelLoad: number
  }
}

/**
 * Integration wrapper for the Premium Chat Interface
 * This component bridges the existing Puffin app with the new Magic UI enhanced interface
 */
export default function ChatIntegration({
  selectedModel,
  onModelChange,
  messages,
  isLoading,
  onSendMessage,
  stats
}: ChatIntegrationProps) {
  return (
    <PremiumChatInterface
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      messages={messages}
      isLoading={isLoading}
      onSendMessage={onSendMessage}
      stats={stats}
    />
  )
}

// Export types for TypeScript
export type { ChatIntegrationProps }
