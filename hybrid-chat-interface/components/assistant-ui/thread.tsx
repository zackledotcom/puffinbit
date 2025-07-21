"use client"

import React from "react"

import { useChat } from "ai/react"
import { BookText, Code, ArrowUpIcon } from "lucide-react"
import DotPattern from "@/components/ui/dot-pattern"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ThreadProps {
  runtime: ReturnType<typeof useChat>
}

export default function Thread({ runtime }: ThreadProps) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: runtime.api,
  })

  const availableContexts = ["General", "Code", "Document", "Analysis", "Creative"]
  const [selectedContext, setSelectedContext] = React.useState("General")

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-4xl font-bold text-blue-300">
            How can I help you?
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[70%] p-3 rounded-lg",
                  m.role === "user" ? "bg-blue-300 text-white" : "bg-neutral-800 text-neutral-200",
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="relative flex-shrink-0 p-4 bg-black">
        {/* DotPattern glow behind input */}
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className={cn(
            "absolute inset-0 z-0 opacity-10 [mask-image:radial-gradient(200px_circle_at_center,white,transparent)]",
          )}
        />
        <form onSubmit={onSubmit} className="relative z-10 flex items-end w-full">
          <div className="relative flex-1">
            {/* Input Textarea - removed stroke, adjusted padding */}
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="w-full min-h-[48px] max-h-[150px] resize-y rounded-md pl-[80px] pr-[60px] py-3 text-white placeholder:text-neutral-500 bg-sidebar-primary my-0 h-auto border-none focus:!border-white focus:!border-[1px] focus:!ring-0 focus:!outline-none" // Removed 'border border-transparent'. Explicitly set 'border-none' and then force 1px white border on focus.
            />
            {/* Context Selector - positioned absolutely inside textarea's area */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  // Removed size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-neutral-700 transition-colors p-1.5 rounded-md focus:outline-none focus:ring-0 h-8 w-8" // Added h-8 w-8
                  title="Select Context"
                >
                  <BookText size={19} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 bg-black border border-neutral-800">
                {availableContexts.map((context) => (
                  <DropdownMenuItem
                    key={context}
                    onSelect={() => setSelectedContext(context)}
                    className="text-neutral-300 hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none focus:ring-0 text-sm cursor-pointer"
                  >
                    {context}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Coding Icon - positioned absolutely inside textarea's area */}
            <Button
              variant="ghost"
              // Removed size="icon"
              className="absolute left-12 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-neutral-700 transition-colors p-1.5 rounded-md focus:outline-none focus:ring-0 h-8 w-8" // Added h-8 w-8
              title="Coding Mode"
            >
              <Code size={19} />
            </Button>
            {/* Send Button - positioned absolutely inside textarea's area */}
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-md bg-white text-black hover:bg-blue-300 hover:text-white transition-all"
              title="Send Message"
            >
              <ArrowUpIcon className="text-black shadow-none" size={19} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
