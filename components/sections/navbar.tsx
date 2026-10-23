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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AnnouncementBar } from "@/components/sections/announcement-bar"
import { ThemeToggle } from "@/components/sections/theme-toggle"
import { productItems, resourceItems, solutionItems, type NavItem } from "@/content/site"
import { ChevronDown, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

const menuGroups = [
  { title: "Products", items: productItems },
  { title: "Solutions", items: solutionItems },
  { title: "Resources", items: resourceItems },
]

const directLinks = [
  { title: "Pricing", href: "/pricing" },
  { title: "Contact", href: "/contact" },
]

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="JiraVision home">
      <Image src="/jiravision_logo.png" alt="" width={34} height={34} className="object-contain" priority />
      <span className="font-display text-lg font-semibold tracking-tight">JiraVision</span>
    </Link>
  )
}

function MenuCard({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <Link href={item.href} onClick={onNavigate} className="group block rounded-md">
      <div className="flex gap-3 rounded-md p-2 transition-colors duration-150 hover:bg-accent">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded">
          <Image
            src={item.image || "/placeholder.svg"}
            alt=""
            fill
            sizes="56px"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium group-hover:text-primary">{item.title}</div>
          <div className="text-xs leading-relaxed text-muted-foreground">{item.description}</div>
        </div>
      </div>
    </Link>
  )
}

function MobileGroup({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-3 text-sm font-medium"
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="pb-2">
          {items.map((item) => (
            <MenuCard key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <AnnouncementBar />
      <div className="container flex h-16 items-center justify-between gap-4">
        <BrandMark />

        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            {menuGroups.map((group) => (
              <NavigationMenuItem key={group.title}>
                <NavigationMenuTrigger>{group.title}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[560px] p-2">
                    <div className="grid grid-cols-2 gap-1">
                      {group.items.map((item) => (
                        <MenuCard key={item.href} item={item} />
                      ))}
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
            {directLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <Link href={link.href} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "font-medium",
                      pathname === link.href && "text-primary",
                    )}
                  >
                    {link.title}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto p-0">
              <SheetHeader className="border-b px-5 py-4 text-left">
                <SheetTitle>
                  <BrandMark />
                </SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col py-2">
                {menuGroups.map((group) => (
                  <MobileGroup key={group.title} title={group.title} items={group.items} onNavigate={() => setOpen(false)} />
                ))}
                {directLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="px-5 py-3 text-sm font-medium hover:bg-accent"
                  >
                    {link.title}
                  </Link>
                ))}
                <div className="mt-2 flex flex-col gap-2 border-t border-border px-5 pt-4">
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link href="/signup">Get started</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
