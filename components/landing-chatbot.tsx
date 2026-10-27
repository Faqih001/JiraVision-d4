"use client"

import { useEffect, useState } from "react"
import { MessageSquare, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { usePathname } from "next/navigation"

interface Faq {
  question: string
  answer: string
}

interface PageKnowledge {
  greeting: string
  faqs: Faq[]
}

// Page-specific scripted answers (no LLM behind this).
// NOTE(owner): claims here must match the pricing page; PLACEHOLDER-check before launch.
const knowledgeBase: Record<string, PageKnowledge> = {
  "/": {
    greeting: "Hi there! Welcome to JiraVision. How can I help you today?",
    faqs: [
      {
        question: "What is JiraVision?",
        answer:
          "JiraVision is an AI-native project management platform that helps teams improve productivity, wellbeing, and collaboration through intelligent automation and ethical metrics.",
      },
      {
        question: "How does JiraVision work?",
        answer:
          "JiraVision integrates with your existing tools and workflows, using AI to automate routine tasks, provide insights, and help teams work more efficiently while maintaining wellbeing.",
      },
      {
        question: "What are the main features?",
        answer:
          "Our main features include AI Scrum Master, Team Wellbeing monitoring, Ethical Metrics, and Gamification. Each is designed to enhance different aspects of your team's productivity and satisfaction.",
      },
      {
        question: "How much does it cost?",
        answer:
          "We offer flexible pricing plans. You can view the detailed pricing on our pricing page or contact sales for a custom quote.",
      },
    ],
  },
  "/products/ai-scrum-master": {
    greeting: "Welcome to the AI Scrum Master page! How can I help you learn more about this feature?",
    faqs: [
      {
        question: "What is the AI Scrum Master?",
        answer:
          "The AI Scrum Master is an intelligent assistant that automates routine scrum tasks, provides data-driven insights for sprint planning, and helps teams identify and resolve blockers efficiently.",
      },
      {
        question: "How does it improve productivity?",
        answer:
          "It reduces time spent on administrative tasks, improves estimation accuracy, provides early warning of potential issues, and helps teams maintain consistent velocity.",
      },
      {
        question: "Can it integrate with Jira?",
        answer:
          "Yes, our AI Scrum Master seamlessly integrates with Jira and other popular project management tools to enhance your existing workflow.",
      },
    ],
  },
  "/products/team-wellbeing": {
    greeting: "Welcome to the Team Wellbeing page! How can I help you understand this feature better?",
    faqs: [
      {
        question: "What is Team Wellbeing?",
        answer:
          "Team Wellbeing is a feature that monitors team health indicators, helps prevent burnout, and provides actionable insights to maintain a sustainable work environment.",
      },
      {
        question: "How does it measure wellbeing?",
        answer:
          "It uses a combination of work pattern analysis, anonymous feedback, and customizable wellbeing metrics to provide a holistic view of team health.",
      },
      {
        question: "Is employee privacy protected?",
        answer:
          "All wellbeing data is anonymized and aggregated. Individual data is never shared with managers or other team members without explicit consent.",
      },
    ],
  },
  "/solutions/startups": {
    greeting: "Looking to move faster with JiraVision? How can I help you today?",
    faqs: [
      {
        question: "How does JiraVision help startups?",
        answer:
          "JiraVision helps startups move faster with less overhead, enabling small teams to achieve more through automation, focus on high-impact work, and scale processes efficiently as you grow.",
      },
      {
        question: "Do you offer startup discounts?",
        answer:
          "We may offer special pricing for early-stage startups. Contact our sales team through the Contact page to ask about our startup program.",
      },
      {
        question: "How quickly can we implement JiraVision?",
        answer:
          "Onboarding is designed to be quick for teams that need to move fast. Contact us for details on implementation timelines.",
      },
    ],
  },
  "/solutions/enterprise": {
    greeting: "Welcome to JiraVision Enterprise Solutions! How can I assist you today?",
    faqs: [
      {
        question: "What enterprise features do you offer?",
        answer:
          "Our enterprise offering can include advanced security controls, dedicated support, custom integrations, and deployment options. Contact sales for the exact scope.",
      },
      {
        question: "How does JiraVision scale for large organizations?",
        answer:
          "JiraVision is built to scale with your organization, supporting multiple teams and departments with consistent performance and reliability.",
      },
      {
        question: "Do you offer custom implementation services?",
        answer:
          "Enterprise engagements can include implementation services, training, and ongoing support. Contact our team to scope what you need.",
      },
    ],
  },
  default: {
    greeting: "Hi there! How can I help you with JiraVision today?",
    faqs: [
      {
        question: "What is JiraVision?",
        answer:
          "JiraVision is an AI-native project management platform that helps teams improve productivity, wellbeing, and collaboration.",
      },
      {
        question: "How can I contact support?",
        answer: "You can reach us through the contact form on our Contact page.",
      },
      {
        question: "Where can I see pricing?",
        answer: "You can view our pricing plans on our Pricing page. We offer flexible options for teams of all sizes.",
      },
      {
        question: "Do you offer a free trial?",
        answer: "Check our Pricing page for current trial options.",
      },
    ],
  },
}

type ChatMessage = { role: "user" | "assistant"; content: string }

function knowledgeFor(pathname: string): PageKnowledge {
  if (knowledgeBase[pathname]) return knowledgeBase[pathname]
  for (const key of Object.keys(knowledgeBase)) {
    if (key !== "default" && key !== "/" && pathname.startsWith(key)) {
      return knowledgeBase[key]
    }
  }
  return knowledgeBase.default
}

export default function LandingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const pathname = usePathname()

  useEffect(() => {
    setMessages([{ role: "assistant", content: knowledgeFor(pathname).greeting }])
  }, [pathname])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen])

  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const question = message.trim()
    setMessages((current) => [...current, { role: "user", content: question }])
    setMessage("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/assistant/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, pathname }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Failed to get response")
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: json.data.answer },
      ])
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I'm having trouble right now. Please try again later or check our FAQ page.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestQuestion = (question: string) => {
    if (isLoading) return
    setMessages((current) => [...current, { role: "user", content: question }])
    setIsLoading(true)

    fetch("/api/assistant/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, pathname }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setMessages((current) => [
            ...current,
            { role: "assistant", content: json.data.answer },
          ])
        } else {
          throw new Error(json.error)
        }
      })
      .catch((error) => {
        console.error("Failed to send message:", error)
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: "I'm having trouble right now. Please try again later or check our FAQ page.",
          },
        ])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const kb = knowledgeFor(pathname)

  return (
    <>
      <Button
        className="fixed bottom-4 right-4 z-50 h-12 gap-2 rounded-full px-4 shadow-md"
        aria-label="Open JiraVision assistant"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold">Assistant</span>
      </Button>

      {isOpen && (
        <Card
          role="dialog"
          aria-label="JiraVision assistant"
          className="fixed bottom-20 right-4 z-50 flex max-h-[min(500px,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col shadow-lg"
        >
          <CardHeader className="flex flex-row items-center justify-between bg-primary p-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 bg-primary-foreground">
                <AvatarFallback className="text-sm text-primary">JV</AvatarFallback>
              </Avatar>
              <span className="font-medium text-primary-foreground">JiraVision Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={
                    msg.role === "assistant"
                      ? "max-w-[80%] self-start rounded-lg bg-primary/10 p-3"
                      : "max-w-[80%] self-end rounded-lg bg-muted p-3"
                  }
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
              {isLoading && (
                <div className="max-w-[80%] self-start rounded-lg bg-primary/10 p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 2 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">Common questions:</p>
                <div className="flex flex-col gap-2">
                  {kb.faqs.slice(0, 3).map((faq) => (
                    <Button
                      key={faq.question}
                      variant="outline"
                      size="sm"
                      className="h-auto justify-start py-2 text-left"
                      onClick={() => suggestQuestion(faq.question)}
                    >
                      {faq.question}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t p-3">
            <form onSubmit={handleSendMessage} className="flex w-full gap-2">
              <Input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                aria-label="Message"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  )
}
