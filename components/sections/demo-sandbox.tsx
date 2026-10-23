"use client"

import { useMemo, useState } from "react"
import { Check, RefreshCw, RotateCcw, Scale, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Section, SectionHeading } from "@/components/sections/section"
import { demoBacklog, demoTeam } from "@/content/sandbox-demo"
import {
  applyRebalanceMove,
  applyRebalanceMoves,
  autoDraftSprint,
  computePersonLoads,
  suggestRebalance,
  teamWellbeingScore,
  unassignedTickets,
  type RebalanceMove,
  type SprintPlan,
} from "@/lib/sandbox/plan"
import { cn } from "@/lib/utils"

const chip = "inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide"
const label = "text-xs uppercase tracking-wide text-muted-foreground"

function PointsChip({ points }: { points: number }) {
  return (
    <span className={cn(chip, "border bg-muted text-muted-foreground")} title="story points">
      {points} pts
    </span>
  )
}

function SkillChip({ skill }: { skill: string }) {
  return (
    <span className={cn(chip, "bg-primary/10 text-primary")}>{skill}</span>
  )
}

export function SandboxDemo() {
  const [plan, setPlan] = useState<SprintPlan>([])
  const [proposals, setProposals] = useState<RebalanceMove[]>([])

  const loads = useMemo(() => computePersonLoads(plan, demoTeam, demoBacklog), [plan])
  const score = useMemo(() => teamWellbeingScore(loads), [loads])
  const remaining = useMemo(() => unassignedTickets(plan, demoBacklog), [plan])
  const committedTotal = useMemo(
    () => loads.reduce((sum, l) => sum + l.committedPoints, 0),
    [loads],
  )
  const capacityTotal = useMemo(
    () => demoTeam.reduce((sum, p) => sum + p.capacityPoints, 0),
    [],
  )
  const anyoneOver = useMemo(() => loads.some((l) => l.overByPoints > 0), [loads])
  const drafted = plan.length > 0

  const handleDraft = () => {
    setPlan(autoDraftSprint(demoBacklog, demoTeam))
    setProposals([])
  }

  const handleSuggest = () => {
    setProposals(suggestRebalance(plan, demoTeam, demoBacklog))
  }

  const handleApply = (move: RebalanceMove) => {
    setPlan((prev) => applyRebalanceMove(prev, move))
    setProposals((prev) => prev.filter((p) => !(p.ticketId === move.ticketId && p.from === move.from)))
  }

  const handleApplyAll = () => {
    setPlan((prev) => applyRebalanceMoves(prev, proposals))
    setProposals([])
  }

  const handleReset = () => {
    setPlan([])
    setProposals([])
  }

  return (
    <Section id="sandbox" bg="contour">
      <div className="mb-3 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] tracking-wide text-muted-foreground">
          DEMO
        </Badge>
        <span className="text-xs text-muted-foreground">live in your browser, no signup</span>
      </div>
      <SectionHeading
        eyebrow="Sprint planning sandbox"
        title="Watch a sprint overload itself — then fix it, one approved move at a time"
        intro="Auto-draft fills the sprint optimising for skill fit and nothing else. Someone quietly ends up carrying the plan while someone else waits. Propose a rebalance, read every move, and apply only what you agree with."
      />
      <p className="-mt-6 mb-8 max-w-2xl text-xs text-muted-foreground">
        Runs entirely in your browser on sample data — in the product this reads your real Jira capacity.
      </p>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleDraft}>
          <Sparkles aria-hidden="true" />
          Auto-draft sprint
        </Button>
        <Button size="sm" variant="outline" onClick={handleSuggest} disabled={!drafted || !anyoneOver}>
          <Scale aria-hidden="true" />
          Suggest rebalance
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={!drafted && proposals.length === 0}
        >
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
        <span className="ml-1 text-xs tracking-wide text-muted-foreground">
          {committedTotal} of {capacityTotal} pts committed
          {!drafted && " · sprint is empty — run the auto-draft"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-surface p-4 shadow-soft">
            <p className={label}>Backlog · unassigned</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nine sample tickets, one sprint, no crystal ball.
            </p>
            <ul className="mt-3 space-y-2">
              {remaining.map((t) => (
                <li key={t.id} className="rounded-md border bg-card px-3 py-2 shadow-soft">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm leading-snug text-foreground">{t.title}</div>
                    <PointsChip points={t.points} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] tracking-wide text-muted-foreground">{t.id}</span>
                    <SkillChip skill={t.skill} />
                  </div>
                </li>
              ))}
              {remaining.length === 0 && (
                <li className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  Every ticket made the draft — capacity didn&apos;t.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border bg-surface p-4 shadow-soft">
            <div className="flex items-baseline justify-between">
              <p className={label}>Team load spread</p>
              <span className="font-display text-2xl font-medium text-foreground">{score}</span>
            </div>
            <Progress
              value={score}
              className="mt-2 h-2 bg-muted"
              aria-label="Team wellbeing score, 0 to 100"
              aria-valuetext={`${score} out of 100`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              100 minus how unevenly points land across people, with a penalty for anyone over
              capacity. A low score means someone&apos;s week is quietly already lost.
            </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          {proposals.length > 0 && (
            <div className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                    Proposed changes — nothing applied yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The product proposes; you approve. Each move is explained before it touches the sprint.
                  </p>
                </div>
                <Button size="sm" onClick={handleApplyAll}>
                  <Check aria-hidden="true" />
                  Apply all
                </Button>
              </div>
              <ul className="mt-3 space-y-2">
                {proposals.map((m) => (
                  <li
                    key={`${m.ticketId}-${m.from}-${m.to}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {m.from.split(" ")[0]} → {m.to.split(" ")[0]}
                        <span className="ml-2 text-xs text-muted-foreground">ticket {m.ticketId}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{m.reason}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleApply(m)}>
                      Apply
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {drafted && proposals.length === 0 && !anyoneOver && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              Everyone is within capacity — nothing to rebalance.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {loads.map((l) => {
              const over = l.overByPoints > 0
              const pct = Math.min(100, Math.round(l.utilization * 100))
              return (
                <div key={l.name} className="rounded-lg border bg-card p-3 shadow-soft">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {l.initials}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-tight text-foreground">{l.name}</p>
                        <p className="text-[10px] tracking-wide text-muted-foreground">
                          {l.skills.join(" · ")} · {l.capacityPoints} pts capacity
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        over ? "font-medium text-clay" : "text-muted-foreground",
                      )}
                    >
                      {l.committedPoints}/{l.capacityPoints}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className={cn(
                      "mt-2 h-1.5 bg-muted",
                      // The indicator is the root's only child div; token swap keeps it declarative.
                      over && "[&>div]:bg-clay",
                    )}
                    aria-label={`Committed load for ${l.name}`}
                    aria-valuetext={`${l.committedPoints} of ${l.capacityPoints} points`}
                  />
                  {over && (
                    <p className="mt-1 text-xs text-clay">
                      +{l.overByPoints} pt{l.overByPoints === 1 ? "" : "s"} over capacity
                    </p>
                  )}
                  <ul className="mt-2 space-y-2">
                    {l.tickets.map(({ ticket, rationale }) => (
                      <li key={ticket.id} className="rounded-md border bg-surface px-2.5 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs leading-snug text-foreground">{ticket.title}</span>
                          <PointsChip points={ticket.points} />
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{rationale}</p>
                      </li>
                    ))}
                    {l.tickets.length === 0 && (
                      <li className="rounded-md border border-dashed px-2.5 py-2 text-[11px] text-muted-foreground">
                        No work assigned — capacity left on the table.
                      </li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Deterministic draft: best skill match first, then smaller tickets, then backlog order —
            no randomness, same input, same plan.
          </p>
        </div>
      </div>
    </Section>
  )
}
