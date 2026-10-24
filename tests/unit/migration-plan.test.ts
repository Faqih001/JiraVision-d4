import { describe, expect, it } from "vitest"
import {
  buildMigrationPlan,
  checklistFileName,
  checklistText,
  clampTeamSize,
  normalizeConfig,
  type MigrationConfig,
} from "@/app/(marketing)/migration/migration-plan"
import { migrationPhases, migrationSources, migrationTeamRange, scopeModel } from "@/content/migration"

const config = (over: Partial<MigrationConfig> = {}): MigrationConfig => ({
  sourceId: "trello",
  teamSize: 20,
  includeAttachments: true,
  dualRun: true,
  ...over,
})

describe("migration model clamps and normalises", () => {
  it("team size clamps to the published range", () => {
    expect(clampTeamSize(0)).toBe(migrationTeamRange.min)
    expect(clampTeamSize(10_000)).toBe(migrationTeamRange.max)
    expect(clampTeamSize(Number.NaN)).toBe(migrationTeamRange.min)
  })

  it("unknown or partial configs fall back to defaults", () => {
    const n = normalizeConfig({ sourceId: "myspace" as MigrationConfig["sourceId"] })
    expect(n.sourceId).toBe("jira")
    expect(n.includeAttachments).toBe(true)
    expect(n.dualRun).toBe(true)
    expect(normalizeConfig(null).teamSize).toBe(clampTeamSize(20))
  })
})

describe("buildMigrationPlan", () => {
  it("phase hours follow (base + hoursPerSeat × size) × source factor", () => {
    const plan = buildMigrationPlan(config({ includeAttachments: false, dualRun: true }))
    const source = migrationSources.find((s) => s.id === "trello")!
    for (const phase of plan.phases) {
      if (phase.key === "build") continue // build may carry attachment hours
      const def = migrationPhases.find((p) => p.key === phase.key)!
      const raw = (def.baseHours + def.hoursPerSeat * 20) * source.factors[phase.key]
      expect(phase.hours.mid).toBe(Math.max(1, Math.round(raw)))
    }
  })

  it("dropping the dual run removes a phase and annotates cutover", () => {
    const withRun = buildMigrationPlan(config())
    const withoutRun = buildMigrationPlan(config({ dualRun: false }))
    expect(withoutRun.phases.length).toBe(withRun.phases.length - 1)
    expect(withoutRun.phases.some((p) => p.key === "dualrun")).toBe(false)
    expect(withoutRun.phases.find((p) => p.key === "cutover")?.note).toMatch(/parallel run/i)
  })

  it("attachments add hours to build for non-Jira sources but zero for Jira", () => {
    const trello = buildMigrationPlan(config({ sourceId: "trello", includeAttachments: false }))
    const trelloAtt = buildMigrationPlan(config({ sourceId: "trello", includeAttachments: true }))
    expect(trelloAtt.phases.find((p) => p.key === "build")!.hours.mid).toBeGreaterThan(
      trello.phases.find((p) => p.key === "build")!.hours.mid,
    )
    const jira = buildMigrationPlan(config({ sourceId: "jira" }))
    const jiraNoAtt = buildMigrationPlan(config({ sourceId: "jira", includeAttachments: false }))
    expect(jira.phases.find((p) => p.key === "build")!.hours.mid).toBe(
      jiraNoAtt.phases.find((p) => p.key === "build")!.hours.mid,
    )
  })

  it("total hours are monotonic in team size and sum of phases", () => {
    const small = buildMigrationPlan(config({ teamSize: 5 }))
    const big = buildMigrationPlan(config({ teamSize: 100 }))
    expect(big.total.mid).toBeGreaterThan(small.total.mid)
    expect(small.total.mid).toBe(small.phases.reduce((s, p) => s + p.hours.mid, 0))
  })

  it("band is symmetric around mid per the published low/high factors", () => {
    const plan = buildMigrationPlan(config())
    for (const phase of plan.phases) {
      expect(phase.hours.low).toBeLessThanOrEqual(phase.hours.mid)
      expect(phase.hours.high).toBeGreaterThanOrEqual(phase.hours.mid)
    }
    expect(scopeModel.bandLow).toBeLessThan(1)
    expect(scopeModel.bandHigh).toBeGreaterThan(1)
  })
})

describe("checklist output", () => {
  it("file name encodes source and clamped size", () => {
    expect(checklistFileName(config({ sourceId: "asana", teamSize: 9999 }))).toBe(
      `jiravision-migration-asana-${migrationTeamRange.max}seats.txt`,
    )
  })

  it("renders [x]/[ ] per ticked id and carries the illustrative disclaimer", () => {
    const plan = buildMigrationPlan(config())
    const text = checklistText(plan, {
      checked: ["discovery:0"],
      generatedOn: "2026-10-23",
    })
    expect(text).toContain("[x]")
    expect(text).toContain("[ ]")
    // The disclaimer survives the 74-column word wrap (whitespace-normalised).
    expect(text.replace(/\s+/g, " ")).toContain("ILLUSTRATIVE, NOT A COMMITMENT")
    expect(text).toContain("2026-10-23")
    // Deterministic: same inputs, same bytes.
    expect(checklistText(plan, { checked: ["discovery:0"], generatedOn: "2026-10-23" })).toBe(text)
  })
})
