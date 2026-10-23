"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Home, Menu, Search, Tag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OPEN_SEARCH_EVENT } from "@/components/features/site-search"
import { cn } from "@/lib/utils"

// The navbar owns the mobile drawer; the "Menu" tab asks it to open.
export const OPEN_MOBILE_NAV_EVENT = "jv-open-mobile-nav"

const DISMISS_KEY = "jv-context-bar-dismissed"
const DISMISS_EVENT = "jv-context-bar-dismiss"

function subscribeDismiss(cb: () => void) {
  window.addEventListener(DISMISS_EVENT, cb)
  return () => window.removeEventListener(DISMISS_EVENT, cb)
}
const getSnapshot = () => sessionStorage.getItem(DISMISS_KEY) === "1"
const getServerSnapshot = () => false

const mobileLinkTabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Pricing", href: "/pricing", icon: Tag },
]

const mobileActionTabs = [
  { label: "Search", icon: Search, onSelect: () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT)) },
  { label: "Menu", icon: Menu, onSelect: () => window.dispatchEvent(new Event(OPEN_MOBILE_NAV_EVENT)) },
]

export function BottomBar() {
  const pathname = usePathname()
  const [mobileHidden, setMobileHidden] = useState(false)
  const [desktopVisible, setDesktopVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const dismissed = useSyncExternalStore(subscribeDismiss, getSnapshot, getServerSnapshot)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight

      if (y <= 0) setMobileHidden(false)
      else if (y - lastScrollY.current > 8) setMobileHidden(true)
      else if (lastScrollY.current - y > 8) setMobileHidden(false)
      lastScrollY.current = y

      // Float bar appears past the hero and disappears near the footer so it never covers content.
      setDesktopVisible(y > 560 && y + window.innerHeight < doc.scrollHeight - 420)
      setProgress(max > 0 ? Math.min(1, y / max) : 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1")
    window.dispatchEvent(new Event(DISMISS_EVENT))
  }

  return (
    <>
      {/* Desktop floating contextual bar */}
      <div
        className={cn(
          "fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 lg:block",
          "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          desktopVisible && !dismissed
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-6 opacity-0",
        )}
        aria-hidden={!desktopVisible || dismissed}
      >
        <div className="flex items-center gap-4 rounded-full border border-border bg-background/95 py-1.5 pl-5 pr-1.5 shadow-soft-md backdrop-blur">
          <span className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
            <span className="h-1 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-150 motion-reduce:transition-none"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
            <span className="sr-only" role="status" aria-label="Reading progress">
              {Math.round(progress * 100)}% read
            </span>
            <span aria-hidden="true">{Math.round(progress * 100)}%</span>
          </span>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            aria-label="Dismiss bar"
            onClick={dismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Mobile persistent navigation */}
      <nav
        aria-label="Site shortcuts"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden",
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
          mobileHidden ? "translate-y-full" : "translate-y-0",
        )}
      >
        <ul className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {mobileLinkTabs.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
            const Icon = tab.icon
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors duration-150",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 h-1 w-1 rounded-full bg-primary transition-opacity duration-150",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                </Link>
              </li>
            )
          })}
          {mobileActionTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <li key={tab.label}>
                <button
                  type="button"
                  onClick={tab.onSelect}
                  className="flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
