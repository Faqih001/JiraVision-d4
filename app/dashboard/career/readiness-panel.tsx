"use client"

// The readiness meter and its drill-downs (design §11). Nothing here computes the
// percentage: the server sends it and this file only draws bars for actual/target.
// Opening a signal asks /api/career/me/evidence for the rows behind its count.

import { useState } from "react"
import { ChevronDown, ChevronRight, CircleHelp, Inbox, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { formatBand, type CareerBand } from "@/lib/career/bands"
import { CAREER_SIGNALS, type CareerSignalKey } from "@/lib/career/signals"
import { cn } from "@/lib/utils"

export type ChecklistItemDto = { key: string; label: string; hint: string }

export type SignoffDto = {
  levelId: number
  itemKey: string
  status: "ticked" | "declined"
  tickedBy: number
  tickedByName: string
  tickedAt: string
  note: string | null
}

export type BandDto = CareerBand & { published: boolean }

export type RungDto = {
  level: number
  title: string
  summary: string
  expectations: string
  checklist: ChecklistItemDto[]
  signoffs: SignoffDto[]
  band: BandDto
  targets?: Partial<Record<CareerSignalKey, number>>
}

export type ReadinessGapDto = {
  kind: "signal" | "checklist"
  key: string
  label: string
  actual: number
  target: number
  hint: string
}

export type ReadinessDto = {
  percent: number
  capped: boolean
  capReason: string | null
  signalPercent: number
  checklistPercent: number
  gaps: ReadinessGapDto[]
  met: boolean
}

export type RequestSummaryDto = {
  id: number
  status: string
  toLevel: number
  requestedAt: string
  returnNote: string | null
  reviewedAt: string | null
}

export type HistoryEntryDto = {
  id: number
  fromLevel: number
  toLevel: number
  requestedAt: string
  reviewedAt: string | null
  effectiveDate: string | null
  reviewerName: string
}

export type CareerMe = {
  asOf: string
  windowDays: number
  windowStart: string
  placements: Array<{ discipline: string; level: number }>
  discipline: string | null
  placement: { level: number; placedAt: string; placedBy: number | null; note: string | null } | null
  current: RungDto | null
  next: RungDto | null
  signals: Record<CareerSignalKey, number> | null
  readiness: ReadinessDto | null
  top: boolean
  latestRequest: RequestSummaryDto | null
  history: HistoryEntryDto[]
  admin: boolean
}

type EvidenceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      rows: Array<{ id: number; label: string; date: string | null }>
      truncated: boolean
      total: number
    }

const barWidth = (actual: number, target: number) =>
  target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 100

function formatDay(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export function CareerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  )
}

function SignoffNote({ signoff }: { signoff?: SignoffDto }) {
  if (!signoff) {
    return <span className="text-[11px] text-muted-foreground">Awaiting admin sign-off</span>
  }
  if (signoff.status === "declined") {
    return (
      <span className="text-[11px] text-destructive">
        Declined by {signoff.tickedByName}
        {signoff.note ? ` — ${signoff.note}` : ""}
      </span>
    )
  }
  return (
    <span className="text-[11px] text-muted-foreground">
      Ticked by {signoff.tickedByName} on {formatDay(signoff.tickedAt)}
      {signoff.note ? ` — ${signoff.note}` : ""}
    </span>
  )
}

function Checklist({ rung, label }: { rung: RungDto | null; label: string }) {
  if (!rung) return null
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {rung.checklist.length === 0 ? (
        <EmptyNote>No checklist is configured for this rung.</EmptyNote>
      ) : (
        <ul className="space-y-1.5">
          {rung.checklist.map((item) => {
            const signoff = rung.signoffs.find((entry) => entry.itemKey === item.key)
            return (
              <li
                key={item.key}
                className="flex flex-col gap-0.5 rounded-md border border-border/70 px-2.5 py-2"
              >
                <span className="text-xs font-medium">{item.label}</span>
                {item.hint ? (
                  <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                ) : null}
                <SignoffNote signoff={signoff} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SignalRow({
  signalKey,
  label,
  hint,
  actual,
  target,
  discipline,
}: {
  signalKey: CareerSignalKey
  label: string
  hint: string
  actual: number
  target: number
  discipline: string | null
}) {
  const [open, setOpen] = useState(false)
  const [evidence, setEvidence] = useState<EvidenceState | null>(null)

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (!next || evidence) return
    setEvidence({ status: "loading" })
    try {
      const qs = new URLSearchParams({ signal: signalKey })
      if (discipline) qs.set("discipline", discipline)
      const res = await fetch(`/api/career/me/evidence?${qs.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? `Request failed (${res.status})`)
      }
      setEvidence({
        status: "ready",
        rows: json.data.rows,
        truncated: Boolean(json.data.truncated),
        total: Number(json.data.total ?? 0),
      })
    } catch (error) {
      setEvidence({ status: "error", message: (error as Error).message })
    }
  }

  return (
    <li className="space-y-1.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span className="flex-1 text-xs font-medium">{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {actual}
          {target > 0 ? ` / ${target}` : " · no target"}
        </span>
      </button>
      <div className="ml-5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={cn(
            "h-full rounded-full",
            target > 0 && actual >= target ? "bg-primary" : "bg-primary/60",
          )}
          style={{ width: `${barWidth(actual, target)}%` }}
        />
      </div>
      <p className="ml-5 text-[11px] text-muted-foreground">{hint}</p>
      {open ? (
        <div className="ml-5 rounded-md border border-border/70 px-2.5 py-2">
          {!evidence || evidence.status === "loading" ? (
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Loading evidence…
            </span>
          ) : evidence.status === "error" ? (
            <span className="text-[11px] text-destructive">{evidence.message}</span>
          ) : evidence.rows.length === 0 ? (
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Inbox className="h-3 w-3" aria-hidden /> Nothing counted in this window
            </span>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                {evidence.total} counted{evidence.truncated ? ` · showing the first ${evidence.rows.length}` : ""}
              </p>
              <ul className="space-y-1">
                {evidence.rows.map((row) => (
                  <li key={row.id} className="flex items-start justify-between gap-3 text-[11px]">
                    <span className="flex-1">{row.label}</span>
                    <span className="tabular-nums text-muted-foreground">{formatDay(row.date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </li>
  )
}

export function ReadinessPanel({
  data,
  discipline,
}: {
  data: CareerMe
  discipline: string | null
}) {
  const readiness = data.readiness
  if (!readiness || !data.signals) return null
  const targets = data.next?.targets ?? {}

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Readiness" icon={<CircleHelp className="h-4 w-4" />}>
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <span className="text-4xl font-semibold tabular-nums">{readiness.percent}%</span>
            <span className="pb-1 text-xs text-muted-foreground">
              to {data.next ? `level ${data.next.level} · ${data.next.title}` : "the next rung"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${readiness.percent}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <span>Signals {readiness.signalPercent}% · 70%</span>
            <span>Checklist {readiness.checklistPercent}% · 30%</span>
          </div>
          {readiness.capped && readiness.capReason ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px]">
              Capped: {readiness.capReason}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            Counted over {data.windowDays} days from {formatDay(data.windowStart)}. Open a row to
            see exactly what was counted.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Signals" icon={<CircleHelp className="h-4 w-4" />}>
        <ul className="space-y-2.5">
          {CAREER_SIGNALS.map((signal) => (
            <SignalRow
              key={signal.key}
              signalKey={signal.key}
              label={signal.label}
              hint={signal.hint}
              actual={data.signals?.[signal.key] ?? 0}
              target={targets[signal.key] ?? 0}
              discipline={discipline}
            />
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Checklist" icon={<CircleHelp className="h-4 w-4" />}>
        <div className="space-y-4">
          <Checklist rung={data.current} label={`Level ${data.current?.level ?? ""} · held`} />
          <Checklist rung={data.next} label={`Level ${data.next?.level ?? ""} · next`} />
        </div>
      </SectionCard>

      <SectionCard title="Band" icon={<CircleHelp className="h-4 w-4" />}>
        <BandBody band={data.next?.band ?? data.current?.band ?? null} />
      </SectionCard>
    </div>
  )
}

function BandBody({ band }: { band: BandDto | null }) {
  if (!band || !band.published) {
    return (
      <div className="space-y-2">
        <Badge variant="outline">Band not published</Badge>
        <p className="text-[11px] text-muted-foreground">
          No pay range has been published for this rung. When one is, it appears here.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <p className="text-lg font-semibold tabular-nums">{formatBand(band)}</p>
      <p className="text-[11px] text-muted-foreground">The range published for this rung.</p>
    </div>
  )
}
