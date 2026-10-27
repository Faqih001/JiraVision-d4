"use client"

// The member's career page (design §11). It renders the profile the server built: the rung
// held, the rung next, the readiness meter with its drill-downs, the request state and the
// approved history. The browser never recomputes a percentage; a request asks the server to
// freeze the evidence it just read.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Award, Clock, Settings2, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { DISCIPLINE_LABEL, isWorkDiscipline } from "@/lib/roles"
import {
  CareerSkeleton,
  ReadinessPanel,
  type CareerMe,
} from "./readiness-panel"

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Awaiting review",
  approved: "Approved",
  returned: "Returned",
}

function formatDay(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString()
}

const labelFor = (discipline: string | null): string =>
  discipline && isWorkDiscipline(discipline)
    ? DISCIPLINE_LABEL[discipline]
    : (discipline ?? "Career")

export default function CareerClient({ discipline }: { discipline?: string }) {
  const { toast } = useToast()
  const [data, setData] = useState<CareerMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = discipline ? `?discipline=${encodeURIComponent(discipline)}` : ""
      const res = await fetch(`/api/career/me${qs}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? `Request failed (${res.status})`)
      }
      setData(json.data as CareerMe)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [discipline])

  useEffect(() => {
    void load()
  }, [load])

  const requestPromotion = async () => {
    if (!data?.discipline) return
    setRequesting(true)
    try {
      const res = await fetch("/api/career/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline: data.discipline }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      toast({ title: "Request submitted", description: "An admin will review the frozen evidence." })
      await load()
    } catch (err) {
      toast({
        title: "Could not submit the request",
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setRequesting(false)
    }
  }

  if (loading) return <CareerSkeleton />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  const placement = data.placement
  const current = data.current
  const next = data.next
  const latest = data.latestRequest

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <TrendingUp className="h-5 w-5" aria-hidden />
            Career
          </h1>
          <p className="text-sm text-muted-foreground">
            {placement
              ? `${labelFor(data.discipline)} · level ${placement.level}${current ? ` — ${current.title}` : ""}`
              : "Your ladder placement and the evidence behind it."}
          </p>
        </div>
        {data.admin ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/career">
              <Settings2 className="mr-1.5 h-4 w-4" aria-hidden />
              Admin: ladder &amp; review
            </Link>
          </Button>
        ) : null}
      </header>

      {data.placements.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Career disciplines">
          {data.placements.map((row) => (
            <Button
              key={row.discipline}
              asChild
              size="sm"
              variant={row.discipline === data.discipline ? "default" : "outline"}
            >
              <Link href={`/dashboard/career/${row.discipline}`}>{labelFor(row.discipline)}</Link>
            </Button>
          ))}
        </div>
      ) : null}

      {!placement ? (
        <SectionCard title="No placement yet" icon={<Award className="h-4 w-4" />}>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              An admin places you on a ladder. Once placed, this page shows the rung you hold,
              the rung next and every row counted towards it.
            </p>
            <p>
              Your work log, tasks and deliverables are already being recorded, so the evidence
              starts counting from the day you are placed.
            </p>
          </div>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="The rung you hold" icon={<Award className="h-4 w-4" />}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-semibold">
                  Level {current?.level ?? placement.level}
                  {current ? ` · ${current.title}` : ""}
                </span>
                <Badge variant="outline">{labelFor(data.discipline)}</Badge>
              </div>
              {current?.summary ? <p className="text-sm">{current.summary}</p> : null}
              {current?.expectations ? (
                <p className="text-xs text-muted-foreground">{current.expectations}</p>
              ) : null}
              <p className="text-[11px] text-muted-foreground">
                Placed {formatDay(placement.placedAt)}
                {placement.note ? ` — ${placement.note}` : ""}
              </p>
            </div>
          </SectionCard>

          {next ? (
            <SectionCard title={`Next: level ${next.level} · ${next.title}`} icon={<ArrowRight className="h-4 w-4" />}>
              <div className="space-y-2">
                {next.summary ? <p className="text-sm">{next.summary}</p> : null}
                {next.expectations ? (
                  <p className="text-xs text-muted-foreground">{next.expectations}</p>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          <ReadinessPanel data={data} discipline={data.discipline} />

          <SectionCard title="Promotion request" icon={<Clock className="h-4 w-4" />}>
            {data.top ? (
              <p className="text-sm text-muted-foreground">You are at the top of this ladder.</p>
            ) : latest && (latest.status === "submitted" || latest.status === "draft") ? (
              <div className="space-y-2">
                <Badge>{STATUS_LABEL[latest.status] ?? latest.status}</Badge>
                <p className="text-sm text-muted-foreground">
                  Awaiting review since {formatDay(latest.requestedAt)}. The evidence was frozen
                  when you submitted, so the reviewer reads exactly what you saw.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {latest?.status === "returned" ? (
                  <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2">
                    <p className="text-xs font-medium">Returned on {formatDay(latest.reviewedAt)}</p>
                    {latest.returnNote ? (
                      <p className="text-xs text-muted-foreground">{latest.returnNote}</p>
                    ) : null}
                  </div>
                ) : null}
                {next ? (
                  <Button onClick={() => void requestPromotion()} disabled={requesting}>
                    {requesting ? "Submitting…" : `Request promotion to ${next.title}`}
                  </Button>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  Submitting freezes the counts and checklist as they stand today. You can request
                  again once a returned request is resolved.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="History" icon={<Clock className="h-4 w-4" />}>
            {data.history.length === 0 ? (
              <EmptyNote>No approved promotions yet.</EmptyNote>
            ) : (
              <ol className="space-y-3">
                {data.history.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">
                        Level {entry.fromLevel} → {entry.toLevel}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Approved {formatDay(entry.reviewedAt ?? entry.requestedAt)}
                        {entry.effectiveDate ? ` · effective ${formatDay(entry.effectiveDate)}` : ""}
                        {entry.reviewerName ? ` · ${entry.reviewerName}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        Computed on the server at {formatDay(data.asOf)} over the last {data.windowDays} days.
        Nothing on this page is typed in by hand.
      </p>
    </div>
  )
}
