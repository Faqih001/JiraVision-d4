"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

const productItems = [
  {
    title: "AI Scrum Master",
    href: "/products/ai-scrum-master",
    description: "Intelligent sprint planning and management with AI assistance",
  },
  {
    title: "Team Wellbeing",
    href: "/products/team-wellbeing",
    description: "Monitor and improve team health and prevent burnout",
  },
  {
    title: "Gamification Suite",
    href: "/products/gamification",
    description: "Increase engagement with game mechanics and rewards",
  },
  {
    title: "Ethical Metrics",
    href: "/products/ethical-metrics",
    description: "Ensure fair and balanced team management practices",
  },
]

const solutionItems = [
  {
    title: "For Startups",
    href: "/solutions/startups",
    description: "Tailored solutions for growing teams and rapid development",
  },
  {
    title: "For Enterprise",
    href: "/solutions/enterprise",
    description: "Scalable solutions for large organizations and complex projects",
  },
  {
    title: "For Agencies",
    href: "/solutions/agencies",
    description: "Flexible tools for client management and creative workflows",
  },
  {
    title: "For Remote Teams",
    href: "/solutions/remote-teams",
    description: "Connect distributed teams with collaborative tools",
  },
]

const resourceItems = [
  {
    title: "Documentation",
    href: "/resources/documentation",
    description: "Comprehensive guides and API references",
  },
  {
    title: "Blog",
    href: "/resources/blog",
    description: "Latest news, tips, and best practices",
  },
  {
    title: "Case Studies",
    href: "/resources/case-studies",
    description: "Success stories from JiraVision customers",
  },
  {
    title: "Webinars",
    href: "/resources/webinars",
    description: "Educational sessions and product demonstrations",
  },
]

export function MainNavbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1 rounded">JV</div>
            <span>JiraVision</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {productItems.map((item) => (
                    <ListItem key={item.title} title={item.title} href={item.href}>
                      {item.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {solutionItems.map((item) => (
                    <ListItem key={item.title} title={item.title} href={item.href}>
                      {item.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {resourceItems.map((item) => (
                    <ListItem key={item.title} title={item.title} href={item.href}>
                      {item.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/pricing" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>Pricing</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/contact" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>Contact</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                <div className="px-2 py-4 font-medium">Products</div>
                {productItems.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="px-2 py-2 text-sm hover:bg-muted rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                <div className="px-2 py-4 font-medium">Solutions</div>
                {solutionItems.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="px-2 py-2 text-sm hover:bg-muted rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                <div className="px-2 py-4 font-medium">Resources</div>
                {resourceItems.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="px-2 py-2 text-sm hover:bg-muted rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                <Link
                  href="/pricing"
                  className="px-2 py-4 font-medium hover:bg-muted rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="/contact"
                  className="px-2 py-4 font-medium hover:bg-muted rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  Contact
                </Link>
                <div className="flex flex-col gap-2 mt-4">
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/signup">
            <Button>Sign Up</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

const ListItem = React.forwardRef<React.ElementRef<"a">, React.ComponentPropsWithoutRef<"a">>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className,
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
          </a>
        </NavigationMenuLink>
      </li>
    )
  },
)
ListItem.displayName = "ListItem"
