"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Bot, Plus, Send, Trash2, User } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "@/hooks/use-toast"

type Thread = {
  id: string
  title: string | null
  scope: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

type Message = {
  id: number
  threadId: string
  role: "user" | "assistant"
  content: string
  references: Array<{ kind: string; label: string; count: number }>
  tokens: number
  createdAt: Date
}

export default function AssistantClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [threads, setThreads] = useState<Thread[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isThreadsLoading, setIsThreadsLoading] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const autoSentRef = useRef(false)

  // Load threads on mount
  useEffect(() => {
    loadThreads()
  }, [])

  // Load messages when thread changes
  useEffect(() => {
    if (currentThreadId) {
      loadThread(currentThreadId)
    }
  }, [currentThreadId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendQuestion = useCallback(
    async (question: string) => {
      if (isLoading) return

      // Optimistically add user message
      const tempUserMessage: Message = {
        id: Date.now(),
        threadId: currentThreadId ?? "",
        role: "user",
        content: question,
        references: [],
        tokens: 0,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, tempUserMessage])

      try {
        setIsLoading(true)
        const res = await fetch("/api/assistant/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            threadId: currentThreadId ?? undefined,
          }),
        })

        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || "Failed to get response")
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: Date.now() + 1,
          threadId: json.data.threadId,
          role: "assistant",
          content: json.data.answer,
          references: json.data.references,
          tokens: 0,
          createdAt: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])

        // Update thread ID if new
        if (!currentThreadId) {
          setCurrentThreadId(json.data.threadId)
        }

        // Reload threads to update list
        loadThreads()
      } catch (error) {
        console.error("Failed to send message:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to get response",
          variant: "destructive",
        })
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, currentThreadId],
  )

  // A deep link like /dashboard/assistant?q=... asks the question once, then
  // drops the param so a refresh does not re-ask it.
  useEffect(() => {
    const question = searchParams.get("q")?.trim()
    if (!question || autoSentRef.current) return
    autoSentRef.current = true
    router.replace("/dashboard/assistant", { scroll: false })
    void sendQuestion(question)
  }, [searchParams, sendQuestion, router])

  function handleSend() {
    const question = input.trim()
    if (!question) return
    setInput("")
    void sendQuestion(question)
  }

  async function loadThreads() {
    try {
      setIsThreadsLoading(true)
      const res = await fetch("/api/assistant/workspace/threads")
      const json = await res.json()
      if (json.success) {
        setThreads(json.data.threads)
      }
    } catch (error) {
      console.error("Failed to load threads:", error)
      toast({
        title: "Error",
        description: "Failed to load conversation threads",
        variant: "destructive",
      })
    } finally {
      setIsThreadsLoading(false)
    }
  }

  async function loadThread(threadId: string) {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/assistant/workspace/threads/${threadId}`)
      const json = await res.json()
      if (json.success) {
        setMessages(json.data.messages)
      }
    } catch (error) {
      console.error("Failed to load thread:", error)
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleNewThread() {
    setCurrentThreadId(null)
    setMessages([])
    setInput("")
  }

  async function handleDeleteThread(threadId: string) {
    if (!confirm("Delete this conversation?")) return

    try {
      const res = await fetch(`/api/assistant/workspace/threads/${threadId}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (json.success) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId))
        if (currentThreadId === threadId) {
          handleNewThread()
        }
        toast({ title: "Conversation deleted" })
      }
    } catch (error) {
      console.error("Failed to delete thread:", error)
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-12rem)]">
        {/* Sidebar: Thread list */}
        <Card className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <Button size="sm" variant="outline" onClick={handleNewThread}>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {isThreadsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-2">
                {threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentThreadId === thread.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setCurrentThreadId(thread.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {thread.title || "Untitled"}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          {thread.messageCount} messages
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteThread(thread.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Main: Chat interface */}
        <Card className="flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ask about your tasks, work log, deliverables, and reports
            </p>
          </div>

          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Start a conversation by asking a question below
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Examples: "What did I work on this week?", "What tasks are due soon?",
                  "Summarize my recent deliverables"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.references && message.references.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/20">
                          <p className="text-xs opacity-70">
                            Sources:{" "}
                            {message.references
                              .map((ref) => `${ref.count} ${ref.label}`)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask about your work..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
