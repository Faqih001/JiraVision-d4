"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useMobile } from "@/hooks/use-mobile"
import DashboardLayout from "@/components/dashboard-layout"

export default function ChatPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const [message, setMessage] = useState("")

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team Chat</h1>
            <p className="text-muted-foreground">Communicate with your team and AI assistant</p>
          </div>
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
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>AI Assistant</CardTitle>
                  <CardDescription>Powered by IBM Granite</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-auto">
              <div className="flex flex-col p-4 space-y-4">
                {/* AI Message */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 rounded-lg p-3 max-w-[80%]">
                    <p>
                      Hello! I'm your AI Scrum Master assistant. I can help you with sprint planning, task management,
                      and team coordination. How can I assist you today?
                    </p>
                  </div>
                </div>

                {/* User Message */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-primary/10 rounded-lg p-3 max-w-[80%]">
                    <p>Hi! Can you give me a summary of our current sprint progress?</p>
                  </div>
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </div>

                {/* AI Message */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 rounded-lg p-3 max-w-[80%]">
                    <p>Of course! Here's a summary of the current sprint (May 1 - May 14):</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Progress: 45% complete (5 days remaining)</li>
                      <li>12 total tasks: 5 completed, 4 in progress, 3 not started</li>
                      <li>Team velocity is on track with previous sprints</li>
                      <li>Potential risk: The "Implement Ethical Dashboard" task may need additional resources</li>
                      <li>Team mood is generally positive with one team member (Alice) showing signs of stress</li>
                    </ul>
                    <p className="mt-2">Would you like more details on any specific aspect of the sprint?</p>
                  </div>
                </div>

                {/* User Message */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-primary/10 rounded-lg p-3 max-w-[80%]">
                    <p>Can you suggest how we might help Alice with her workload?</p>
                  </div>
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </div>

                {/* AI Message */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 rounded-lg p-3 max-w-[80%]">
                    <p>
                      Based on my analysis, Alice is currently assigned to 3 high-priority tasks with a total workload
                      of 120% capacity. Here are some suggestions to help balance her workload:
                    </p>
                    <ol className="list-decimal pl-5 mt-2 space-y-1">
                      <li>
                        Reassign the "Design Gamification Elements" task to Robert, who currently has 20% available
                        capacity
                      </li>
                      <li>Extend the deadline for the "UI Component Library" task by 2 days</li>
                      <li>Provide additional support by pairing Alice with John for the "Dashboard Redesign" task</li>
                      <li>
                        Consider a brief check-in with Alice to understand if there are any blockers or challenges she's
                        facing
                      </li>
                    </ol>
                    <p className="mt-2">Would you like me to draft a rebalanced task assignment plan for the team?</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t p-3">
              <div className="flex w-full items-center gap-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
