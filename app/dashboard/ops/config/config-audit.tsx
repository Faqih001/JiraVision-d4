"use client"

// The audit trail for the pack's config changes (PR 11f).
//
// Shows the last 50 changes: who made them, when, and what operation (apply/revert/reset). The summary
// field contains counts (applied, replaced, new) for apply operations, and is empty for revert/reset.
// This is a read-only view — the undo and reset buttons are in the propose panel.

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import { History } from "lucide-react"

type AuditEvent = {
  id: number
  operation: string
  summary: Record<string, number>
  createdAt: string
  userId: number
}

function OperationBadge({ operation }: { operation: string }) {
  if (operation === "apply") return <Badge>applied</Badge>
  if (operation === "revert") return <Badge variant="outline">reverted</Badge>
  if (operation === "reset") return <Badge variant="destructive">reset</Badge>
  return <Badge variant="outline">{operation}</Badge>
}

function formatSummary(summary: Record<string, number>): string {
  const parts: string[] = []
  if (summary.applied) parts.push(`${summary.applied} item${summary.applied === 1 ? "" : "s"}`)
  if (summary.replaced) parts.push(`${summary.replaced} replaced`)
  if (summary.new) parts.push(`${summary.new} new`)
  return parts.length > 0 ? parts.join(", ") : "no details"
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return date.toLocaleDateString()
}

export default function ConfigAudit({ packKey }: { packKey: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetch("/api/ops/config/audit")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.success) {
          setEvents(json.data.events as AuditEvent[])
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load audit trail")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [packKey])

  return (
    <SectionCard title="Change history" icon={<History className="h-4 w-4" />}>
      {loading && <EmptyNote>Loading change history…</EmptyNote>}
      {error && <EmptyNote>{error}</EmptyNote>}
      {!loading && !error && events.length === 0 && (
        <EmptyNote>No changes have been made to this pack's config yet.</EmptyNote>
      )}
      {!loading && !error && events.length > 0 && (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3 border-b border-dashed pb-2 last:border-0">
              <OperationBadge operation={event.operation} />
              <div className="flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">User {event.userId}</span>{" "}
                  <span className="text-muted-foreground">{formatSummary(event.summary)}</span>
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
