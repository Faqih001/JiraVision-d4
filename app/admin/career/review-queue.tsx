"use client"

// The promotion review queue (design §11). Each card is the snapshot the member froze when
// they submitted: the same percentage, targets, checklist and row counts the meter showed
// them. The reviewer decides that artefact, not today's numbers. Nothing here recomputes a
// percentage; the server's figure is rendered as-is.

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ClipboardCheck, Clock, Loader2, RotateCcw, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { CAREER_SIGNALS, type CareerSignalKey } from "@/lib/career/signals"
import { DISCIPLINE_LABEL, isWorkDiscipline } from "@/lib/roles"

type ChecklistEntry = { key: string; label: string; hint: string }

type SignoffEntry = { itemKey: string; status: string }

type FrozenEvidence = {
  asOf?: string
  windowStart?: string
  windowDays?: number
  discipline?: string
  fromLevel?: number
  toLevel?: number
  signals?: Partial<Record<CareerSignalKey, number>>
  readiness?: {
    percent: number
    capped: boolean
    capReason: string | null
    signalPercent: number
    checklistPercent: number
    met: boolean
  } | null
  checklist?: { current?: ChecklistEntry[]; next?: ChecklistEntry[] }
  signoffs?: { current?: SignoffEntry[]; next?: SignoffEntry[] }
  targets?: Partial<Record<CareerSignalKey, number>>
  refs?: Partial<Record<CareerSignalKey, { rows?: unknown[]; truncated?: boolean }>>
}

type CareerRequestRow = {
  id: number
  memberName: string
  discipline: string
  fromLevel: number
  toLevel: number
  status: string
  note: string | null
  evidence: unknown
  requestedAt: string
  reviewerName: string | null
  reviewedAt: string | null
  returnNote: string | null
  effectiveDate: string | null
}

type Flash = { kind: "ok" | "err"; text: string } | null

const disciplineLabel = (value: string): string =>
  isWorkDiscipline(value) ? DISCIPLINE_LABEL[value] : value

function formatDay(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString()
}

function asEvidence(value: unknown): FrozenEvidence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as FrozenEvidence
}

function signedStatus(
  entries: SignoffEntry[] | undefined,
  itemKey: string,
): string | null {
  return entries?.find((entry) => entry.itemKey === itemKey)?.status ?? null
}

function ChecklistColumn({
  heading,
  items,
  signoffs,
}: {
  heading: string
  items: ChecklistEntry[]
  signoffs: SignoffEntry[] | undefined
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No checklist on this rung.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const status = signedStatus(signoffs, item.key)
            return (
              <li
                key={item.key}
                className="flex items-start justify-between gap-2 rounded-md border border-border/70 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium">{item.label}</p>
                  {item.hint ? (
                    <p className="text-[11px] text-muted-foreground">{item.hint}</p>
                  ) : null}
                </div>
                <Badge variant={status === "ticked" ? "default" : "outline"} className="shrink-0">
                  {status === "ticked" ? "Ticked" : status === "declined" ? "Declined" : "Open"}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FrozenSnapshot({ evidence }: { evidence: FrozenEvidence | null }) {
  if (!evidence) {
    return (
      <p className="text-xs text-muted-foreground">
        This request has no snapshot attached. Do not decide it from memory — ask the member to
        submit again.
      </p>
    )
  }

  const readiness = evidence.readiness ?? null
  const refs = evidence.refs ?? {}

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {readiness ? (
          <>
            <span className="text-3xl font-semibold tabular-nums">{readiness.percent}%</span>
            <span className="pb-1 text-[11px] text-muted-foreground">
              Signals {readiness.signalPercent}% · Checklist {readiness.checklistPercent}%
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            The readiness figure is not recorded in this snapshot.
          </span>
        )}
      </div>

      {readiness?.capped && readiness.capReason ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px]">
          Capped: {readiness.capReason}
        </p>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Counted over {evidence.windowDays ?? "—"} days from {formatDay(evidence.windowStart)},
        frozen {formatDay(evidence.asOf)}. These are the numbers the member saw.
      </p>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Signals at submit
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {CAREER_SIGNALS.map((signal) => {
            const actual = evidence.signals?.[signal.key] ?? 0
            const target = evidence.targets?.[signal.key] ?? 0
            const ref = refs[signal.key]
            const rows = ref?.rows?.length ?? 0
            return (
              <li key={signal.key} className="text-[11px]">
                <span className="font-medium">{signal.label}</span>{" "}
                <span className="tabular-nums text-muted-foreground">
                  {actual}
                  {target > 0 ? ` / ${target}` : " · no target"}
                  {" · "}
                  {rows === 1 ? "1 row" : `${rows} rows`}
                  {ref?.truncated ? " (truncated)" : ""}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ChecklistColumn
          heading={`Level ${evidence.fromLevel ?? "—"} · held`}
          items={evidence.checklist?.current ?? []}
          signoffs={evidence.signoffs?.current}
        />
        <ChecklistColumn
          heading={`Level ${evidence.toLevel ?? "—"} · requested`}
          items={evidence.checklist?.next ?? []}
          signoffs={evidence.signoffs?.next}
        />
      </div>
    </div>
  )
}

export function ReviewQueue() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<CareerRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<Flash>(null)
  const [returnNotes, setReturnNotes] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/career/requests")
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      setRequests(json.data.requests as CareerRequestRow[])
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/career/requests")
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
        }
        return json
      })
      .then((json) => {
        if (cancelled) return
        setRequests(json.data.requests as CareerRequestRow[])
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const decide = async (row: CareerRequestRow, action: "approve" | "return") => {
    const note = (returnNotes[row.id] ?? "").trim()
    if (action === "return" && !note) {
      setFlash({ kind: "err", text: "A note is required to return a request." })
      return
    }
    setBusy(row.id)
    setFlash(null)
    try {
      const res = await fetch(`/api/career/requests/${row.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "return" ? JSON.stringify({ note }) : undefined,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      toast({
        title: action === "approve" ? "Request approved" : "Request returned",
        description:
          action === "approve"
            ? `${row.memberName} moves to level ${row.toLevel}.`
            : `${row.memberName} can read your note and submit again.`,
      })
      setReturnNotes((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      await load()
    } catch (err) {
      setFlash({ kind: "err", text: (err as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const queue = requests.filter((row) => row.status === "submitted")
  const history = requests.filter((row) => row.status === "approved" || row.status === "returned")

  return (
    <div className="space-y-4">
      {flash ? (
        <Alert variant={flash.kind === "err" ? "destructive" : "default"}>
          <AlertDescription>{flash.text}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <SectionCard
        title={`Awaiting review (${queue.length})`}
        icon={<ClipboardCheck className="h-4 w-4" />}
      >
        {loading ? (
          <p className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading requests…
          </p>
        ) : queue.length === 0 ? (
          <EmptyNote>No promotion requests are waiting.</EmptyNote>
        ) : (
          <ul className="space-y-4">
            {queue.map((row) => {
              const evidence = asEvidence(row.evidence)
              const working = busy === row.id
              return (
                <li key={row.id} className="rounded-lg border border-border/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{row.memberName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {disciplineLabel(row.discipline)} · Level {row.fromLevel} →{" "}
                        {row.toLevel} · requested {formatDay(row.requestedAt)}
                      </p>
                      {row.note ? (
                        <p className="text-[11px] text-muted-foreground">{row.note}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      Frozen snapshot
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="rounded-md border border-border/70 p-3">
                      <FrozenSnapshot evidence={evidence} />
                    </div>

                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => void decide(row, "approve")}
                        disabled={working}
                      >
                        {working ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                        )}
                        Approve
                      </Button>
                      <Textarea
                        rows={3}
                        placeholder="Why is this request returned? (required)"
                        aria-label={`Return note for ${row.memberName}`}
                        value={returnNotes[row.id] ?? ""}
                        onChange={(event) =>
                          setReturnNotes((prev) => ({ ...prev, [row.id]: event.target.value }))
                        }
                      />
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => void decide(row, "return")}
                        disabled={working || !(returnNotes[row.id] ?? "").trim()}
                      >
                        {working ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                        )}
                        Return with note
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        Approving moves the placement and notifies the member. Approving is
                        refused if their placement moved since they submitted.
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Decided requests" icon={<Clock className="h-4 w-4" />}>
        {loading ? null : history.length === 0 ? (
          <EmptyNote>No approved or returned requests yet.</EmptyNote>
        ) : (
          <ul className="space-y-2">
            {history.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/70 px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium">
                    {row.status === "approved" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />
                    )}
                    {row.memberName} · Level {row.fromLevel} → {row.toLevel}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {disciplineLabel(row.discipline)} ·{" "}
                    {row.status === "approved" ? "Approved" : "Returned"}{" "}
                    {formatDay(row.reviewedAt ?? row.requestedAt)}
                    {row.reviewerName ? ` by ${row.reviewerName}` : ""}
                    {row.effectiveDate ? ` · effective ${formatDay(row.effectiveDate)}` : ""}
                  </p>
                  {row.returnNote ? (
                    <p className="text-[11px] text-muted-foreground">{row.returnNote}</p>
                  ) : null}
                </div>
                <Badge variant="outline">{row.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
