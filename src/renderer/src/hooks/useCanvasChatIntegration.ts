// src/renderer/src/hooks/useCanvasChatIntegration.ts
import { useEffect, useCallback, useRef, useState } from 'react'
import { useCanvasModeStore } from '@/stores/useCanvasModeStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { detectCodeInMessage, shouldSuggestCanvas, getBestCodeSuggestion } from '@/utils/codeDetection'

interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  model?: string
  canvasContext?: any
}

interface CanvasIntegrationOptions {
  enableAutoTrigger: boolean
  enableContextSharing: boolean
  enableCodeSuggestions: boolean
  securityLevel: 'strict' | 'standard' | 'permissive'
}

/**
 * Canvas-Chat Integration Hook
 * Provides bidirectional integration between chat and Canvas mode
 * Handles auto-triggering, context sharing, and code suggestions
 */
export const useCanvasChatIntegration = (
  messages: ChatMessage[],
  onAddMessage: (message: ChatMessage) => void,
  options: CanvasIntegrationOptions = {
    enableAutoTrigger: true,
    enableContextSharing: true, 
    enableCodeSuggestions: true,
    securityLevel: 'standard'
  }
) => {
  const { 
    canvasMode, 
    autoTriggerEnabled, 
    autoTriggerThreshold,
    bidirectionalSync,
    setCanvasMode,
    addTrigger 
  } = useCanvasModeStore()
  
  const canvasFiles = useCanvasStore(state => state.fileTree || [])
  const lastProcessedMessageRef = useRef<string | null>(null)

  // Auto-trigger system for Canvas mode based on chat events
  const analyzeMessageForCanvasTrigger = useCallback((
    messageContent: string, 
    messageId: string,
    userInitiated: boolean = true
  ) => {
    console.log('🎨 Canvas auto-trigger analysis:', {
      autoTriggerEnabled,
      canvasMode,
      messageLength: messageContent.length,
      messagePreview: messageContent.substring(0, 50) + '...'
    })
    
    if (!autoTriggerEnabled || canvasMode) {
      console.log('❌ Auto-trigger skipped:', { autoTriggerEnabled, canvasMode })
      return false
    }
    
    const shouldTrigger = shouldSuggestCanvas(messageContent)
    console.log('🔍 Should trigger Canvas?', shouldTrigger)
    
    if (shouldTrigger) {
      const codeBlocks = detectCodeInMessage(messageContent)
      const highestConfidence = Math.max(...codeBlocks.map(c => c.confidence))
      
      console.log('📊 Code analysis:', {
        codeBlocks: codeBlocks.length,
        highestConfidence,
        threshold: autoTriggerThreshold,
        willTrigger: highestConfidence >= autoTriggerThreshold
      })
      
      if (highestConfidence >= autoTriggerThreshold) {
        console.log('🚀 TRIGGERING CANVAS MODE!')
        
        // Add trigger record
        addTrigger({
          type: 'auto',
          reason: `Code detected with ${(highestConfidence * 100).toFixed(0)}% confidence`,
          chatMessageId: messageId,
          codeSnippet: codeBlocks[0]?.code.substring(0, 100) + '...',
          confidence: highestConfidence
        })
        
        // Auto-activate Canvas mode
        setCanvasMode(true, {
          type: 'auto',
          reason: `Auto-triggered by code detection (${(highestConfidence * 100).toFixed(0)}% confidence)`,
          chatMessageId: messageId
        })
        
        return true
      }
    }
    
    return false
  }, [autoTriggerEnabled, canvasMode, autoTriggerThreshold, setCanvasMode, addTrigger])

  // Manual trigger with reason
  const triggerCanvasManually = useCallback((reason: string, context?: any) => {
    addTrigger({
      type: 'manual',
      reason,
      chatMessageId: context?.messageId
    })
    
    setCanvasMode(true, {
      type: 'manual',
      reason
    })
  }, [setCanvasMode, addTrigger])

  // Process new messages for Canvas triggers
  useEffect(() => {
    if (!options.enableAutoTrigger || messages.length === 0) return
    
    const latestMessage = messages[messages.length - 1]
    
    // Skip if already processed or not a user message
    if (latestMessage.id === lastProcessedMessageRef.current || 
        latestMessage.type !== 'user') return
    
    lastProcessedMessageRef.current = latestMessage.id
    
    // Analyze message for code patterns
    const wasTriggered = analyzeMessageForCanvasTrigger(
      latestMessage.content, 
      latestMessage.id,
      true
    )
    
    // If Canvas was auto-triggered, add helpful AI message
    if (wasTriggered) {
      const helpMessage: ChatMessage = {
        id: `canvas_help_${Date.now()}`,
        type: 'ai',
        content: '🎨 I detected code in your message and activated Canvas mode! You can now edit the code side-by-side with our conversation.',
        timestamp: new Date(),
        canvasContext: { autoTriggered: true, originalMessageId: latestMessage.id }
      }
      
      // Delay to allow Canvas to activate smoothly
      setTimeout(() => onAddMessage(helpMessage), 300)
    }
    
  }, [messages, options.enableAutoTrigger, analyzeMessageForCanvasTrigger, onAddMessage])

  // Share Canvas context with chat messages
  const getCanvasContextForChat = useCallback(() => {
    if (!options.enableContextSharing || !canvasMode) return null
    
    return {
      hasActiveFiles: canvasFiles.length > 0,
      fileCount: canvasFiles.length,
      languages: [...new Set(canvasFiles.map(f => f.language || 'unknown'))],
      modifiedFiles: canvasFiles.filter(f => f.modified).length,
      lastModified: canvasFiles.reduce((latest, file) => {
        const fileDate = new Date(file.lastModified || 0)
        return fileDate > latest ? fileDate : latest
      }, new Date(0))
    }
  }, [options.enableContextSharing, canvasMode, canvasFiles])

  // Enhanced message sender with Canvas context
  const sendMessageWithCanvasContext = useCallback((content: string, type: 'user' | 'ai' = 'user') => {
    const canvasContext = getCanvasContextForChat()
    
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
      canvasContext: canvasContext && bidirectionalSync ? canvasContext : undefined
    }
    
    onAddMessage(message)
    
    // Log integration event
    if (canvasContext && bidirectionalSync) {
      console.log('🔄 Message sent with Canvas context:', {
        messageId: message.id,
        contextSummary: canvasContext
      })
    }
    
    return message
  }, [getCanvasContextForChat, bidirectionalSync, onAddMessage])

  // Suggest Canvas activation for code-heavy messages
  const suggestCanvasActivation = useCallback((messageContent: string, messageId: string) => {
    if (!options.enableCodeSuggestions || canvasMode) return false
    
    const suggestion = getBestCodeSuggestion(messageContent)
    
    if (suggestion && suggestion.confidence > 0.5) {
      const suggestionMessage: ChatMessage = {
        id: `suggestion_${Date.now()}`,
        type: 'ai',
        content: `💡 I noticed you're working with ${suggestion.language} code. Would you like me to activate Canvas mode for a better coding experience?`,
        timestamp: new Date(),
        canvasContext: { 
          suggestion: true, 
          detectedLanguage: suggestion.language,
          confidence: suggestion.confidence,
          originalMessageId: messageId
        }
      }
      
      setTimeout(() => onAddMessage(suggestionMessage), 500)
      return true
    }
    
    return false
  }, [options.enableCodeSuggestions, canvasMode, onAddMessage])

  // Manual Canvas activation with context
  const activateCanvasWithCode = useCallback((code: string, language: string, reason: string) => {
    triggerCanvasManually(`Manual activation: ${reason}`, { code, language })
    
    // Add helpful message about activation
    const activationMessage: ChatMessage = {
      id: `activation_${Date.now()}`,
      type: 'ai',
      content: `🎨 Canvas mode activated! I've set up a ${language} file with your code. You can edit it directly while we continue our conversation.`,
      timestamp: new Date(),
      canvasContext: { manualActivation: true, language, reason }
    }
    
    setTimeout(() => onAddMessage(activationMessage), 200)
  }, [triggerCanvasManually, onAddMessage])

  // Canvas safety monitoring
  const monitorCanvasSafety = useCallback(() => {
    if (!canvasMode) return null
    
    const safetyMetrics = {
      securityLevel: options.securityLevel,
      editCount: canvasFiles.filter(f => f.modified).length,
      unsavedChanges: canvasFiles.some(f => f.modified),
      lastActivity: canvasFiles.reduce((latest, file) => {
        const fileDate = new Date(file.lastModified || 0)
        return fileDate > latest ? fileDate : latest
      }, new Date(0))
    }
    
    // Warn about unsaved changes
    if (safetyMetrics.unsavedChanges && options.securityLevel === 'strict') {
      console.warn('⚠️ Canvas has unsaved changes in strict security mode')
    }
    
    return safetyMetrics
  }, [canvasMode, canvasFiles, options.securityLevel])

  return {
    // Core integration
    sendMessageWithCanvasContext,
    getCanvasContextForChat,
    
    // Canvas activation
    suggestCanvasActivation,
    activateCanvasWithCode,
    
    // Monitoring and safety
    monitorCanvasSafety,
    
    // State
    canvasMode,
    isCanvasIntegrationActive: bidirectionalSync,
    
    // Utils
    analyzeMessageForCanvasTrigger,
    triggerCanvasManually
  }
}

// Canvas Security Logger for comprehensive audit trail
export class CanvasSecurityLogger {
  private static logs: Array<{
    timestamp: Date
    operation: string
    userId: string
    details: any
    risk: 'low' | 'medium' | 'high' | 'critical'
  }> = []

  static log(operation: string, details: any, risk: 'low' | 'medium' | 'high' | 'critical' = 'low') {
    const logEntry = {
      timestamp: new Date(),
      operation,
      userId: 'current_user', // TODO: Get from auth system
      details: {
        ...details,
        // Sanitize sensitive content
        content: details.content ? '[CONTENT_SANITIZED]' : undefined
      },
      risk
    }
    
    this.logs.push(logEntry)
    
    // Keep only last 1000 entries
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000)
    }
    
    // Log to console with appropriate level
    const logLevel = risk === 'critical' ? 'error' : risk === 'high' ? 'warn' : 'info'
    console[logLevel](`🔒 Canvas Security [${risk.toUpperCase()}]: ${operation}`, details)
    
    // Send to backend for persistent storage
    if (window.electronAPI?.logSecurityEvent) {
      window.electronAPI.logSecurityEvent(logEntry)
    }
  }

  static getLogs(filter?: { risk?: string; operation?: string; since?: Date }) {
    let filteredLogs = this.logs
    
    if (filter?.risk) {
      filteredLogs = filteredLogs.filter(log => log.risk === filter.risk)
    }
    
    if (filter?.operation) {
      filteredLogs = filteredLogs.filter(log => log.operation.includes(filter.operation))
    }
    
    if (filter?.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since)
    }
    
    return filteredLogs
  }

  static exportLogs() {
    const exportData = {
      generatedAt: new Date().toISOString(),
      totalEntries: this.logs.length,
      logs: this.logs
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `canvas-security-log-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    console.log('📁 Canvas security logs exported')
  }
}
