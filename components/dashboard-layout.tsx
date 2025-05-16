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
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Brain,
  Calendar,
  ChevronDown,
  Gamepad2,
  Globe,
  Heart,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Shield,
  Sprout,
  Sun,
  Users,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useMobile } from "@/hooks/use-mobile"
import { CircleJVLoader } from "@/components/ui/loader"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const [searchFocused, setSearchFocused] = useState(false)
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New sprint started", read: false },
    { id: 2, title: "Team meeting in 30 minutes", read: false },
    { id: 3, title: "3 tasks due today", read: true },
  ])

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen)
  }

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length

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
  const navCategories = [
    {
      title: "Main",
      items: [
        {
          title: "Dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
          href: "/dashboard",
          active: pathname === "/dashboard",
          dot: "bg-blue-500",
        },
        {
          title: "Kanban Board",
          icon: <Layers className="h-5 w-5" />,
          href: "/dashboard/kanban",
          active: pathname === "/dashboard/kanban",
          dot: "bg-blue-500",
        },
        {
          title: "Sprints",
          icon: <Sprout className="h-5 w-5" />,
          href: "/dashboard/sprints",
          active: pathname === "/dashboard/sprints",
          dot: "bg-blue-500",
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
          dot: "bg-purple-500",
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
          dot: "bg-rose-500",
        },
        {
          title: "Team Members",
          icon: <Users className="h-5 w-5" />,
          href: "/dashboard/team",
          active: pathname === "/dashboard/team",
          dot: "bg-rose-500",
        },
        {
          title: "Chat",
          icon: <MessageSquare className="h-5 w-5" />,
          href: "/dashboard/chat",
          active: pathname === "/dashboard/chat",
          dot: "bg-rose-500",
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
          dot: "bg-amber-500",
        },
        {
          title: "Ethical Metrics",
          icon: <Shield className="h-5 w-5" />,
          href: "/dashboard/ethical-metrics",
          active: pathname === "/dashboard/ethical-metrics",
          dot: "bg-amber-500",
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
          dot: "bg-green-500",
        },
        {
          title: "Calendar",
          icon: <Calendar className="h-5 w-5" />,
          href: "/dashboard/calendar",
          active: pathname === "/dashboard/calendar",
          dot: "bg-green-500",
        },
        {
          title: "Settings",
          icon: <Settings className="h-5 w-5" />,
          href: "/dashboard/settings",
          active: pathname === "/dashboard/settings",
          dot: "bg-green-500",
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
                priority
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
                {category.items.map((item, itemIdx) => (
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
                        {!sidebarCollapsed && (
                          <span
                            className={cn(
                              "absolute -left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full",
                              item.dot,
                            )}
                          />
                        )}
                      </div>
                      {!sidebarCollapsed && <span>{item.title}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn("w-full justify-start gap-2", sidebarCollapsed && "justify-center p-0")}
              >
                <Avatar className="h-8 w-8 border-2 border-primary/20">
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
            <DropdownMenuContent align={sidebarCollapsed ? "center" : "start"} className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="flex items-center">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
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
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground rounded-full h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
                >
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>English</DropdownMenuItem>
                <DropdownMenuItem>Spanish</DropdownMenuItem>
                <DropdownMenuItem>French</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground rounded-full h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full p-0 text-[10px] sm:text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px] sm:w-80">
                <div className="flex items-center justify-between p-2">
                  <DropdownMenuLabel className="text-sm sm:text-base">Notifications</DropdownMenuLabel>
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs sm:text-sm h-7 sm:h-8">
                    Mark all as read
                  </Button>
                </div>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((notification) => (
                      <DropdownMenuItem key={notification.id} className="flex items-start gap-2 p-3">
                        <div
                          className={cn(
                            "mt-0.5 h-2 w-2 flex-shrink-0 rounded-full",
                            notification.read ? "bg-muted" : "bg-primary",
                          )}
                        />
                        <div className="flex-1">
                          <p className={cn("text-sm", notification.read ? "text-muted-foreground" : "font-medium")}>
                            {notification.title}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <p>No notifications</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-8 sm:h-9 px-1 sm:px-2">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-primary/20">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm">{user.name?.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 sm:w-56">
                <DropdownMenuLabel className="text-sm sm:text-base">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="text-sm">Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex items-center"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="container mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
