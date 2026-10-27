"use client"

// Four Growth AI actions (design §11). The panel only renders what the server saved:
// it never computes readiness, never invents a source and never publishes a band. A
// learning item or benchmark source is shown only because the route verified its URL
// against Google Search grounding.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { GROWTH_ACTIONS, GROWTH_ACTION_LABEL, type GrowthAction } from "@/lib/career/growth"

type LearningPayload = {
  items: Array<{ title: string; provider: string | null; url: string; why: string; hours: number | null }>
  dropped: number
  queries: string[]
  asOfDay: string
}

type BenchmarkPayload = {
  benchmark: {
    min: number
    max: number
    currency: string
    market: string
    basis: string
    sources: Array<{ url: string; title: string | null }>
  }
  asOfDay: string
}

type ReviewPayload = {
  signals: Record<string, number>
  readiness: { percent: number; capped: boolean; capReason: string | null }
  asOfDay: string
}

type TasksPayload = {
  planId: number
  tasks: Array<{ title: string; description: string; estimatePoints: number }>
  gaps: Array<{ kind: string; label: string }>
  asOfDay: string
}

type GrowthRow = {
  id: number
  kind: GrowthAction
  payload: LearningPayload | BenchmarkPayload | ReviewPayload | TasksPayload
  narrative: string | null
  asOf: string
  model: string | null
  aiMarked: boolean
}

function day(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export function GrowthPanel({ discipline, top }: { discipline: string | null; top: boolean }) {
  const { toast } = useToast()
  const [aiAvailable, setAiAvailable] = useState(false)
  const [rows, setRows] = useState<GrowthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<GrowthAction | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/career/growth")
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error ?? `Request failed (${res.status})`)
      setAiAvailable(Boolean(json.data.aiAvailable))
      setRows((json.data.reviews ?? []) as GrowthRow[])
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (action: GrowthAction) => {
    if (!discipline) return
    setBusy(action)
    try {
      const res = await fetch("/api/career/growth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, discipline }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error ?? `Request failed (${res.status})`)
      toast({
        title: `${GROWTH_ACTION_LABEL[action]} saved`,
        description: "The result is below and in your history.",
      })
      await load()
    } catch (err) {
      toast({
        title: `${GROWTH_ACTION_LABEL[action]} failed`,
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  const latest = (action: GrowthAction): GrowthRow | undefined => rows.find((row) => row.kind === action)

  const disabled = !aiAvailable || top || busy !== null || !discipline

  return (
    <SectionCard title="Growth AI" icon={<Badge variant="outline">AI</Badge>}>
      <div className="space-y-4">
        {!aiAvailable ? (
          <Alert>
            <AlertDescription>
              Growth AI is off. Set <code className="rounded bg-muted px-1">GOOGLE_GEMINI_API_KEY</code> to
              enable it; the rest of this page works without it.
            </AlertDescription>
          </Alert>
        ) : null}

        {top ? (
          <p className="text-sm text-muted-foreground">
            You are at the top of this ladder, so there is no next rung to prepare for.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {GROWTH_ACTIONS.map((action) => (
              <Button key={action} variant="outline" disabled={disabled} onClick={() => void run(action)}>
                {busy === action ? "Working…" : GROWTH_ACTION_LABEL[action]}
              </Button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          AI-generated and may be wrong. Learning links and benchmark sources are checked against the
          search results before they appear; anything unverified is dropped.
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">Loading saved results…</p> : null}

        {!loading && rows.length === 0 ? <EmptyNote>No growth results yet.</EmptyNote> : null}

        <div className="space-y-4">
          {GROWTH_ACTIONS.map((action) => {
            const row = latest(action)
            if (!row) return null
            return (
              <div key={row.id} className="rounded-md border border-border/60 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{GROWTH_ACTION_LABEL[action]}</p>
                  <Badge variant="outline">{row.aiMarked ? "AI" : "Saved"}</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {day(row.asOf)}
                    {row.model ? ` · ${row.model}` : ""}
                  </span>
                </div>
                <GrowthBody row={row} />
              </div>
            )
          })}
        </div>
      </div>
    </SectionCard>
  )
}

function GrowthBody({ row }: { row: GrowthRow }) {
  if (row.kind === "learning") {
    const payload = row.payload as LearningPayload
    return (
      <div className="space-y-2">
        <ul className="space-y-2">
          {payload.items.map((item) => (
            <li key={item.url} className="text-sm">
              <a className="font-medium underline" href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
              {item.provider ? <span className="text-muted-foreground"> · {item.provider}</span> : null}
              {item.hours ? <span className="text-muted-foreground"> · {item.hours}h</span> : null}
              <p className="text-xs text-muted-foreground">{item.why}</p>
            </li>
          ))}
        </ul>
        {payload.dropped > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {payload.dropped} unverified link{payload.dropped === 1 ? "" : "s"} removed.
          </p>
        ) : null}
      </div>
    )
  }

  if (row.kind === "benchmark") {
    const { benchmark } = row.payload as BenchmarkPayload
    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium">
          {benchmark.min.toLocaleString()}–{benchmark.max.toLocaleString()} {benchmark.currency}
          <span className="text-muted-foreground"> · {benchmark.market}</span>
        </p>
        <p className="text-xs text-muted-foreground">{benchmark.basis}</p>
        <ul className="space-y-1 text-xs">
          {benchmark.sources.map((source) => (
            <li key={source.url}>
              <a className="underline" href={source.url} target="_blank" rel="noreferrer">
                {source.title ?? source.url}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Suggestion only. A band is published by an admin on the ladder, never by this action.
        </p>
      </div>
    )
  }

  if (row.kind === "review") {
    return <p className="whitespace-pre-line text-sm">{row.narrative}</p>
  }

  const payload = row.payload as TasksPayload
  return (
    <div className="space-y-2 text-sm">
      <ul className="space-y-2">
        {payload.tasks.map((task, index) => (
          <li key={`${task.title}-${index}`}>
            <p className="font-medium">
              {task.title} <span className="text-muted-foreground">· {task.estimatePoints} pts</span>
            </p>
            <p className="text-xs text-muted-foreground">{task.description}</p>
          </li>
        ))}
      </ul>
      <Button asChild size="sm" variant="outline">
        <Link href={`/dashboard/planner/${payload.planId}`}>Review the draft plan</Link>
      </Button>
    </div>
  )
}
