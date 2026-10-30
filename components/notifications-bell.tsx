"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import {
  AtSign,
  Award,
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  Heart,
  Inbox,
  Info,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trophy,
} from "lucide-react"
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client"
import { drizzleParsers } from "@neon/realtime-drizzle/client"
import { RealtimeProvider, useLiveQuery } from "@neon/realtime-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

interface NotificationRow {
  id: number
  type: string
  title: string
  body: string | null
  isRead: boolean
  metadata: Record<string, unknown> | null
  createdAt: string | Date
}

/** Live-query rows arrive with PostgreSQL (snake_case) column keys. */
interface LiveNotificationRow {
  id: number
  type: string
  title: string
  body: string | null
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string | Date
}

function fromLiveRow(row: LiveNotificationRow): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    metadata: row.metadata,
    createdAt: row.created_at,
  }
}

function linkOf(row: NotificationRow): string | null {
  const link = row.metadata?.link
  return typeof link === "string" && link.startsWith("/") ? link : null
}

function timeOf(row: NotificationRow): Date {
  const value = row.createdAt
  return value instanceof Date ? value : new Date(String(value))
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  info: Info,
  task: ClipboardList,
  sprint: Sprout,
  mention: AtSign,
  wellbeing: Heart,
  gamification: Trophy,
  ai: Sparkles,
  system: Settings,
  cms: ShieldCheck,
  career: Award,
}

function typeIcon(type: string) {
  return TYPE_ICONS[type] ?? Bell
}

/**
 * Newest-first rows cut into the day headers the feed reads like: Today, Yesterday,
 * then an explicit date, so an overnight backlog is scannable without timestamps.
 */
function groupByDay(rows: NotificationRow[]) {
  const groups: { label: string; rows: NotificationRow[] }[] = []
  for (const row of rows) {
    const date = timeOf(row)
    const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "EEE d MMM yyyy")
    const last = groups[groups.length - 1]
    if (last?.label === label) last.rows.push(row)
    else groups.push({ label, rows: [row] })
  }
  return groups
}

async function markRead(id: number, isRead: boolean) {
  await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isRead }),
  }).catch(() => undefined)
}

async function markAllRead() {
  await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ all: true }),
  }).catch(() => undefined)
}

type Connection = "live" | "polling" | "reconnecting" | "error"

const CONNECTION_COPY: Record<Connection, { label: string; hint: string; className: string }> = {
  live: { label: "Live", hint: "Updates arrive as they happen", className: "text-emerald-600 dark:text-emerald-400" },
  polling: { label: "Polling", hint: "Refreshes every 30 seconds", className: "text-muted-foreground" },
  reconnecting: { label: "Reconnecting", hint: "Trying to resume live updates", className: "text-amber-600 dark:text-amber-400" },
  error: { label: "Offline", hint: "Live updates stopped", className: "text-destructive" },
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-[32px] rounded-full px-3 text-xs font-medium transition-colors duration-150",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  )
}

interface PanelProps {
  rows: NotificationRow[] | undefined
  connection: Connection
  errorText?: string | null
  /** Count from the server when it knows more rows than the feed holds. */
  unreadCount?: number
  onRowsChanged?: () => void
  onRetry?: () => void
}

function NotificationPanel({ rows, connection, errorText, unreadCount, onRowsChanged, onRetry }: PanelProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [onlyUnread, setOnlyUnread] = useState(false)

  const feedCount = rows ? rows.filter((row) => !row.isRead).length : 0
  const unread = unreadCount ?? feedCount
  const visible = useMemo(() => (rows ? rows.filter((row) => !onlyUnread || !row.isRead) : undefined), [rows, onlyUnread])
  const groups = useMemo(() => groupByDay(visible ?? []), [visible])

  const openRow = async (row: NotificationRow) => {
    if (!row.isRead) {
      await markRead(row.id, true)
      onRowsChanged?.()
    }
    const link = linkOf(row)
    if (link) {
      setOpen(false)
      router.push(link)
    }
  }

  const toggleRead = async (row: NotificationRow) => {
    await markRead(row.id, row.isRead)
    onRowsChanged?.()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="relative h-9 w-9 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unread > 0 && (
            <span
              className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
              aria-hidden="true"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:w-[23rem]">
        <header className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {unread > 0 && (
              <Badge className="h-5 border-0 px-1.5 text-[11px] leading-none" aria-hidden="true">
                {unread} new
              </Badge>
            )}
          </div>
          <span
            className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", CONNECTION_COPY[connection].className)}
            title={CONNECTION_COPY[connection].hint}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                connection === "live" ? "bg-emerald-500" : connection === "reconnecting" ? "bg-amber-500" : "bg-current",
                connection === "error" && "opacity-60",
              )}
              aria-hidden="true"
            />
            {CONNECTION_COPY[connection].label}
          </span>
        </header>

        <div className="flex items-center gap-1 border-b px-2 py-1.5">
          <FilterChip label="All" active={!onlyUnread} onClick={() => setOnlyUnread(false)} />
          <FilterChip label="Unread" active={onlyUnread} onClick={() => setOnlyUnread(true)} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              void markAllRead().then(() => onRowsChanged?.())
            }}
            disabled={unread === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Mark all read
          </Button>
        </div>

        {errorText ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center" role="alert">
            <p className="text-sm font-medium">Live updates stopped</p>
            <p className="text-xs text-muted-foreground">{errorText}</p>
            {onRetry && (
              <Button type="button" variant="outline" size="sm" className="mt-1 gap-1.5 text-xs" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Reconnect
              </Button>
            )}
          </div>
        ) : visible === undefined ? (
          <div className="space-y-1 px-3 py-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2.5 py-2">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5 py-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
              <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">{onlyUnread ? "Nothing unread" : "You're all caught up"}</p>
            <p className="text-xs text-muted-foreground">
              {onlyUnread ? "Every notification here has been read." : "New activity on your team shows up here."}
            </p>
          </div>
        ) : (
          <div className="max-h-[21rem] overflow-y-auto">
            {groups.map((group) => (
              <section key={group.label}>
                <h3 className="sticky top-0 z-10 bg-popover/95 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                  {group.label}
                </h3>
                {group.rows.map((row) => {
                  const Icon = typeIcon(row.type)
                  return (
                    <article
                      key={row.id}
                      className={cn(
                        "group relative flex items-start gap-2.5 border-b border-l-2 px-3 py-2.5 transition-colors duration-150 last:border-b-0",
                        row.isRead ? "border-l-transparent" : "border-l-primary bg-primary/[0.04]",
                      )}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => void openRow(row)}
                          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                        >
                          <p
                            className={cn(
                              "text-sm leading-snug",
                              row.isRead ? "text-muted-foreground" : "font-medium text-foreground",
                            )}
                          >
                            {row.title}
                          </p>
                          {row.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.body}</p> : null}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDistanceToNow(timeOf(row), { addSuffix: true })}
                          </p>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleRead(row)}
                        aria-label={row.isRead ? `Mark "${row.title}" as unread` : `Mark "${row.title}" as read`}
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors duration-150",
                          "hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          row.isRead && "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                        )}
                      >
                        {row.isRead ? (
                          <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </article>
                  )
                })}
              </section>
            ))}
          </div>
        )}

        <footer className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
          <Link
            href="/dashboard/activity"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            All activity
          </Link>
          <Link href="/dashboard/settings" className="text-xs font-medium text-muted-foreground hover:text-foreground">
            Notification settings
          </Link>
        </footer>
      </PopoverContent>
    </Popover>
  )
}

function LiveBell({ sealed, onRetry }: { sealed: SealedLiveQuery<LiveNotificationRow>; onRetry: () => void }) {
  const router = useRouter()
  const [signedOut, setSignedOut] = useState(false)

  // The realtime hook calls refreshQuery on every reconnect attempt. When the socket flaps — a
  // waking compute, or a dev box with no realtime service — that becomes a fetch per second, and
  // each one is a session read plus a user read. Coalesce them: hand back the last sealed
  // capability without re-fetching inside the window, and grow the window as failures stack so a
  // stuck connection settles at ~30s instead of hammering the route.
  const lastSealed = useRef(sealed)
  const lastFetch = useRef(0)
  const backoffMs = useRef(5_000)

  const refreshQuery = useCallback(async () => {
    const now = Date.now()
    if (now - lastFetch.current < backoffMs.current) {
      return lastSealed.current
    }
    lastFetch.current = now
    try {
      const res = await fetch("/api/notifications/live")
      // A signed-out browser cannot be fixed by reconnecting, so this is terminal: hand the decision
      // back to the server-side gate. Everything else stays retryable.
      if (res.status === 401) {
        setSignedOut(true)
        router.refresh()
        throw new Error("This browser is signed out.")
      }
      // 503 is the database waking, not a dead session: keep the current capability and lengthen the
      // wait rather than treating it like a fresh subscription that needs immediate re-sealing.
      if (res.status === 503) {
        backoffMs.current = Math.min(30_000, backoffMs.current * 2)
        return lastSealed.current
      }
      if (!res.ok) throw new Error("Could not refresh the live notification query")
      const json = (await res.json()) as { sealed: SealedLiveQuery<LiveNotificationRow> }
      lastSealed.current = json.sealed
      backoffMs.current = 5_000
      return json.sealed
    } catch (error) {
      backoffMs.current = Math.min(30_000, backoffMs.current * 2)
      throw error
    }
  }, [router])

  const { data, status, error } = useLiveQuery(sealed, { refreshQuery })

  const rows = useMemo(() => (data ? data.map(fromLiveRow) : undefined), [data])
  const connection: Connection =
    status === "error" ? "error" : status === "closed" || status === "stale" ? "reconnecting" : "live"

  return (
    <NotificationPanel
      rows={rows}
      connection={connection}
      errorText={
        signedOut
          ? "Your session has ended. Taking you to sign in."
          : status === "error"
            ? error?.message ?? "Subscription failed"
            : null
      }
      onRetry={status === "error" && !signedOut ? onRetry : undefined}
    />
  )
}

function PollingBell() {
  const router = useRouter()
  const [rows, setRows] = useState<NotificationRow[] | undefined>(undefined)
  const [unreadCount, setUnreadCount] = useState<number | undefined>(undefined)
  const [signedOut, setSignedOut] = useState(false)

  useEffect(() => {
    if (signedOut) return

    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined

    const load = async () => {
      const res = await fetch("/api/notifications?limit=20").catch(() => null)
      if (cancelled) return

      // 401 is the server saying this browser is signed out. Polling again cannot fix that — and
      // the server-side dashboard gate is the one authority on it, so ask it to re-decide. A 5xx
      // or a dropped connection is not a 401: those keep polling.
      if (res?.status === 401) {
        clearInterval(interval)
        setSignedOut(true)
        router.refresh()
        return
      }

      if (!res?.ok) return
      const json = (await res.json()) as { items: NotificationRow[]; unreadCount?: number }
      if (cancelled) return
      setRows(json.items)
      setUnreadCount(typeof json.unreadCount === "number" ? json.unreadCount : undefined)
    }
    void load()
    interval = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [signedOut, router])

  return (
    <NotificationPanel
      rows={rows}
      connection={signedOut ? "error" : "polling"}
      errorText={signedOut ? "Your session has ended. Taking you to sign in." : null}
      unreadCount={unreadCount}
      onRowsChanged={() => {
        // Row updates are not pushed here, so re-read the feed after every change.
        void fetch("/api/notifications?limit=20")
          .then(async (res) => (res.ok ? ((await res.json()) as { items: NotificationRow[]; unreadCount?: number }) : null))
          .then((json) => {
            if (!json) return
            setRows(json.items)
            setUnreadCount(typeof json.unreadCount === "number" ? json.unreadCount : undefined)
          })
          .catch(() => undefined)
      }}
    />
  )
}

export default function NotificationsBell() {
  const [config, setConfig] = useState<{ sealed: SealedLiveQuery<LiveNotificationRow>; realtimeUrl: string } | null>(null)
  const [checked, setChecked] = useState(false)
  // Re-mounting the subscription is the only way the realtime hook can be asked to
  // reconnect after it has failed, so a retry bumps the key on its provider.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch("/api/notifications/live")
      .then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as { sealed: SealedLiveQuery<LiveNotificationRow>; realtimeUrl: string | null }
      })
      .then((json) => {
        if (cancelled) return
        if (json?.sealed && json.realtimeUrl) setConfig({ sealed: json.sealed, realtimeUrl: json.realtimeUrl })
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const client = useMemo(() => {
    if (!config) return null
    return createRealtimeClient({ url: config.realtimeUrl, parsers: { ...drizzleParsers } })
  }, [config])

  if (!checked) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="relative h-9 w-9 rounded-full border border-border bg-card text-muted-foreground"
      >
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    )
  }

  if (!config || !client) return <PollingBell />

  return (
    <RealtimeProvider key={attempt} client={client}>
      <LiveBell sealed={config.sealed} onRetry={() => setAttempt((value) => value + 1)} />
    </RealtimeProvider>
  )
}
