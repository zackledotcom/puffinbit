"use client"

import { useState, useCallback, useRef } from "react"

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

interface UseChatRuntimeProps {
  api: (url: string, options: RequestInit) => Promise<Response>
}

export const useChatRuntime = ({ api }: UseChatRuntimeProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (newMessage: string) => {
      if (isLoading) {
        abortControllerRef.current?.abort()
      }

      setIsLoading(true)
      setError(null)

      const userMessage: ChatMessage = { role: "user", content: newMessage }
      setMessages((prevMessages) => [...prevMessages, userMessage])

      const requestBody = {
        messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      }

      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      try {
        const response = await api("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || "Failed to send message")
        }

        const data = await response.json()
        const assistantMessage = data.choices?.[0]?.message

        if (assistantMessage) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { role: assistantMessage.role, content: assistantMessage.content },
          ])
        } else {
          throw new Error("No response from assistant")
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("Request aborted")
        } else {
          setError(err.message || "An error occurred")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [api, isLoading, messages],
  )

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  }
}