"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
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
} from "@/components/ui/sheet"
import { AnnouncementBar } from "@/components/layout/announcement-bar"
import { GoogleTranslateSelect } from "@/components/layout/google-translate"
import { OPEN_MOBILE_NAV_EVENT } from "@/components/layout/bottom-bar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import {
  menuFeatures,
  productItems,
  resourceItems,
  solutionItems,
  type MenuFeature,
  type NavItem,
} from "@/content/site"
import { ChevronDown, Search } from "lucide-react"
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

/*
  Below xl the header bar is not rendered at all: a phone or a tablet gets the bottom tab
  bar, and its Menu tab opens the drawer rendered under this header. The split is JavaScript
  rather than a pair of visibility classes because the language picker exists in both places
  and Google writes into one container id per document — two mounted pickers would fight
  over it.
*/
const DESKTOP_NAV_QUERY = "(min-width: 1280px)"

function subscribeDesktopNav(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_NAV_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const readDesktopNav = () => window.matchMedia(DESKTOP_NAV_QUERY).matches
// The server has no viewport, so the first paint is the desk bar; a phone or a tablet
// re-reads the query as soon as it hydrates.
const readDesktopNavOnServer = () => true

function useDesktopNav() {
  return useSyncExternalStore(subscribeDesktopNav, readDesktopNav, readDesktopNavOnServer)
}

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
 * One drawer group can be open at a time, so the accordion state lives on the Navbar and
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
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // The drawer's open accordion section, by group title. null when they are all closed.
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const desktopNav = useDesktopNav()
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

  // The mobile bottom bar's "Menu" tab opens this drawer.
  useEffect(() => {
    const openNav = () => {
      setOpen(true)
      setHidden(false)
    }
    window.addEventListener(OPEN_MOBILE_NAV_EVENT, openNav)
    return () => window.removeEventListener(OPEN_MOBILE_NAV_EVENT, openNav)
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
      {desktopNav && (
        <div
          className={cn(
            "border-b bg-background/95 backdrop-blur transition-[height,box-shadow,border-color] duration-200 motion-reduce:transition-none",
            scrolled ? "border-border shadow-soft" : "border-transparent",
          )}
        >
          <div
            className={cn(
              "container flex items-center justify-between gap-4 transition-[height] duration-200 motion-reduce:transition-none",
              scrolled ? "h-14" : "h-20",
            )}
          >
            <BrandMark />

            {/*
              This whole bar is the desk surface: brand, three hover triggers, two direct
              links and the right cluster need about 1120px. Below xl the visitor is on a
              phone or a tablet, so the bar is not rendered at all and the bottom tab bar
              takes its place.
            */}
            <NavigationMenu>
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

            <div className="flex items-center gap-2">
              {/*
                One translator per document: the desk bar and the drawer are opposite branches
                of desktopNav, so the container id Google writes into stays unique and a
                language picked on a public page is in force the moment the visitor signs in.
              */}
              <GoogleTranslateSelect lazy />
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/*
        Below xl this drawer is the site navigation, and the bottom tab bar's Menu tab is its
        only trigger — the bar that used to hold a hamburger is not rendered there at all.
      */}
      <Sheet open={open} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto p-0">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle>
              <BrandMark />
            </SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col py-2">
            <div className="mx-4 mb-2 flex items-center gap-2">
              <GoogleTranslateSelect lazy />
              <ThemeToggle />
            </div>
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
              <Button asChild variant="outline" onClick={closeDrawer}>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild onClick={closeDrawer}>
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}
