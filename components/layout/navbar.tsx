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
import { ChevronDown, Menu, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { OPEN_SEARCH_EVENT } from "@/components/features/site-search"
import { useLocale } from "@/lib/i18n/use-locale"

const menuGroups: { title: keyof typeof menuFeatures; i18nKey: string; items: NavItem[] }[] = [
  { title: "Products", i18nKey: "nav.products", items: productItems },
  { title: "Solutions", i18nKey: "nav.solutions", items: solutionItems },
  { title: "Resources", i18nKey: "nav.resources", items: resourceItems },
]

const directLinks = [
  { title: "Pricing", i18nKey: "nav.pricing", href: "/pricing" },
  { title: "Contact", i18nKey: "nav.contact", href: "/contact" },
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

function MobileGroup({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
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
  const lastScrollY = useRef(0)
  const pathname = usePathname()
  const { t } = useLocale()

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
  const setDrawerOpen = (v: boolean) => {
    setOpen(v)
    if (v) setHidden(false)
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

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              {menuGroups.map((group) => (
                <NavigationMenuItem key={group.title}>
                  <NavigationMenuTrigger className={triggerInk}>{t(group.i18nKey)}</NavigationMenuTrigger>
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
                      {t(link.i18nKey)}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="hidden items-center gap-2 lg:flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>{t("nav.search")}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                &#8984;K
              </kbd>
            </Button>
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{t("nav.login")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">{t("nav.getStarted")}</Link>
            </Button>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
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
                      setOpen(false)
                      window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))
                    }}
                    className="mx-4 mb-2 flex min-h-[48px] items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground"
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    {t("nav.search")}
                  </button>
                  {menuGroups.map((group) => (
                    <MobileGroup
                      key={group.title}
                      title={t(group.i18nKey)}
                      items={group.items}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                  {directLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="min-h-[48px] px-5 py-3 text-sm font-medium hover:bg-accent"
                    >
                      {t(link.i18nKey)}
                    </Link>
                  ))}
                  <div className="mt-2 flex flex-col gap-2 border-t border-border px-5 pt-4">
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link href="/login">{t("nav.login")}</Link>
                    </Button>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/signup">{t("nav.getStarted")}</Link>
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
