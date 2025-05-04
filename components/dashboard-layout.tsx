"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { AIModelType } from "@/lib/ai-models"
import { useTheme } from "next-themes"

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

// Icons
import {
  ActivitySquare,
  AlertCircle,
  Blocks,
  Brain,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  Code,
  Command,
  Gamepad2,
  Gauge,
  Heart,
  History,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageCircle,
  Paperclip,
  PieChart,
  Plus,
  Puzzle,
  RefreshCcw,
  Scale,
  Search,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Star,
  Trophy,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react"

// Interface definitions
interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  isNew?: boolean;
  hasNotification?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [aiAssistantMinimized, setAiAssistantMinimized] = useState(true)
  const [aiTyping, setAiTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [currentDate] = useState(new Date())
  
  // Mini-dashboard KPIs for the top-right corner
  const keyMetrics = {
    sprintProgress: 68,
    tasksCompleted: 42,
    teamMood: "Positive",
    nextMeeting: "Daily Standup in 47m",
  }
  
  // Navigation structure
  const navGroups: NavGroup[] = [
    {
      title: "Core",
      items: [
        {
          title: "Overview",
          href: "/dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          title: "Sprints",
          href: "/dashboard/sprints",
          icon: <Sprout className="h-5 w-5" />,
          hasNotification: true,
        },
        {
          title: "AI Scrum Master",
          href: "/dashboard/ai-scrum-master",
          icon: <Brain className="h-5 w-5" />,
          isNew: true,
        },
      ],
    },
    {
      title: "Insights & Analytics",
      items: [
        {
          title: "Team Wellbeing",
          href: "/dashboard/team-wellbeing",
          icon: <Heart className="h-5 w-5" />,
        },
        {
          title: "Gamification",
          href: "/dashboard/gamification",
          icon: <Trophy className="h-5 w-5" />,
        },
        {
          title: "Ethical Metrics",
          href: "/dashboard/ethical-metrics",
          icon: <Scale className="h-5 w-5" />,
        },
      ],
    },
    {
      title: "Collaboration",
      items: [
        {
          title: "Team",
          href: "/dashboard/team",
          icon: <Users className="h-5 w-5" />,
        },
        {
          title: "Chat",
          href: "/dashboard/chat",
          icon: <MessageCircle className="h-5 w-5" />,
          hasNotification: true,
        },
        {
          title: "Integrations",
          href: "/dashboard/integrations",
          icon: <Puzzle className="h-5 w-5" />,
        },
      ],
    },
  ]
  
  // Quick actions for the floating action button
  const quickActions = [
    { title: "Create Task", icon: <Plus className="h-4 w-4" />, action: () => console.log("Create task") },
    { title: "Start Sprint", icon: <Zap className="h-4 w-4" />, action: () => console.log("Start sprint") },
    { title: "Schedule Meeting", icon: <Calendar className="h-4 w-4" />, action: () => console.log("Schedule meeting") },
    { title: "Ask AI Assistant", icon: <Sparkles className="h-4 w-4" />, action: () => setAiAssistantMinimized(false) },
  ]

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  // Simulate AI typing effect for demo
  const simulateAiResponse = () => {
    setAiTyping(true)
    setTimeout(() => {
      setAiTyping(false)
    }, 2000)
  }

  // Handle search functionality
  const handleSearchFocus = () => {
    setIsSearching(true)
  }

  const handleSearchBlur = () => {
    if (!searchQuery) {
      setIsSearching(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Searching for:", searchQuery)
    // Implement search functionality here
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-gradient-to-br from-primary to-purple-600"></div>
            <div className="text-2xl font-bold">JiraVision</div>
          </div>
          <Progress value={60} className="w-48 h-2" />
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden h-full flex-shrink-0 flex-col border-r bg-card transition-all duration-300 ease-in-out lg:flex",
          sidebarCollapsed ? "w-[70px]" : "w-[280px]"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b px-4 backdrop-blur-sm bg-background/80">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
              <Wand2 className="h-5 w-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && <span className="font-semibold">JiraVision</span>}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-muted-foreground hover:text-foreground"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* User Section */}
        <div className={cn("flex items-center gap-3 border-b p-4", sidebarCollapsed && "justify-center")}>
          <Avatar className="h-10 w-10 ring-2 ring-primary ring-offset-2 ring-offset-background">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          {!sidebarCollapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          )}
          
          {!sidebarCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="flex items-center cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="px-3 py-2">
              {!sidebarCollapsed && (
                <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item, itemIndex) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link 
                      key={itemIndex}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive 
                          ? "bg-gradient-to-r from-primary to-primary-foreground/20 text-primary-foreground" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        sidebarCollapsed && "justify-center"
                      )}
                    >
                      <div className="relative">
                        {item.icon}
                        {item.hasNotification && (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <div className="flex flex-1 items-center justify-between">
                          <span>{item.title}</span>
                          {item.isNew && <Badge variant="outline" className="text-xs py-0 animate-pulse bg-primary/10">New</Badge>}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        {!sidebarCollapsed && (
          <div className="mt-auto border-t p-4 backdrop-blur-sm bg-background/80">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">AI Assistant</span>
              </div>
              <Badge variant="secondary" className="text-xs">Granite</Badge>
            </div>
            <Button 
              onClick={() => setAiAssistantMinimized(false)}
              className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask AI Assistant</span>
            </Button>
          </div>
        )}

        {/* Collapsed Mode Bottom Actions */}
        {sidebarCollapsed && (
          <div className="mt-auto border-t p-3 backdrop-blur-sm bg-background/80">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAiAssistantMinimized(false)}
                    className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-primary-foreground hover:shadow-md transition-all duration-200"
                  >
                    <Brain className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Ask AI Assistant
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[85%] max-w-[300px] p-0">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center justify-between border-b px-4 backdrop-blur-sm bg-background/80">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                  <Wand2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">JiraVision</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3 border-b p-4">
              <Avatar className="h-10 w-10 ring-2 ring-primary/60 ring-offset-2 ring-offset-background">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="flex items-center cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {navGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="px-3 py-2">
                  <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item, itemIndex) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={itemIndex}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-gradient-to-r from-primary to-primary-foreground/20 text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                          onClick={() => setMobileSidebarOpen(false)}
                        >
                          <div className="relative">
                            {item.icon}
                            {item.hasNotification && (
                              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                            )}
                          </div>
                          <span>{item.title}</span>
                          {item.isNew && <Badge variant="outline" className="ml-auto text-xs animate-pulse bg-primary/10">New</Badge>}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-4 backdrop-blur-sm bg-background/80">
              <Button
                onClick={() => {
                  setMobileSidebarOpen(false)
                  setAiAssistantMinimized(false)
                }}
                className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Sparkles className="h-4 w-4" />
                <span>Ask AI Assistant</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header/Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search with command trigger */}
          <div className="relative flex-1 max-w-md">
            <form onSubmit={handleSearch} className="relative">
              <Search className={cn(
                "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                isSearching && "text-foreground"
              )} />
              <input
                type="search"
                placeholder="Search tasks, sprints, team..."
                className={cn(
                  "w-full rounded-full bg-accent/50 py-2 pl-10 pr-4 text-sm outline-none transition-all",
                  "placeholder:text-muted-foreground/70",
                  "focus:bg-background focus:ring-2 focus:ring-primary/30 focus:shadow-sm",
                  isSearching && "bg-background ring-2 ring-primary/30"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
              />
              <kbd 
                className={cn(
                  "pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity md:inline-block",
                  isSearching && "opacity-100"
                )}
              >
                ESC
              </kbd>
            </form>
            {isSearching && searchQuery && (
              <div className="absolute top-full z-50 mt-2 w-full rounded-md border bg-popover p-2 shadow-md">
                <div className="p-1 text-xs font-medium text-muted-foreground">Quick Results</div>
                <div className="py-1">
                  <Button variant="ghost" className="w-full justify-start px-2 py-1.5 text-sm">
                    <span>API Integration Sprint</span>
                    <Badge variant="outline" className="ml-auto">Sprint</Badge>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start px-2 py-1.5 text-sm">
                    <span>Optimize Authentication Flow</span>
                    <Badge variant="outline" className="ml-auto">Task</Badge>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* KPIs and Mini-Dashboard */}
          <div className="hidden md:flex items-center gap-4 p-1 rounded-full bg-muted/50 px-4">
            <div className="flex items-center gap-1" title="Sprint Progress">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">{keyMetrics.sprintProgress}%</span>
            </div>
            <div className="h-4 border-r"></div>
            <div className="flex items-center gap-1" title="Tasks Completed">
              <ActivitySquare className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium">{keyMetrics.tasksCompleted}</span>
            </div>
            <div className="h-4 border-r"></div>
            <div className="flex items-center gap-1" title="Team Mood">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-medium">{keyMetrics.teamMood}</span>
            </div>
            <div className="h-4 border-r"></div>
            <div className="flex items-center gap-1" title="Next Calendar Event">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">{keyMetrics.nextMeeting}</span>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">3</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
              <RefreshCcw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
              <CircleHelp className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-primary/30"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full border-primary/30">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>{user.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto p-4 lg:p-6">{children}</div>
        </main>

        {/* Floating Action Button */}
        <div className="fixed right-6 bottom-6 z-40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-purple-600 hover:shadow-xl hover:from-primary/90 hover:to-purple-700 transition-all duration-200">
                <Plus className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {quickActions.map((action, index) => (
                <DropdownMenuItem key={index} onClick={action.action} className="cursor-pointer">
                  <div className="mr-2">{action.icon}</div>
                  <span>{action.title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Assistant Panel */}
      <AnimatePresence>
        {!aiAssistantMinimized && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-card shadow-lg md:max-w-md"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b p-4 backdrop-blur-sm bg-background/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-md">
                    <Brain className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">JiraVision Assistant</h3>
                    <p className="text-xs text-muted-foreground">Powered by IBM Granite</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setAiAssistantMinimized(true)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-6 rounded-xl bg-primary/10 p-4 shadow-sm">
                  <h4 className="mb-2 font-medium">AI Assistant • IBM Granite</h4>
                  <p className="text-sm text-muted-foreground">
                    I can help you manage sprints, analyze team performance, draft communications, 
                    suggest workload optimizations, and more. What would you like to do today?
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Sample AI conversation */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg rounded-tr-none bg-primary px-4 py-3 text-primary-foreground">
                      <p className="text-sm">How is our current sprint progressing?</p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="max-w-[80%] rounded-lg rounded-tl-none bg-muted px-4 py-3">
                      <p className="text-sm">
                        Your current sprint (May 2025-05) is 68% complete with 5 days remaining. 
                        42 out of 61 tasks are completed, putting you slightly ahead of schedule.
                        <br /><br />
                        The team's velocity is 15% higher than your previous sprint. The API integration task 
                        has been flagged as at risk due to dependency issues.
                        <br /><br />
                        Would you like me to suggest some resource reallocation options to address the at-risk task?
                      </p>
                    </div>
                  </div>
                  
                  {/* AI typing indicator */}
                  {aiTyping && (
                    <div className="flex">
                      <div className="max-w-[80%] rounded-lg rounded-tl-none bg-muted px-4 py-3">
                        <div className="flex space-x-2">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-primary"></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.2s' }}></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t p-4 backdrop-blur-sm bg-background/80">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={simulateAiResponse}
                    className="h-auto py-1.5 text-xs bg-muted/50 hover:bg-muted transition-colors"
                  >
                    Yes, suggest resource reallocation
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={simulateAiResponse}
                    className="h-auto py-1.5 text-xs bg-muted/50 hover:bg-muted transition-colors"
                  >
                    Show me team velocity trends
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={simulateAiResponse}
                    className="h-auto py-1.5 text-xs bg-muted/50 hover:bg-muted transition-colors"
                  >
                    Focus on at-risk tasks
                  </Button>
                </div>
                
                <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); simulateAiResponse(); }}>
                  <input
                    type="text"
                    placeholder="Ask the AI assistant..."
                    className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button type="submit" size="icon" className="rounded-full bg-primary hover:bg-primary/90">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Lucide Icon component
function Bell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <path d="M4 2C2.8 3.7 2 5.7 2 8" />
      <path d="M22 8c0-2.3-.8-4.3-2-6" />
    </svg>
  )
}

function Sun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function Moon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}
