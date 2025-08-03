/**
 * Integrated Browser Chat Component
 * Combines Electron browser with AI chat for context-aware conversations
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Robot, 
  User, 
  Globe, 
  Lightning, 
  Copy, 
  Check,
  SplitHorizontal,
  Maximize,
  Minimize
} from 'phosphor-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import ElectronBrowser from './ElectronBrowser';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasContext?: boolean;
  contextUrl?: string;
}

interface BrowserChatProps {
  onClose?: () => void;
  initialUrl?: string;
  className?: string;
}

const BrowserChat: React.FC<BrowserChatProps> = ({
  onClose,
  initialUrl = 'https://www.google.com',
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "I'm your AI browsing assistant! Navigate to any webpage on the right, click the lightning bolt to extract context, and I'll help you understand and discuss the content.",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedContext, setExtractedContext] = useState('');
  const [contextCopied, setContextCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState('');
  const [splitRatio, setSplitRatio] = useState(50);
  const [browserMaximized, setBrowserMaximized] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle context extraction from browser
  const handleContextExtracted = useCallback((context: string) => {
    setExtractedContext(context);
    
    // Add context notification message
    const contextMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `I've extracted context from **${pageTitle || currentUrl}**. You can now ask me questions about the page content, and I'll use this context to provide informed responses.`,
      timestamp: new Date(),
      hasContext: true,
      contextUrl: currentUrl
    };
    
    setMessages(prev => [...prev, contextMessage]);
  }, [pageTitle, currentUrl]);

  // Handle browser navigation
  const handleBrowserNavigate = useCallback((url: string, title: string) => {
    setCurrentUrl(url);
    setPageTitle(title);
    // Clear context when navigating to new page
    setExtractedContext('');
  }, []);

  // Send message to AI
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare context for AI if available
      let fullPrompt = inputMessage;
      if (extractedContext) {
        fullPrompt = `Based on this webpage context:\n\n${extractedContext}\n\nUser question: ${inputMessage}`;
      }

      // Call AI service through IPC
      const response = await window.api.invoke('chat-with-ai', {
        message: fullPrompt,
        model: 'tinydolphin:latest', // Default model
        history: messages.slice(-6).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        memoryOptions: {
          enabled: true,
          searchLimit: 3
        }
      });

      if (response.success && response.message) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          hasContext: !!extractedContext,
          contextUrl: extractedContext ? currentUrl : undefined
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.error || 'Failed to get AI response');
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, extractedContext, currentUrl, messages]);

  // Copy context to input
  const copyContextToInput = useCallback(() => {
    if (extractedContext && inputRef.current) {
      const contextPrompt = `Analyze this webpage content and tell me about: `;
      setInputMessage(contextPrompt);
      inputRef.current.focus();
      setContextCopied(true);
      setTimeout(() => setContextCopied(false), 2000);
    }
  }, [extractedContext]);

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Split panel resizing
  const handleSplitResize = (e: React.MouseEvent) => {
    if (browserMaximized) return;
    
    const startX = e.clientX;
    const startRatio = splitRatio;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const containerWidth = window.innerWidth;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newRatio = Math.max(20, Math.min(80, startRatio + deltaPercent));
      setSplitRatio(newRatio);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Toggle browser maximize
  const toggleBrowserMaximize = () => {
    setBrowserMaximized(!browserMaximized);
  };

  return (
    <TooltipProvider>
      <div className={`h-screen w-full bg-gray-50 flex flex-col ${className}`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <Robot className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">AI Browser Assistant</h1>
              <p className="text-xs text-gray-500">Browse the web with AI-powered insights</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {extractedContext && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Context Ready
              </Badge>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleBrowserMaximize}
                >
                  {browserMaximized ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {browserMaximized ? 'Show split view' : 'Maximize browser'}
              </TooltipContent>
            </Tooltip>
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Chat Panel */}
          <AnimatePresence>
            {!browserMaximized && (
              <motion.div
                initial={{ width: `${splitRatio}%` }}
                animate={{ width: `${splitRatio}%` }}
                exit={{ width: 0 }}
                className="bg-white border-r border-gray-200 flex flex-col"
              >
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Robot className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-800">AI Assistant</span>
                    </div>
                    
                    {extractedContext && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyContextToInput}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            {contextCopied ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy context prompt to input</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex space-x-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Robot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                        <div
                          className={`rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.hasContext && message.contextUrl && (
                            <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-30">
                              <div className="flex items-center space-x-1 text-xs opacity-75">
                                <Globe className="w-3 h-3" />
                                <span>Context from: {new URL(message.contextUrl).hostname}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Robot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-gray-400/60 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-gray-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-1 bg-gray-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex space-x-2">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={extractedContext ? "Ask me about the webpage..." : "Browse to a page and extract context to start..."}
                      className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={2}
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resize Handle */}
          {!browserMaximized && (
            <div
              className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize flex items-center justify-center"
              onMouseDown={handleSplitResize}
            >
              <div className="w-0.5 h-8 bg-gray-500 rounded-full" />
            </div>
          )}

          {/* Browser Panel */}
          <motion.div
            initial={{ width: browserMaximized ? '100%' : `${100 - splitRatio}%` }}
            animate={{ width: browserMaximized ? '100%' : `${100 - splitRatio}%` }}
            className="bg-white"
          >
            <ElectronBrowser
              initialUrl={initialUrl}
              onContextExtracted={handleContextExtracted}
              onNavigate={handleBrowserNavigate}
              className="h-full"
            />
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BrowserChat;