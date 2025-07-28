"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ChevronDown, PanelLeft, Trash2, Settings, Sun, Moon, SlidersHorizontal, Upload, Monitor, Globe, ChevronRight, Code, Square, ArrowUp, BookOpen, Zap, Wifi, WifiOff, PlayCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DotPattern } from "@/components/ui/dot-pattern";
import MessageComponent from "./components/MessageComponent";

const OllamaIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="8" r="3"/>
    <path d="M12 14c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z"/>
    <circle cx="8" cy="6" r="1"/>
    <circle cx="16" cy="6" r="1"/>
  </svg>
);

interface Message {
  id: string | number;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  model?: string;
  responseTime?: number;
  codeOutput?: string;
  codeError?: string;
}

interface ThreadItem {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

interface HybridChatInterfaceProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => Promise<void>;
  stats?: {
    responseTime?: number;
    tokens?: number;
    modelLoad?: number;
  };
}

const HybridChatInterface: React.FC<HybridChatInterfaceProps> = ({
  selectedModel,
  onModelChange,
  messages,
  isLoading,
  onSendMessage,
  stats
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const [isOnline, setIsOnline] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [powerOverlayOpen, setPowerOverlayOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    if (!window.api?.getOllamaModels) {
      console.error('❌ window.api.getOllamaModels is not available!');
      return;
    }
    
    window.api.getOllamaModels().then((response: { success: boolean; models: string[] }) => {
      const models = response.success ? response.models : [];
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(selectedModel)) {
        onModelChange(models[0]);
      }
    }).catch((err) => {
      console.error('❌ Failed to fetch models:', err);
      setAvailableModels([]);
    });

    // Load threads
    window.api.umslGetThread('').then((response: { success: boolean; thread?: any }) => {
      if (response.success && response.thread) {
        setThreads(response.thread.map((t: any) => ({
          id: t.id,
          title: t.metadata?.title || 'New conversation',
          timestamp: new Date(t.metadata?.createdAt || Date.now()).toLocaleString(),
          messages: t.messages || []
        })));
        if (response.thread.length > 0) {
          setCurrentThreadId(response.thread[0].id);
        }
      }
    });
  }, [selectedModel, onModelChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startNewChat = async () => {
    const title = `New conversation ${Date.now()}`;
    const response = await window.api.umslCreateThread(title, { title });
    if (response.success) {
      const newThread: ThreadItem = {
        id: response.threadId,
        title,
        timestamp: new Date().toLocaleString(),
        messages: []
      };
      setThreads((prev) => [newThread, ...prev]);
      setCurrentThreadId(newThread.id);
    }
  };

  const deleteThread = async (threadId: string) => {
    await window.api.umslDeleteThread(threadId);
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
    if (currentThreadId === threadId) {
      const remainingThreads = threads.filter((thread) => thread.id !== threadId);
      if (remainingThreads.length > 0) {
        setCurrentThreadId(remainingThreads[0].id);
      } else {
        setCurrentThreadId(null);
      }
    }
  };

  const getModelDisplayName = (model: string) => {
    return model
      .replace(":latest", "")
      .replace("deepseek-coder", "DeepSeek Coder")
      .replace("qwen2.5", "Qwen 2.5")
      .replace("phi3.5", "Phi 3.5")
      .replace("tinydolphin", "TinyDolphin")
      .replace("openchat", "OpenChat")
      .replace("llama3.2", "Llama 3.2");
  };

  const onThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
  };

  const handleOnlineToggle = async () => {
    try {
      const ollamaStatus = await window.api.checkOllamaStatus();
      const chromaStatus = await window.api.checkChromaStatus();
      const actualOnlineStatus = ollamaStatus.success && chromaStatus.success;
      setIsOnline(actualOnlineStatus);
      console.log('🌐 Online status:', { ollama: ollamaStatus.success, chroma: chromaStatus.success });
    } catch (error) {
      console.error('Failed to check online status:', error);
      setIsOnline(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const content = inputValue.trim();
    setInputValue("");
    if (currentThreadId) {
      await window.api.umslAddToThread(currentThreadId, 'user', content, { model: selectedModel });
    }
    await onSendMessage(content);
  };

  // Tool handler functions
  const handleMemoriesClick = async () => {
    try {
      const memoryStats = await window.api.umslGetMemoryStats();
      console.log('🧠 Memory stats:', memoryStats);
      // TODO: Open memory panel/modal
    } catch (error) {
      console.error('Failed to get memory stats:', error);
    }
  };

  const handleModelSettingsClick = async () => {
    try {
      const modelStats = await window.api.umslGetModelStats();
      const resourceUsage = await window.api.umslGetResourceUsage();
      console.log('⚙️ Model settings:', { modelStats, resourceUsage });
      // TODO: Open model settings panel
    } catch (error) {
      console.error('Failed to get model settings:', error);
    }
  };

  const handleExportChatClick = async () => {
    try {
      const chatData = {
        model: selectedModel,
        messages: messages,
        timestamp: new Date().toISOString(),
        thread: currentThreadId
      };
      
      const result = await window.api.fsSaveFileDialog(
        `chat-${Date.now()}.json`,
        JSON.stringify(chatData, null, 2)
      );
      
      if (result.success) {
        console.log('💾 Chat exported:', result.filePath);
      }
    } catch (error) {
      console.error('Failed to export chat:', error);
    }
  };

  // Power Center handlers
  const handlePerformanceModeToggle = async () => {
    try {
      const metrics = await window.api.getPerformanceMetrics();
      console.log('⚡ Performance metrics:', metrics);
      // TODO: Toggle performance mode based on current state
    } catch (error) {
      console.error('Failed to toggle performance mode:', error);
    }
  };

  const handleGPUAccelerationToggle = async () => {
    try {
      const serviceMetrics = await window.api.getServiceMetrics();
      console.log('🎮 GPU acceleration status:', serviceMetrics);
      // TODO: Toggle GPU acceleration
    } catch (error) {
      console.error('Failed to toggle GPU acceleration:', error);
    }
  };

  const handleAdvancedEditorClick = async () => {
    try {
      // Open modelfile editor - could open a modal or redirect
      console.log('📝 Opening advanced modelfile editor...');
      // TODO: Implement modelfile editor
    } catch (error) {
      console.error('Failed to open advanced editor:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRunCode = async (messageId: string | number, code: string) => {
    try {
      const output = await window.api.execCode({ code, lang: 'js' });
      if (currentThreadId) {
        await window.api.umslAddToThread(currentThreadId, 'system', `Code output: ${output.output || output.error}`);
      }
      await onSendMessage(`Code output: ${output.output || output.error}`);
    } catch (error) {
      const errMsg = `Code error: ${error instanceof Error ? error.message : String(error)}`;
      if (currentThreadId) {
        await window.api.umslAddToThread(currentThreadId, 'system', errMsg);
      }
      await onSendMessage(errMsg);
    }
  };

  const PowerOverlay = () => {
    if (!powerOverlayOpen) return null;
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 z-50"
          onClick={() => setPowerOverlayOpen(false)}
        />
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-full w-[600px] bg-neutral-900/95 border-l border-neutral-800/50 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-between p-6 border-b border-neutral-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Power Center</h2>
                <p className="text-sm text-neutral-400">Performance & Model Creation</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setPowerOverlayOpen(false)}>
              <X size={20} />
            </Button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Performance Settings</h3>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Performance Mode</div>
                      <div className="text-xs text-neutral-400">Optimize for Apple Silicon</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handlePerformanceModeToggle}>Toggle</Button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">GPU Acceleration</div>
                      <div className="text-xs text-neutral-400">Metal Performance Shaders</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleGPUAccelerationToggle}>Toggle</Button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Create Custom Model</h3>
              </div>
              <div className="space-y-3">
                <Button variant="outline" className="w-full text-left" onClick={handleAdvancedEditorClick}>
                  <div className="flex items-center gap-3">
                    <Code size={18} className="text-green-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Advanced Editor</div>
                      <div className="text-xs text-neutral-400">Custom Modelfile creation</div>
                    </div>
                    <ChevronRight size={14} className="text-neutral-500" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white font-inter h-full">
      <div className="fixed inset-0 bg-dot-white/[0.2] bg-[size:20px_20px] pointer-events-none" />
      <div className="relative z-10 flex flex-1 min-h-0">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-72 bg-black border-r border-neutral-800 flex flex-col h-full"
            >
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="text-lg font-medium text-blue-400">Puffin AI</div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} title="Close Sidebar">
                    <PanelLeft size={19} />
                  </Button>
                </div>
              </div>
              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="icon" onClick={startNewChat} title="New Chat" className="bg-[#000000] text-white hover:text-white hover:bg-gradient-to-br hover:from-blue-400 hover:to-blue-600 border-0">
                    <Plus size={19} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleOnlineToggle} title={isOnline ? "Online" : "Offline"} className="text-neutral-400 hover:text-white">
                    {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                  </Button>
                  <div className="flex items-center justify-center text-neutral-400" title="Ollama Running">
                    <OllamaIcon size={16} />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm font-bold text-neutral-400 mb-2 uppercase tracking-wider">Choose Model</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full h-11 text-sm bg-[#000000] border-0 text-white hover:bg-gradient-to-br hover:from-blue-400 hover:to-blue-600 hover:text-white justify-start focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:outline-none transition-all duration-200"
                        style={{ 
                          outline: 'none', 
                          boxShadow: 'none',
                          border: 'none'
                        }}
                      >
                        <span className="truncate text-left">{getModelDisplayName(selectedModel)}</span>
                        <ChevronDown size={19} className="ml-auto" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-black border border-neutral-800">
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => onModelChange(model)}
                          className="text-neutral-300 hover:bg-gradient-to-br hover:from-blue-400 hover:to-blue-600 hover:text-white text-sm justify-start focus:bg-gradient-to-br focus:from-blue-400 focus:to-blue-600 focus:text-white data-[highlighted]:bg-gradient-to-br data-[highlighted]:from-blue-400 data-[highlighted]:to-blue-600 data-[highlighted]:text-white"
                          style={{ outline: 'none', boxShadow: 'none' }}
                        >
                          <span className="text-left">{getModelDisplayName(model)}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="mb-2 uppercase tracking-wider text-slate-300 font-black text-sm">Recent Chats</div>
                  <ScrollArea className="flex-1">
                    {threads.map((thread) => (
                      <motion.div
                        key={thread.id}
                        whileHover={{ backgroundColor: "rgb(20, 20, 23)" }}
                        className={cn(
                          "group p-3 rounded-md cursor-pointer mb-1 transition-colors flex items-center justify-between text-white",
                          thread.id === currentThreadId ? "bg-neutral-900 border border-blue-300/50" : "hover:bg-neutral-900"
                        )}
                      >
                        <div className="flex-1 min-w-0" onClick={() => setCurrentThreadId(thread.id)}>
                          <div className="text-sm truncate text-white">{thread.title}</div>
                          <div className="text-xs text-neutral-500 mt-1">{thread.timestamp}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(thread.id);
                          }}
                          className="opacity-0 group-hover:opacity-60 hover:opacity-100 text-neutral-500 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </motion.div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => console.log("Opening settings...")}>
                    <Settings size={19} />
                  </Button>
                  <div className="flex items-center gap-1 bg-black p-1 rounded-md border border-neutral-800">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <Button
                        key={t}
                        variant="ghost"
                        size="icon"
                        onClick={() => onThemeChange(t)}
                        className={cn(theme === t ? "bg-black text-white" : "text-neutral-500 hover:text-neutral-300")}
                      >
                        {t === "light" && <Sun size={14} />}
                        {t === "dark" && <Moon size={14} />}
                        {t === "system" && <Monitor size={14} />}
                      </Button>
                    ))}
                  </div>
                </div>
                {stats && (
                  <div className="text-xs text-neutral-500 mt-2 space-y-1">
                    {stats.responseTime && <div>Response: {stats.responseTime}ms</div>}
                    {stats.tokens && <div>Tokens: {stats.tokens}</div>}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-2 top-4 z-50"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-white hover:bg-neutral-700 border border-white/30"
              title="Open Sidebar"
            >
              <PanelLeft size={19} />
            </Button>
          </motion.div>
        )}
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="h-16 flex-shrink-0 bg-black flex items-center justify-between px-6 border-b border-neutral-800"
          >
            <div className="flex items-center">
              <Button variant="outline" className="h-11 text-sm">
                <span className="truncate">{getModelDisplayName(selectedModel)}</span>
                <ChevronDown size={19} className="ml-2" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleModelSettingsClick} title="Model Settings">
                <SlidersHorizontal size={19} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleMemoriesClick} title="Memories">
                <BookOpen size={19} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPowerOverlayOpen(true)}
                title="Power Center"
              >
                <Zap size={19} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleExportChatClick} title="Export Chat">
                <Upload size={19} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleOnlineToggle} title="Online Mode">
                <Globe size={19} />
              </Button>
            </div>
          </motion.div>
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-black">
              <DotPattern
                width={30}
                height={30}
                cx={1.5}
                cy={1.5}
                cr={1.5}
                glow={true}
                className="text-white [mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
              />
            </div>
            <ScrollArea className="relative h-full">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-lg">AI</span>
                    </div>
                    <h1 className="text-5xl font-semibold mb-4 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                      How can I help you today?
                    </h1>
                    <div className="text-neutral-500">
                      Start a conversation with {getModelDisplayName(selectedModel)}
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="px-4 py-6 max-w-4xl mx-auto">
                  {messages.map((message, index) => (
                    <MessageComponent
                      key={message.id}
                      message={message}
                      onRunCode={(code) => handleRunCode(message.id, code)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="p-4 pb-2">
            <div className="w-[80%] mx-auto">
              <div className="flex items-end gap-2 p-4 rounded-2xl min-h-[80px] bg-[#000000] hover:border hover:border-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50">
                <div className="flex items-end gap-2 self-end">
                  <Button variant="ghost" size="icon" title="Add Context">
                    <Plus size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" title="Code Mode">
                    <Code size={16} />
                  </Button>
                </div>
                <div className="w-px h-6 bg-neutral-600 self-end" />
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message Puffin..."
                  className="flex-1 resize-none bg-[#000000] border-0 py-2 px-2 min-h-[40px] max-h-[200px] text-white placeholder:text-neutral-500 focus:border focus:border-white focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  size="icon"
                  className={cn(isLoading ? "bg-red-500" : "bg-blue-500 hover:bg-blue-600", "h-8 w-8 rounded-lg self-end")}
                >
                  {isLoading ? <Square size={16} /> : <ArrowUp size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PowerOverlay />
    </div>
  );
};

export default HybridChatInterface;