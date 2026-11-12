"use client"

// One line, three surfaces: when the hourly schedule last fired and what it found. The per-item
// "Last run" indicators cannot answer this when every queue is empty — they all read "Never run",
// which looks the same as a dead cron.
//
// A failed read renders HEARTBEAT_UNKNOWN, never HEARTBEAT_NEVER. Those are different facts and the
// component must not collapse them.

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"
import { HEARTBEAT_UNKNOWN, heartbeatView } from "@/lib/cron/heartbeat-view"
import type { HeartbeatDto } from "@/app/api/cron/_heartbeat"
import { cn } from "@/lib/utils"

export function SchedulerHeartbeat({ className }: { className?: string }) {
  const [heartbeat, setHeartbeat] = useState<HeartbeatDto | null>(null)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const response = await fetch("/api/cron/status", { cache: "no-store" })
        const json = await response.json()
        if (!alive) return
        if (!response.ok || !json.success) {
          setFailed(true)
          return
        }
        setHeartbeat(json.data ?? null)
        setFailed(false)
      } catch {
        if (alive) setFailed(true)
      } finally {
        if (alive) setLoaded(true)
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [])

  if (!loaded) return null

  const view = failed ? { tone: "failed" as const, text: HEARTBEAT_UNKNOWN } : heartbeatView(heartbeat)

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-[11px]",
        view.tone === "failed" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      <Activity className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{view.text}</span>
    </p>
  )
}