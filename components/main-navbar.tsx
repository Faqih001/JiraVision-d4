"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
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
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Menu, ChevronDown, ChevronUp } from "lucide-react"

// Define interfaces for navigation items
interface NavItem {
  title: string;
  href: string;
  description: string;
  image?: string;
}

// Add this new component for mobile navigation
function MobileNavAccordion({ 
  title, 
  items, 
  setIsOpen 
}: { 
  title: string; 
  items: NavItem[]; 
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>> 
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <button
        className="flex w-full items-center justify-between px-2 py-3 font-medium"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {title}
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="pb-2">
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted rounded-md mx-2 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <div className="h-8 w-8 rounded overflow-hidden flex-shrink-0">
                <Image 
                  src={item.image || "/placeholder.svg"} 
                  alt={item.title} 
                  width={32}
                  height={32}
                  className="object-cover w-full h-full" 
                />
              </div>
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

const productItems = [
  {
    title: "AI Scrum Master",
    href: "/products/ai-scrum-master",
    description: "Intelligent sprint planning and management with AI assistance",
    image:
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Team Wellbeing",
    href: "/products/team-wellbeing",
    description: "Monitor and improve team health and prevent burnout",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Gamification Suite",
    href: "/products/gamification",
    description: "Increase engagement with game mechanics and rewards",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Ethical Metrics",
    href: "/products/ethical-metrics",
    description: "Ensure fair and balanced team management practices",
    image:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
]

const solutionItems = [
  {
    title: "For Startups",
    href: "/solutions/startups",
    description: "Tailored solutions for growing teams and rapid development",
    image:
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "For Enterprise",
    href: "/solutions/enterprise",
    description: "Scalable solutions for large organizations and complex projects",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "For Agencies",
    href: "/solutions/agencies",
    description: "Flexible tools for client management and creative workflows",
    image:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "For Remote Teams",
    href: "/solutions/remote-teams",
    description: "Connect distributed teams with collaborative tools",
    image:
      "https://images.unsplash.com/photo-1528901166007-3784c7dd3653?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
]

const resourceItems = [
  {
    title: "Documentation",
    href: "/resources/documentation",
    description: "Comprehensive guides and API references",
    image:
      "https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Blog",
    href: "/resources/blog",
    description: "Latest news, tips, and best practices",
    image:
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Case Studies",
    href: "/resources/case-studies",
    description: "Success stories from JiraVision customers",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Webinars",
    href: "/resources/webinars",
    description: "Educational sessions and product demonstrations",
    image:
      "https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  },
]

export function MainNavbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative">
              <Image 
                src="/jiravision_logo.png" 
                alt="JiraVision"
                width={32}
                height={32}
                className="object-contain"
                loading="eager" 
              />
            </div>
            <span>JiraVision</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[750px] p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {productItems.map((item) => (
                      <Link key={item.title} href={item.href} className="group block">
                        <div className="flex gap-4 rounded-lg p-3 hover:bg-muted transition-colors">
                          <div className="h-16 w-16 rounded-md overflow-hidden relative">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.title}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[750px] p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {solutionItems.map((item) => (
                      <Link key={item.title} href={item.href} className="group block">
                        <div className="flex gap-4 rounded-lg p-3 hover:bg-muted transition-colors">
                          <div className="h-16 w-16 rounded-md overflow-hidden relative">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.title}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[750px] p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {resourceItems.map((item) => (
                      <Link key={item.title} href={item.href} className="group block">
                        <div className="flex gap-4 rounded-lg p-3 hover:bg-muted transition-colors">
                          <div className="h-16 w-16 rounded-md overflow-hidden relative">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.title}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
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
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto max-h-screen">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Navigation links and options</SheetDescription>
              </SheetHeader>
              <div className="flex items-center gap-2 font-bold text-xl mb-6">
                <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <div className="relative">
                    <Image 
                      src="/jiravision_logo.png" 
                      alt="JiraVision"
                      width={32}
                      height={32}
                      className="object-contain"
                      loading="eager"
                    />
                  </div>
                  <span>JiraVision</span>
                </Link>
              </div>
              <nav className="flex flex-col gap-2">
                <MobileNavAccordion title="Products" items={productItems} setIsOpen={setIsOpen} />
                <MobileNavAccordion title="Solutions" items={solutionItems} setIsOpen={setIsOpen} />
                <MobileNavAccordion title="Resources" items={resourceItems} setIsOpen={setIsOpen} />

                <Link
                  href="/pricing"
                  className="px-2 py-3 font-medium hover:bg-muted rounded-md transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="/contact"
                  className="px-2 py-3 font-medium hover:bg-muted rounded-md transition-colors"
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
