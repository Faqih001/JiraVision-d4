"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Accessibility, Check, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  applyState,
  getAccessibilityServerSnapshot,
  getAccessibilitySnapshot,
  OPEN_A11Y_EVENT,
  profiles,
  resetState,
  stateFromProfile,
  subscribeAccessibility,
  withToggle,
  writeState,
  type AccessibilityState,
  type Step,
} from "@/lib/accessibility"

// Hydration-safe "is client" flag: false on the server, true after mount.
const subscribeNoop = () => () => {}
const mountedSnapshot = () => true
const mountedServerSnapshot = () => false

const contentToggles: { key: keyof AccessibilityState; label: string; hint: string }[] = [
  { key: "readableFont", label: "Readable font", hint: "Replaces the display face with a plain, wide sans" },
  { key: "highlightHeadings", label: "Highlight headings", hint: "Fills every heading so structure is obvious" },
  { key: "highlightLinks", label: "Highlight links", hint: "Underlines and tints all links" },
  { key: "highlightButtons", label: "Highlight buttons", hint: "Outlines every clickable control" },
  { key: "hideImages", label: "Hide images", hint: "Removes photos, illustrations and icons" },
  { key: "tooltips", label: "Tooltips", hint: "Shows each control's name on hover and focus" },
  { key: "stopAnimations", label: "Stop animations", hint: "Freezes motion, carousels and transitions" },
  { key: "readAloud", label: "Read aloud", hint: "Click any paragraph or heading to hear it" },
]

const colourToggles: { key: keyof AccessibilityState; label: string; hint: string }[] = [
  { key: "darkContrast", label: "Dark contrast", hint: "Forces a near-black palette" },
  { key: "lightContrast", label: "Light contrast", hint: "Forces a pure-white palette" },
  { key: "highContrast", label: "High contrast", hint: "Black on white, heaviest borders" },
  { key: "invertColours", label: "Invert colours", hint: "Swaps light and dark values" },
  { key: "rotateHues", label: "Change colours", hint: "Rotates the palette away from red/green" },
  { key: "highSaturation", label: "High saturation", hint: "Pushes every colour outward" },
  { key: "lowSaturation", label: "Low saturation", hint: "Mutes colour to reduce distraction" },
  { key: "monochrome", label: "Monochrome", hint: "Removes colour, keeps luminance" },
]

const cursorToggles: { key: keyof AccessibilityState; label: string }[] = [
  { key: "readingGuide", label: "Reading guide" },
  { key: "readingMask", label: "Reading mask" },
  { key: "bigBlackCursor", label: "Big black cursor" },
  { key: "bigWhiteCursor", label: "Big white cursor" },
]

const steps: { key: "textSize" | "lineHeight" | "textSpacing"; label: string }[] = [
  { key: "textSize", label: "Text size" },
  { key: "lineHeight", label: "Line height" },
  { key: "textSpacing", label: "Text spacing" },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</h3>
}

function PresetRow({
  label,
  hint,
  active,
  onClick,
}: {
  label: string
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150",
        active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60",
      )}
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  )
}

function StepRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: Step
  onChange: (next: Step) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1" role="group" aria-label={label}>
        {([1, 2, 3] as Step[]).map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(value === step ? 0 : step)}
            aria-pressed={value === step}
            className={cn(
              "min-h-[36px] min-w-[44px] rounded-md border text-xs font-semibold transition-colors duration-150",
              value === step ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
            )}
          >
            {"+".repeat(step)}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Pointer-tracked band used by the reading guide and reading mask. Both are fixed and
 * sit outside #jv-page, so no page adjustment can reposition them off screen.
 */
function ReadingOverlay({ variant }: { variant: "guide" | "mask" }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const place = (y: number) => {
      const el = ref.current
      if (!el) return
      el.style.top = `${Math.max(0, y - el.offsetHeight / 2)}px`
    }
    const onPointer = (event: PointerEvent) => place(event.clientY)
    const onTouch = (event: TouchEvent) => place(event.touches[0]?.clientY ?? 0)
    window.addEventListener("pointermove", onPointer, { passive: true })
    window.addEventListener("touchmove", onTouch, { passive: true })
    place(window.innerHeight / 2)
    return () => {
      window.removeEventListener("pointermove", onPointer)
      window.removeEventListener("touchmove", onTouch)
    }
  }, [variant])

  return <div ref={ref} className={`jv-reading-overlay jv-reading-${variant}`} aria-hidden="true" />
}

export function AccessibilityWidget() {
  const mounted = useSyncExternalStore(subscribeNoop, mountedSnapshot, mountedServerSnapshot)
  const state = useSyncExternalStore(
    subscribeAccessibility,
    getAccessibilitySnapshot,
    getAccessibilityServerSnapshot,
  )
  const [open, setOpen] = useState(false)
  // The workspace ships its own launcher, bottom-right next to the assistant pill,
  // so the public one stands down there rather than doubling up.
  const pathname = usePathname()
  const showLauncher = !pathname.startsWith("/dashboard")

  const toggle = useCallback(
    <K extends keyof AccessibilityState>(key: K, value?: AccessibilityState[K]) =>
      writeState(value === undefined ? withToggle(state, key) : withToggle(state, key, value)),
    [state],
  )

  const chooseProfile = (id: string) => writeState(stateFromProfile(state.profile === id ? null : id))

  // The attributes live on <html> and the bootstrap script only runs on a fresh
  // page load, so mount re-asserts whatever the store holds.
  useEffect(() => {
    applyState(state)
  }, [state])

  useEffect(() => {
    const openPanel = () => setOpen(true)
    window.addEventListener(OPEN_A11Y_EVENT, openPanel)
    return () => window.removeEventListener(OPEN_A11Y_EVENT, openPanel)
  }, [])

  // Tooltips need a name to surface; the stylesheet reads data-jv-tip, so fill it in
  // from the accessible name and keep it current as the page changes.
  useEffect(() => {
    if (!mounted || !state.tooltips) return
    const page = document.getElementById("jv-page")
    if (!page) return
    const selector = "a[href], button, [role='button']"
    const stamp = () => {
      for (const el of Array.from(page.querySelectorAll(selector))) {
        if (el.getAttribute("data-jv-tip")) continue
        const name = el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent?.trim()
        if (name) el.setAttribute("data-jv-tip", name.slice(0, 120))
      }
    }
    stamp()
    const observer = new MutationObserver(stamp)
    observer.observe(page, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [mounted, state.tooltips])

  // Read aloud: one delegated click listener, and speech stops with the setting.
  useEffect(() => {
    if (!state.readAloud) {
      window.speechSynthesis?.cancel()
      return
    }
    const page = document.getElementById("jv-page")
    if (!page) return
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        "p, li, h1, h2, h3, h4, blockquote, dd, figcaption",
      )
      const text = target?.textContent?.trim()
      if (!text) return
      const speech = window.speechSynthesis
      if (!speech) return
      speech.cancel()
      speech.speak(new SpeechSynthesisUtterance(text))
    }
    page.addEventListener("click", onClick)
    return () => {
      page.removeEventListener("click", onClick)
      window.speechSynthesis?.cancel()
    }
  }, [state.readAloud])

  return (
    <>
      {mounted && showLauncher && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the accessibility menu"
          aria-expanded={open}
          className={cn(
            "fixed right-4 z-50 flex min-h-[48px] min-w-[48px] items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium shadow-soft-md",
            // Foot of the right-edge stack: the Assistant pill sits above it, and the
            // cookie banner above the pill. Below xl the whole stack clears the marketing
            // bottom bar, which is 52px tall plus the safe area and is the site navigation
            // on a phone or tablet; nothing here has to react to the banner, because the
            // banner is what moves.
            "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] xl:bottom-[calc(1rem+env(safe-area-inset-bottom))]",
          )}
        >
          <Accessibility className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Accessibility</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "top-4 left-4 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[26rem] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:left-auto sm:right-4",
          )}
        >
          <DialogHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b bg-primary py-3 pl-4 pr-12 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" aria-hidden="true" />
              <DialogTitle className="text-base font-semibold">Accessibility</DialogTitle>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => writeState(resetState())}
              className="h-8 gap-1.5 px-2 text-xs text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          </DialogHeader>
          <DialogDescription className="sr-only">
            Adjust text size, contrast, colour and motion for the whole site. Choices are saved in this browser.
          </DialogDescription>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
            <section>
              <SectionTitle>Accessibility profiles</SectionTitle>
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <PresetRow
                    key={profile.id}
                    label={profile.label}
                    hint={profile.hint}
                    active={state.profile === profile.id}
                    onClick={() => chooseProfile(profile.id)}
                  />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Content adjustments</SectionTitle>
              <div className="space-y-3">
                {contentToggles.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                    <Switch
                      checked={state[item.key] === true}
                      onCheckedChange={() => toggle(item.key)}
                      aria-label={item.label}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 divide-y border-t">
                {steps.map((step) => (
                  <StepRow
                    key={step.key}
                    label={step.label}
                    value={state[step.key]}
                    onChange={(next) => toggle(step.key, next)}
                  />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Colour adjustments</SectionTitle>
              <p className="mb-2 text-xs text-muted-foreground">
                One palette adjustment at a time — click again to switch it off.
              </p>
              <div className="space-y-3">
                {colourToggles.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                    <Switch
                      checked={state[item.key] === true}
                      onCheckedChange={() => toggle(item.key)}
                      aria-label={item.label}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Orientation adjustments</SectionTitle>
              <div className="space-y-3">
                {cursorToggles.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium">{item.label}</p>
                    <Switch
                      checked={state[item.key] === true}
                      onCheckedChange={() => toggle(item.key)}
                      aria-label={item.label}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Help</SectionTitle>
              <details className="group rounded-md border px-3 py-2">
                <summary className="min-h-[32px] cursor-pointer list-none text-sm font-medium [&::-webkit-details-marker]:hidden">
                  How this menu works
                </summary>
                <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    Every switch changes the page immediately and is remembered in this browser only — nothing is
                    uploaded, and signing out or clearing site data resets it.
                  </p>
                  <p>
                    Profiles apply a tested combination of the switches below. Any manual change detaches the page from
                    the profile so you can keep tuning it.
                  </p>
                  <p>
                    Read aloud uses the speech voices already installed on your device, so its quality depends on your
                    operating system.
                  </p>
                  <Link href="/accessibility" className="font-medium text-primary underline-offset-2 hover:underline">
                    Read the full accessibility statement
                  </Link>
                </div>
              </details>
            </section>
          </div>

          <div className="border-t bg-muted/40 px-4 py-3">
            <Button
              type="button"
              id="jv-a11y-clear"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => writeState(resetState())}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Clear — turn off all adjustments
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {state.readingGuide && <ReadingOverlay variant="guide" />}
      {state.readingMask && <ReadingOverlay variant="mask" />}
    </>
  )
}
