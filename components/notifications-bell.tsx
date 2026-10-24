"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Bell } from "lucide-react"
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client"
import { drizzleParsers } from "@neon/realtime-drizzle/client"
import { RealtimeProvider, useLiveQuery } from "@neon/realtime-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface NotificationRow {
  id: number
  userId?: number
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
  return typeof link === "string" && link.length > 0 ? link : null
}

function timeOf(row: NotificationRow): Date {
  const value = row.createdAt
  return value instanceof Date ? value : new Date(String(value))
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

interface FeedProps {
  rows: NotificationRow[] | undefined
  statusText: string | null
  emptyText: string
  onError?: string | null
}

function NotificationFeed({ rows, statusText, emptyText, onError }: FeedProps) {
  const router = useRouter()

  if (onError) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground" role="alert">
        <p>Live updates stopped</p>
        <p className="text-xs">{onError}</p>
      </div>
    )
  }
  if (rows === undefined) {
    return <div className="p-4 text-center text-sm text-muted-foreground">{statusText ?? "Loading notifications"}</div>
  }
  if (rows.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
  }
  return (
    <div className="max-h-[320px] overflow-y-auto">
      {rows.map((row) => {
        const link = linkOf(row)
        return (
          <DropdownMenuItem
            key={row.id}
            className="flex items-start gap-2 p-3"
            onSelect={() => {
              if (!row.isRead) void markRead(row.id, true)
              if (link) router.push(link)
            }}
          >
            <div
              className={cn("mt-0.5 h-2 w-2 flex-shrink-0 rounded-full", row.isRead ? "bg-muted" : "bg-primary")}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm truncate", row.isRead ? "text-muted-foreground" : "font-medium")}>{row.title}</p>
              {row.body ? <p className="text-xs text-muted-foreground line-clamp-2">{row.body}</p> : null}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(timeOf(row), { addSuffix: true })}
              </p>
            </div>
          </DropdownMenuItem>
        )
      })}
    </div>
  )
}

function LiveBell({ sealed }: { sealed: SealedLiveQuery<LiveNotificationRow> }) {
  const refreshQuery = useCallback(async () => {
    const res = await fetch("/api/notifications/live")
    if (!res.ok) throw new Error("Could not refresh the live notification query")
    const json = (await res.json()) as { sealed: SealedLiveQuery<LiveNotificationRow> }
    return json.sealed
  }, [])

  const { data, status, error } = useLiveQuery(sealed, { refreshQuery })

  const rows = useMemo(
    () => (data ? data.map(fromLiveRow) : undefined),
    [data],
  )
  const unreadCount = rows ? rows.filter((row) => !row.isRead).length : 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className="relative text-muted-foreground hover:text-foreground rounded-full h-8 w-8 sm:h-9 sm:w-9"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full p-0 text-[10px] sm:text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] sm:w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="text-sm sm:text-base">Notifications</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm h-7 sm:h-8"
            onClick={() => {
              // Row updates arrive over the live subscription; no manual refetch needed.
              void markAllRead()
            }}
          >
            Mark all as read
          </Button>
        </div>
        <DropdownMenuSeparator />
        <NotificationFeed
          rows={status === "error" ? undefined : rows}
          statusText={status === "closed" || status === "stale" ? (rows ? "Reconnecting…" : "Loading notifications") : null}
          emptyText="No notifications"
          onError={status === "error" ? error?.message ?? "Subscription failed" : null}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PollingBell() {
  const [rows, setRows] = useState<NotificationRow[] | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const res = await fetch("/api/notifications?limit=20").catch(() => null)
      if (!res?.ok || cancelled) return
      const json = (await res.json()) as { items: NotificationRow[] }
      if (!cancelled) setRows(json.items)
    }
    void load()
    const interval = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const unreadCount = rows ? rows.filter((row) => !row.isRead).length : 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className="relative text-muted-foreground hover:text-foreground rounded-full h-8 w-8 sm:h-9 sm:w-9"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full p-0 text-[10px] sm:text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] sm:w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="text-sm sm:text-base">Notifications</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm h-7 sm:h-8"
            onClick={() => {
              void markAllRead().then(async () => {
                const res = await fetch("/api/notifications?limit=20")
                if (res.ok) setRows(((await res.json()) as { items: NotificationRow[] }).items)
              })
            }}
          >
            Mark all as read
          </Button>
        </div>
        <DropdownMenuSeparator />
        <NotificationFeed rows={rows} statusText="Loading notifications" emptyText="No notifications" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function NotificationsBell() {
  const [config, setConfig] = useState<{ sealed: SealedLiveQuery<LiveNotificationRow>; realtimeUrl: string } | null>(null)
  const [checked, setChecked] = useState(false)

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
        className="relative text-muted-foreground rounded-full h-8 w-8 sm:h-9 sm:w-9"
      >
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    )
  }

  if (!config || !client) return <PollingBell />

  return (
    <RealtimeProvider client={client}>
      <LiveBell sealed={config.sealed} />
    </RealtimeProvider>
  )
}
