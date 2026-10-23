// Pure, deterministic migration-plan model for the /migration planner island.
// No React, no browser APIs — every number printed by the UI comes from here so
// it can be inspected (and unit-tested) in isolation. Inputs are exactly the two
// the visitor controls: which tool they're leaving, and team size.

import {
  migrationPhases,
  migrationSources,
  migrationTeamRange,
  scopeModel,
  type MigrationPhaseKey,
  type MigrationSource,
  type MigrationSourceId,
} from "@/content/migration"
import { contactDetails } from "@/content/site"

export interface MigrationConfig {
  sourceId: MigrationSourceId
  teamSize: number
  includeAttachments: boolean
  dualRun: boolean
}

export interface HourBand {
  low: number
  mid: number
  high: number
}

export interface MigrationPhasePlan {
  key: MigrationPhaseKey
  title: string
  intent: string
  tasks: string[]
  exitCriteria: string
  hours: HourBand
  /** Extra explanation for this phase under the current config, if any. */
  note?: string
}

export interface MigrationPlan {
  source: MigrationSource
  config: MigrationConfig
  boardsInScope: number
  phases: MigrationPhasePlan[]
  total: HourBand
  weeks: { low: number; high: number }
  /** One line per assumption the visitor can check the maths against. */
  assumptions: string[]
}

export function sourceById(id: MigrationSourceId): MigrationSource {
  return migrationSources.find((s) => s.id === id) ?? migrationSources[0]!
}

export function clampTeamSize(value: number): number {
  if (!Number.isFinite(value)) return migrationTeamRange.min
  return Math.min(migrationTeamRange.max, Math.max(migrationTeamRange.min, Math.round(value)))
}

/** Normalises anything read from storage or the URL into a valid config. */
export function normalizeConfig(input: Partial<MigrationConfig> | null | undefined): MigrationConfig {
  const id = input?.sourceId
  const known: MigrationSourceId[] = ["jira", "asana", "linear", "trello", "notion"]
  return {
    sourceId: id && known.includes(id) ? id : "jira",
    teamSize: clampTeamSize(typeof input?.teamSize === "number" ? input.teamSize : 20),
    includeAttachments: input?.includeAttachments !== false,
    dualRun: input?.dualRun !== false,
  }
}

function band(rawHours: number): HourBand {
  const mid = Math.max(1, Math.round(rawHours))
  const low = Math.max(1, Math.round(rawHours * scopeModel.bandLow))
  const high = Math.max(mid, Math.round(rawHours * scopeModel.bandHigh))
  return { low, mid, high }
}

export function buildMigrationPlan(config: MigrationConfig): MigrationPlan {
  const source = sourceById(config.sourceId)
  const teamSize = clampTeamSize(config.teamSize)
  const attachmentHours = config.includeAttachments
    ? source.attachmentHoursPerSeat * teamSize
    : 0

  const phases: MigrationPhasePlan[] = []

  for (const phase of migrationPhases) {
    if (phase.key === "dualrun" && !config.dualRun) continue

    const raw =
      (phase.baseHours + phase.hoursPerSeat * teamSize) * source.factors[phase.key] +
      (phase.key === "build" ? attachmentHours : 0)

    const plan: MigrationPhasePlan = {
      key: phase.key,
      title: phase.title,
      intent: phase.intent,
      tasks: [...phase.tasks],
      exitCriteria: phase.exitCriteria,
      hours: band(raw),
    }

    if (phase.key === "build" && config.includeAttachments) {
      plan.note =
        source.attachmentHoursPerSeat === 0
          ? "JiraVision never copies attachments — Jira stays the store, so there is nothing to do in this phase. Your history and files stay exactly where audit already points."
          : `Includes roughly ${Math.round(attachmentHours)} h of attachment scope review. Volume ceilings and source export limits are unconfirmed — confirm scope with us before committing.`
    }

    if (phase.key === "cutover" && !config.dualRun) {
      plan.note =
        "You removed the parallel run. Its risk doesn't disappear — it lands in cutover week, so keep the old workspace writable for a full sprint and expect to reopen it."
    }

    if (phase.key === "dualrun") {
      plan.note = source.dualRunNote
    }

    phases.push(plan)
  }

  const total: HourBand = {
    low: phases.reduce((s, p) => s + p.hours.low, 0),
    mid: phases.reduce((s, p) => s + p.hours.mid, 0),
    high: phases.reduce((s, p) => s + p.hours.high, 0),
  }

  const boardsInScope = Math.max(1, Math.round(teamSize / scopeModel.boardsPerSeat))

  return {
    source,
    config: { ...config, teamSize },
    boardsInScope,
    phases,
    total,
    weeks: {
      low: Math.max(1, Math.ceil(total.mid / scopeModel.hoursPerWeekMax)),
      high: Math.max(1, Math.ceil(total.mid / scopeModel.hoursPerWeekMin)),
    },
    assumptions: [
      `Scope proxy: ${teamSize} seats ≈ ${boardsInScope} board${boardsInScope === 1 ? "" : "s"} at ${scopeModel.boardsPerSeat} people per board. Team size is the only scope input.`,
      "Phase hours = base + (hours per seat × team size) × the source multiplier. Both tables are printed in the “How these numbers are made” section below.",
      `Displayed band is ${Math.round(scopeModel.bandLow * 100)}%–${Math.round(scopeModel.bandHigh * 100)}% of the mid figure — a good week and a bad one.`,
      `Elapsed weeks assume ${scopeModel.hoursPerWeekMin}–${scopeModel.hoursPerWeekMax} focused hours per week, because nobody migrates full-time.`,
      config.includeAttachments
        ? `Attachments on: +${source.attachmentHoursPerSeat} h per seat folded into workspace build${source.attachmentHoursPerSeat === 0 ? " (zero for Jira — nothing is copied)" : ""}.`
        : "Attachments off: the old workspace keeps its files; scope review happens later, separately.",
      config.dualRun
        ? "Parallel run included: two sprints with both tools writable."
        : "Parallel run skipped: cutover carries the risk that phase would have absorbed.",
    ],
  }
}

export function checklistFileName(config: MigrationConfig): string {
  const source = sourceById(config.sourceId)
  return `jiravision-migration-${source.id}-${clampTeamSize(config.teamSize)}seats.txt`
}

function wrap(text: string, width = 74): string {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    if (line.length === 0) line = word
    else if (line.length + word.length + 1 <= width) line += ` ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.join("\n")
}

export interface ChecklistOptions {
  /** Task ids ("phaseKey:index") ticked on the page. */
  checked: string[]
  /** ISO date, passed in by the caller so this stays deterministic. */
  generatedOn: string
}

export function checklistText(plan: MigrationPlan, options: ChecklistOptions): string {
  const { source, config } = plan
  const out: string[] = []

  out.push("JIRAVISION MIGRATION CHECKLIST")
  out.push("-".repeat(31))
  out.push("")
  out.push(`Source tool:      ${source.label}`)
  out.push(`Team size:        ${config.teamSize} seats`)
  out.push(`Boards in scope:  ${plan.boardsInScope} (scope proxy, ${scopeModel.boardsPerSeat} people per board)`)
  out.push(`Attachments:      ${config.includeAttachments ? "carry pass included" : "stay in the source tool"}`)
  out.push(`Parallel run:     ${config.dualRun ? "two sprints" : "skipped — see cutover note"}`)
  out.push(`Generated:        ${options.generatedOn} by the /migration planner`)
  out.push("")
  out.push(
    wrap(
      "EFFORT FIGURES BELOW ARE TYPICAL, BASED ON WORKSPACE SIZE - ILLUSTRATIVE, NOT A COMMITMENT.",
    ),
  )
  out.push("")
  out.push(wrap(source.summary))
  out.push("")
  out.push("-".repeat(74))
  out.push(`TOTAL: ~${plan.total.low}-${plan.total.high} h of focused work (mid ${plan.total.mid} h)`)
  out.push(`SPREAD: roughly ${plan.weeks.low}-${plan.weeks.high} weeks of elapsed time`)
  out.push("-".repeat(74))
  out.push("")

  plan.phases.forEach((phase, i) => {
    out.push(`PHASE ${i + 1} - ${phase.title.toUpperCase()}   ~${phase.hours.low}-${phase.hours.high} h`)
    out.push(wrap(phase.intent))
    out.push("")
    phase.tasks.forEach((task, t) => {
      const id = `${phase.key}:${t}`
      out.push(`  [${options.checked.includes(id) ? "x" : " "}] ${task}`)
    })
    out.push("")
    if (phase.note) out.push(wrap(`Note: ${phase.note}`, 70).replace(/^/gm, "      "))
    out.push(wrap(`Done when: ${phase.exitCriteria}`, 70).replace(/^/gm, "      "))
    out.push("")
  })

  out.push("FIELD MAP")
  out.push(wrap(`How ${source.kicker} shapes translate. Row by row, the importer confirms or refuses.`, 70))
  out.push("")
  source.fieldMap.forEach((row) => {
    out.push(`  ${row.them} -> ${row.ours}  [${row.how}]`)
    out.push(
      wrap(row.note, 60)
        .split("\n")
        .map((l) => `      ${l}`)
        .join("\n"),
    )
  })
  out.push("")

  out.push("ASSUMPTIONS YOU CAN ARGUE WITH")
  plan.assumptions.forEach((a) => {
    out.push(
      wrap(`- ${a}`, 70)
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n"),
    )
  })
  out.push("")
  out.push(
    wrap(
      "We publish no migration counts and no average duration, because we have not instrumented enough migrations to do that honestly. Nothing here deletes or writes to your old workspace: archive means read-only.",
    ),
  )
  out.push("")
  out.push(
    wrap(
      `Questions, or a scope you want confirmed in writing (attachments especially): ${contactDetails.email} — or the /contact form.`,
    ),
  )

  return out.join("\n")
}
