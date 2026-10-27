"use client"

// The playbook editor (design §12 item 5). The stored row is loaded once; every change is a
// draft in this component. Step order lives in the pure helpers so a move, a clone and a
// remove always leave orders 1..n. Publishing saves first, so the sheet that goes live is
// the sheet on screen, and the gate is the same pure rule the publish route applies.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpenCheck,
  Copy,
  Loader2,
  Play,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import type { PrecautionSuggestion } from "@/lib/agent/precautions"
import { exportPlaybookPdf } from "@/lib/export/pdf"
import {
  emptyStep,
  moveStep,
  cloneStep,
  removeStep,
  type PlaybookStep,
} from "@/lib/playbooks/method"
import {
  PLAYBOOK_STATUS_LABEL,
  publishProblem,
  type PlaybookStatus,
} from "@/lib/playbooks/rules"
import { DISCIPLINE_LABEL, WORK_DISCIPLINES } from "@/lib/roles"

type PlaybookRow = {
  id: number
  packKey: string
  discipline: string | null
  title: string
  summary: string | null
  scopeKind: string | null
  method: string[]
  steps: PlaybookStep[]
  precautions: string[]
  recommendations: string[]
  tags: string[]
  status: PlaybookStatus
  version: number
  authorId: number | null
  authorName: string | null
  source: string
  aiMarked: boolean
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  updatedAt: string
}

type PackSummary = { packKey: string; title: string; method: string[] }

type EditorPayload = {
  playbook: PlaybookRow
  packs: PackSummary[]
  admin: boolean
  today: string
}

type EditorDraft = {
  title: string
  summary: string
  discipline: string
  scopeKind: string
  verifyIntervalDays: string
  method: string
  precautions: string
  recommendations: string
  tags: string
  steps: PlaybookStep[]
}

type SendResult = { json: any; error: string | null }

async function send(path: string, init?: RequestInit): Promise<SendResult> {
  try {
    const res = await fetch(path, init)
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success) {
      return { json, error: json?.error ?? json?.message ?? `Request failed (${res.status})` }
    }
    return { json, error: null }
  } catch (error) {
    return { json: null, error: (error as Error).message }
  }
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

const lines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

const tagsOf = (text: string): string[] =>
  text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

const fromRow = (row: PlaybookRow): EditorDraft => ({
  title: row.title,
  summary: row.summary ?? "",
  discipline: row.discipline ?? "none",
  scopeKind: row.scopeKind ?? "",
  verifyIntervalDays: row.verifyIntervalDays === null ? "" : String(row.verifyIntervalDays),
  method: row.method.join("\n"),
  precautions: row.precautions.join("\n"),
  recommendations: row.recommendations.join("\n"),
  tags: row.tags.join(", "),
  steps: row.steps,
})

function ListField({
  id,
  label,
  values,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Textarea
        id={id}
        rows={2}
        value={values.join("\n")}
        onChange={(event) => onChange(event.target.value.split("\n"))}
        placeholder={placeholder}
      />
    </div>
  )
}

export function EditorSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function PlaybookEditor({ id }: { id: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const [payload, setPayload] = useState<EditorPayload | null>(null)
  const [draft, setDraft] = useState<EditorDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [precautionIdeas, setPrecautionIdeas] = useState<PrecautionSuggestion[]>([])
  const [precautionBusy, setPrecautionBusy] = useState(false)
  const [precautionError, setPrecautionError] = useState<string | null>(null)
  const [aiTouched, setAiTouched] = useState(false)

  const playbook = payload?.playbook ?? null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/playbooks/${id}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      const next = json.data as EditorPayload
      setPayload(next)
      setDraft(fromRow(next.playbook))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const phases = useMemo(() => (draft ? lines(draft.method) : []), [draft])
  const orphans = useMemo(
    () => (draft ? draft.steps.filter((step) => !phases.includes(step.phase)) : []),
    [draft, phases],
  )

  const publishIssue = useMemo(() => {
    if (!playbook || !draft) return null
    return publishProblem({
      status: playbook.status,
      source: playbook.source,
      aiMarked: playbook.aiMarked,
      steps: draft.steps,
    })
  }, [playbook, draft])

  const patchStep = useCallback((index: number, patch: Partial<PlaybookStep>) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((step, position) =>
              position === index ? { ...step, ...patch } : step,
            ),
          }
        : prev,
    )
  }, [])

  const setSteps = useCallback((next: PlaybookStep[]) => {
    setDraft((prev) => (prev ? { ...prev, steps: next } : prev))
  }, [])

  const suggestPrecautions = useCallback(async () => {
    if (!draft) return
    const method = lines(draft.method)
    const steps = draft.steps
      .filter((step) => step.action.trim())
      .map((step) => ({ phase: step.phase, action: step.action.trim() }))
    if (steps.length === 0) {
      setPrecautionError("Add at least one step with an action first.")
      return
    }
    setPrecautionBusy(true)
    setPrecautionError(null)
    const result = await send(
      "/api/agent/precautions",
      jsonInit("POST", {
        playbook: {
          title: draft.title,
          summary: draft.summary.trim() || null,
          method,
          steps,
          existing: lines(draft.precautions),
        },
      }),
    )
    setPrecautionBusy(false)
    if (result.error) {
      setPrecautionError(result.error)
      return
    }
    setPrecautionIdeas((result.json?.data?.suggestions ?? []) as PrecautionSuggestion[])
  }, [draft])

  const acceptPrecaution = useCallback(
    (idea: PrecautionSuggestion) => {
      if (!draft) return
      const current = lines(draft.precautions)
      const exists = current.some((line) => line.toLowerCase() === idea.text.toLowerCase())
      const next = exists ? current : [...current, idea.text]
      setDraft({ ...draft, precautions: next.join("\n") })
      setAiTouched(true)
      setPrecautionIdeas((ideas) => ideas.filter((entry) => entry.text !== idea.text))
    },
    [draft],
  )

  const save = useCallback(async (): Promise<boolean> => {
    if (!playbook || !draft) return false
    const method = lines(draft.method)
    if (method.length === 0) {
      toast({ variant: "destructive", title: "The method needs at least one phase" })
      return false
    }
    if (draft.steps.some((step) => !method.includes(step.phase))) {
      toast({
        variant: "destructive",
        title: "A step sits in a phase the method no longer lists",
        description: "Move that step to a current phase before saving.",
      })
      return false
    }

    const intervalText = draft.verifyIntervalDays.trim()
    const interval = intervalText === "" ? null : Number(intervalText)
    if (interval !== null && (!Number.isInteger(interval) || interval < 0 || interval > 3650)) {
      toast({
        variant: "destructive",
        title: "Re-verify interval",
        description: "Use a whole number of days between 0 and 3650, or leave it blank.",
      })
      return false
    }

    setBusy(true)
    const result = await send(
      `/api/playbooks/${playbook.id}`,
      jsonInit("PATCH", {
        title: draft.title,
        summary: draft.summary,
        discipline: draft.discipline === "none" ? null : draft.discipline,
        scopeKind: draft.scopeKind.trim() || null,
        verifyIntervalDays: interval,
        method,
        steps: draft.steps,
        precautions: lines(draft.precautions),
        recommendations: lines(draft.recommendations),
        tags: tagsOf(draft.tags),
        ...(aiTouched ? { aiMarked: true } : {}),
      }),
    )
    setBusy(false)

    if (result.error) {
      toast({ variant: "destructive", title: "Save", description: result.error })
      return false
    }

    const updated = result.json?.data?.playbook as PlaybookRow | undefined
    if (updated) {
      setPayload((prev) => (prev ? { ...prev, playbook: updated } : prev))
      setDraft(fromRow(updated))
      setAiTouched(false)
      toast({
        title: "Saved",
        description:
          updated.version > playbook.version ? `Version ${updated.version} is now current.` : undefined,
      })
    }
    return true
  }, [draft, playbook, toast, aiTouched])

  const publish = useCallback(async () => {
    if (!playbook) return
    const saved = await save()
    if (!saved) return

    setBusy(true)
    const result = await send(`/api/playbooks/${playbook.id}/publish`, { method: "POST" })
    setBusy(false)
    if (result.error) {
      toast({ variant: "destructive", title: "Publish", description: result.error })
      return
    }
    const updated = result.json?.data?.playbook as PlaybookRow | undefined
    if (updated) {
      setPayload((prev) => (prev ? { ...prev, playbook: updated } : prev))
      setDraft(fromRow(updated))
    }
    toast({ title: "Published", description: "Every member can read it now." })
  }, [playbook, save, toast])

  const setStatus = useCallback(
    async (status: "draft" | "archived") => {
      if (!playbook) return
      setBusy(true)
      const result = await send(
        `/api/playbooks/${playbook.id}`,
        jsonInit("PATCH", { status }),
      )
      setBusy(false)
      if (result.error) {
        toast({ variant: "destructive", title: PLAYBOOK_STATUS_LABEL[status], description: result.error })
        return
      }
      const updated = result.json?.data?.playbook as PlaybookRow | undefined
      if (updated) {
        setPayload((prev) => (prev ? { ...prev, playbook: updated } : prev))
        setDraft(fromRow(updated))
      }
      toast({ title: PLAYBOOK_STATUS_LABEL[status], description: updated?.title ?? playbook.title })
    },
    [playbook, toast],
  )

  const print = useCallback(() => {
    if (!playbook || !draft) return
    const intervalText = draft.verifyIntervalDays.trim()
    const interval = intervalText === "" ? null : Number(intervalText)
    exportPlaybookPdf({
      title: draft.title,
      summary: draft.summary.trim() || null,
      packKey: playbook.packKey,
      discipline: draft.discipline === "none" ? null : draft.discipline,
      version: playbook.version,
      status: playbook.status,
      aiMarked: playbook.aiMarked,
      authorName: playbook.authorName,
      method: lines(draft.method),
      steps: draft.steps,
      precautions: lines(draft.precautions),
      recommendations: lines(draft.recommendations),
      lastVerifiedAt: playbook.lastVerifiedAt,
      verifyIntervalDays: interval !== null && Number.isFinite(interval) ? interval : null,
    })
  }, [draft, playbook])

  if (loading && !payload) return <EditorSkeleton />

  if (error && !payload) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!payload || !playbook || !draft) return null

  const packTitle =
    payload.packs.find((pack) => pack.packKey === playbook.packKey)?.title ?? playbook.packKey
  const canRun = playbook.status === "published"

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/dashboard/playbooks"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Playbooks
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookOpenCheck className="h-5 w-5" aria-hidden />
            {draft.title || "Untitled playbook"}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={playbook.status === "published" ? "default" : "secondary"}>
              {PLAYBOOK_STATUS_LABEL[playbook.status]}
            </Badge>
            <Badge variant="outline">v{playbook.version}</Badge>
            <Badge variant="outline">{packTitle}</Badge>
            <span className="text-xs text-muted-foreground">
              {playbook.authorName ?? "Unknown author"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={print} disabled={busy}>
            <Printer className="mr-1.5 h-4 w-4" aria-hidden />
            Print
          </Button>
          {canRun ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/playbooks/${playbook.id}/run`}>
                <Play className="mr-1.5 h-4 w-4" aria-hidden />
                Run
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled title="Publish the playbook before running it.">
              <Play className="mr-1.5 h-4 w-4" aria-hidden />
              Run
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => void save()} disabled={busy}>
            <Save className="mr-1.5 h-4 w-4" aria-hidden />
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => void publish()}
            disabled={busy || publishIssue !== null}
            title={publishIssue ?? "Make this playbook readable by every member."}
          >
            Publish
          </Button>
          {playbook.status === "archived" ? (
            <Button size="sm" variant="ghost" onClick={() => void setStatus("draft")} disabled={busy}>
              Restore to draft
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => void setStatus("archived")} disabled={busy}>
              Archive
            </Button>
          )}
        </div>
      </header>

      {playbook.aiMarked ? (
        <Alert>
          <Sparkles className="h-4 w-4" aria-hidden />
          <AlertDescription>
            Model-written draft — every precaution below is advice, not a company rule. Edit and
            review before publishing; saving a content change records that review.
          </AlertDescription>
        </Alert>
      ) : null}

      {publishIssue ? (
        <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {publishIssue}
        </p>
      ) : null}

      {orphans.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <AlertDescription>
            {orphans.length} {orphans.length === 1 ? "step sits" : "steps sit"} in a phase this
            method no longer lists. Move {orphans.length === 1 ? "it" : "them"} to a current phase
            before saving.
          </AlertDescription>
        </Alert>
      ) : null}

      <SectionCard title="The playbook" icon={<BookOpenCheck className="h-4 w-4" />}>
        <div className="space-y-3">
          <div>
            <Label htmlFor="pb-title">Title</Label>
            <Input
              id="pb-title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Replace a failed drive in the rack"
            />
          </div>
          <div>
            <Label htmlFor="pb-summary">Summary</Label>
            <Textarea
              id="pb-summary"
              rows={2}
              value={draft.summary}
              onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
              placeholder="When this applies and what it produces."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="pb-discipline">Discipline</Label>
              <Select
                value={draft.discipline}
                onValueChange={(value) => setDraft({ ...draft, discipline: value })}
              >
                <SelectTrigger id="pb-discipline">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No discipline</SelectItem>
                  {WORK_DISCIPLINES.map((discipline) => (
                    <SelectItem key={discipline} value={discipline}>
                      {DISCIPLINE_LABEL[discipline]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pb-scope">Scope kind</Label>
              <Input
                id="pb-scope"
                value={draft.scopeKind}
                onChange={(event) => setDraft({ ...draft, scopeKind: event.target.value })}
                placeholder="e.g. procedure"
              />
            </div>
            <div>
              <Label htmlFor="pb-interval">Re-verify every (days)</Label>
              <Input
                id="pb-interval"
                type="number"
                min={0}
                max={3650}
                step={1}
                value={draft.verifyIntervalDays}
                onChange={(event) => setDraft({ ...draft, verifyIntervalDays: event.target.value })}
                placeholder="Blank means never scheduled"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pb-tags">Tags — comma separated</Label>
            <Input
              id="pb-tags"
              value={draft.tags}
              onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
              placeholder="hardware, networking"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Method" icon={<BookOpenCheck className="h-4 w-4" />}>
        <div className="space-y-2">
          <Label htmlFor="pb-method" className="text-xs text-muted-foreground">
            One phase per line, in the order they are worked
          </Label>
          <Textarea
            id="pb-method"
            rows={Math.max(6, phases.length + 1)}
            value={draft.method}
            onChange={(event) => setDraft({ ...draft, method: event.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Every step&apos;s phase must name one of these lines. A step whose phase disappears is
            flagged above rather than dropped.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title={`Steps (${draft.steps.length})`}
        icon={<BookOpenCheck className="h-4 w-4" />}
        action={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setSteps([...draft.steps, emptyStep(phases[0] ?? "", draft.steps.length + 1)])}
            disabled={phases.length === 0}
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Add step
          </Button>
        }
      >
        {draft.steps.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No steps yet. Add the first one and give it an action — publishing needs at least one
            step with an action.
          </p>
        ) : (
          <div className="space-y-4">
            {draft.steps.map((step, index) => (
              <div key={index} className="rounded-lg border bg-muted/10 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums">{index + 1}.</span>
                  <Select
                    value={step.phase}
                    onValueChange={(value) => patchStep(index, { phase: value })}
                  >
                    <SelectTrigger className="h-8 w-[11rem]" aria-label={`Step ${index + 1} phase`}>
                      <SelectValue placeholder="Phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {phases.map((phase) => (
                        <SelectItem key={phase} value={phase}>
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5"
                      aria-label={`Move step ${index + 1} up`}
                      onClick={() => setSteps(moveStep(draft.steps, index, index - 1))}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5"
                      aria-label={`Move step ${index + 1} down`}
                      onClick={() => setSteps(moveStep(draft.steps, index, index + 1))}
                      disabled={index === draft.steps.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5"
                      aria-label={`Clone step ${index + 1}`}
                      onClick={() => setSteps(cloneStep(draft.steps, index))}
                    >
                      <Copy className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5 text-destructive"
                      aria-label={`Remove step ${index + 1}`}
                      onClick={() => setSteps(removeStep(draft.steps, index))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  <div>
                    <Label htmlFor={`step-${index}-action`} className="text-xs text-muted-foreground">
                      Action
                    </Label>
                    <Textarea
                      id={`step-${index}-action`}
                      rows={2}
                      value={step.action}
                      onChange={(event) => patchStep(index, { action: event.target.value })}
                      placeholder="What the person does, in one instruction."
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`step-${index}-expected`} className="text-xs text-muted-foreground">
                        Expected result
                      </Label>
                      <Textarea
                        id={`step-${index}-expected`}
                        rows={2}
                        value={step.expected}
                        onChange={(event) => patchStep(index, { expected: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`step-${index}-time`} className="text-xs text-muted-foreground">
                        Time estimate
                      </Label>
                      <Input
                        id={`step-${index}-time`}
                        value={step.time_estimate}
                        onChange={(event) => patchStep(index, { time_estimate: event.target.value })}
                        placeholder="e.g. 15 min"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`step-${index}-stop`} className="text-xs text-muted-foreground">
                        Stop if
                      </Label>
                      <Textarea
                        id={`step-${index}-stop`}
                        rows={2}
                        value={step.stop_condition}
                        onChange={(event) => patchStep(index, { stop_condition: event.target.value })}
                        placeholder="The condition that makes this unsafe to continue."
                      />
                    </div>
                    <div>
                      <Label htmlFor={`step-${index}-escalate`} className="text-xs text-muted-foreground">
                        Escalate to
                      </Label>
                      <Textarea
                        id={`step-${index}-escalate`}
                        rows={2}
                        value={step.escalation}
                        onChange={(event) => patchStep(index, { escalation: event.target.value })}
                        placeholder="Who to call, and when."
                      />
                    </div>
                    <div>
                      <Label htmlFor={`step-${index}-evidence`} className="text-xs text-muted-foreground">
                        Evidence to record
                      </Label>
                      <Textarea
                        id={`step-${index}-evidence`}
                        rows={2}
                        value={step.evidence_to_record}
                        onChange={(event) => patchStep(index, { evidence_to_record: event.target.value })}
                        placeholder="Serial, photo, reading — what proves it was done."
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    <ListField
                      id={`step-${index}-checks`}
                      label="Checks — one per line"
                      values={step.checks}
                      onChange={(next) => patchStep(index, { checks: next })}
                      placeholder="What to confirm before moving on."
                    />
                    <ListField
                      id={`step-${index}-precautions`}
                      label="Precautions — one per line"
                      values={step.precautions}
                      onChange={(next) => patchStep(index, { precautions: next })}
                      placeholder="What protects the person and the equipment."
                    />
                    <ListField
                      id={`step-${index}-warnings`}
                      label="Warnings — one per line"
                      values={step.warnings}
                      onChange={(next) => patchStep(index, { warnings: next })}
                      placeholder="What goes wrong if this is skipped."
                    />
                    <ListField
                      id={`step-${index}-ppe`}
                      label="PPE — one per line"
                      values={step.ppe}
                      onChange={(next) => patchStep(index, { ppe: next })}
                      placeholder="Gloves, goggles, mat."
                    />
                    <ListField
                      id={`step-${index}-tools`}
                      label="Tools & parts — one per line"
                      values={step.tools_parts}
                      onChange={(next) => patchStep(index, { tools_parts: next })}
                      placeholder="What to bring to the job."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Precautions" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Model advice stays marked on the printed sheet.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void suggestPrecautions()}
                disabled={precautionBusy || !draft.title.trim()}
              >
                {precautionBusy ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3 w-3" />
                )}
                Suggest precautions
              </Button>
            </div>
            {precautionError ? (
              <p className="text-xs text-destructive" role="alert">
                {precautionError}
              </p>
            ) : null}
            {precautionIdeas.length > 0 ? (
              <ul className="space-y-2">
                {precautionIdeas.map((idea) => (
                  <li key={idea.text} className="rounded-md border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm">{idea.text}</span>
                      <Badge variant="secondary">AI suggestion</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{idea.why}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => acceptPrecaution(idea)}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPrecautionIdeas((ideas) => ideas.filter((entry) => entry.text !== idea.text))
                        }
                      >
                        Dismiss
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            <Label htmlFor="pb-precautions" className="text-xs text-muted-foreground">
              One per line. These apply to the whole playbook.
            </Label>
            <Textarea
              id="pb-precautions"
              rows={5}
              value={draft.precautions}
              onChange={(event) => setDraft({ ...draft, precautions: event.target.value })}
            />
          </div>
        </SectionCard>
        <SectionCard title="Recommendations" icon={<Sparkles className="h-4 w-4" />}>
          <div className="space-y-2">
            <Label htmlFor="pb-recommendations" className="text-xs text-muted-foreground">
              One per line. Advice, not a rule.
            </Label>
            <Textarea
              id="pb-recommendations"
              rows={5}
              value={draft.recommendations}
              onChange={(event) => setDraft({ ...draft, recommendations: event.target.value })}
            />
          </div>
        </SectionCard>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
        <Button variant="outline" onClick={() => router.push("/dashboard/playbooks")} disabled={busy}>
          Back to the library
        </Button>
        <Button onClick={() => void save()} disabled={busy}>
          <Save className="mr-1.5 h-4 w-4" aria-hidden />
          Save changes
        </Button>
      </div>
    </div>
  )
}
