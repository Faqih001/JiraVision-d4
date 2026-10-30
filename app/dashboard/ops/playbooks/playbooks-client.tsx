"use client"

// The playbook preview page (operations engine, PR 10). The pack's opsConfig declares
// playbookSeeds — the recurring runbooks this discipline is meant to work, each with a frequency,
// a method and the steps inside every phase. This page renders them read-only and hands the member
// to the playbook library, where a SOP is actually written, published and run. It writes nothing:
// a seed is a declaration from the role pack, not a saved SOP, and this page never pretends otherwise.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpenCheck,
  CalendarClock,
  ExternalLink,
  ListChecks,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"

type PlaybookPhaseDef = { name: string; steps: string[] }

type PlaybookSeedDef = {
  id: string
  label: string
  frequency: "daily" | "weekly" | "monthly" | "quarterly"
  method: string[]
  phases: PlaybookPhaseDef[]
}

type PackInfo = {
  packKey: string | null
  hasOpsConfig: boolean
  discipline: string | null
  playbookSeeds: PlaybookSeedDef[] | null
}

const FREQUENCY_LABEL: Record<PlaybookSeedDef["frequency"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
}

function libraryHref(seed: PlaybookSeedDef): string {
  return `/dashboard/playbooks?${new URLSearchParams({ q: seed.label }).toString()}`
}

export function PlaybooksSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function SeedCard({ seed }: { seed: PlaybookSeedDef }) {
  const stepCount = seed.phases.reduce((total, phase) => total + phase.steps.length, 0)

  return (
    <SectionCard
      title={seed.label}
      icon={<BookOpenCheck className="h-4 w-4" />}
      action={
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">
            <CalendarClock className="mr-1 h-3 w-3" aria-hidden />
            {FREQUENCY_LABEL[seed.frequency]}
          </Badge>
          <Badge variant="outline">
            {seed.phases.length} {seed.phases.length === 1 ? "phase" : "phases"}
          </Badge>
          <Badge variant="outline">
            {stepCount} {stepCount === 1 ? "step" : "steps"}
          </Badge>
        </div>
      }
    >
      {seed.method.length > 0 ? (
        <ol className="mt-1 flex flex-wrap gap-1.5">
          {seed.method.map((phase) => (
            <li key={phase}>
              <Badge variant="secondary">{phase}</Badge>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-3 space-y-3">
        {seed.phases.map((phase, phaseIndex) => (
          <div key={`${seed.id}-${phaseIndex}`} className="rounded-md border bg-muted/10 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="tabular-nums text-muted-foreground">{phaseIndex + 1}.</span>
              {phase.name}
            </p>
            {phase.steps.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {phase.steps.map((step, stepIndex) => (
                  <li key={`${seed.id}-${phaseIndex}-${stepIndex}`} className="flex items-start gap-2 text-xs">
                    <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No steps declared for this phase.</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Button size="sm" variant="outline" asChild>
          <Link href={libraryHref(seed)}>
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Open in playbook library
          </Link>
        </Button>
      </div>
    </SectionCard>
  )
}

export default function OpsPlaybooksClient() {
  const [pack, setPack] = useState<PackInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPack = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/ops/pack")
      if (!res.ok) throw new Error("Could not load your operations pack.")
      const json = await res.json()
      setPack(json.data as PackInfo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPack()
  }, [loadPack])

  const seeds = useMemo(() => pack?.playbookSeeds ?? [], [pack?.playbookSeeds])

  if (loading) return <PlaybooksSkeleton />

  if (error && !pack) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void loadPack()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!pack?.hasOpsConfig || !pack?.packKey) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Playbook previews</h1>
        <SectionCard title="No operations configured" icon={<BookOpenCheck className="h-4 w-4" />}>
          <EmptyNote>
            Your role pack has no operations configuration yet, so there are no runbooks to preview.{" "}
            <Link href="/dashboard/ops" className="underline underline-offset-2">
              Back to operations overview
            </Link>
            .
          </EmptyNote>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookOpenCheck className="h-5 w-5" aria-hidden />
            Playbook previews
          </h1>
          <p className="text-sm text-muted-foreground">
            {pack.discipline ? pack.discipline : "Your"} operations &middot; the runbooks your role pack
            says this discipline works, shown exactly as it declares them.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/playbooks">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Playbook library
          </Link>
        </Button>
      </header>

      <p className="text-xs text-muted-foreground">
        These are declarations from your role pack, not saved SOPs — nothing here is written to your
        library. Open one to write the playbook, publish it, and then run it against the work log.
      </p>

      {seeds.length === 0 ? (
        <SectionCard title="No playbook seeds" icon={<BookOpenCheck className="h-4 w-4" />}>
          <EmptyNote>This pack declares no recurring runbooks yet.</EmptyNote>
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {seeds.map((seed) => (
            <SeedCard key={seed.id} seed={seed} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops">Operations overview</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/logs">Activity logs</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/reports">Report previews</Link>
        </Button>
      </div>
    </div>
  )
}
