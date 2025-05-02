"use client"

import { useState } from "react"
import { MessageSquare, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function GlobalChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi there! How can I help you with JiraVision today?",
    },
  ])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!message.trim()) return

    // Add user message
    const newMessages = [
      ...messages,
      {
        role: "user",
        content: message,
      },
    ]
    setMessages(newMessages)
    setMessage("")

    // Simulate AI response after a short delay
    setTimeout(() => {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "I'm your JiraVision assistant. I can help you navigate the platform, answer questions about features, or connect you with support if needed. What would you like to know?",
        },
      ])
    }, 1000)
  }

  return (
    <>
      {/* Chatbot Button */}
      <Button className="fixed bottom-4 right-4 rounded-full shadow-lg h-12 w-12 p-0" onClick={() => setIsOpen(true)}>
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Chatbot Dialog */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-80 md:w-96 shadow-xl z-50 flex flex-col max-h-[500px]">
          <CardHeader className="bg-primary p-3 rounded-t-lg flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 bg-primary-foreground">
                <AvatarFallback className="text-primary text-sm">JV</AvatarFallback>
              </Avatar>
              <span className="text-primary-foreground font-medium">JiraVision Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary/90"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 overflow-y-auto flex-1 max-h-80">
            <div className="flex flex-col gap-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`${
                    msg.role === "assistant"
                      ? "bg-primary/10 rounded-lg p-3 max-w-[80%] self-start"
                      : "bg-muted/50 rounded-lg p-3 max-w-[80%] self-end"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t p-3">
            <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
              <Input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  )
}
