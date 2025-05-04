"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Send, Settings, Info, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMobile } from "@/hooks/use-mobile"
import DashboardLayout from "@/components/dashboard-layout"
import AIModelSelector from "@/components/ai-model-selector"
import { 
  AIModelType, 
  AI_MODELS, 
  DEFAULT_AI_SETTINGS, 
  AIModelSettings, 
  ChatMessage,
  generateAIResponse
} from "@/lib/ai-models"

export default function ChatPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const [message, setMessage] = useState("")
  const [modelSettings, setModelSettings] = useState<AIModelSettings>(DEFAULT_AI_SETTINGS)
  const [showModelDialog, setShowModelDialog] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI Scrum Master assistant. I can help you with sprint planning, task management, and team coordination. How can I assist you today?"
    }
  ])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    // Add user message
    const userMessage = { role: "user" as const, content: message }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setMessage("")
    
    // Show typing indicator
    setIsTyping(true)
    
    try {
      // Get AI response based on the selected model
      const aiResponse = await generateAIResponse(updatedMessages, modelSettings)
      
      // Add AI response
      setMessages([...updatedMessages, { role: "assistant", content: aiResponse }])
    } catch (error) {
      console.error("Error generating AI response:", error)
      // Add error message
      setMessages([
        ...updatedMessages,
        { 
          role: "assistant", 
          content: "Sorry, I encountered an error processing your request. Please try again later." 
        }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleModelSettingsChange = (settings: AIModelSettings) => {
    setModelSettings(settings)
    setShowModelDialog(false)
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team Chat</h1>
            <p className="text-muted-foreground">Communicate with your team and AI assistant</p>
          </div>
          <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Sparkles className="h-4 w-4" />
                <span>Configure AI</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>AI Model Settings</DialogTitle>
                <DialogDescription>
                  Configure the AI model used for your assistant
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <AIModelSelector 
                  initialSettings={modelSettings} 
                  onSettingsChange={handleModelSettingsChange} 
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Chat Sidebar */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>Recent chats</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left bg-muted/30">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">AI Assistant</div>
                    <div className="text-sm text-muted-foreground truncate">How can I help you today?</div>
                  </div>
                  <Badge>Active</Badge>
                </button>

                <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>TE</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Team - Engineering</div>
                    <div className="text-sm text-muted-foreground truncate">
                      Alice: Let's discuss the API integration
                    </div>
                  </div>
                  <Badge variant="outline">3 new</Badge>
                </button>

                <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>PM</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Project Management</div>
                    <div className="text-sm text-muted-foreground truncate">
                      Emily: Sprint planning tomorrow at 10 AM
                    </div>
                  </div>
                  <Badge variant="outline">1 new</Badge>
                </button>

                <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>RJ</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Robert Johnson</div>
                    <div className="text-sm text-muted-foreground truncate">
                      Can you review my PR when you get a chance?
                    </div>
                  </div>
                </button>

                <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>AS</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Alice Smith</div>
                    <div className="text-sm text-muted-foreground truncate">Thanks for your help with the design!</div>
                  </div>
                </button>
              </div>
            </CardContent>
            <CardFooter className="border-t p-3">
              <Button variant="outline" className="w-full">
                New Conversation
              </Button>
            </CardFooter>
          </Card>

          {/* Chat Main */}
          <Card className="md:col-span-3 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>AI Assistant</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      Powered by {AI_MODELS[modelSettings.model].name}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{AI_MODELS[modelSettings.model].description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardDescription>
                  </div>
                </div>
                
                <Badge variant="outline" className="ml-auto">
                  {modelSettings.model === AIModelType.GRANITE 
                    ? 'Granite ' + AI_MODELS[AIModelType.GRANITE].version 
                    : AI_MODELS[modelSettings.model].name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-auto">
              <div className="flex flex-col p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    )}
                    <div 
                      className={`${
                        msg.role === "user" 
                          ? "bg-primary/10 rounded-lg p-3 max-w-[80%]" 
                          : "bg-muted/50 rounded-lg p-3 max-w-[80%]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-1">
                      <div className="h-2 w-2 bg-current rounded-full animate-pulse"></div>
                      <div className="h-2 w-2 bg-current rounded-full animate-pulse delay-150"></div>
                      <div className="h-2 w-2 bg-current rounded-full animate-pulse delay-300"></div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t p-3">
              <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isTyping}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
