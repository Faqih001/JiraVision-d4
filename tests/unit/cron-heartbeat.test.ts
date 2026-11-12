// Nothing in the product records an hourly run that found nothing to do. Production currently has
// 0 report schedules, 0 automation rules and 0 digest rows, so every per-item "Last run" reads
// "Never run" — which looks exactly like a dead cron. This file pins the one row that answers "did
// the scheduler fire, and what did it find?" independently of whether any queue had work in it.
//
// The write is an upsert on a fixed id, not an append: per-job failure history already lives in
// report_runs, automation_runs and email_digest.status, so a log table here would duplicate it.

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
}))

vi.mock("@/lib/db", () => ({
  db: {
    execute: async (fragment: unknown) => {
      state.fragments.push(fragment)
      state.calls += 1
      if (state.calls === state.failAt) throw new Error("relation \"scheduler_heartbeat\" does not exist")
      return state.answers.shift() ?? []
    },
  },
}))

import {
  heartbeatSql,
  readHeartbeat,
  recordHeartbeat,
  recordHeartbeatSql,
} from "@/app/api/cron/_heartbeat"

const JOBS = {
  reports: { ok: true, due: 0, ran: 0, failed: 0 },
  rules: { ok: true, due: 0, ran: 0, failed: 0 },
  digest: { ok: true, due: 0, delivered: 0, failed: 0, refused: 0 },
}

const statements = () => state.fragments.map((f) => text(f as Parameters<typeof dialect.sqlToQuery>[0]))

function reset() {
  state.fragments.length = 0
  state.answers.length = 0
  state.calls = 0
  state.failAt = 0
}

describe("the heartbeat write", () => {
  beforeEach(reset)

  it("upserts one row rather than appending to a log", () => {
    const lower = text(recordHeartbeatSql(true, JOBS))
    expect(lower).toMatch(/^insert into scheduler_heartbeat/)
    expect(lower).toContain("on conflict (id) do update")
    expect(lower).not.toContain("create table")
  })

  it("binds the outcome and the per-job counts instead of pasting them into the statement", () => {
    const { sql, params } = render(recordHeartbeatSql(false, JOBS))
    expect(params).toContain(false)
    expect(params).toContain(JSON.stringify(JOBS))
    // The counts must travel as a parameter: interpolated JSON would be an injection surface and
    // would break on any job error message containing a quote.
    expect(sql).not.toContain("reports")
  })

  it("takes the fire time from the database clock, never from a bound Date", () => {
    const { sql, params } = render(recordHeartbeatSql(true, JOBS))
    expect(sql.toLowerCase()).toContain("now()")
    // The done-window wave shipped a board that read 0 of 0 because a Date was bound as a parameter.
    // A timestamp the driver has to serialize is the same trap; now() cannot drift or fail to bind.
    expect(params.some((p) => p instanceof Date)).toBe(false)
  })

  it("recordHeartbeat issues exactly one statement", async () => {
    await recordHeartbeat(true, JOBS)
    expect(state.fragments).toHaveLength(1)
    expect(statements()[0]).toMatch(/^insert into scheduler_heartbeat/)
  })
})

describe("the heartbeat read", () => {
  beforeEach(reset)

  it("reads the single row and renders its timestamp as UTC ISO text", () => {
    const { sql, params } = render(heartbeatSql())
    const lower = sql.toLowerCase()
    expect(lower).toContain("from scheduler_heartbeat")
    expect(lower).toMatch(/where id = \$\d+/)
    expect(lower).toContain("at time zone 'utc'")
    expect(params).toContain(1)
  })

  it("answers null when the scheduler has never fired", async () => {
    state.answers = [[]]
    expect(await readHeartbeat()).toBeNull()
  })

  it("answers the stored outcome and per-job counts", async () => {
    state.answers = [[{ last_fired_at: "2026-11-12T14:03:00Z", ok: false, jobs: JOBS }]]
    expect(await readHeartbeat()).toEqual({
      lastFiredAt: "2026-11-12T14:03:00Z",
      ok: false,
      jobs: JOBS,
    })
  })

  it("parses the counts when the driver hands jsonb back as a string", async () => {
    state.answers = [[{ last_fired_at: "2026-11-12T14:03:00Z", ok: true, jobs: JSON.stringify(JOBS) }]]
    expect((await readHeartbeat())?.jobs).toEqual(JOBS)
  })

  it("throws when the read fails rather than reporting 'never fired'", async () => {
    state.failAt = 1
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(readHeartbeat()).rejects.toThrow(/scheduler_heartbeat/)
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})