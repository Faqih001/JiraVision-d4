"use client"

import { Accessibility } from "lucide-react"
import { cn } from "@/lib/utils"
import { OPEN_A11Y_EVENT } from "@/lib/accessibility"

/**
 * Dashboard trigger for the accessibility panel. The panel itself is mounted once in
 * the root layout and listens for OPEN_A11Y_EVENT, so this only has to ask for it.
 *
 * It sits bottom-right, stacked above the assistant pill, which is the same corner the
 * public-site launcher uses; the two never share a page because the public one stands
 * down under /dashboard.
 */
export function AccessibilityLauncher({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_A11Y_EVENT))}
      aria-label="Open the accessibility menu"
      className={cn(
        "fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-40",
        "flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card px-3.5",
        "text-xs font-semibold shadow-soft-md transition-colors duration-150",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <Accessibility className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>Accessibility</span>
    </button>
  )
}
