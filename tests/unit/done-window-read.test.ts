// The Done column's window has to be a WHERE clause, and this is the one place that can prove it:
// the fragment is rendered to real SQL and read back. A source-text guard would pass on a predicate
// that never references the events table, and the whole point of the wave is that the row budget is
// spent on the cards the member asked to see rather than on all-time history fetched first.
//
// Nothing here connects to a database — `sqlToQuery` renders, it does not run.

import { describe, expect, it } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import { doneEarlierSql, doneWindowSql, finishEventsFor } from "@/lib/tasks/completed-on-read"
import { COMPLETED_TASK_STATUSES } from "@/lib/tasks/statuses"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dialect = new PgDialect()
const render = (fragment: Parameters<typeof dialect.sqlToQuery>[0]) => dialect.sqlToQuery(fragment)

const FROM = new Date("2026-11-02T00:00:00.000Z")
const TO = new Date("2026-11-09T00:00:00.000Z")

/** A bound window edge: an ISO instant carried as the string the driver can serialize. */
const isInstant = (param: unknown): param is string =>
  typeof param === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(param)

describe("a narrowed Done column filters where the rows are counted", () => {
  it("asks the events table for the finish, not the row behind the card", () => {
    const { sql } = render(doneWindowSql({ from: FROM, to: TO }))
    expect(sql).toContain('max("task_events"."at")')
    expect(sql).toContain('"task_events"."task_id" = "tasks"."id"')
    expect(sql).toContain('"task_events"."to_status" in (')
  })

  it("reaches for the row's own clock only when there is no event", () => {
    const { sql } = render(doneWindowSql({ from: FROM, to: TO }))
    expect(sql).toContain('coalesce((select max("task_events"."at")')
    expect(sql).toContain('"tasks"."updated_at", "tasks"."created_at")')
  })

  it("binds every bound and every word — nothing is pasted into the text", () => {
    const { sql, params } = render(doneWindowSql({ from: FROM, to: TO }))
    for (const leak of ["2026-11-02", "2026-11-09", "'done'", "'closed'"]) {
      expect(sql).not.toContain(leak)
    }
    // The finished words arrive as parameters, so a fourth word in COMPLETED_TASK_STATUSES joins
    // the filter without this file changing.
    expect(new Set(params.filter((p) => (COMPLETED_TASK_STATUSES as readonly string[]).includes(String(p)))).size).toBe(
      COMPLETED_TASK_STATUSES.length,
    )
  })

  it("only ever hides a finished one-off", () => {
    // An open card and a schedule's card both fall on the keep side of this clause: the board's
    // schedule card is already the drawn day's occurrence, and outstanding work that happens to be
    // old is still outstanding.
    const { sql } = render(doneWindowSql({ from: FROM, to: TO }))
    expect(sql).toMatch(
      /not \("tasks"\."status" in \(\$1, \$2, \$3\) and \("tasks"\."cadence" is null or "tasks"\."cadence" = 'one-off'\)/,
    )
  })

  it("keeps a card whose finish cannot be dated", () => {
    // Comparisons against NULL are NULL, and a NULL in a WHERE drops the row. The window is a
    // preference, so an undatable card stays visible instead of vanishing from a column.
    const { sql } = render(doneWindowSql({ from: FROM, to: TO }))
    expect(sql).toMatch(/coalesce\(.*\), true\)/)
  })

  it("opens the past for `all` but still stops at the day being drawn", () => {
    const { sql, params } = render(doneWindowSql({ from: null, to: TO }))
    expect(sql).not.toContain(">=")
    expect(sql).toContain(" < ")
    const instants = params.filter(isInstant)
    expect(instants).not.toContain("2026-11-02T00:00:00.000Z")
    expect(instants).toContain("2026-11-09T00:00:00.000Z")
  })

  it("binds only what the driver can write to the socket", () => {
    // The failure this pins is silent: postgres.js serializes a `sql` fragment's parameters by
    // value, and a bare Date reaches its string encoder and throws ERR_INVALID_ARG_TYPE. The throw
    // lands in getPaginatedTasks' catch, which answers an empty page with HTTP 200 — so the board
    // reads "0 of 0 cards" and nothing anywhere says why. Rendering the fragment is not enough;
    // the parameters have to be serializable, which is what the rest of this repo does
    // (lib/data-access.ts binds `now.toISOString()` the same way).
    for (const bounds of [{ from: FROM, to: TO }, { from: null, to: TO }]) {
      for (const fragment of [doneWindowSql(bounds), doneEarlierSql(bounds)]) {
        if (!fragment) continue
        for (const param of render(fragment).params) {
          expect(param, `Date in ${String(param)}`).not.toBeInstanceOf(Date)
        }
      }
    }
  })
})

describe("the line that says what the window left out", () => {
  it("counts only finished one-offs that finished before the window opened", () => {
    const { sql } = render(doneEarlierSql({ from: FROM, to: TO })!)
    expect(sql).toMatch(
      /^\(\("tasks"\."status" in \(\$1, \$2, \$3\) and \("tasks"\."cadence" is null or "tasks"\."cadence" = 'one-off'\)\) and /,
    )
    expect(sql).toContain('"tasks"."updated_at", "tasks"."created_at") < $7')
    expect(sql).not.toContain(">=")
  })

  it("has nothing to name for a window that hides nothing", () => {
    expect(doneEarlierSql({ from: null, to: TO })).toBeNull()
  })
})

describe("the completion day handed back with each row", () => {
  it("reads the same max(finished event) the filter compares against", () => {
    // If the value and the predicate ever disagree, the board groups a card on a day the window
    // says it is not in — a card that appears and disappears with a reload.
    const source = readFileSync(resolve(process.cwd(), "lib/tasks/completed-on-read.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
    const body = source.slice(source.indexOf("export async function finishEventsFor"))
    expect(body).toContain("max(${taskEvents.at})")
    expect(body).toContain("completedStatusSql(taskEvents.toStatus)")
    expect(body).toContain(".groupBy(taskEvents.taskId)")
    expect(typeof finishEventsFor).toBe("function")
  })

  it("asks nothing of the database for an empty page", async () => {
    expect(await finishEventsFor([])).toEqual(new Map())
  })
})
