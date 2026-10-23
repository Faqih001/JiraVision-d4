"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { FileText, HelpCircle, Layers, ListTree, MessagesSquare, Rocket, Search, Settings2, Home as HomeIcon } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { searchIndex, type SearchEntry, type SearchGroup } from "@/content/search-index"
import { track } from "@/lib/analytics"

export const OPEN_SEARCH_EVENT = "jv-open-search"

const RECENT_KEY = "jv-recent-searches"
const RECENT_MAX = 5

const groupIcons: Record<SearchGroup, typeof Search> = {
  Pages: HomeIcon,
  Products: Layers,
  Solutions: Rocket,
  Resources: FileText,
  Blog: MessagesSquare,
  FAQ: HelpCircle,
  Changelog: ListTree,
}

function readRecent(): SearchEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SearchEntry[]).slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

// Recent searches flow through useSyncExternalStore with a cached snapshot so
// hydration stays stable (server and first client render both see []).
const RECENT_EVENT = "jv-recent-searches-change"
let recentCache: { raw: string | null; value: SearchEntry[] } = { raw: null, value: [] }

function subscribeRecent(callback: () => void) {
  window.addEventListener(RECENT_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(RECENT_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

function getRecentSnapshot(): SearchEntry[] {
  const raw = typeof window === "undefined" ? null : localStorage.getItem(RECENT_KEY)
  if (raw !== recentCache.raw) recentCache = { raw, value: raw ? readRecent() : [] }
  return recentCache.value
}

function pushRecent(entry: SearchEntry) {
  const next = [entry, ...readRecent().filter((r) => r.href !== entry.href)].slice(0, RECENT_MAX)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  recentCache = { raw: null, value: [] } // force re-read on next snapshot call
  window.dispatchEvent(new Event(RECENT_EVENT))
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable
}

const navShortcuts: { keys: string; label: string; href: string }[] = [
  { keys: "g h", label: "Home", href: "/" },
  { keys: "g p", label: "Pricing", href: "/pricing" },
  { keys: "g c", label: "Contact", href: "/contact" },
  { keys: "g s", label: "Sign up", href: "/signup" },
]

export function SiteSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [query, setQuery] = useState("")
  const recent = useSyncExternalStore(subscribeRecent, getRecentSnapshot, getRecentSnapshot)
  const gPending = useRef(false)

  const openPalette = useCallback(() => setOpen(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === "?") {
        e.preventDefault()
        setHelpOpen(true)
        return
      }
      const key = e.key.toLowerCase()
      if (gPending.current) {
        gPending.current = false
        const hit = navShortcuts.find((s) => s.keys === `g ${key}`)
        if (hit) {
          e.preventDefault()
          router.push(hit.href)
        }
        return
      }
      if (key === "g") {
        gPending.current = true
        setTimeout(() => (gPending.current = false), 800)
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener(OPEN_SEARCH_EVENT, openPalette)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener(OPEN_SEARCH_EVENT, openPalette)
    }
  }, [openPalette, router])

  const select = (entry: SearchEntry) => {
    pushRecent(entry)
    setQuery("")
    setOpen(false)
    track("search_result", { title: entry.title, group: entry.group })
    router.push(entry.href)
  }

  const q = query.trim().toLowerCase()
  const results = q
    ? searchIndex
        .filter((e) => `${e.title} ${e.subtitle}`.toLowerCase().includes(q))
        .slice(0, 12)
    : []
  const groups = results.reduce<Record<string, SearchEntry[]>>((acc, entry) => {
    ;(acc[entry.group] ??= []).push(entry)
    return acc
  }, {})
  const showRecent = !q && recent.length > 0

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setQuery("")
        }}
      >
        <DialogTitle className="sr-only">Search JiraVision</DialogTitle>
        <CommandInput
          placeholder="Search pages, products, FAQ…"
          aria-label="Search pages, products, blog articles, FAQ answers and changelog entries"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results. Try a shorter phrase.</CommandEmpty>
          {showRecent && (
            <CommandGroup heading="Recent searches">
              {recent.map((entry) => (
                <CommandItem key={`recent-${entry.href}`} value={`${entry.title} recent`} onSelect={() => select(entry)}>
                  <Search className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 truncate">{entry.title}</span>
                  <span className="text-xs text-muted-foreground">{entry.group}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {Object.entries(groups).map(([group, entries]) => {
            const Icon = groupIcons[group as SearchGroup]
            return (
              <CommandGroup key={group} heading={group}>
                {entries.map((entry) => (
                  <CommandItem key={`${group}-${entry.title}`} value={`${entry.title} ${entry.href}`} onSelect={() => select(entry)}>
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{entry.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{entry.subtitle}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
          {!q && (
            <CommandGroup heading="Suggested">
              {searchIndex
                .filter((e) => e.group === "Pages" || e.group === "Products")
                .slice(0, 6)
                .map((entry) => {
                  const Icon = groupIcons[entry.group]
                  return (
                    <CommandItem key={`sug-${entry.href}`} value={`${entry.title} ${entry.href}`} onSelect={() => select(entry)}>
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1 truncate">{entry.title}</span>
                      <span className="text-xs text-muted-foreground">{entry.group}</span>
                    </CommandItem>
                  )
                })}
            </CommandGroup>
          )}
          {!q && (
            <CommandGroup heading="Actions">
              <CommandItem value="action-help" onSelect={() => { setOpen(false); setHelpOpen(true) }}>
                <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Keyboard shortcuts
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
              Keyboard shortcuts
            </DialogTitle>
            <DialogDescription>Navigation works anywhere on the site except inside text fields.</DialogDescription>
          </DialogHeader>
          <dl className="divide-y divide-border text-sm">
            <div className="flex items-center justify-between py-2">
              <dt>Search (this palette)</dt>
              <dd><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘K</kbd></dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt>This help</dt>
              <dd><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd></dd>
            </div>
            {navShortcuts.map((s) => (
              <div key={s.keys} className="flex items-center justify-between py-2">
                <dt>Go to {s.label}</dt>
                <dd><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{s.keys}</kbd></dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-2">
              <dt>Dismiss dialog</dt>
              <dd><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Esc</kbd></dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </>
  )
}
