"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Search,
  MessageSquare,
  Bell,
  Brain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { Badge } from "@/components/ui/badge"

const mainNavItems = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Products",
    href: "/products",
    children: [
      {
        title: "AI Scrum Master",
        description: "Intelligent sprint planning and team optimization",
        href: "/products/ai-scrum-master",
      },
      {
        title: "Team Wellbeing",
        description: "Monitor and improve team happiness and health",
        href: "/products/team-wellbeing",
      },
      {
        title: "Ethical Metrics",
        description: "Fair workload distribution and diversity insights",
        href: "/products/ethical-metrics",
      },
      {
        title: "Gamification",
        description: "Motivate teams through game-based incentives",
        href: "/products/gamification",
      },
    ],
  },
  {
    title: "Solutions",
    href: "/solutions",
    children: [
      {
        title: "For Enterprise",
        description: "Tailored for large organizations",
        href: "/solutions/enterprise",
      },
      {
        title: "For Startups",
        description: "Scale your agile processes efficiently",
        href: "/solutions/startups",
      },
      {
        title: "For Remote Teams",
        description: "Optimize distributed team collaboration",
        href: "/solutions/remote-teams",
      },
      {
        title: "For Agencies",
        description: "Manage multiple client projects seamlessly",
        href: "/solutions/agencies",
      },
    ],
  },
  {
    title: "Resources",
    href: "/resources",
    children: [
      {
        title: "Blog",
        description: "Latest insights and tips",
        href: "/resources/blog",
      },
      {
        title: "Documentation",
        description: "Detailed guides and tutorials",
        href: "/resources/documentation",
      },
      {
        title: "Webinars",
        description: "Live and recorded sessions",
        href: "/resources/webinars",
      },
      {
        title: "Case Studies",
        description: "Success stories from our customers",
        href: "/resources/case-studies",
      },
    ],
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "About",
    href: "/about",
  },
  {
    title: "Contact",
    href: "/contact",
  },
]

export default function MainNavbar() {
  const { theme, setTheme } = useTheme()
  const { user, isLoading, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile nav when route changes
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  // Handle dropdown hover for desktop
  const handleDropdownEnter = (title: string) => {
    setActiveDropdown(title)
  }

  const handleDropdownLeave = () => {
    setActiveDropdown(null)
  }

  const toggleMobileNav = () => {
    setMobileNavOpen(!mobileNavOpen)
  }

  // Check if the current page is a public page (non-dashboard)
  const isPublicPage = !pathname.startsWith("/dashboard")

  // Don't show navbar on dashboard pages
  if (!isPublicPage) {
    return null
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-200",
        scrolled 
          ? "bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80" 
          : "bg-background"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">JiraVision</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center">
          <ul className="flex space-x-1">
            {mainNavItems.map((item) => (
              <li key={item.title} className="relative">
                {item.children ? (
                  <div
                    onMouseEnter={() => handleDropdownEnter(item.title)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <button
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                        pathname === item.href && "text-primary"
                      )}
                    >
                      {item.title}
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </button>
                    {activeDropdown === item.title && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-md border bg-popover p-1 shadow-md animate-in fade-in-10 slide-in-from-top-2">
                        <div className="grid gap-1 p-2">
                          {item.children?.map((subItem) => (
                            <Link
                              key={subItem.title}
                              href={subItem.href}
                              className={cn(
                                "flex flex-col space-y-0.5 rounded-md p-3 text-sm transition-colors hover:bg-muted",
                                pathname === subItem.href && "bg-muted"
                              )}
                            >
                              <span className="font-medium">{subItem.title}</span>
                              <span className="line-clamp-1 text-xs opacity-70">
                                {subItem.description}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "block px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                      pathname === item.href && "text-primary"
                    )}
                  >
                    {item.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 hidden sm:flex"
            onClick={() => setShowSearchModal(true)}
          >
            <Search className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Search</span>
          </Button>

          {/* User section */}
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-xs text-white flex items-center justify-center">2</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-80 overflow-y-auto">
                    <div className="p-2 hover:bg-muted rounded-md cursor-pointer">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">JD</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <p className="text-sm">John Doe mentioned you in a comment</p>
                          <p className="text-xs text-muted-foreground">2 hours ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 hover:bg-muted rounded-md cursor-pointer">
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 flex items-center justify-center bg-primary/10 rounded-full">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm">New comment on your task "API Integration"</p>
                          <p className="text-xs text-muted-foreground">Yesterday</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2 text-center">
                    <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary">
                      View all notifications
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden md:flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="px-2 gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} alt={user?.name} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">{user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{user.name}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="font-normal text-xs text-muted-foreground">{user.email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} alt={user?.name} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">{user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href="/dashboard">
                      <DropdownMenuItem>Dashboard</DropdownMenuItem>
                    </Link>
                    <Link href="/dashboard/settings">
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white hover:shadow-md transition-all duration-200"
                >
                  Sign up
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Navigation Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleMobileNav}
          >
            {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileNavOpen && (
        <div className="border-t lg:hidden">
          <div className="container mx-auto py-4 px-4 sm:px-8">
            <nav className="flex flex-col space-y-4">
              {mainNavItems.map((item) => (
                <div key={item.title} className="flex flex-col">
                  {item.children ? (
                    <details className="group">
                      <summary className="flex cursor-pointer items-center justify-between py-2 font-medium">
                        {item.title}
                        <ChevronDown className="h-4 w-4 opacity-70 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="ml-4 mt-2 flex flex-col space-y-2">
                        {item.children.map((subItem) => (
                          <Link key={subItem.title} href={subItem.href} className="py-2">
                            <div className="font-medium">{subItem.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {subItem.description}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "py-2 font-medium",
                        pathname === item.href && "text-primary"
                      )}
                    >
                      {item.title}
                    </Link>
                  )}
                  {item.title !== "Contact" && <div className="mt-4 border-t border-border/40" />}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
