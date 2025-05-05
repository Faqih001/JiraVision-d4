"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Avatar, Box, IconButton, Input, Stack, Typography } from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import CircularProgress from "@mui/material/CircularProgress"
import { generateGraniteResponse, type ChatMessage } from "@/lib/granite-ai"
import { MessageSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

const DashboardChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to bottom on new message
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value)
  }

  const sendMessage = () => {
    if (input.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: input,
        role: "user",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      generateResponse(input)
      setInput("")
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      sendMessage()
    }
  }

  const generateResponse = async (userMessage: string) => {
    setIsLoading(true)

    try {
      // Convert our messages to the format expected by the Granite AI
      const chatMessages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are an AI assistant for the JiraVision dashboard. You help users navigate the dashboard, understand metrics, and provide insights about team performance. Be concise, helpful, and friendly.",
        },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: userMessage,
        },
      ]

      // Generate response using the Granite AI
      const response = await generateGraniteResponse(chatMessages, {
        temperature: 0.7,
        maxTokens: 500,
        thinking: true,
      })

      // Add the response to messages
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: response.text,
          role: "assistant",
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error("Error generating response:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: "I'm sorry, I encountered an error. Please try again later.",
          role: "assistant",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Toggle Button */}
      <button
        onClick={toggleChat}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90",
          isOpen && "rotate-90 scale-0 opacity-0",
        )}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Interface */}
      <div
        className={cn(
          "flex h-[500px] w-[350px] flex-col overflow-hidden rounded-lg border bg-white shadow-xl transition-all duration-300 dark:bg-gray-900",
          isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
        )}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Avatar sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}>A</Avatar>
            <Typography variant="subtitle1">JiraVision Assistant</Typography>
          </div>
          <button
            onClick={toggleChat}
            className="rounded-full p-1 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <Box
          sx={{
            flexGrow: 1,
            padding: "16px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
          ref={chatContainerRef}
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="mb-2 h-12 w-12 opacity-20" />
              <p className="text-lg font-medium">How can I help you today?</p>
              <p className="text-sm">Ask me anything about your dashboard or team performance.</p>
            </div>
          )}

          {messages.map((message) => (
            <Stack
              key={message.id}
              direction="row"
              spacing={2}
              sx={{
                alignItems: "flex-start",
                marginBottom: "8px",
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <Avatar sx={{ bgcolor: message.role === "user" ? "primary.main" : "secondary.main" }}>
                {message.role === "user" ? "U" : "A"}
              </Avatar>
              <Box
                sx={{
                  maxWidth: "80%",
                  padding: "8px",
                  borderRadius: "8px",
                  backgroundColor: message.role === "user" ? "#DCF8C6" : "#ECECEC",
                  wordWrap: "break-word",
                }}
              >
                <Typography variant="body2">{message.content}</Typography>
              </Box>
            </Stack>
          ))}
          {isLoading && (
            <Stack direction="row" spacing={2} sx={{ alignItems: "center", marginBottom: "8px" }}>
              <Avatar sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}>A</Avatar>
              <CircularProgress size={24} />
            </Stack>
          )}
        </Box>

        {/* Chat Input */}
        <Box sx={{ padding: "8px", borderTop: "1px solid #ddd" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Input
              placeholder="Type a message..."
              fullWidth
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <IconButton color="primary" aria-label="send" onClick={sendMessage} disabled={isLoading}>
              <SendIcon />
            </IconButton>
          </Stack>
        </Box>
      </div>
    </div>
  )
}

export default DashboardChatbot
