"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import NotificationsBell from "@/components/notifications-bell"
import { AssistantPanel } from "@/components/assistant-panel"
import { GoogleTranslateSelect } from "@/components/layout/google-translate"
import { ThemeSwitch } from "@/components/theme-switch"
import { AccessibilityLauncher } from "@/components/accessibility/accessibility-launcher"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Calendar,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Gamepad2,
  Heart,
  Home,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Repeat,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sprout,
  Sun,
  Target,
  Users,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useMobile } from "@/hooks/use-mobile"
import { CircleJVLoader } from "@/components/ui/loader"

/** Nav entries that can carry a live "N new" count. */
type BadgeKey = "activity" | "chat"

type NavItem = {
  title: string
  icon: React.ReactNode
  href: string
  active: boolean
  badge?: BadgeKey
}

type NavCategory = { title: string; items: NavItem[] }

const badgeCount = (count: number) => (count > 99 ? "99+" : String(count))

/**
 * The five account actions, shared by the top bar and the sidebar footer so the two
 * triggers can never drift apart. "Home" leaves the workspace for the public site;
 * everything else stays inside it.
 */
function AccountMenuContent() {
  const { user, logout } = useAuth()
  // `theme` is the preference and is usually "system"; only resolvedTheme says what
  // the page actually looks like.
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <>
      <DropdownMenuLabel className="text-xs sm:text-sm">
        <span className="block truncate font-medium">{user?.name}</span>
        <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/" className="flex items-center">
          <Home className="mr-2 h-4 w-4" />
          <span className="text-sm">Home</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/settings" className="flex items-center">
          <Settings className="mr-2 h-4 w-4" />
          <span className="text-sm">Settings</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/billing" className="flex items-center">
          <CreditCard className="mr-2 h-4 w-4" />
          <span className="text-sm">Billing</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")} className="flex items-center">
        {/* One icon, and it shows the mode the click is going to, not the one on screen. */}
        {isDark ? (
          <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
        ) : (
          <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        <span className="text-sm">{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={logout} className="flex items-center">
        <LogOut className="mr-2 h-4 w-4" />
        <span className="text-sm">Log out</span>
      </DropdownMenuItem>
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const isMobile = useMobile()
  const [searchFocused, setSearchFocused] = useState(false)
  // null while the first read is in flight (or failed) so a badge never claims zero.
  const [newCounts, setNewCounts] = useState<Record<BadgeKey, number | null>>({ activity: null, chat: null })

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen)
  }

  // Unread notifications and unread chat messages are the two stores with real
  // read-state, so they are the only items that can honestly say "new".
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      const [notifications, chats] = await Promise.all([
        fetch("/api/notifications?limit=1")
          .then((res) => (res.ok ? (res.json() as Promise<{ unreadCount?: number }>) : null))
          .catch(() => null),
        fetch("/api/chat")
          .then((res) => (res.ok ? (res.json() as Promise<{ unreadCount?: number }[]>) : null))
          .catch(() => null),
      ])
      if (cancelled) return
      setNewCounts({
        activity: typeof notifications?.unreadCount === "number" ? notifications.unreadCount : null,
        chat: Array.isArray(chats)
          ? chats.reduce((sum, chat) => sum + (typeof chat.unreadCount === "number" ? chat.unreadCount : 0), 0)
          : null,
      })
    }
    void load()
    const timer = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [user, pathname])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }

    // Close mobile sidebar when changing routes
    setMobileSidebarOpen(false)

    // Auto-collapse sidebar on mobile
    if (isMobile) {
      setSidebarCollapsed(true)
    }
  }, [user, isLoading, router, pathname, isMobile])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <CircleJVLoader size="md" showText={true} />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Navigation categories
  const navCategories: NavCategory[] = [
    {
      title: "Main",
      items: [
        {
          title: "Dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
          href: "/dashboard",
          active: pathname === "/dashboard",
        },
        {
          title: "Kanban Board",
          icon: <Layers className="h-5 w-5" />,
          href: "/dashboard/kanban",
          active: pathname === "/dashboard/kanban",
        },
        {
          title: "Sprints",
          icon: <Sprout className="h-5 w-5" />,
          href: "/dashboard/sprints",
          active: pathname === "/dashboard/sprints",
        },
        {
          title: "Tasks",
          icon: <ClipboardList className="h-5 w-5" />,
          href: "/dashboard/tasks",
          active: pathname === "/dashboard/tasks",
        },
        {
          title: "Work Log",
          icon: <CalendarCheck className="h-5 w-5" />,
          href: "/dashboard/worklog",
          active: pathname === "/dashboard/worklog",
        },
        {
          title: "Work Reports",
          icon: <FileText className="h-5 w-5" />,
          href: "/dashboard/reports-work",
          active: pathname === "/dashboard/reports-work",
        },
        {
          title: "Backlog",
          icon: <Inbox className="h-5 w-5" />,
          href: "/dashboard/backlog",
          active: pathname === "/dashboard/backlog",
        },
      ],
    },
    {
      title: "Planning",
      items: [
        {
          title: "Goals & OKRs",
          icon: <Target className="h-5 w-5" />,
          href: "/dashboard/goals",
          active: pathname === "/dashboard/goals",
        },
        {
          title: "Retrospectives",
          icon: <Repeat className="h-5 w-5" />,
          href: "/dashboard/retros",
          active: pathname === "/dashboard/retros",
        },
        {
          title: "Automation",
          icon: <Bot className="h-5 w-5" />,
          href: "/dashboard/automation",
          active: pathname === "/dashboard/automation",
        },
      ],
    },
    {
      title: "AI Features",
      items: [
        {
          title: "AI Scrum Master",
          icon: <Brain className="h-5 w-5" />,
          href: "/dashboard/ai-scrum-master",
          active: pathname === "/dashboard/ai-scrum-master",
        },
      ],
    },
    {
      title: "Team",
      items: [
        {
          title: "Team Wellbeing",
          icon: <Heart className="h-5 w-5" />,
          href: "/dashboard/team-wellbeing",
          active: pathname === "/dashboard/team-wellbeing",
        },
        {
          title: "Team Members",
          icon: <Users className="h-5 w-5" />,
          href: "/dashboard/team",
          active: pathname === "/dashboard/team",
        },
        {
          title: "Team Settings",
          icon: <SlidersHorizontal className="h-5 w-5" />,
          href: "/dashboard/team/settings",
          active: pathname === "/dashboard/team/settings",
        },
        {
          title: "Chat",
          icon: <MessageSquare className="h-5 w-5" />,
          href: "/dashboard/chat",
          active: pathname === "/dashboard/chat",
          badge: "chat",
        },
      ],
    },
    {
      title: "Metrics",
      items: [
        {
          title: "Gamification",
          icon: <Gamepad2 className="h-5 w-5" />,
          href: "/dashboard/gamification",
          active: pathname === "/dashboard/gamification",
        },
        {
          title: "Ethical Metrics",
          icon: <Shield className="h-5 w-5" />,
          href: "/dashboard/ethical-metrics",
          active: pathname === "/dashboard/ethical-metrics",
        },
        {
          title: "Analytics",
          icon: <BarChart3 className="h-5 w-5" />,
          href: "/dashboard/analytics",
          active: pathname === "/dashboard/analytics",
        },
        {
          title: "Reports",
          icon: <FileSpreadsheet className="h-5 w-5" />,
          href: "/dashboard/reports",
          active: pathname === "/dashboard/reports",
        },
        {
          title: "Activity",
          icon: <Activity className="h-5 w-5" />,
          href: "/dashboard/activity",
          active: pathname === "/dashboard/activity",
          badge: "activity",
        },
      ],
    },
    {
      title: "Applications",
      items: [
        {
          title: "Email",
          icon: <Mail className="h-5 w-5" />,
          href: "/dashboard/email",
          active: pathname === "/dashboard/email",
        },
        {
          title: "Calendar",
          icon: <Calendar className="h-5 w-5" />,
          href: "/dashboard/calendar",
          active: pathname === "/dashboard/calendar",
        },
        {
          title: "Billing",
          icon: <CreditCard className="h-5 w-5" />,
          href: "/dashboard/billing",
          active: pathname === "/dashboard/billing",
        },
        {
          title: "Settings",
          icon: <Settings className="h-5 w-5" />,
          href: "/dashboard/settings",
          active: pathname === "/dashboard/settings",
        },
      ],
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7fb] dark:bg-gray-950">
      {/* Sidebar - Always visible on desktop, toggleable on mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out lg:relative",
          sidebarCollapsed ? "w-[70px]" : "w-[250px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "shadow-lg lg:shadow-none", // Added shadow for better visibility on mobile
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className={cn("relative", sidebarCollapsed ? "mx-auto" : "")}>
              <Image 
                src="/jiravision_logo.png" 
                alt="JiraVision"
                width={32}
                height={32}
                className="object-contain"
                loading="eager"
              />
            </div>
            {!sidebarCollapsed && <span className="font-bold text-xl">JiraVision</span>}
          </Link>
          <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={toggleSidebar}>
            {sidebarCollapsed ? (
              <ChevronDown className="h-5 w-5 rotate-90" />
            ) : (
              <ChevronDown className="h-5 w-5 -rotate-90" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobileSidebar}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          {navCategories.map((category, idx) => (
            <div key={idx} className={cn("mb-4", sidebarCollapsed ? "px-2" : "px-4")}>
              {!sidebarCollapsed && (
                <h3 className="mb-1 text-xs font-medium uppercase text-muted-foreground tracking-wider">
                  {category.title}
                </h3>
              )}
              <ul className={cn("space-y-1", sidebarCollapsed && "border-t pt-2 first:border-t-0")}>
                {category.items.map((item, itemIdx) => {
                  const count = item.badge ? newCounts[item.badge] : null
                  return (
                    <li key={itemIdx}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
                          item.active ? "bg-gray-100 dark:bg-gray-800 text-primary" : "text-gray-700 dark:text-gray-300",
                          sidebarCollapsed && "justify-center px-0",
                        )}
                      >
                        <div className="relative">
                          <span className={cn("text-current", item.active && "text-primary")}>{item.icon}</span>
                          {sidebarCollapsed && count ? (
                            <Badge
                              aria-hidden="true"
                              className="absolute -right-2.5 -top-2 h-4 min-w-4 justify-center border-0 px-1 text-[10px] leading-none"
                            >
                              {badgeCount(count)}
                            </Badge>
                          ) : null}
                        </div>
                        <span className={cn(sidebarCollapsed && "sr-only")}>{item.title}</span>
                        {!sidebarCollapsed && count ? (
                          <Badge
                            aria-hidden="true"
                            className="ml-auto h-5 min-w-5 justify-center border-0 px-1.5 text-[11px] leading-none"
                          >
                            {badgeCount(count)}
                          </Badge>
                        ) : null}
                        {count ? <span className="sr-only">{`${count} new`}</span> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t p-4">
          {/* Below 768px the top bar has no room for the language dropdown, so the
              drawer carries it instead — and only one of the two is ever mounted. */}
          {isMobile && (
            <div className="mb-3 flex justify-center">
              <GoogleTranslateSelect />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 rounded-full border border-border bg-card",
                  sidebarCollapsed && "justify-center p-1",
                )}
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <>
                    <span className="truncate">{user.name}</span>
                    <ChevronDown className="ml-auto h-4 w-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={sidebarCollapsed ? "center" : "start"} side="right" className="w-60">
              <AccountMenuContent />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={toggleMobileSidebar} aria-hidden="true" />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white dark:bg-gray-900 px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobileSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
            <div
              className={cn(
                "relative flex items-center transition-all",
                searchFocused ? "w-[180px] sm:w-[250px] md:w-[300px] lg:w-[400px]" : "w-[150px] sm:w-[200px] md:w-[250px] lg:w-[300px]",
              )}
            >
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-9 h-9 bg-gray-50 dark:bg-gray-800 border-0 text-sm"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3">
            {!isMobile && <ThemeSwitch />}

            {!isMobile && <GoogleTranslateSelect />}

            {!isMobile && <AssistantPanel />}

            <NotificationsBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 gap-2 rounded-full border border-border bg-card px-1 hover:bg-muted sm:px-2"
                >
                  <Avatar className="h-7 w-7 border border-border sm:h-8 sm:w-8">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm md:inline">{user.name?.split(" ")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 sm:w-60">
                <AccountMenuContent />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto overflow-x-hidden">
            <div className="container mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Bottom-right, stacked above the assistant pill; the panel it opens is mounted
          once in the root layout. It steps aside while the mobile drawer is over it. */}
      <AccessibilityLauncher className={mobileSidebarOpen ? "hidden" : undefined} />
    </div>
  )
}
