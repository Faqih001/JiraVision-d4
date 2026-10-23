"use client"

import { Keyboard, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section, SectionHeading } from "@/components/sections/section"
import { OPEN_HELP_EVENT, OPEN_SEARCH_EVENT } from "@/components/features/site-search"

const shortcuts: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Open search anywhere" },
  { keys: ["?"], label: "Shortcut cheat sheet" },
  { keys: ["G", "then", "P"], label: "Go to pricing" },
  { keys: ["G", "then", "C"], label: "Go to contact" },
  { keys: ["Esc"], label: "Close any overlay" },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[2rem] items-center justify-center rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground">
      {children}
    </kbd>
  )
}

export function KeyboardFirst() {
  return (
    <Section id="keyboard" bg="shapes" className="border-y bg-surface">
      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <SectionHeading
            className="mb-6"
            eyebrow="Built for keyboards"
            title="If it can be typed, it can be typed"
            intro="Jira's best-loved feature is JQL. We agree. JiraVision is fast on your hands first: command palette, two-key navigation, and a product that stays out of the mouse's way."
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2 rounded-full"
              onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
            >
              <Search className="h-4 w-4" aria-hidden />
              Try the palette now
            </Button>
            <Button
              variant="ghost"
              className="gap-2 rounded-full"
              onClick={() => window.dispatchEvent(new Event(OPEN_HELP_EVENT))}
            >
              <Keyboard className="h-4 w-4" aria-hidden />
              Show all shortcuts
            </Button>
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {shortcuts.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-sm">{s.label}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {s.keys.map((k, i) =>
                  k === "then" ? (
                    <span key={`${s.label}-then-${i}`} className="text-xs text-muted-foreground">then</span>
                  ) : (
                    <Kbd key={`${s.label}-${k}-${i}`}>{k}</Kbd>
                  ),
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
