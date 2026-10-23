"use client"

// Client island for /migration: builds a step-by-step migration plan from two
// inputs (source tool + team size) plus two scope switches, ticks off a real
// checklist, and downloads it as a text file straight from the browser.
//
// The whole configuration lives in localStorage and is read through
// useSyncExternalStore (the same pattern as lib/consent.ts): there is no local
// React state for the plan itself, so no setState in effects or render — every
// change is an event handler that writes the store and re-renders from it.
// Effort numbers come from the public model in migration-plan.ts and are always
// labelled illustrative.

import { useMemo, useState, useSyncExternalStore } from "react"
import { Check, Download, RotateCcw, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Section, SectionHeading } from "@/components/sections/section"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics"
import {
  defaultMigrationConfig,
  estimateDisclaimer,
  migrationSources,
  migrationTeamRange,
  scopeModel,
  type MigrationSourceId,
} from "@/content/migration"
import {
  buildMigrationPlan,
  checklistFileName,
  checklistText,
  clampTeamSize,
  normalizeConfig,
  type MigrationConfig,
} from "./migration-plan"

const STORE_KEY = "jv-migration-planner-v1"
const STORE_EVENT = "jv-migration-planner-change"

interface PlannerStore {
  config: MigrationConfig
  checked: string[]
}

const emptyStore: PlannerStore = { config: defaultMigrationConfig, checked: [] }

function parseStore(raw: string | null): PlannerStore | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== "object") return null
    const checkedRaw = parsed.checked
    return {
      config: normalizeConfig(parsed.config as Partial<MigrationConfig> | null),
      checked: Array.isArray(checkedRaw)
        ? checkedRaw.filter((x): x is string => typeof x === "string")
        : [],
    }
  } catch {
    return null
  }
}

// Snapshot cache keyed on the raw string, so getSnapshot returns a stable
// reference between writes (a new object every call would loop React).
let cache: { raw: string | null; value: PlannerStore | null } = { raw: null, value: null }

function subscribePlannerStore(callback: () => void) {
  window.addEventListener(STORE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(STORE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

function getPlannerSnapshot(): PlannerStore | null {
  const raw = window.localStorage.getItem(STORE_KEY)
  if (raw !== cache.raw) cache = { raw, value: parseStore(raw) }
  return cache.value
}

// Server and first client render both see null → the default config, so nothing
// hydrates differently.
function getPlannerServerSnapshot(): PlannerStore | null {
  return null
}

function writePlannerStore(next: PlannerStore) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch {
    // Private mode / quota: the planner still works, it just won't persist.
  }
  cache = { raw: null, value: null }
  window.dispatchEvent(new Event(STORE_EVENT))
}

function clearPlannerStore() {
  try {
    window.localStorage.removeItem(STORE_KEY)
  } catch {
    // ignore — see writePlannerStore
  }
  cache = { raw: null, value: null }
  window.dispatchEvent(new Event(STORE_EVENT))
}

function SourceButton({
  source,
  active,
  onSelect,
}: {
  source: MigrationSourceId
  active: boolean
  onSelect: (id: MigrationSourceId) => void
}) {
  const label = migrationSources.find((s) => s.id === source)?.kicker ?? source
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(source)}
      className={cn(
        "min-h-[40px] rounded-full border px-4 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  )
}

function SwitchRow({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string
  label: string
  help: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{help}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

const howTone: Record<string, string> = {
  carries: "border-primary/40 bg-primary/10 text-primary",
  rebuilt: "border-warning/40 bg-warning/10 text-warning",
  "stays behind": "border-border bg-muted text-muted-foreground",
}

export function MigrationPlanner() {
  const stored = useSyncExternalStore(subscribePlannerStore, getPlannerSnapshot, getPlannerServerSnapshot)
  const config = stored?.config ?? emptyStore.config
  const checked = stored?.checked ?? emptyStore.checked
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null)

  const plan = useMemo(() => buildMigrationPlan(config), [config])

  const totalTasks = useMemo(
    () => plan.phases.reduce((sum, p) => sum + p.tasks.length, 0),
    [plan],
  )
  const doneTasks = useMemo(
    () =>
      plan.phases.reduce(
        (sum, phase) => sum + phase.tasks.filter((_, t) => checked.includes(`${phase.key}:${t}`)).length,
        0,
      ),
    [plan, checked],
  )
  const progressPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)

  const update = (patch: Partial<MigrationConfig>) => {
    writePlannerStore({ config: normalizeConfig({ ...config, ...patch }), checked })
    setDownloadedFile(null)
  }

  const toggleTask = (id: string) => {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id]
    writePlannerStore({ config, checked: next })
  }

  const reset = () => {
    clearPlannerStore()
    setDownloadedFile(null)
  }

  const download = () => {
    const text = checklistText(plan, {
      checked,
      generatedOn: new Date().toISOString().slice(0, 10),
    })
    const name = checklistFileName(config)
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = name
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    // Revoke on the next tick: some browsers cancel a download if the object URL
    // disappears inside the same task that started it.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setDownloadedFile(name)
    track("migration_plan_download", {
      source: config.sourceId,
      team_size: config.teamSize,
      dual_run: config.dualRun,
    })
  }

  return (
    <Section id="planner" bg="grid">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] tracking-wide text-muted-foreground">
          PLANNER
        </Badge>
        <span className="text-xs text-muted-foreground">
          runs in your browser · nothing is uploaded · config is saved on this device
        </span>
      </div>
      <SectionHeading
        eyebrow="Migration planner"
        title="Pick your source, set your size, read the plan"
        intro="Two inputs and two switches produce a phase-by-phase plan with exit criteria you can hold us to. Tick items off as you go, then download the whole thing as a text file for the team channel."
      />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
        <div className="space-y-5 self-start rounded-lg border bg-card p-6 shadow-soft">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Coming from
            </p>
            <div role="group" aria-label="Source tool" className="flex flex-wrap gap-2">
              {migrationSources.map((s) => (
                <SourceButton
                  key={s.id}
                  source={s.id}
                  active={config.sourceId === s.id}
                  onSelect={(sourceId) => update({ sourceId })}
                />
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plan.source.summary}</p>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <label htmlFor="migration-team-size" className="text-sm font-medium">
                Team size
              </label>
              <span className="font-mono text-sm tabular-nums">{config.teamSize} seats</span>
            </div>
            <Slider
              id="migration-team-size"
              min={migrationTeamRange.min}
              max={migrationTeamRange.max}
              step={migrationTeamRange.step}
              value={[config.teamSize]}
              onValueChange={([v]) => update({ teamSize: clampTeamSize(v ?? config.teamSize) })}
              aria-label="Team size in seats"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Team size is the scope proxy: {plan.boardsInScope} board
              {plan.boardsInScope === 1 ? "" : "s"} at roughly {scopeModel.boardsPerSeat} people per
              board. It is not a delivery promise.
            </p>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <SwitchRow
              id="migration-attachments"
              label="Include an attachment pass"
              help={
                plan.source.attachmentHoursPerSeat === 0
                  ? "For Jira teams this changes nothing: JiraVision never copies files, Jira stays the store."
                  : `Adds scope-review hours (${plan.source.attachmentHoursPerSeat} h per seat) to workspace build. Ceilings are unconfirmed — ask us before you commit to a number.`
              }
              checked={config.includeAttachments}
              onChange={(includeAttachments) => update({ includeAttachments })}
            />
            <SwitchRow
              id="migration-dual-run"
              label="Include a parallel run"
              help="Two sprints with both tools writable. Turning it off deletes a phase and moves that risk into cutover week."
              checked={config.dualRun}
              onChange={(dualRun) => update({ dualRun })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button size="sm" onClick={download}>
              <Download aria-hidden="true" />
              Download checklist
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw aria-hidden="true" />
              Reset
            </Button>
          </div>

          {downloadedFile && (
            <p className="flex items-start gap-2 text-xs text-primary">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Saved to your downloads as {downloadedFile}. {doneTasks}/{totalTasks} items were ticked.
            </p>
          )}
          {stored && (
            <p className="text-xs text-muted-foreground">
              Restored from this device — your last setup is still here. Clear it with Reset.
            </p>
          )}

          <ul className="space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {plan.assumptions.map((a) => (
              <li key={a} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-clay" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-surface p-5 shadow-soft">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {plan.source.kicker} · {config.teamSize} seats
                </p>
                <p className="mt-1 font-display text-2xl font-medium tracking-tight">
                  ~{plan.total.low}–{plan.total.high} h
                  <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                    over {plan.weeks.low}–{plan.weeks.high} weeks elapsed
                  </span>
                </p>
              </div>
              <p className="max-w-[18rem] text-[11px] leading-relaxed text-clay">
                Effort ranges are {estimateDisclaimer}.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Progress
                value={progressPct}
                className="h-2 bg-muted"
                aria-label="Checklist progress"
                aria-valuetext={`${doneTasks} of ${totalTasks} checklist items ticked`}
              />
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {doneTasks}/{totalTasks} ticked
              </span>
            </div>
          </div>

          <ol className="space-y-4">
            {plan.phases.map((phase, i) => (
              <li key={phase.key} className="rounded-lg border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium tracking-tight">
                    <span className="mr-2 font-mono text-xs text-clay">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {phase.title}
                  </h3>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    ~{phase.hours.low}–{phase.hours.high} h · mid {phase.hours.mid} h
                  </p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{phase.intent}</p>
                <ul className="mt-3 space-y-2">
                  {phase.tasks.map((task, t) => {
                    const id = `${phase.key}:${t}`
                    const on = checked.includes(id)
                    return (
                      <li key={id}>
                        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleTask(id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                            aria-label={`${phase.title}: ${task}`}
                          />
                          <span className={cn(on && "text-muted-foreground line-through")}>{task}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                {phase.note && (
                  <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs leading-relaxed">
                    {phase.note}
                  </p>
                )}
                <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="font-semibold text-foreground">Done when:</span>{" "}
                    {phase.exitCriteria}
                  </span>
                </p>
              </li>
            ))}
          </ol>

          <div className="rounded-lg border bg-surface shadow-soft">
            <div className="border-b px-5 py-4">
              <h3 className="font-display text-lg font-medium tracking-tight">
                {plan.source.kicker} field map
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Shape, not a guarantee: the importer confirms or refuses each row against your
                actual workspace during discovery.
              </p>
            </div>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Field mapping from {plan.source.kicker} to JiraVision
              </caption>
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2 font-semibold">
                    In {plan.source.kicker}
                  </th>
                  <th scope="col" className="px-5 py-2 font-semibold">
                    In JiraVision
                  </th>
                  <th scope="col" className="px-5 py-2 font-semibold">
                    Verdict
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.source.fieldMap.map((row) => (
                  <tr key={`${row.them}-${row.ours}`} className="border-b last:border-b-0">
                    <th scope="row" className="px-5 py-3 text-left font-medium">
                      {row.them}
                    </th>
                    <td className="px-5 py-3">
                      {row.ours}
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{row.note}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide",
                          howTone[row.how],
                        )}
                      >
                        {row.how}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Section>
  )
}
