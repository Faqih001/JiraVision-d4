"use client"

import Link from "next/link"
import { useEffect, useState, useSyncExternalStore } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const DISMISS_KEY = "jv-context-bar-dismissed"
const DISMISS_EVENT = "jv-context-bar-dismiss"

function subscribeDismiss(cb: () => void) {
  window.addEventListener(DISMISS_EVENT, cb)
  return () => window.removeEventListener(DISMISS_EVENT, cb)
}
const getSnapshot = () => sessionStorage.getItem(DISMISS_KEY) === "1"
const getServerSnapshot = () => false

export function BottomBar() {
  const [desktopVisible, setDesktopVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const dismissed = useSyncExternalStore(subscribeDismiss, getSnapshot, getServerSnapshot)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight

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
    // Reading progress and the signup CTA, floating over the page on lg and up. It sits at
    // the horizontal centre and the accessibility/assistant stack at the right edge, so the
    // two never overlap. Below lg the header, footer and that stack already own the view.
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 lg:block",
        "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
        desktopVisible && !dismissed ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
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
  )
}
