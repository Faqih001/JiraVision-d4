"use client"

// Top-bar assistant panel (design §7): a compact Popover chat next to the bell,
// backed by the same /api/assistant/workspace endpoint as /dashboard/assistant.

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bot, Loader2, Maximize2, Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

type PanelMessage = {
  id: number
  role: "user" | "assistant"
  content: string
  references: Array<{ kind: string; label: string; count: number }>
}

const SUGGESTIONS = [
  "What did I work on this week?",
  "What tasks are due soon?",
  "Summarize my recent deliverables",
]

export function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<PanelMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // The Radix root only clips; the element that actually scrolls is the viewport inside it.
    const viewport = scrollRef.current?.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]")
    viewport?.scrollTo({ top: viewport.scrollHeight })
  }, [open, messages, isLoading])

  const send = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return
      const tempId = Date.now()
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", content: question.trim(), references: [] },
      ])
      setInput("")
      setIsLoading(true)
      try {
        const res = await fetch("/api/assistant/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: question.trim(), threadId: threadId ?? undefined }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error ?? "Assistant unavailable")
        setThreadId(json.data.threadId)
        setMessages((prev) => [
          ...prev,
          {
            id: tempId + 1,
            role: "assistant",
            content: json.data.answer,
            references: json.data.references ?? [],
          },
        ])
      } catch (error) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          {
            id: tempId + 1,
            role: "assistant",
            content:
              error instanceof Error
                ? error.message
                : "The assistant is unavailable right now. Try again later.",
            references: [],
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, threadId],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-border bg-card hover:bg-muted"
          aria-label="Open AI assistant"
        >
          <Bot className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
        aria-label="AI assistant panel"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Assistant</span>
          </div>
          <Link
            href="/dashboard/assistant"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="h-3 w-3" />
            Full page
          </Link>
        </div>

        <ScrollArea className="h-[20rem] px-3 py-2" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-2 py-2">
              <p className="text-xs text-muted-foreground">
                Ask about your tasks, work log, deliverables and reports:
              </p>
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="h-auto w-full justify-start py-2 text-left text-xs"
                  onClick={() => send(s)}
                  disabled={isLoading}
                >
                  {s}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                      <Bot className="h-3 w-3 text-primary-foreground" />
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg p-2 text-xs ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.references.length > 0 && (
                      <p className="mt-1 border-t border-border/30 pt-1 text-[10px] opacity-70">
                        Sources: {m.references.map((r) => `${r.count} ${r.label}`).join(", ")}
                      </p>
                    )}
                  </div>
                  {m.role === "user" && (
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-3 w-3" />
                    </span>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking…
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <form
          className="flex gap-2 border-t p-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your work…"
            aria-label="Ask the assistant"
            disabled={isLoading}
            className="h-8 text-xs"
            maxLength={2000}
          />
          <Button type="submit" size="icon" className="h-8 w-8" disabled={isLoading || !input.trim()} aria-label="Send question">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
