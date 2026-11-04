// Source guards for the "a daily lands in To do every morning" wave: the board draws today's
// occurrence instead of the schedule, the move writes the occurrence row, the read that feeds
// it is bounded, and no grid is written for a weekend. The date maths itself is unit-tested in
// tests/unit/task-recurrence.test.ts; these hold the wiring, because every rule here is one a
// future writer can quietly bypass by calling the wrong door.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const KANBAN = "app/dashboard/kanban/page.tsx"
const TASKS_ROUTE = "app/api/tasks/route.ts"
const READER = "lib/tasks/today-occurrence.ts"
const RECURRENCE = "lib/tasks/recurrence.ts"
const RECONCILE = "scripts/reconcile-recurring-tasks.mjs"

describe("the board draws the day, not the schedule", () => {
  it("buckets columns by the drawn status", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/const boardStatus = \(t: TaskRow\): string \| null =>/)
    expect(page).toMatch(/boardTasks\.filter\(\(t\) => boardStatus\(t\) === status\)/)
  })

  it("never buckets a column by the row behind the card", () => {
    // `t.status` on a schedule is the template's own status, which is forever `in_progress`
    // after the reconcile. A column keyed on it would pin every daily to one place.
    const page = codeOnly(src(KANBAN))
    expect(page).not.toMatch(/visibleTasks\.filter\(\(t\) => t\.status === status\)/)
  })

  it("draws nothing for a schedule with no occurrence today, or a settled one", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/const status = t\.todayInstance\?\.status/)
    expect(page).toMatch(/if \(!status \|\| status === "skipped"\) return null/)
  })

  it("names the schedules it is holding back", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/isRecurring\(t\) && boardStatus\(t\) === null/)
    expect(page).toMatch(/not due today/)
  })

  it("reads overdue, my cards and the totals off the drawn status", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/const status = boardStatus\(t\)/)
    expect(page).toMatch(/isCompletedTaskStatus\(t\.todayInstance\?\.status \?\? t\.status\)/)
  })
})

describe("an occurrence card moves through the instance door", () => {
  it("offers only the three states an occurrence row can hold", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/const INSTANCE_STATUSES = \["todo", "in_progress", "done"\]/)
    expect(page).toMatch(/if \(t\.todayInstance\) return INSTANCE_STATUSES/)
  })

  it("refuses a board-only column and writes nothing", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/if \(!INSTANCE_STATUSES\.includes\(status\)\)/)
    // The refusal must reload, so a card the client optimistically moved snaps back.
    const refusal = page.slice(page.indexOf("!INSTANCE_STATUSES.includes(status)"))
    expect(refusal.slice(0, 600)).toMatch(/await reloadTasks\(\)/)
  })

  it("patches the occurrence, not the task", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/fetch\(`\/api\/task-instances\/\$\{occurrence\.id\}`/)
    expect(page).toMatch(/method: "PATCH"/)
  })

  it("still refuses to finish the schedule itself", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/isRecurring\(task\) && isCompletedTaskStatus\(status\)/)
    expect(page).toMatch(/RECURRING_STATUS_HINT/)
  })
})

describe("the read that feeds the board", () => {
  it("attaches today's occurrence to every task row", () => {
    const route = codeOnly(src(TASKS_ROUTE))
    expect(route).toMatch(/todayOccurrencesFor\(/)
    expect(route).toMatch(/todayInstance: occurrences\.get\(task\.id\) \?\? null/)
  })

  it("loads the member list only when the page holds a schedule", () => {
    const route = codeOnly(src(TASKS_ROUTE))
    expect(route).toMatch(/hasSchedule && session \? await loadVisibleMemberIds\(session\.id\) : \[\]/)
  })

  it("tops up only grids this caller may write, and only so many", () => {
    const reader = codeOnly(src(READER))
    expect(reader).toMatch(/export const TODAY_TOP_UP_LIMIT = 25/)
    expect(reader).toMatch(/missing\.slice\(0, TODAY_TOP_UP_LIMIT\)/)
    expect(reader).toMatch(/s\.assigneeId !== null && writable\.has\(s\.assigneeId\)/)
  })

  it("reads today's rows in one query and swallows a failed top-up", () => {
    const reader = codeOnly(src(READER))
    expect(reader).toMatch(/eq\(taskInstances\.instanceDate, todayIso\)/)
    expect(reader).toMatch(/inArray\(taskInstances\.taskId, taskIds\)/)
    expect(reader).toMatch(/catch \(error\) \{/)
    expect(reader).toMatch(/return found/)
  })
})

describe("no grid is written for a weekend", () => {
  it("rolls every date the recurrence engine produces", () => {
    const engine = codeOnly(src(RECURRENCE))
    expect(engine).toMatch(/export function workingDayOnOrAfter/)
    // The three doors that can emit an occurrence date.
    expect(engine).toMatch(/let cursor = workingDayOnOrAfter\(toIsoDate\(from\)\)/)
    expect(engine).toMatch(/return next \? workingDayOnOrAfter\(next\.slice\(0, 10\)\) : null/)
    expect(engine).toMatch(/let cursor = workingDayOnOrAfter\(latestIso \?\? todayIso\)/)
  })

  it("leaves the report scheduler alone", () => {
    // computeNextRun also drives report_schedules.next_run_at, whose live rows were produced
    // without a weekend rule. Rolling it there would silently shift running schedules.
    const cadence = codeOnly(src("lib/cadence.ts"))
    expect(cadence).not.toMatch(/working-days/)
    expect(cadence).not.toMatch(/workingDayOnOrAfter/)
  })

  it("settles only weekend rows nobody has touched, from a backup taken first", () => {
    const script = codeOnly(src(RECONCILE))
    expect(script).toMatch(/extract\(isodow from instance_date\) >= 6/)
    expect(script).toMatch(/r\.status === "todo"/)
    expect(script).toMatch(/and status = 'todo'/)
    expect(script).toMatch(/where id = any\(/)
    // The before-values must already be on disk when the transaction starts, or a rollback has
    // nothing to roll back to.
    expect(script.indexOf("writeFileSync")).toBeLessThan(script.indexOf("sql.begin"))
  })
})
