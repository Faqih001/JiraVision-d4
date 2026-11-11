// `report_schedules.next_run_at` has been computed and persisted since the report builder shipped,
// and nothing has ever read it: a schedule only ran when a person pressed Run. This file pins the
// two properties the hourly runner needs to be safe to wire up.
//
// The first is the claim. Vercel can deliver the same run more than once, and two deliveries that
// both see "due" would both send the report. The claim is an UPDATE whose WHERE still requires the
// row to be due, so the second delivery matches zero rows and does nothing. That predicate is
// rendered to real SQL here — a source guard would pass on an unconditional UPDATE.
//
// The second is containment: one schedule that throws must not stop the rest of the queue.

import { beforeEach, describe, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"

const dialect = new PgDialect()
const render = (fragment: Parameters<typeof dialect.sqlToQuery>[0]) => dialect.sqlToQuery(fragment)
const text = (fragment: Parameters<typeof dialect.sqlToQuery>[0]) => render(fragment).sql.toLowerCase()

const state = vi.hoisted(() => ({
  fragments: [] as unknown[],
  answers: [] as unknown[],
  calls: 0,
  failAt: 0,
  notifications: [] as { userId: number; title: string }[],
  many: [] as { userIds: number[]; title: string }[],
}))

vi.mock("@/lib/db", () => ({
  db: {
    execute: async (fragment: unknown) => {
      state.fragments.push(fragment)
      state.calls += 1
      if (state.calls === state.failAt) throw new Error("relation does not exist")
      return state.answers.shift() ?? []
    },
  },
}))

vi.mock("@/lib/notifications", () => ({
  createNotification: async (input: { userId: number; title: string }) => {
    state.notifications.push(input)
  },
  notifyMany: async (userIds: number[], input: { title: string }) => {
    state.many.push({ userIds, title: input.title })
  },
}))

import { claimScheduleSql, dueSchedulesSql, runDueSchedules, runSchedule } from "@/app/api/reports/_runner"
import type { ScheduleDto } from "@/app/api/reports/_shared"

const schedule = (over: Partial<ScheduleDto> = {}): ScheduleDto => ({
  id: 7,
  userId: 1,
  name: "Weekly tasks",
  description: null,
  dataset: "tasks",
  config: { rangeDays: 30, groupBy: "status" },
  cadence: "weekly",
  recipients: [1, 2],
  isActive: true,
  lastRunAt: null,
  nextRunAt: "2026-11-09T06:00:00Z",
  createdAt: "2026-11-01T06:00:00Z",
  updatedAt: "2026-11-01T06:00:00Z",
  ...over,
})

/** The raw row shape the due read returns, before serializeSchedule normalizes it. */
const rawRow = (over: Record<string, unknown> = {}) => ({
  id: 7,
  user_id: 1,
  name: "Weekly tasks",
  description: null,
  dataset: "tasks",
  config: { rangeDays: 30, groupBy: "status" },
  cadence: "weekly",
  recipients: [1, 2],
  is_active: true,
  last_run_at: null,
  next_run_at: "2026-11-09T06:00:00Z",
  created_at: "2026-11-01T06:00:00Z",
  updated_at: "2026-11-01T06:00:00Z",
  run_count: 0,
  ...over,
})

const statements = () => state.fragments.map((f) => text(f as Parameters<typeof dialect.sqlToQuery>[0]))

function reset() {
  state.fragments.length = 0
  state.answers.length = 0
  state.notifications.length = 0
  state.many.length = 0
  state.calls = 0
  state.failAt = 0
}

describe("the due-schedule read and its claim", () => {
  it("only selects active schedules whose next run has arrived", () => {
    const { sql, params } = render(dueSchedulesSql())
    const lower = sql.toLowerCase()
    expect(lower).toContain("from report_schedules")
    expect(lower).toMatch(/is_active/)
    expect(lower).toMatch(/next_run_at <= now\(\)/)
    expect(lower).toMatch(/order by .*next_run_at/)
    expect(params).toContain(50)
  })

  it("claims by advancing the next run only while the row is still due", () => {
    const { sql, params } = render(claimScheduleSql(7, "2026-11-16T06:00:00Z"))
    const lower = sql.toLowerCase()
    expect(lower).toMatch(/^update report_schedules set next_run_at = /)
    expect(lower).toMatch(/where .*id = \$\d+ and is_active and next_run_at <= now\(\)/)
    expect(lower).toMatch(/returning id/)
    expect(params).toContain(7)
    expect(params).toContain("2026-11-16T06:00:00Z")
  })

  it("binds a null next run for a one-off instead of pasting the word into the statement", () => {
    const { sql, params } = render(claimScheduleSql(7, null))
    expect(sql.toLowerCase()).not.toContain("null::timestamptz")
    expect(params).toContain(null)
  })
})

describe("running the due queue", () => {
  beforeEach(reset)

  it("does nothing when no schedule is due", async () => {
    state.answers = [[]]
    expect(await runDueSchedules()).toEqual({ ok: true, due: 0, ran: 0, failed: 0 })
    expect(state.fragments).toHaveLength(1)
    expect(state.notifications).toEqual([])
  })

  it("skips a schedule another delivery already claimed", async () => {
    // The duplicate-delivery case: the read saw it due, the claim matched zero rows.
    state.answers = [[rawRow()], []]
    expect(await runDueSchedules()).toEqual({ ok: true, due: 1, ran: 0, failed: 0 })
    expect(state.fragments).toHaveLength(2)
    expect(statements().join("\n")).not.toContain("insert into report_runs")
    expect(state.notifications).toEqual([])
    expect(state.many).toEqual([])
  })

  it("runs a claimed schedule, logs the run and notifies owner and recipients", async () => {
    state.answers = [
      [rawRow()], // due read
      [{ id: 7 }], // claim
      [{ name: "todo", value: 4 }], // dataset aggregation
      [], // insert report_runs
      [], // update last_run_at
    ]
    expect(await runDueSchedules()).toEqual({ ok: true, due: 1, ran: 1, failed: 0 })

    const sql = statements()
    expect(sql).toHaveLength(5)
    expect(sql[1]).toMatch(/^update report_schedules set next_run_at = /)
    expect(sql[3]).toContain("insert into report_runs")
    expect(sql[4]).toMatch(/update report_schedules\s+set last_run_at = now\(\)/)
    expect(state.notifications).toHaveLength(1)
    expect(state.notifications[0].userId).toBe(1)
    // The owner is in recipients too; they must not be notified twice.
    expect(state.many).toEqual([{ userIds: [2], title: "Shared report ready: Weekly tasks" }])
  })

  it("keeps going when one schedule throws, and records the failure", async () => {
    state.answers = [
      [rawRow(), rawRow({ id: 8, name: "Broken" })], // two due
      [{ id: 7 }], // claim 7
      // call 3 is schedule 7's aggregation and throws
      [], // error run row for 7
      [{ id: 8 }], // claim 8
      [{ name: "todo", value: 1 }], // aggregation for 8
      [], // insert run for 8
      [], // update 8
    ]
    state.failAt = 3
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await runDueSchedules()
    expect(result).toEqual({ ok: false, due: 2, ran: 1, failed: 1 })
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()

    const sql = statements()
    expect(sql.some((s) => s.includes("insert into report_runs") && s.includes("'error'"))).toBe(true)
    expect(state.notifications).toHaveLength(1)
    expect(state.notifications[0].title).toContain("Broken")
  })
})

describe("the shared runner the manual Run button also calls", () => {
  beforeEach(reset)

  it("returns the dataset result and advances the schedule's own clock", async () => {
    state.answers = [[{ name: "done", value: 2 }], [], []]
    const result = await runSchedule(schedule())
    expect(result.rows).toEqual([{ name: "done", value: 2 }])
    expect(result.total).toBe(2)

    const sql = statements()
    expect(sql[0]).toContain("from tasks")
    expect(sql[1]).toContain("insert into report_runs")
    expect(sql[2]).toMatch(/next_run_at = /)
  })
})
