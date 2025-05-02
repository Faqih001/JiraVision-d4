"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Check, Code, Github, GitPullRequest, Globe, MessageSquare, Plus, Search, Slack, Trello, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMobile } from "@/hooks/use-mobile"
import DashboardLayout from "@/components/dashboard-layout"

export default function IntegrationsPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Integrations</h1>
            <p className="text-muted-foreground">Connect JiraVision with your favorite tools</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Search className="h-4 w-4" />
              <span>Browse Marketplace</span>
            </Button>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span>Add Integration</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search integrations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {/* Active Integrations */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Active Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* GitHub Integration */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-black p-2 rounded-md">
                          <Github className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle>GitHub</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </div>
                    <CardDescription>Connect your repositories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p>Connected repositories: 5</p>
                      <p>Last synced: 10 minutes ago</p>
                      <div className="flex items-center gap-2 mt-2">
                        <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                        <span>12 open pull requests</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      Disconnect
                    </Button>
                  </CardFooter>
                </Card>

                {/* Slack Integration */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#4A154B] p-2 rounded-md">
                          <Slack className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle>Slack</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </div>
                    <CardDescription>Get notifications in your channels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p>Connected workspace: JiraVision Team</p>
                      <p>Connected channels: 3</p>
                      <div className="flex items-center gap-2 mt-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>Notifications enabled</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      Disconnect
                    </Button>
                  </CardFooter>
                </Card>

                {/* Trello Integration */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#0079BF] p-2 rounded-md">
                          <Trello className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle>Trello</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </div>
                    <CardDescription>Sync your boards and cards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p>Connected boards: 2</p>
                      <p>Last synced: 1 hour ago</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Check className="h-4 w-4 text-muted-foreground" />
                        <span>Two-way sync enabled</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      Disconnect
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>

            {/* Available Integrations */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Available Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Figma Integration */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-black p-2 rounded-md">
                          <svg
                            className="h-5 w-5 text-white"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M8 24C10.2091 24 12 22.2091 12 20V16H8C5.79086 16 4 17.7909 4 20C4 22.2091 5.79086 24 8 24Z" />
                            <path d="M4 12C4 9.79086 5.79086 8 8 8H12V16H8C5.79086 16 4 14.2091 4 12Z" />
                            <path d="M4 4C4 1.79086 5.79086 0 8 0H12V8H8C5.79086 8 4 6.20914 4 4Z" />
                            <path d="M12 0H16C18.2091 0 20 1.79086 20 4C20 6.20914 18.2091 8 16 8H12V0Z" />
                            <path d="M20 12C20 14.2091 18.2091 16 16 16C13.7909 16 12 14.2091 12 12C12 9.79086 13.7909 8 16 8C18.2091 8 20 9.79086 20 12Z" />
                          </svg>
                        </div>
                        <CardTitle>Figma</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Available
                      </Badge>
                    </div>
                    <CardDescription>Connect your design files</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p>Sync design files with your projects</p>
                      <p>Get notifications on design updates</p>
                      <p>Link tasks to design components</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button className="w-full" size="sm">
                      Connect
                    </Button>
                  </CardFooter>
                </Card>

                {/* Google Drive Integration */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-white border p-2 rounded-md">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4.16797 19.5833L9.66797 9.75H23.334L17.834 19.5833H4.16797Z" fill="#4285F4" />
                            <path
                              d="M9.66797 9.75L4.16797 19.5833L0.667969 13L6.16797 3.16667L9.66797 9.75Z"
                              fill="#FBBC04"
                            />
                            <path d="M6.16797 3.16667L0.667969 13H14.334L19.834 3.16667H6.16797Z" fill="#EA4335" />
                          </svg>
                        </div>
                        <CardTitle>Google Drive</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Available
                      </Badge>
                    </div>
                    <CardDescription>Access your documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p>Attach Google Docs to tasks</p>
                      <p>Share files with team members</p>
                      <p>Collaborate on documents</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button className="w-full" size="sm">
                      Connect
                    </Button>
                  </CardFooter>
                </Card>

                {/* Custom API Integration */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-violet-600 p-2 rounded-md">
                          <Code className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle>Custom API</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Available
                      </Badge>
                    </div>
                    <CardDescription>Build your own integration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p>Connect to any REST API</p>
                      <p>Create custom webhooks</p>
                      <p>Build advanced automations</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button className="w-full" size="sm">
                      Configure
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            {/* Active Integrations Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* GitHub Integration */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-black p-2 rounded-md">
                        <Github className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle>GitHub</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                  <CardDescription>Connect your repositories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>Connected repositories: 5</p>
                    <p>Last synced: 10 minutes ago</p>
                    <div className="flex items-center gap-2 mt-2">
                      <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                      <span>12 open pull requests</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Disconnect
                  </Button>
                </CardFooter>
              </Card>

              {/* Slack Integration */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#4A154B] p-2 rounded-md">
                        <Slack className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle>Slack</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                  <CardDescription>Get notifications in your channels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>Connected workspace: JiraVision Team</p>
                    <p>Connected channels: 3</p>
                    <div className="flex items-center gap-2 mt-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>Notifications enabled</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Disconnect
                  </Button>
                </CardFooter>
              </Card>

              {/* Trello Integration */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#0079BF] p-2 rounded-md">
                        <Trello className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle>Trello</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                  <CardDescription>Sync your boards and cards</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>Connected boards: 2</p>
                    <p>Last synced: 1 hour ago</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Check className="h-4 w-4 text-muted-foreground" />
                      <span>Two-way sync enabled</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Disconnect
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="available" className="mt-4">
            {/* Available Integrations Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Figma Integration */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-black p-2 rounded-md">
                        <svg
                          className="h-5 w-5 text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M8 24C10.2091 24 12 22.2091 12 20V16H8C5.79086 16 4 17.7909 4 20C4 22.2091 5.79086 24 8 24Z" />
                          <path d="M4 12C4 9.79086 5.79086 8 8 8H12V16H8C5.79086 16 4 14.2091 4 12Z" />
                          <path d="M4 4C4 1.79086 5.79086 0 8 0H12V8H8C5.79086 8 4 6.20914 4 4Z" />
                          <path d="M12 0H16C18.2091 0 20 1.79086 20 4C20 6.20914 18.2091 8 16 8H12V0Z" />
                          <path d="M20 12C20 14.2091 18.2091 16 16 16C13.7909 16 12 14.2091 12 12C12 9.79086 13.7909 8 16 8C18.2091 8 20 9.79086 20 12Z" />
                        </svg>
                      </div>
                      <CardTitle>Figma</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      Available
                    </Badge>
                  </div>
                  <CardDescription>Connect your design files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>Sync design files with your projects</p>
                    <p>Get notifications on design updates</p>
                    <p>Link tasks to design components</p>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button className="w-full" size="sm">
                    Connect
                  </Button>
                </CardFooter>
              </Card>

              {/* Google Drive Integration */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-white border p-2 rounded-md">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4.16797 19.5833L9.66797 9.75H23.334L17.834 19.5833H4.16797Z" fill="#4285F4" />
                          <path
                            d="M9.66797 9.75L4.16797 19.5833L0.667969 13L6.16797 3.16667L9.66797 9.75Z"
                            fill="#FBBC04"
                          />
                          <path d="M6.16797 3.16667L0.667969 13H14.334L19.834 3.16667H6.16797Z" fill="#EA4335" />
                        </svg>
                      </div>
                      <CardTitle>Google Drive</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      Available
                    </Badge>
                  </div>
                  <CardDescription>Access your documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>Attach Google Docs to tasks</p>
                    <p>Share files with team members</p>
                    <p>Collaborate on documents</p>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button className="w-full" size="sm">
                    Connect
                  </Button>
                </CardFooter>
              </Card>

              {/* Custom API Integration */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-violet-600 p-2 rounded-md">
                        <Code className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle>Custom API</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      Available
                    </Badge>
                  </div>
                  <CardDescription>Build your own integration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>Connect to any REST API</p>
                    <p>Create custom webhooks</p>
                    <p>Build advanced automations</p>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button className="w-full" size="sm">
                    Configure
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="custom" className="mt-4">
            <div className="text-center py-8">
              <Code className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold mt-4">Create Custom Integration</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Build your own integration using our API. Connect JiraVision to any service or create custom workflows.
              </p>
              <Button className="mt-4">Get Started</Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Website Chatbot Section */}
        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Website Chatbot</CardTitle>
              <CardDescription>Add an AI-powered chatbot to help users navigate your website</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Website Assistant</p>
                      <p className="text-sm text-muted-foreground">Powered by IBM Granite</p>
                    </div>
                  </div>
                  <Switch id="chatbot-active" defaultChecked />
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Chatbot Configuration</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Chatbot Name</label>
                        <Input defaultValue="JiraVision Assistant" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Primary Color</label>
                        <div className="flex gap-2">
                          <Input type="color" defaultValue="#7C3AED" className="w-12 h-9 p-1" />
                          <Input defaultValue="#7C3AED" className="flex-1" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Welcome Message</label>
                      <Input defaultValue="👋 Hi there! How can I help you with JiraVision today?" className="w-full" />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Knowledge Base</label>
                      <div className="flex gap-2">
                        <Input
                          defaultValue="https://docs.jiravision.com"
                          className="flex-1"
                          placeholder="URL to your documentation"
                        />
                        <Button variant="outline">Sync</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        The chatbot will use this knowledge base to answer user questions
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Chatbot Preview</h3>
                  <div className="border rounded-lg bg-background">
                    <div className="bg-primary p-3 rounded-t-lg flex items-center justify-between">
                      <span className="text-primary-foreground font-medium">JiraVision Assistant</span>
                      <X className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto">
                      <div className="flex flex-col gap-3">
                        <div className="bg-primary/10 rounded-lg p-3 max-w-[80%] self-start">
                          <p className="text-sm">👋 Hi there! How can I help you with JiraVision today?</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 max-w-[80%] self-end">
                          <p className="text-sm">How do I create a new sprint?</p>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-3 max-w-[80%] self-start">
                          <p className="text-sm">
                            To create a new sprint, go to the Sprints page from the sidebar, then click the "Create
                            Sprint" button in the top right. Fill in the sprint details like name, duration, and goals,
                            then click "Create".
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t p-3 flex gap-2">
                      <Input placeholder="Type your message..." className="flex-1" />
                      <Button size="icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="m22 2-7 20-4-9-9-4Z" />
                          <path d="M22 2 11 13" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t flex justify-between">
              <Button variant="outline">Reset to Default</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  )
}
