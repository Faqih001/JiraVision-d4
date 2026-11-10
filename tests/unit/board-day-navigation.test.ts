// Source guards for browsing the board by day.
//
// The hazard this wave exists to contain: the occurrence read is also a write. A grid tops
// itself up inside the request, so a browsed day must only SELECT which row is drawn — if the
// browsed day became the top-up anchor, paging into December would fabricate weeks of
// occurrences nobody asked for. The day maths itself is unit-tested in
// tests/unit/board-day.test.ts; these hold the wiring.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const KANBAN = "app/dashboard/kanban/page.tsx"
const TASKS_ROUTE = "app/api/tasks/route.ts"
const READER = "lib/tasks/day-occurrence.ts"

describe("the read draws the asked-for day", () => {
  it("takes the day from the query string, defaulting to the member's own today", () => {
    const route = codeOnly(src(TASKS_ROUTE))
    expect(route).toMatch(/const todayIso = localDay\(new Date\(\), session\?\.timezone\)/)
    expect(route).toMatch(/resolveBoardDay\(searchParams\.get\("date"\), todayIso\)/)
  })

  it("selects the browsed day but anchors the top-up on the real today", () => {
    const route = codeOnly(src(TASKS_ROUTE))
    expect(route).toMatch(/occurrencesForDay\(result\.tasks, boardDay\.iso, writableIds, todayIso\)/)
  })

  it("tells the client which day it drew and whether it may be written to", () => {
    // The page must not guess readOnly from its own clock: a member in another zone, or a tab
    // left open overnight, would disagree with the server about which day is future.
    const route = codeOnly(src(TASKS_ROUTE))
    expect(route).toMatch(/dayInstance: occurrences\.get\(task\.id\) \?\? null/)
    expect(route).toMatch(/date: boardDay\.iso/)
    expect(route).toMatch(/today: todayIso/)
    expect(route).toMatch(/readOnly: boardDay\.readOnly/)
  })
})

describe("browsing selects rows; only today grows a grid", () => {
  it("reads the browsed day in one query", () => {
    const reader = codeOnly(src(READER))
    expect(reader).toMatch(/eq\(taskInstances\.instanceDate, dayIso\)/)
    expect(reader).toMatch(/inArray\(taskInstances\.taskId, taskIds\)/)
  })

  it("never lets the browsed day become the horizon anchor", () => {
    const reader = codeOnly(src(READER))
    expect(reader).toMatch(/ensureInstanceHorizon\(schedule\.id, schedule\.cadence, topUpIso\)/)
    expect(reader).not.toMatch(/ensureInstanceHorizon\([^)]*dayIso/)
  })

  it("writes nothing at all when the browsed day is behind today", () => {
    // A past row that is missing cannot be born by a forward-walking horizon, so the top-up
    // would be pure write traffic on a read-only look back.
    const reader = codeOnly(src(READER))
    expect(reader).toMatch(/if \(dayIso < topUpIso\) return found/)
  })

  it("keeps the top-up bounded and inside the caller's writable members", () => {
    const reader = codeOnly(src(READER))
    expect(reader).toMatch(/export const DAY_TOP_UP_LIMIT = 25/)
    expect(reader).toMatch(/missing\.slice\(0, DAY_TOP_UP_LIMIT\)/)
    expect(reader).toMatch(/s\.assigneeId !== null && writable\.has\(s\.assigneeId\)/)
  })

  it("still returns the rows it found when the top-up fails", () => {
    const reader = codeOnly(src(READER))
    expect(reader).toMatch(/catch \(error\) \{/)
    expect(reader).toMatch(/return found/)
  })
})

describe("the board carries its day in the address", () => {
  it("reads the day from the URL behind a Suspense boundary", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/useSearchParams/)
    expect(page).toMatch(/<Suspense fallback=/)
    expect(page).toMatch(/urlParams\.get\("date"\)/)
  })

  it("asks the API for the browsed day on every read, refresh and live tick", () => {
    const page = codeOnly(src(KANBAN))
    const asks = page.match(/\/api\/tasks\?pageSize=200&\$\{scopeParam\}\$\{dateQuery\}\$\{doneQuery\}/g) ?? []
    expect(asks.length).toBe(2)
    expect(page).toMatch(/const dateQuery = requestedDay \? `&date=\$\{encodeURIComponent\(requestedDay\)\}` : ""/)
  })

  it("writes the day back to the URL, and drops it on today", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/boardDayParam\(/)
    expect(page).toMatch(/router\.replace\(/)
  })

  it("offers a previous day, a next day, a picker and a way back to today", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toContain('aria-label="Previous day"')
    expect(page).toContain('aria-label="Next day"')
    expect(page).toContain('aria-label="Jump to today"')
    expect(page).toContain('aria-label="Board day"')
    expect(page).toMatch(/shiftDays\(boardDay\.iso, -1\)/)
    expect(page).toMatch(/shiftDays\(boardDay\.iso, 1\)/)
  })

  it("says which day it is drawing, loudly", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/boardDayTitle\(boardDay\.iso, todayIso\)/)
    expect(page).toMatch(/not due on this day/)
    expect(page).not.toMatch(/not due today/)
  })
})

describe("a future day is a preview, not a place to record work", () => {
  it("takes the verdict from the server's day when it matches, and from the same rule otherwise", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/serverDay\?\.date === boardDay\.iso \? serverDay\.readOnly : boardDay\.readOnly/)
  })

  it("refuses the move before anything is written or optimistically drawn", () => {
    const page = codeOnly(src(KANBAN))
    const move = page.slice(page.indexOf("const moveTask = useCallback"))
    const guardAt = move.indexOf("if (readOnly)")
    expect(guardAt).toBeGreaterThan(-1)
    expect(guardAt).toBeLessThan(move.indexOf("const occurrence = task.dayInstance"))
  })

  it("will not start a drag, accept a drop, or offer a status button", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/renderCard\(t, !readOnly\)/)
    expect(page).toMatch(/const handleColumnDrop = [\s\S]{0,200}if \(readOnly\) return/)
    expect(page).toMatch(/disabled=\{readOnly\}/)
  })

  it("says why the board cannot be moved", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/Future days are a preview/)
  })
})