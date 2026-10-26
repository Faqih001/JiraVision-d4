"use client"

import { useState, useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

/**
 * Light and dark side by side, with a knob that slides to the active one.
 *
 * The slide is a keyframe animation rather than a transition because next-themes runs
 * with disableTransitionOnChange: it zeroes every CSS transition while the class
 * flips, which is the only moment this knob ever moves. app/globals.css owns the
 * keyframes; the transform below is the resting state they animate towards.
 */

// Hydration-safe "is client" flag: false on the server, true after mount.
const subscribeNoop = () => () => {}
const mountedSnapshot = () => true
const mountedServerSnapshot = () => false

type Animation = "to-dark" | "to-light"

export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribeNoop, mountedSnapshot, mountedServerSnapshot)
  const [animation, setAnimation] = useState<Animation | null>(null)
  // `theme` is the preference and is usually "system"; only resolvedTheme says what
  // the page actually looks like.
  const isDark = mounted && resolvedTheme === "dark"

  const toggle = () => {
    setAnimation(isDark ? "to-light" : "to-dark")
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to the ${isDark ? "light" : "dark"} theme`}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-border bg-card p-1",
        "transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <span
        aria-hidden="true"
        data-jv-anim={animation ?? undefined}
        onAnimationEnd={() => setAnimation(null)}
        className={cn(
          "jv-theme-knob absolute left-1 top-1 h-7 w-7 rounded-full bg-primary/10 ring-1 ring-inset ring-primary/25",
          !mounted && "opacity-0",
        )}
        style={{ transform: isDark ? "translateX(100%)" : "translateX(0)" }}
      />
      <span className="relative z-10 flex h-7 w-7 items-center justify-center">
        <Sun
          aria-hidden="true"
          data-jv-anim={animation === "to-light" ? "pop" : undefined}
          className={cn("jv-theme-icon h-4 w-4", isDark ? "text-muted-foreground/60" : "text-primary")}
        />
      </span>
      <span className="relative z-10 flex h-7 w-7 items-center justify-center">
        <Moon
          aria-hidden="true"
          data-jv-anim={animation === "to-dark" ? "pop" : undefined}
          className={cn("jv-theme-icon h-4 w-4", isDark ? "text-primary" : "text-muted-foreground/60")}
        />
      </span>
    </button>
  )
}
