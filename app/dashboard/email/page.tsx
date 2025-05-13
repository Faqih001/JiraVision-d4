"use client"

import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Archive,
  ArchiveX,
  ArrowDown,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  File,
  Filter,
  Inbox,
  Info,
  Loader2,
  MailOpen,
  Menu,
  MoreVertical,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Star,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

export default function EmailPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  
  // Mock email data
  const emails = [
    {
      id: "1",
      from: { name: "Emily Wilson", email: "emily@jiravision.com", avatar: "EW" },
      subject: "Sprint Planning Meeting",
      content: `Hi team, I wanted to remind everyone about our sprint planning meeting tomorrow at 10 AM. Please
make sure to review the backlog items and come prepared with your estimates. We'll be discussing the
upcoming features for the Ethical Metrics dashboard.

Let me know if you have any questions or concerns.

Best,
Emily`,
      time: "10:32 AM",
      date: "Today",
      labels: ["Important", "Work"],
      read: false,
      starred: true,
      attachments: [{ name: "sprint-planning-agenda.pdf", size: "245 KB" }],
      to: ["dev-team@jiravision.com"]
    },
    {
      id: "2",
      from: { name: "Robert Johnson", email: "robert@jiravision.com", avatar: "RJ" },
      subject: "API Integration Update",
      content: `Hello, I've completed the integration with the IBM Granite API. The authentication issues have been
resolved, and we can now proceed with implementing the AI Scrum Master features. I've pushed the
changes to the repository, and you can review them at your convenience.

All tests are passing and the documentation has been updated. Let me know if you need any clarification.

Regards,
Robert`,
      time: "Yesterday",
      date: "May 12",
      labels: ["Work"],
      read: true,
      starred: false,
      attachments: [],
      to: ["dev-team@jiravision.com"]
    },
    {
      id: "3",
      from: { name: "Alice Smith", email: "alice@designteam.com", avatar: "AS" },
      subject: "Gamification UI Designs",
      content: `Hi John, I've attached the latest UI designs for the Gamification dashboard. I've incorporated the
feedback from our last meeting and added some new elements for the skill trees and achievements. Let
me know what you think!

I've also included some alternative color schemes as we discussed.

Cheers,
Alice`,
      time: "May 10",
      date: "May 10",
      labels: ["Design"],
      read: true,
      starred: true,
      attachments: [{ name: "gamification-designs-v2.fig", size: "3.2 MB" }],
      to: ["john.doe@jiravision.com"]
    },
    {
      id: "4",
      from: { name: "JiraVision System", email: "system@jiravision.com", avatar: "JV" },
      subject: "Weekly Team Performance Report",
      content: `Your weekly team performance report is now available. This week's highlights: Velocity increased by
8%, team wellbeing score is at 85%, and there are 2 potential risks identified by the AI Scrum
Master. Click the link below to view the full report.

https://jiravision.com/reports/weekly/team-performance/2025-05-06

This is an automated message. Please do not reply to this email.`,
      time: "May 8",
      date: "May 8",
      labels: ["System"],
      read: true,
      starred: false,
      attachments: [],
      to: ["john.doe@jiravision.com"]
    },
    {
      id: "5",
      from: { name: "Sophia Rodriguez", email: "sophia@jiravision.com", avatar: "SR" },
      subject: "Team Building Event Next Friday",
      content: `Hello everyone,

I'm excited to announce our next team building event scheduled for Friday, May 20th. We'll be having a virtual escape room challenge followed by a happy hour.

Please let me know if you'll be able to attend by EOD Monday. I've attached the details and schedule for the event.

Looking forward to seeing everyone there!

Best,
Sophia`,
      time: "May 7",
      date: "May 7",
      labels: ["Team", "Event"],
      read: false,
      starred: false,
      attachments: [{ name: "team-building-details.pdf", size: "178 KB" }],
      to: ["all-staff@jiravision.com"]
    },
  ]
  
  // Functions to handle email actions
  const toggleEmailSelection = (id: string) => {
    setSelectedEmails(prev => 
      prev.includes(id) ? prev.filter(emailId => emailId !== id) : [...prev, id]
    )
  }
  
  const selectAllEmails = () => {
    setSelectedEmails(emails.map(email => email.id))
  }
  
  const deselectAllEmails = () => {
    setSelectedEmails([])
  }
  
  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1500)
  }
  
  const handleOpenEmail = (id: string) => {
    setSelectedEmail(id)
  }
  
  const handleCloseEmail = () => {
    setSelectedEmail(null)
  }
  
  const handleOpenCompose = () => {
    setIsComposeOpen(true)
  }
  
  const handleCloseCompose = () => {
    setIsComposeOpen(false)
  }
  
  // Compose email form state
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    message: "",
  })
  
  // Handle compose form input changes
  const handleComposeChange = (field: string, value: string) => {
    setComposeData(prev => ({ ...prev, [field]: value }))
  }
  
  // Get currently viewed email
  const currentEmail = emails.find(email => email.id === selectedEmail)
  
  // Get mobile state
  const isMobile = useIsMobile()
  
  // Active folder state
  const [activeFolder, setActiveFolder] = useState("inbox")
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Email</h1>
          <p className="text-muted-foreground">Manage your team communications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1 bg-primary" onClick={handleOpenCompose}>
            <Edit2 className="h-4 w-4" />
            <span>Compose</span>
          </Button>
        </div>
      </div>

      {/* Email Interface */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Email Sidebar */}
        <div className="md:col-span-3 lg:col-span-2 space-y-4 bg-card rounded-lg border p-4">
          <Button 
            size="sm" 
            className="gap-1 w-full bg-primary"
            onClick={handleOpenCompose}
          >
            <Edit2 className="h-4 w-4" />
            <span>Compose</span>
          </Button>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search emails..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Email Folders */}
          <div className="space-y-1">
            <Button 
              variant={activeFolder === "inbox" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder("inbox")}
            >
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
              <Badge variant="secondary" className="ml-auto rounded-sm px-1 py-0 text-xs font-normal">24</Badge>
            </Button>
            <Button 
              variant={activeFolder === "starred" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder("starred")}
            >
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Starred</span>
              <Badge variant="secondary" className="ml-auto rounded-sm px-1 py-0 text-xs font-normal">8</Badge>
            </Button>
            <Button 
              variant={activeFolder === "sent" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder("sent")}
            >
              <Send className="h-4 w-4" />
              <span>Sent</span>
              <Badge variant="secondary" className="ml-auto rounded-sm px-1 py-0 text-xs font-normal">12</Badge>
            </Button>
            <Button 
              variant={activeFolder === "drafts" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder("drafts")}
            >
              <File className="h-4 w-4" />
              <span>Drafts</span>
              <Badge variant="secondary" className="ml-auto rounded-sm px-1 py-0 text-xs font-normal">3</Badge>
            </Button>
            <Button 
              variant={activeFolder === "scheduled" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder("scheduled")}
            >
              <Clock className="h-4 w-4" />
              <span>Scheduled</span>
              <Badge variant="secondary" className="ml-auto rounded-sm px-1 py-0 text-xs font-normal">5</Badge>
            </Button>
            <Button 
              variant={activeFolder === "archive" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder("archive")}
            >
              <Archive className="h-4 w-4" />
              <span>Archive</span>
            </Button>
            <Button 
              variant={activeFolder === "trash" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder("trash")}
            >
              <Trash2 className="h-4 w-4" />
              <span>Trash</span>
            </Button>
          </div>

          <Separator />

          {/* Email Labels */}
          <div className="py-1">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-sm font-medium">Labels</h3>
              <Button variant="ghost" size="icon" className="h-5 w-5">
                <Plus className="h-3 w-3" />
                <span className="sr-only">Add Label</span>
              </Button>
            </div>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                <span>Important</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                <span>Work</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span>Personal</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span>Sprint Planning</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                <span>Team Updates</span>
              </Button>
            </div>
          </div>

          <Separator />
          
          {/* Storage */}
          <div className="py-1">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-sm font-medium">Storage</h3>
              <Info className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="space-y-2 px-2">
              <div className="w-full bg-muted h-2 rounded-full">
                <div className="bg-blue-500 h-2 rounded-full w-[65%]"></div>
              </div>
              <p className="text-xs text-muted-foreground">6.5 GB of 10 GB used</p>
            </div>
          </div>
        </div>

        {/* Main Email Content Area */}
        <div className={`md:col-span-9 lg:col-span-10 ${selectedEmail ? "grid grid-cols-1 md:grid-cols-12 gap-4" : ""}`}>
          {/* Email List View (Hidden when viewing an email on mobile) */}
          {(!selectedEmail || !isMobile) && (
            <div className={`${selectedEmail ? "md:col-span-5 lg:col-span-4" : "w-full"} bg-card rounded-lg border`}>
              {/* Email Toolbar */}
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="select-all" 
                    checked={selectedEmails.length === emails.length && emails.length > 0}
                    onCheckedChange={(checked) => checked ? selectAllEmails() : deselectAllEmails()}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={selectAllEmails}>All</DropdownMenuItem>
                      <DropdownMenuItem onClick={deselectAllEmails}>None</DropdownMenuItem>
                      <DropdownMenuItem>Read</DropdownMenuItem>
                      <DropdownMenuItem>Unread</DropdownMenuItem>
                      <DropdownMenuItem>Starred</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {selectedEmails.length > 0 ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem>Mark as read</DropdownMenuItem>
                          <DropdownMenuItem>Mark as unread</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Add star</DropdownMenuItem>
                          <DropdownMenuItem>Remove star</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Add label</DropdownMenuItem>
                          <DropdownMenuItem>Move to</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilterOpen(!filterOpen)}>
                        <Filter className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-xs text-muted-foreground">1-5 of 24</div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filter Options (Expandable) */}
              {filterOpen && (
                <div className="p-3 border-b bg-muted/30">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="h-7 gap-1">
                      <Tag className="h-3 w-3" />
                      <span>Has attachment</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1">
                      <BookOpen className="h-3 w-3" />
                      <span>Unread</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1">
                      <Star className="h-3 w-3" />
                      <span>Starred</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Email List */}
              <div className="divide-y">
                {emails.map((email) => (
                  <div 
                    key={email.id} 
                    className={`p-3 flex gap-3 cursor-pointer hover:bg-muted/50 ${!email.read ? 'bg-primary/5' : ''}`}
                    onClick={() => handleOpenEmail(email.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <Checkbox 
                          checked={selectedEmails.includes(email.id)} 
                          onCheckedChange={() => toggleEmailSelection(email.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5" 
                          onClick={(e) => { e.stopPropagation(); }}
                        >
                          <Star className={`h-4 w-4 ${email.starred ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                        </Button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>{email.from.avatar}</AvatarFallback>
                            </Avatar>
                            <p className={`text-sm font-medium truncate ${!email.read ? 'font-semibold' : ''}`}>
                              {email.from.name}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {email.time}
                          </div>
                        </div>
                        
                        <h4 className={`text-sm truncate ${!email.read ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </h4>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {email.labels.map(label => {
                            const color = 
                              label === "Important" ? "bg-red-500" : 
                              label === "Work" ? "bg-blue-500" : 
                              label === "Design" ? "bg-green-500" : 
                              label === "System" ? "bg-purple-500" : 
                              label === "Team" ? "bg-amber-500" : 
                              label === "Event" ? "bg-pink-500" : "bg-gray-500";
                            
                            return (
                              <div key={label} className="flex items-center gap-1">
                                <span className={`h-2 w-2 rounded-full ${color}`}></span>
                                <span className="text-xs text-muted-foreground">{label}</span>
                              </div>
                            );
                          })}
                          
                          {email.attachments.length > 0 && (
                            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              <span>{email.attachments.length}</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {email.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email View */}
          {selectedEmail && currentEmail && (
            <div className={`${!isMobile ? "md:col-span-7 lg:col-span-8" : "w-full"} bg-card rounded-lg border`}>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isMobile && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCloseEmail}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <h2 className="text-lg font-medium">{currentEmail.subject}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MailOpen className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Reply</DropdownMenuItem>
                      <DropdownMenuItem>Reply all</DropdownMenuItem>
                      <DropdownMenuItem>Forward</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Print</DropdownMenuItem>
                      <DropdownMenuItem>Mark as unread</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>{currentEmail.from.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{currentEmail.from.name}</h3>
                        <Badge variant="outline" className="rounded-sm font-normal">
                          Team Member
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="block sm:inline">{currentEmail.from.email}</span>
                        <span className="hidden sm:inline mx-1">•</span> 
                        <span>To: {currentEmail.to.join(", ")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentEmail.date}, {currentEmail.time}
                  </div>
                </div>

                {/* Email Content */}
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {currentEmail.content.split('\n\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>

                  {/* Attachments */}
                  {currentEmail.attachments.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h4 className="text-sm font-medium">Attachments ({currentEmail.attachments.length})</h4>
                      <div className="flex flex-wrap gap-3">
                        {currentEmail.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-2 border rounded-md p-2 bg-muted/30">
                            <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
                              <File className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{attachment.name}</p>
                              <p className="text-xs text-muted-foreground">{attachment.size}</p>
                            </div>
                            <div className="flex ml-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply section */}
                  <div className="mt-8 pt-4 border-t">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea 
                          className="min-h-[100px]"
                          placeholder="Type your reply here..." 
                        />
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-1">
                              <Paperclip className="h-3 w-3" />
                              <span>Attach</span>
                            </Button>
                          </div>
                          <Button size="sm">
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Compose Email Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-t-lg sm:rounded-lg border shadow-lg flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-medium">New Message</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCloseCompose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Input 
                    placeholder="To" 
                    value={composeData.to}
                    onChange={(e) => handleComposeChange('to', e.target.value)}
                  />
                </div>
                <div>
                  <Input 
                    placeholder="Subject" 
                    value={composeData.subject}
                    onChange={(e) => handleComposeChange('subject', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Textarea 
                    className="min-h-[200px]"
                    placeholder="Write your message here..." 
                    value={composeData.message}
                    onChange={(e) => handleComposeChange('message', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <Paperclip className="h-3 w-3" />
                  <span>Attach</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <MoreVertical className="h-3 w-3" />
                      <span>Options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Save draft</DropdownMenuItem>
                    <DropdownMenuItem>Add CC</DropdownMenuItem>
                    <DropdownMenuItem>Add BCC</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Format text</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <Button size="sm" className="gap-1">
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
