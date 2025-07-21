"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Thread from "@/components/assistant-ui/thread"
import {
  Plus,
  ChevronDown,
  PanelLeft,
  Trash2,
  Settings,
  Sun,
  Moon,
  SlidersHorizontal,
  Upload,
  Monitor,
  Globe,
  ChevronRight,
} from "lucide-react"
import { useChatRuntime } from "@/hooks/use-chat-runtime"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { DotPattern } from "@/components/ui/dot-pattern"

interface Message {
  id: string | number
  type: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  model?: string
  responseTime?: number
}

interface ThreadItem {
  id: string
  title: string
  timestamp: string
  messages: Message[]
}

interface MemoryItem {
  id: string
  title: string
  date: string
}

interface HybridChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  theme: "light" | "dark" | "system"
  onThemeChange: (theme: "light" | "dark" | "system") => void
  onOpenSettings: () => void
  stats?: {
    responseTime?: number
    tokens?: number
    modelLoad?: number
  }
}

const HybridChatInterface: React.FC<HybridChatInterfaceProps> = ({
  selectedModel,
  onModelChange,
  theme,
  onThemeChange,
  onOpenSettings,
  stats,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentThreadId, setCurrentThreadId] = useState("thread-1")
  const [systemHealthPercentage, setSystemHealthPercentage] = useState(80)
  const [modelHealthPercentage, setModelHealthPercentage] = useState(95)

  const availableModels = [
    "llama3.2:latest",
    "qwen2.5:latest",
    "deepseek-coder:latest",
    "phi3.5:latest",
    "tinydolphin:latest",
    "openchat:latest",
  ]

  const [threads, setThreads] = useState<ThreadItem[]>([
    {
      id: "thread-1",
      title: "New conversation",
      timestamp: "Just now",
      messages: [],
    },
    {
      id: "thread-2",
      title: "Project Alpha Brainstorm",
      timestamp: "Yesterday",
      messages: [],
    },
    {
      id: "thread-3",
      title: "Marketing Strategy Q3",
      timestamp: "2 days ago",
      messages: [],
    },
  ])

  const memories: MemoryItem[] = [
    { id: "mem-1", title: "Meeting Notes - 2024-07-15", date: "July 15, 2024" },
    { id: "mem-2", title: "Research on Quantum Computing", date: "July 10, 2024" },
    { id: "mem-3", title: "Code Snippets - React Hooks", date: "June 28, 2024" },
  ]

  const chatApi = useCallback(
    async (url: string, options: RequestInit) => {
      try {
        console.log("🔥 HYBRID: Using Assistant UI with your Puffin backend")
        if (!options.body) {
          throw new Error("Request body required")
        }
        const request = JSON.parse(options.body as string)
        const userMessage = request.messages[request.messages.length - 1]?.content || ""

        const response = await (window as any).api.chatWithAI({
          message: userMessage,
          model: selectedModel,
          history: request.messages.slice(0, -1).map((m: any) => ({ role: m.role, content: m.content })),
          mode: "chat",
        })

        if (response.success) {
          const assistantUIResponse = {
            choices: [
              {
                message: {
                  role: "assistant",
                  content: response.message || response.response || "No response generated",
                },
                finish_reason: "stop",
              },
            ],
          }
          return new Response(JSON.stringify(assistantUIResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        } else {
          throw new Error(response.message || "AI service error")
        }
      } catch (error) {
        console.error("❌ Hybrid API Error:", error)
        return new Response(
          JSON.stringify({
            error: { message: error instanceof Error ? error.message : "Unknown error", type: "api_error" },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        )
      }
    },
    [selectedModel],
  )

  const runtime = useChatRuntime({ api: chatApi })

  const startNewChat = () => {
    const newThread: ThreadItem = {
      id: `thread-${Date.now()}`,
      title: "New conversation",
      timestamp: "Just now",
      messages: [],
    }
    setThreads((prev) => [newThread, ...prev])
    setCurrentThreadId(newThread.id)
  }

  const deleteThread = (threadId: string) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId))
    if (currentThreadId === threadId) {
      const remainingThreads = threads.filter((thread) => thread.id !== threadId)
      if (remainingThreads.length > 0) {
        setCurrentThreadId(remainingThreads[0]?.id)
      } else {
        startNewChat()
      }
    }
  }

  const getModelDisplayName = (model: string) => {
    return model
      .replace(":latest", "")
      .replace("deepseek-coder", "DeepSeek Coder")
      .replace("qwen2.5", "Qwen 2.5")
      .replace("phi3.5", "Phi 3.5")
      .replace("tinydolphin", "TinyDolphin")
      .replace("openchat", "OpenChat")
      .replace("llama3.2", "Llama 3.2")
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white font-inter h-full">
      {/* Background Pattern for entire app */}
      <div className="fixed inset-0 bg-dot-white/[0.2] bg-[size:20px_20px] pointer-events-none" />
      <div className="relative z-10 flex flex-1 min-h-0">
        {/* YOUR EXACT SIDEBAR - ENHANCED */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-72 bg-black border-r border-neutral-800 flex flex-col"
            >
              {/* Sidebar Header with Toggle */}
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="text-lg font-medium text-sidebar-ring">Puffin AI</div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors" // Consistent hover
                  title="Close Sidebar"
                >
                  <PanelLeft size={19} />
                </button>
              </div>
              <div className="p-4">
                <button
                  onClick={startNewChat}
                  className="w-full flex items-center justify-start gap-2 h-11 px-4 rounded-md bg-black text-white border border-neutral-800 hover:border-blue-300/50 hover:bg-neutral-700 transition-colors text-sm mb-4" // Consistent blue border on hover
                >
                  <Plus size={19} />
                  <span>New chat</span>
                </button>
                {/* Model Selector */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">Choose Model</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full flex items-center justify-between h-11 px-3 rounded-md bg-black text-neutral-300 hover:bg-neutral-700 border border-neutral-800 hover:border-blue-300/50 transition-colors">
                        <span className="truncate">{getModelDisplayName(selectedModel)}</span>
                        <ChevronDown size={19} className="text-neutral-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-black border border-neutral-800">
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => onModelChange(model)}
                          className="text-neutral-300 hover:bg-blue-400/30 focus:bg-blue-400/30 text-sm cursor-pointer" // Consistent hover
                        >
                          {getModelDisplayName(model)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {/* Thread List */}
              <ScrollArea className="flex-1 px-3 py-2 bg-black">
                <div className="mb-2 uppercase tracking-wider px-3 text-slate-300 font-black text-sm">Recent Chats</div>
                {threads.map((thread) => (
                  <motion.div
                    key={thread.id}
                    whileHover={{ backgroundColor: "rgb(20, 20, 23)" }}
                    className={cn(
                      "group p-3 rounded-md cursor-pointer mb-1 transition-colors flex items-center justify-between text-white",
                      thread.id === currentThreadId
                        ? "bg-neutral-900 border border-blue-300/50 shadow-md shadow-blue-300/10" // Subtle blue border and shadow
                        : "hover:bg-neutral-900",
                    )}
                  >
                    <div className="flex-1 min-w-0" onClick={() => setCurrentThreadId(thread.id)}>
                      <div className="text-sm truncate text-white">{thread.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">{thread.timestamp}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteThread(thread.id)
                      }}
                      className="group-hover:opacity-100 transition-opacity p-1 h-8 w-8 text-white hover:text-red-400 hover:bg-red-500/20 opacity-50"
                    >
                      <Trash2 size={19} />
                    </Button>
                  </motion.div>
                ))}

                {/* RESTORED: Memories Section */}
                <div className="mt-6 mb-2 uppercase tracking-wider px-3 text-slate-300 font-black text-sm">
                  Memories
                </div>
                {memories.map((memory) => (
                  <motion.div
                    key={memory.id}
                    whileHover={{ backgroundColor: "rgb(20, 20, 23)" }}
                    className="group p-3 rounded-md cursor-pointer mb-1 transition-colors flex items-center justify-between hover:bg-neutral-900"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate text-white">{memory.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">{memory.date}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 text-white hover:text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </motion.div>
                ))}
              </ScrollArea>
              {/* Sidebar Footer with Theme Toggle */}
              <div className="px-4 py-3 border-t border-neutral-900">
                <div className="flex items-center justify-between">
                  <button
                    onClick={onOpenSettings}
                    className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-500 hover:text-neutral-300 transition-colors" // Consistent hover
                    aria-label="Settings"
                  >
                    <Settings size={19} />
                  </button>
                  <div className="flex items-center gap-1 bg-black p-1 rounded-md border border-neutral-800">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => onThemeChange(t)}
                        className={cn(
                          "p-1.5 rounded-md transition-colors text-slate-50",
                          theme === t
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700", // Consistent hover
                        )}
                        aria-label={`${t} theme`}
                      >
                        {t === "light" && <Sun size={19} />}
                        {t === "dark" && <Moon size={19} />}
                        {t === "system" && <Monitor className="text-slate-50" size={19} />}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Stats Display */}
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
        {/* Floating Sidebar Toggle - Visible when sidebar is closed */}
        <AnimatePresence>
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
                size="icon" // Changed to "icon" for consistent h-10 w-10
                onClick={() => setSidebarOpen(true)}
                className="text-white hover:bg-neutral-700 p-1.5 border border-white/30 hover:border-blue-300/50 rounded-full bg-black backdrop-blur" // Changed p-2 to p-1.5
                title="Open Sidebar"
              >
                <PanelLeft size={19} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          {/* Chat Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="h-16 flex-shrink-0 bg-black flex items-center justify-between px-6 border-b border-neutral-800"
          >
            <div className="flex items-center">
              {/* REMOVED: The redundant PanelLeft icon from here */}
              <div className="flex items-center gap-2 bg-neutral-950 text-neutral-200 px-3 py-1.5 rounded-md text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{getModelDisplayName(selectedModel)}</span>
              </div>
              {/* Secondary Settings icon moved outside the model box */}
              <button
                className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors ml-2" // Consistent padding and hover
                title="Model Settings"
              >
                <SlidersHorizontal size={19} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors" // Consistent padding and hover
                title="Export Chat"
              >
                <Upload size={19} />
              </button>
              <button
                className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-700 transition-colors" // Consistent padding and hover
                title="Online Mode"
              >
                <Globe size={19} />
              </button>
            </div>
          </motion.div>

          {/* Chat Messages Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-black">
                {/* DotPattern glow behind messages */}
                <DotPattern
                  width={30}
                  height={30}
                  cx={1.5}
                  cy={1.5}
                  cr={1.5}
                  className={cn(
                    "absolute inset-0 z-0 opacity-25 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]", // Increased opacity and mask size for more glow
                  )}
                />
              </div>
              <div className="relative h-full overflow-y-auto">
                <Thread runtime={runtime} />
              </div>
            </div>
            {/* Health Indicators below input bar, centered */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 px-6 py-2 bg-black text-xs text-neutral-500" // Removed border-t
            >
              {/* System Health Indicator */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="uppercase font-semibold text-blue-400">System Health</span>{" "}
                    {/* Subtle blue tint */}
                    <ChevronRight size={19} className="text-neutral-400" />
                  </div>
                  <div className="relative h-2 w-24 rounded-full border border-neutral-600 bg-neutral-900">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${systemHealthPercentage}%` }}
                    />
                  </div>
                </div>
                <span>{systemHealthPercentage}%</span>
              </div>

              {/* Model Health Indicator */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="uppercase font-semibold text-blue-400">Model Health</span> {/* Subtle blue tint */}
                    <ChevronRight size={19} className="text-neutral-400" />
                  </div>
                  <div className="relative h-2 w-24 rounded-full border border-neutral-600 bg-neutral-900">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-blue-300 transition-all duration-300"
                      style={{ width: `${modelHealthPercentage}%` }}
                    />
                  </div>
                </div>
                <span>{modelHealthPercentage}%</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HybridChatInterface
