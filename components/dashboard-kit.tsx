"use client"

// Shared building blocks for the dashboard product pages (V3).
// Kept presentation-only so every page composes the same sections,
// pills and chart styling defined by the design tokens in globals.css.

import { CircleDot, Flag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const STATUSES = ["todo", "in_progress", "review", "blocked", "done"]
export const PRIORITIES = ["urgent", "high", "medium", "low"]

export const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  blocked: "Blocked",
  done: "Done",
}

export const STATUS_COLOR: Record<string, string> = {
  todo: "hsl(var(--chart-stone))",
  in_progress: "hsl(var(--chart-moss))",
  review: "hsl(var(--chart-clay))",
  blocked: "hsl(var(--destructive))",
  done: "hsl(var(--chart-pine))",
}

export const PRIORITY_COLOR: Record<string, string> = {
  urgent: "hsl(var(--destructive))",
  high: "hsl(var(--chart-clay))",
  medium: "hsl(var(--chart-moss))",
  low: "hsl(var(--chart-stone))",
}

/**
 * The sizing contract for a filter bar and the dropdowns that sit in it. A row of six filters has
 * to hold one line at desktop, so each control is as wide as its own text and no wider — the fixed
 * guesses this replaces (w-36, w-40) were what pushed the last control onto a second row — and the
 * search field, not the filters, is what absorbs the slack. `max-w` is the ceiling for names that
 * beat it; the shared SelectTrigger truncates there rather than wrapping.
 */
export const FILTER_BAR = "flex flex-wrap items-center gap-1.5 py-3"
export const FILTER_TRIGGER = "h-8 w-auto max-w-[13rem] shrink-0 text-xs"
export const FILTER_SEARCH = "relative min-w-0 flex-1 basis-40"

export function SectionCard({
  title,
  icon,
  action,
  className,
  children,
}: {
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  )
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${STATUS_COLOR[status] ?? "hsl(var(--muted-foreground))"} 15%, transparent)`,
        color: STATUS_COLOR[status],
      }}
    >
      <CircleDot className="h-3 w-3" />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function PriorityPill({ priority }: { priority: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
      <Flag className="h-3 w-3" style={{ color: PRIORITY_COLOR[priority] }} />
      {priority}
    </span>
  )
}

export function AvatarCircle({
  name,
  avatar,
  size = 28,
}: {
  name: string
  avatar?: string | null
  size?: number
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar.startsWith("avatars/") ? `/api/storage/${avatar}` : avatar}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-muted text-[10px] font-semibold"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  )
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{children}</p>
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" }
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  },
}
