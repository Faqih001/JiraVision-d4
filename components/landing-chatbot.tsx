"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { usePathname } from "next/navigation"

// Define the knowledge base for different pages
const knowledgeBase = {
  // Home page
  "/": {
    greeting: "👋 Hi there! Welcome to JiraVision. How can I help you today?",
    faqs: [
      {
        question: "What is JiraVision?",
        answer:
          "JiraVision is an AI-powered project management platform that helps teams improve productivity, wellbeing, and collaboration through intelligent automation and ethical metrics.",
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
          "We offer flexible pricing plans starting from $10 per user per month. You can view our detailed pricing on our pricing page or contact sales for a custom quote.",
      },
    ],
  },
  // Products pages
  "/products/ai-scrum-master": {
    greeting: "👋 Welcome to the AI Scrum Master page! How can I help you learn more about this feature?",
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
    greeting: "👋 Welcome to the Team Wellbeing page! How can I help you understand this feature better?",
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
          "Absolutely. All wellbeing data is anonymized and aggregated. Individual data is never shared with managers or other team members without explicit consent.",
      },
    ],
  },
  // Solutions pages
  "/solutions/startups": {
    greeting: "👋 Looking to supercharge your startup with JiraVision? How can I help you today?",
    faqs: [
      {
        question: "How does JiraVision help startups?",
        answer:
          "JiraVision helps startups move faster with less overhead, enabling small teams to achieve more through automation, focus on high-impact work, and scale processes efficiently as you grow.",
      },
      {
        question: "Do you offer startup discounts?",
        answer:
          "Yes! We offer special pricing for early-stage startups. Contact our sales team to learn about our startup program and discounts.",
      },
      {
        question: "How quickly can we implement JiraVision?",
        answer:
          "Most startups can be up and running with JiraVision in less than a week. Our streamlined onboarding process is designed for teams that need to move quickly.",
      },
    ],
  },
  "/solutions/enterprise": {
    greeting: "👋 Welcome to JiraVision Enterprise Solutions! How can I assist you today?",
    faqs: [
      {
        question: "What enterprise features do you offer?",
        answer:
          "Our enterprise offering includes advanced security controls, dedicated support, custom integrations, on-premises deployment options, and enterprise-grade SLAs.",
      },
      {
        question: "How does JiraVision scale for large organizations?",
        answer:
          "JiraVision is built to scale with your organization, supporting thousands of users across multiple teams and departments with consistent performance and reliability.",
      },
      {
        question: "Do you offer custom implementation services?",
        answer:
          "Yes, our enterprise plans include custom implementation services, training, and ongoing support to ensure successful adoption across your organization.",
      },
    ],
  },
  // Default responses for other pages
  default: {
    greeting: "👋 Hi there! How can I help you with JiraVision today?",
    faqs: [
      {
        question: "What is JiraVision?",
        answer:
          "JiraVision is an AI-powered project management platform that helps teams improve productivity, wellbeing, and collaboration.",
      },
      {
        question: "How can I contact support?",
        answer:
          "You can reach our support team by emailing support@jiravision.com or by using the contact form on our Contact page.",
      },
      {
        question: "Where can I see pricing?",
        answer: "You can view our pricing plans on our Pricing page. We offer flexible options for teams of all sizes.",
      },
      {
        question: "Do you offer a free trial?",
        answer: "Yes! We offer a 14-day free trial with no credit card required. You can sign up on our website.",
      },
    ],
  },
}

export default function LandingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const pathname = usePathname()

  // Get the appropriate knowledge base based on the current path
  const getKnowledgeBase = () => {
    if (knowledgeBase[pathname]) {
      return knowledgeBase[pathname]
    }

    // Check if the current path starts with any of the keys in knowledgeBase
    for (const key of Object.keys(knowledgeBase)) {
      if (pathname.startsWith(key) && key !== "/") {
        return knowledgeBase[key]
      }
    }

    return knowledgeBase.default
  }

  // Initialize messages with the appropriate greeting when the component mounts or pathname changes
  useEffect(() => {
    const kb = getKnowledgeBase()
    setMessages([
      {
        role: "assistant",
        content: kb.greeting,
      },
    ])
  }, [pathname])

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

    // Generate a response based on the user's message
    setTimeout(() => {
      const kb = getKnowledgeBase()

      // Check if the message matches any FAQ
      const lowerCaseMessage = message.toLowerCase()
      const matchedFaq = kb.faqs.find(
        (faq) =>
          lowerCaseMessage.includes(faq.question.toLowerCase()) ||
          faq.question.toLowerCase().includes(lowerCaseMessage),
      )

      let responseContent
      if (matchedFaq) {
        responseContent = matchedFaq.answer
      } else {
        // Generic responses if no match is found
        const genericResponses = [
          "I'm here to help you learn more about JiraVision. Could you please clarify what specific information you're looking for?",
          "That's a great question! To provide the most accurate information, would you like to speak with our sales team? You can contact them through our Contact page.",
          "I don't have specific information about that, but I'd be happy to connect you with someone who can help. Would you like me to provide contact information?",
          "Thanks for your question. You might find more detailed information about this on our documentation page or by contacting our support team.",
        ]
        responseContent = genericResponses[Math.floor(Math.random() * genericResponses.length)]
      }

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: responseContent,
        },
      ])
    }, 1000)
  }

  // Suggest common questions based on the current page
  const suggestQuestion = (question) => {
    // Simulate user asking the question
    const newMessages = [
      ...messages,
      {
        role: "user",
        content: question,
      },
    ]
    setMessages(newMessages)

    // Find and provide the answer
    setTimeout(() => {
      const kb = getKnowledgeBase()
      const matchedFaq = kb.faqs.find((faq) => faq.question === question)

      if (matchedFaq) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: matchedFaq.answer,
          },
        ])
      }
    }, 800)
  }

  return (
    <>
      {/* Chatbot Button */}
      <Button
        className="fixed bottom-4 right-4 rounded-full shadow-lg h-12 w-12 p-0 z-50"
        onClick={() => setIsOpen(true)}
      >
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

            {/* Suggested questions */}
            {messages.length <= 2 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Common questions:</p>
                <div className="flex flex-col gap-2">
                  {getKnowledgeBase()
                    .faqs.slice(0, 3)
                    .map((faq, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="justify-start text-left h-auto py-2"
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
