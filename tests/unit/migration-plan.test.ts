import { describe, expect, it } from "vitest"

import {
  buildMigrationPlan,
  checklistText,
  clampTeamSize,
  normalizeConfig,
  sourceById,
  type MigrationConfig,
} from "@/app/(marketing)/migration/migration-plan"
import {
  migrationPhases,
  migrationSources,
  migrationTeamRange,
  scopeModel,
  type MigrationSourceId,
} from "@/content/migration"

const TEAM = 20

const configFor = (sourceId: MigrationSourceId, partial: Partial<MigrationConfig> = {}) => ({
  sourceId,
  teamSize: TEAM,
  includeAttachments: false,
  dualRun: true,
  ...partial,
})

const round = Math.round

describe("buildMigrationPlan — hours formula", () => {
  it("phase hours = (base + perSeat × size) × sourceFactor, per source and phase", () => {
    for (const source of migrationSources) {
      const plan = buildMigrationPlan(configFor(source.id))
      expect(plan.phases).toHaveLength(migrationPhases.length)
      for (const phase of migrationPhases) {
        const planned = plan.phases.find((p) => p.key === phase.key)!
        const raw = (phase.baseHours + phase.hoursPerSeat * TEAM) * source.factors[phase.key]
        expect(planned.hours.mid).toBe(Math.max(1, round(raw)))
        expect(planned.hours.low).toBe(Math.max(1, round(raw * scopeModel.bandLow)))
        expect(planned.hours.high).toBe(
          Math.max(Math.max(1, round(raw)), round(raw * scopeModel.bandHigh)),
        )
      }
    }
  })

  it("folds attachment hours into the build phase only, per seat", () => {
    for (const source of migrationSources) {
      const off = buildMigrationPlan(configFor(source.id))
      const on = buildMigrationPlan(
        configFor(source.id, { includeAttachments: true }),
      )
      const buildOff = off.phases.find((p) => p.key === "build")!
      const buildOn = on.phases.find((p) => p.key === "build")!
      const buildPhase = migrationPhases.find((p) => p.key === "build")!
      const rawOff =
        (buildPhase.baseHours + buildPhase.hoursPerSeat * TEAM) * source.factors.build
      const extra = source.attachmentHoursPerSeat * TEAM
      expect(buildOff.hours.mid).toBe(Math.max(1, round(rawOff)))
      expect(buildOn.hours.mid).toBe(Math.max(1, round(rawOff + extra)))
      // Other phases are untouched by the attachments switch.
      for (const p of off.phases) {
        if (p.key === "build") continue
        expect(on.phases.find((q) => q.key === p.key)!.hours).toEqual(p.hours)
      }
    }
  })
})

describe("buildMigrationPlan — checklist output", () => {
  it("emits one checkbox line per task, stable across sources and repeat calls", () => {
    const counts = migrationSources.map((source) => {
      const plan = buildMigrationPlan(configFor(source.id))
      const text = checklistText(plan, { checked: [], generatedOn: "2026-10-23" })
      return text.split("\n").filter((l) => /^\s+\[[ x]\] /.test(l)).length
    })
    const expected = migrationPhases.reduce((s, p) => s + p.tasks.length, 0)
    expect(expected).toBeGreaterThan(0)
    for (const c of counts) expect(c).toBe(expected)
    expect(new Set(counts).size).toBe(1)
  })

  it("ticks only the ids handed in", () => {
    const plan = buildMigrationPlan(configFor("asana"))
    const ticked = checklistText(plan, {
      checked: ["discovery:0", "cutover:1"],
      generatedOn: "2026-10-23",
    })
    expect(ticked).toContain("[x] Give JiraVision a read-only view")
    expect(ticked).toContain("[x] Announce with the archive location")
    const doneCount = ticked.split("\n").filter((l) => /^\s+\[x\] /.test(l)).length
    expect(doneCount).toBe(2)
  })
})

describe("buildMigrationPlan — parallel-run toggle", () => {
  it("removes the dualrun phase and shrinks the total", () => {
    const on = buildMigrationPlan(configFor("linear", { dualRun: true }))
    const off = buildMigrationPlan(configFor("linear", { dualRun: false }))
    expect(on.phases).toHaveLength(migrationPhases.length)
    expect(off.phases).toHaveLength(migrationPhases.length - 1)
    expect(off.phases.some((p) => p.key === "dualrun")).toBe(false)
    expect(off.total.mid).toBeLessThan(on.total.mid)
    // The risk note lands in cutover.
    const cutover = off.phases.find((p) => p.key === "cutover")!
    expect(cutover.note).toContain("parallel run")
  })
})

describe("buildMigrationPlan — monotonic in team size", () => {
  it("total effort never decreases as seats grow, and grows strictly overall", () => {
    let prev = -1
    for (let size = migrationTeamRange.min; size <= migrationTeamRange.max; size++) {
      const plan = buildMigrationPlan(configFor("notion", { teamSize: size }))
      expect(plan.total.mid).toBeGreaterThanOrEqual(prev)
      prev = plan.total.mid
    }
    const small = buildMigrationPlan(configFor("notion", { teamSize: migrationTeamRange.min }))
    const large = buildMigrationPlan(configFor("notion", { teamSize: migrationTeamRange.max }))
    expect(large.total.mid).toBeGreaterThan(small.total.mid)
    expect(large.total.low).toBeGreaterThan(small.total.low)
    expect(large.weeks.high).toBeGreaterThanOrEqual(small.weeks.high)
  })
})

describe("config helpers", () => {
  it("clampTeamSize snaps to the documented range", () => {
    expect(clampTeamSize(Number.NaN)).toBe(migrationTeamRange.min)
    expect(clampTeamSize(1)).toBe(migrationTeamRange.min)
    expect(clampTeamSize(200)).toBe(migrationTeamRange.max)
    expect(clampTeamSize(20.6)).toBe(21)
  })

  it("normalizeConfig rejects unknown sources and defaults switches on", () => {
    const c = normalizeConfig({ sourceId: "myspace" as MigrationSourceId, teamSize: 999 })
    expect(c.sourceId).toBe("jira")
    expect(c.teamSize).toBe(migrationTeamRange.max)
    expect(c.includeAttachments).toBe(true)
    expect(c.dualRun).toBe(true)
    expect(sourceById("asana").kicker).toBe("Asana")
  })
})
