"use client"

// Running a published playbook once (design §12 item 5). The person works the phases in
// order and writes what happened against each; submitting leaves one action entry per phase
// in the work log, each naming this playbook and the version that was followed.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Play,
  ShieldAlert,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import type { PlaybookStep } from "@/lib/playbooks/method"
import type { PlaybookStatus } from "@/lib/playbooks/rules"

type RunPlaybook = {
  id: number
  title: string
  status: PlaybookStatus
  version: number
  discipline: string | null
  method: string[]
  steps: PlaybookStep[]
  authorName: string | null
}

type RunPayload = {
  playbook: RunPlaybook
  admin: boolean
  today: string
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

export function RunSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function PhaseNotes({
  phase,
  value,
  onChange,
}: {
  phase: string
  value: string
  onChange: (next: string) => void
}) {
  const id = `run-${phase.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {phase} — what happened
      </Label>
      <Textarea
        id={id}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="What you did, what you found, and what it proved."
      />
    </div>
  )
}

export default function RunClient({ id }: { id: string }) {
  const { toast } = useToast()

  const [payload, setPayload] = useState<RunPayload | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [workedOn, setWorkedOn] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [logged, setLogged] = useState<{ count: number; workedOn: string } | null>(null)

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
      const next = json.data as RunPayload
      setPayload(next)
      setWorkedOn(next.today)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const stepsByPhase = useMemo(() => {
    const map = new Map<string, PlaybookStep[]>()
    for (const phase of playbook?.method ?? []) map.set(phase, [])
    for (const step of playbook?.steps ?? []) {
      map.set(step.phase, [...(map.get(step.phase) ?? []), step])
    }
    return map
  }, [playbook])

  const submit = useCallback(async () => {
    if (!playbook) return
    setBusy(true)
    const result = await send(
      `/api/playbooks/${playbook.id}/run`,
      jsonInit("POST", { workedOn, notes }),
    )
    setBusy(false)
    if (result.error) {
      toast({ variant: "destructive", title: "Run", description: result.error })
      return
    }
    const count = result.json?.data?.count as number | undefined
    const day = result.json?.data?.workedOn as string | undefined
    setLogged({ count: count ?? playbook.method.length, workedOn: day ?? workedOn })
    toast({
      title: "Run recorded",
      description: `${count ?? playbook.method.length} work-log entries were written.`,
    })
  }, [notes, playbook, toast, workedOn])

  if (loading && !payload) return <RunSkeleton />

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

  if (!payload || !playbook) return null

  if (playbook.status !== "published") {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" aria-hidden />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              This playbook is {playbook.status}; only a published playbook can be run. Publish it
              first, then come back.
            </span>
            <Button size="sm" asChild>
              <Link href={`/dashboard/playbooks/${playbook.id}`}>Open the editor</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={`/dashboard/playbooks/${playbook.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {playbook.title}
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Play className="h-5 w-5" aria-hidden />
            Run — {playbook.title}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="default">Published</Badge>
            <Badge variant="outline">v{playbook.version}</Badge>
            <span className="text-xs text-muted-foreground">
              {playbook.authorName ?? "Unknown author"}
            </span>
          </div>
        </div>
        <div className="w-full sm:w-52">
          <Label htmlFor="run-day" className="text-xs text-muted-foreground">
            Worked on
          </Label>
          <Input
            id="run-day"
            type="date"
            value={workedOn}
            max={payload.today}
            onChange={(event) => setWorkedOn(event.target.value)}
          />
        </div>
      </header>

      {logged ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {logged.count} {logged.count === 1 ? "entry was" : "entries were"} added to the work
              log for {logged.workedOn}, one per phase.
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/worklog">Open the work log</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Work the phases in order. Each phase you write against becomes one action entry in the work
        log, naming this playbook and version {playbook.version}. Nothing is written until you
        submit.
      </p>

      {playbook.method.map((phase, phaseIndex) => {
        const steps = stepsByPhase.get(phase) ?? []
        return (
          <SectionCard
            key={phase}
            title={`${phaseIndex + 1}. ${phase}`}
            icon={<BookOpenCheck className="h-4 w-4" />}
            action={<Badge variant="outline">{steps.length} steps</Badge>}
          >
            <div className="space-y-3">
              {steps.length > 0 ? (
                <ol className="space-y-2">
                  {steps.map((step) => (
                    <li key={`${phase}-${step.order}`} className="rounded-md border bg-muted/10 p-2">
                      <p className="text-sm">
                        <span className="mr-1 font-semibold tabular-nums">{step.order}.</span>
                        {step.action}
                      </p>
                      {step.checks.length > 0 ? (
                        <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                          {step.checks.map((check) => (
                            <li key={check}>{check}</li>
                          ))}
                        </ul>
                      ) : null}
                      {step.ppe.length > 0 || step.tools_parts.length > 0 || step.stop_condition ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {step.ppe.length > 0 ? `PPE: ${step.ppe.join(", ")}. ` : ""}
                          {step.tools_parts.length > 0
                            ? `Tools: ${step.tools_parts.join(", ")}. `
                            : ""}
                          {step.stop_condition ? `Stop if: ${step.stop_condition}` : ""}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">No steps written for this phase.</p>
              )}

              <PhaseNotes
                phase={phase}
                value={notes[phase] ?? ""}
                onChange={(next) => setNotes((prev) => ({ ...prev, [phase]: next }))}
              />
            </div>
          </SectionCard>
        )
      })}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/playbooks/${playbook.id}`}>Back to the editor</Link>
        </Button>
        <Button onClick={() => void submit()} disabled={busy || logged !== null}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
          Record this run
        </Button>
      </div>
    </div>
  )
}
