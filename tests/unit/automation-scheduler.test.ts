// The automation engine has been complete since it shipped — triggers, conditions, actions, run
// history — and the only thing that ever called it was a person pressing Run. This file pins what
// the hourly caller must add without changing the engine.
//
// The engine bumps `last_run_at` itself at the end of a successful run, so the scheduler's ceiling
// is what stops an hourly delivery from re-applying a rule it applied 20 minutes ago (by hand or by
// the previous delivery). That ceiling is rendered to real SQL here: a source guard would pass on a
// select that only checks is_active.

import { beforeEach, describe, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"

const dialect = new PgDialect()
const render = (fragment: Parameters<typeof dialect.sqlToQuery>[0]) => dialect.sqlToQuery(fragment)
const text = (fragment: Parameters<typeof dialect.sqlToQuery>[0]) => render(fragment).sql.toLowerCase()

const state = vi.hoisted(() => ({
  fragments: [] as unknown[],
  answers: [] as unknown[],
  executed: [] as { id: number; actorName: string; dryRun?: boolean }[],
  failIds: [] as number[],
  acted: 0,
  notifications: [] as unknown[],
}))

vi.mock("@/lib/db", () => ({
  db: {
    execute: async (fragment: unknown) => {
      state.fragments.push(fragment)
      return state.answers.shift() ?? []
    },
  },
}))

vi.mock("@/lib/notifications", () => ({
  createNotification: async (input: unknown) => {
    state.notifications.push(input)
  },
  notifyMany: async () => [],
}))

// Only the engine is replaced; the projection and serializeRule stay real, so the row the scheduler
// hands to executeRule is the row the database would have produced.
vi.mock("@/app/api/automation/_shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/api/automation/_shared")>()
  return {
    ...actual,
    executeRule: async (rule: { id: number }, opts: { actorName: string; dryRun?: boolean }) => {
      state.executed.push({ id: rule.id, actorName: opts.actorName, dryRun: opts.dryRun })
      if (state.failIds.includes(rule.id)) throw new Error("rule exploded")
      return { matched: [], planned: [], acted: state.acted, dryRun: false }
    },
  }
})

import { activeRulesSql, runActiveRules } from "@/app/api/automation/_scheduler"

const rawRule = (over: Record<string, unknown> = {}) => ({
  id: 3,
  user_id: 1,
  name: "Escalate overdue",
  description: null,
  trigger: "overdue",
  conditions: { statusIn: ["todo", "in_progress"] },
  actions: [{ type: "bump_priority", params: {} }],
  is_active: true,
  run_count: 4,
  last_run_at: null,
  created_at: "2026-11-01T06:00:00Z",
  updated_at: "2026-11-01T06:00:00Z",
  ...over,
})

const statements = () => state.fragments.map((f) => text(f as Parameters<typeof dialect.sqlToQuery>[0]))

function reset() {
  state.fragments.length = 0
  state.answers.length = 0
  state.executed.length = 0
  state.failIds.length = 0
  state.notifications.length = 0
  state.acted = 0
}

describe("which rules the hour is allowed to run", () => {
  it("takes active rules that have never run or last ran over 55 minutes ago", () => {
    const lower = text(activeRulesSql())
    expect(lower).toContain("from automation_rules")
    expect(lower).toMatch(/is_active/)
    expect(lower).toMatch(/last_run_at is null/)
    expect(lower).toMatch(/last_run_at <= now\(\) - interval '55 minutes'/)
  })

  it("leaves the ceiling above the delivery interval", () => {
    // 55 minutes, not 60: Vercel's jitter can deliver an hour's run a little early, and a ceiling of
    // exactly 60 would then skip every other delivery. Anything below the hour re-applies actions.
    const { sql } = render(activeRulesSql())
    const minutes = Number(/interval '(\d+) minutes'/.exec(sql)?.[1])
    expect(minutes).toBeGreaterThanOrEqual(55)
    expect(minutes).toBeLessThan(60)
  })

  it("binds the row budget instead of pasting it into the statement", () => {
    const { sql, params } = render(activeRulesSql())
    expect(params).toContain(50)
    expect(sql.toLowerCase()).not.toContain("limit 50")
  })
})

describe("running the hour's rules", () => {
  beforeEach(reset)

  it("asks the engine nothing when no rule is due", async () => {
    state.answers = [[]]
    expect(await runActiveRules()).toEqual({ ok: true, due: 0, ran: 0, failed: 0, acted: 0 })
    expect(state.fragments).toHaveLength(1)
    expect(state.executed).toEqual([])
  })

  it("runs each due rule for real, as the schedule rather than a person", async () => {
    state.answers = [[rawRule(), rawRule({ id: 4, name: "Assign stale" })]]
    state.acted = 2
    expect(await runActiveRules()).toEqual({ ok: true, due: 2, ran: 2, failed: 0, acted: 4 })
    expect(state.executed).toEqual([
      { id: 3, actorName: "Hourly schedule", dryRun: undefined },
      { id: 4, actorName: "Hourly schedule", dryRun: undefined },
    ])
    // The engine writes the run row and bumps last_run_at; the scheduler must not do it twice.
    expect(statements().join("\n")).not.toContain("insert into automation_runs")
    expect(statements().join("\n")).not.toContain("update automation_rules")
  })

  it("does not notify the owner once an hour", async () => {
    // A rule that matches nothing still runs 24 times a day. The run is in automation_runs, which
    // the page already lists; an owner notification per delivery would be noise.
    state.answers = [[rawRule()]]
    await runActiveRules()
    expect(state.notifications).toEqual([])
  })

  it("keeps going when one rule throws", async () => {
    state.answers = [[rawRule(), rawRule({ id: 4, name: "Broken" })]]
    state.failIds = [3]
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await runActiveRules()).toEqual({ ok: false, due: 2, ran: 1, failed: 1, acted: 0 })
    expect(state.executed.map((e) => e.id)).toEqual([3, 4])
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})