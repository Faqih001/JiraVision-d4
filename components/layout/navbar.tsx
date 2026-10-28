"use client"

import { useEffect, useRef, useState } from "react"
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
import { AnnouncementBar } from "@/components/layout/announcement-bar"
import { GoogleTranslateSelect } from "@/components/layout/google-translate"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, type User } from "@/context/auth-context"
import {
  menuFeatures,
  productItems,
  resourceItems,
  solutionItems,
  type MenuFeature,
  type NavItem,
} from "@/content/site"
import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { OPEN_SEARCH_EVENT } from "@/components/features/site-search"

const menuGroups: { title: keyof typeof menuFeatures; items: NavItem[] }[] = [
  { title: "Products", items: productItems },
  { title: "Solutions", items: solutionItems },
  { title: "Resources", items: resourceItems },
]

const directLinks = [
  { title: "Pricing", href: "/pricing" },
  { title: "Contact", href: "/contact" },
]

const triggerInk =
  "relative after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-primary after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100 data-[state=open]:after:scale-x-100 motion-reduce:after:transition-none"

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

function FeaturedCard({ feature }: { feature: MenuFeature }) {
  return (
    <Link href={feature.href} className="group flex h-full flex-col rounded-lg border bg-surface p-4 transition-shadow duration-150 hover:shadow-soft">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay">{feature.eyebrow}</span>
      <span className="mt-1.5 text-sm font-semibold">{feature.title}</span>
      <span className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{feature.body}</span>
      <span className="mt-3 text-xs font-medium text-primary group-hover:underline">{feature.cta} &rarr;</span>
    </Link>
  )
}

/**
 * Two letters from a name ("Amara Okafor" → "AO"), one from a single word, and the email's
 * first letter when there is no name — never an empty circle.
 */
function initialsOf(user: Pick<User, "name" | "email">): string {
  const words = (user.name ?? "").trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return ((user.email ?? "").trim()[0] ?? "?").toUpperCase()
}

function UserAvatar({ user, className }: { user: User; className?: string }) {
  return (
    <Avatar className={cn("border border-border", className)}>
      {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
      <AvatarFallback className="text-xs font-semibold">{initialsOf(user)}</AvatarFallback>
    </Avatar>
  )
}

/**
 * The signed-in half of the header: the avatar replaces the Log in / Get started pair, so a
 * returning member is greeted by their own face instead of an invitation to join.
 */
function AccountMenu() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={`Account menu for ${user.name || user.email}`}
        >
          <UserAvatar user={user} className="h-8 w-8" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()} className="flex items-center">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * each row is told whether it is the open one. Tapping the open row closes it.
 */
function MobileGroup({
  title,
  items,
  open,
  onToggle,
  onNavigate,
}: {
  title: string
  items: NavItem[]
  open: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-sm font-medium"
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
  const { user, isLoading, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // The drawer's open accordion section, by group title. null when they are all closed.
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const lastScrollY = useRef(0)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      if (y <= 0) {
        setHidden(false)
      } else if (y - lastScrollY.current > 8) {
        setHidden(true)
      } else if (lastScrollY.current - y > 8) {
        setHidden(false)
      }
      lastScrollY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Never leave the bar half-hidden mid-page: the drawer opening reveals it.
  // Closing it also resets the accordion, so the next open starts at the top.
  const setDrawerOpen = (v: boolean) => {
    setOpen(v)
    if (v) setHidden(false)
    else setOpenGroup(null)
  }

  // Every way the drawer can dismiss itself goes through here, so the accordion never
  // keeps a section open that the visitor has already left.
  const closeDrawer = () => {
    setOpen(false)
    setOpenGroup(null)
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-transform duration-300 ease-out motion-reduce:transition-none",
        hidden && !open ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <AnnouncementBar />
      <div
        className={cn(
          "border-b bg-background/95 backdrop-blur transition-[height,box-shadow,border-color] duration-200 motion-reduce:transition-none",
          scrolled ? "border-border shadow-soft" : "border-transparent",
        )}
      >
        <div
          className={cn(
            "container flex items-center justify-between gap-4 transition-[height] duration-200 motion-reduce:transition-none",
            scrolled ? "h-14" : "h-16 md:h-20",
          )}
        >
          <BrandMark />

          {/*
            The hover mega-menu is a pointer surface and it is wide: brand, three triggers,
            two direct links and the whole right cluster need about 1120px, so it starts at
            xl (1280). A tablet, portrait or landscape, gets the drawer below that — it is
            tap-sized, and its labels cannot be widened by the translator mid-row.
          */}
          <NavigationMenu className="hidden xl:flex">
            <NavigationMenuList>
              {menuGroups.map((group) => (
                <NavigationMenuItem key={group.title}>
                  <NavigationMenuTrigger className={triggerInk}>{group.title}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[720px] grid-cols-[1fr_1fr_220px] gap-4 p-3">
                      <div className="col-span-2 grid grid-cols-2 gap-1">
                        {group.items.map((item) => (
                          <MenuCard key={item.href} item={item} />
                        ))}
                      </div>
                      <FeaturedCard feature={menuFeatures[group.title]} />
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
              {directLinks.map((link) => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={link.href}
                      aria-current={pathname === link.href ? "page" : undefined}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        triggerInk,
                        "font-medium",
                        pathname === link.href && "text-primary",
                      )}
                    >
                      {link.title}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/*
            One translator per document: this instance is mounted at every width, so the
            container id Google writes into stays unique, and a language picked on a public
            page is in force the moment the visitor signs in. Its label truncates, so the
            row compresses rather than overflowing on a narrow phone.
          */}
          <div className="flex items-center gap-2">
            <GoogleTranslateSelect lazy />

            <div className="hidden items-center gap-2 xl:flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Search</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  &#8984;K
                </kbd>
              </Button>
              <ThemeToggle />
              {/*
                Three states, never two: a member (avatar), no member (the pair), and a first
                read still in flight (a placeholder the same size as the avatar). Guessing
                "signed out" while the cookie is being checked is the flash this avoids.
              */}
              {user ? (
                <AccountMenu />
              ) : isLoading ? (
                <span aria-hidden="true" className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/signup">Get started</Link>
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 xl:hidden">
              <ThemeToggle />
              <Sheet open={open} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto p-0">
                  <SheetHeader className="border-b px-5 py-4 text-left">
                    <SheetTitle>
                      <BrandMark />
                    </SheetTitle>
                    <SheetDescription className="sr-only">Site navigation</SheetDescription>
                  </SheetHeader>
                  <nav className="flex flex-col py-2">
                    <button
                      type="button"
                      onClick={() => {
                        closeDrawer()
                        window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))
                      }}
                      className="mx-4 mb-2 flex min-h-[48px] items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground"
                    >
                      <Search className="h-4 w-4" aria-hidden="true" />
                      Search
                    </button>
                    {menuGroups.map((group) => (
                      <MobileGroup
                        key={group.title}
                        title={group.title}
                        items={group.items}
                        open={openGroup === group.title}
                        onToggle={() => setOpenGroup((current) => (current === group.title ? null : group.title))}
                        onNavigate={closeDrawer}
                      />
                    ))}
                    {directLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeDrawer}
                        className="min-h-[48px] px-5 py-3 text-sm font-medium hover:bg-accent"
                      >
                        {link.title}
                      </Link>
                    ))}
                    <div className="mt-2 flex flex-col gap-2 border-t border-border px-5 pt-4">
                      {user ? (
                        <>
                          <div className="flex items-center gap-3 pb-2">
                            <UserAvatar user={user} className="h-9 w-9" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{user.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <Button asChild onClick={closeDrawer}>
                            <Link href="/dashboard">Dashboard</Link>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              closeDrawer()
                              void logout()
                            }}
                          >
                            Log out
                          </Button>
                        </>
                      ) : isLoading ? (
                        <span
                          aria-hidden="true"
                          className="h-10 w-full animate-pulse rounded-md bg-muted"
                        />
                      ) : (
                        <>
                          <Button asChild variant="outline" onClick={closeDrawer}>
                            <Link href="/login">Log in</Link>
                          </Button>
                          <Button asChild onClick={closeDrawer}>
                            <Link href="/signup">Get started</Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
