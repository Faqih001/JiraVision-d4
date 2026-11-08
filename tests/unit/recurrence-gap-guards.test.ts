// Source guards for the recurrence gap fixes (F1-F6). The behaviour lives in the pure
// modules and is unit-tested there; these guards hold the wiring in place, because every
// fix here is a rule a future writer can quietly bypass by calling the wrong door.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { CAREER_SIGNAL_KEYS } from "@/lib/career/signals"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

// Every door that can mutate a task row. A rule enforced in one of them and not the others
// is a rule a client can step around.
const TASK_WRITE_ROUTES = [
  "app/api/tasks/[id]/route.ts",
  "app/api/tasks/bulk/route.ts",
  "app/api/test/tasks/[id]/route.ts",
  "app/api/test/tasks/bulk/route.ts",
] as const

// The create door is a writer too, but it births the first grid itself, so it only belongs in the
// rules that apply to any write — not the cadence-change one.
const TASK_CREATE_ROUTES = ["app/api/tasks/route.ts"] as const

describe("a recurring template stays open", () => {
  it.each([...TASK_CREATE_ROUTES, ...TASK_WRITE_ROUTES])(
    "%s refuses a finished status with 409",
    (file) => {
      const body = codeOnly(src(file))
      expect(body).toMatch(/recurringStatusError\(/)
      expect(body).toMatch(/status: 409/)
    },
  )

  it("derives the template flag from the cadence rather than the request body", () => {
    const picker = codeOnly(src("lib/task-updates.ts"))
    expect(picker).toMatch(/patch\.isTemplate = value !== "one-off"/)
    expect(picker).not.toMatch(/case "isTemplate"/)
  })

  it("keeps the finished words out of the boards for recurring cards", () => {
    // The rule itself is the KC-1 shared vocabulary in lib/tasks/statuses.ts; both readers now call
    // it instead of spelling it out, so the guard holds the call sites, not the old inline filter.
    const kanban = codeOnly(src("app/dashboard/kanban/page.tsx"))
    expect(kanban).toMatch(/creatableStatusesFor\(t\.cadence, STATUSES\)/)
    const tasks = codeOnly(src("app/dashboard/tasks/page.tsx"))
    expect(tasks).toMatch(/creatableStatusesFor\(detailTask\.cadence, STATUSES\)/)
    // The cycle button has the same rule, or a click would still land the card on Done.
    expect(tasks).toMatch(/nextStatus\(t\.status, t\.cadence\)/)
    expect(codeOnly(src("lib/tasks/statuses.ts"))).toMatch(
      /vocabulary\.filter\(\(status\) => !isCompletedTaskStatus\(status\)\)/,
    )
  })
})

describe("the instance grid is anchored on today", () => {
  it("tops up from the horizon rule and never chains off the old grid tail", () => {
    const writer = codeOnly(src("lib/data-access-task-instances.ts"))
    expect(writer).toMatch(/horizonDates\(/)
    expect(writer).toMatch(/onConflictDoNothing\(\)/)
    // The pre-fix generateNextInstance stepped from the latest stored date, which handed out
    // dates in the past. Nothing may build a row from that date again.
    expect(writer).not.toMatch(/nextInstanceDate\(/)
  })

  it("only ever reads open rows forward from today", () => {
    const writer = codeOnly(src("lib/data-access-task-instances.ts"))
    expect(writer).toMatch(/gte\(taskInstances\.instanceDate, todayIso\)/)
  })

  it.each(TASK_WRITE_ROUTES)("%s materialises the grid on a cadence change", (file) => {
    expect(codeOnly(src(file))).toMatch(/materialiseGridOnCadenceChange\(/)
  })

  it("anchors writes on the member's local day, never the server clock", () => {
    for (const file of [...TASK_WRITE_ROUTES, "app/api/task-instances/[id]/route.ts"]) {
      expect(codeOnly(src(file))).toMatch(/localDay\(/)
    }
  })

  it("lets only the assignee extend a schedule by reading it", () => {
    const route = codeOnly(src("app/api/task-instances/route.ts"))
    expect(route).toMatch(/assigneeId === session\.id/)
    expect(route).toMatch(/ensureInstanceHorizon\(/)
  })

  it("anchors a born grid on the start day and caps it at the due date", () => {
    const create = codeOnly(src("app/api/tasks/route.ts"))
    // The due date ends a series. Passed in as the anchor instead, it birthed a grid of Fridays
    // that had not arrived yet, so the board drew no card on the day the schedule was made.
    expect(create).not.toMatch(/generateInitialInstances\([\s\S]{0,220}?data\.dueDate/)
    expect(create).toMatch(
      /generateInitialInstances\(\s*newTask\.id,[\s\S]*?newTask\.startDate[\s\S]*?newTask\.dueDate/,
    )

    const writer = codeOnly(src("lib/data-access-task-instances.ts"))
    expect(writer).toMatch(/computeInstanceDates\(cadence, from, endDateIso\)/)
    // Every top-up door reads the cap itself, so none of them can forget to pass it.
    expect(writer).toMatch(/horizonDates\([\s\S]*?await seriesEnd\(taskId\)/)
  })
})

describe("the grid repair script borrows the engine's dates", () => {
  const script = codeOnly(src("scripts/reanchor-recurring-grid.mjs"))

  it("asks the engine which days exist instead of stepping them itself", () => {
    expect(script).toMatch(/await import\("\.\.\/lib\/tasks\/recurrence\.ts"\)/)
    expect(script).toMatch(/computeInstanceDates\(task\.cadence,[\s\S]*?task\.due_date\)/)
    expect(script).not.toMatch(/CADENCE_DAYS|setUTCDate/)
  })

  it("writes nothing until --apply, and backs up before the transaction opens", () => {
    expect(script).toMatch(/const APPLY = process\.argv\.includes\("--apply"\)/)
    expect(script).toMatch(/if \(!APPLY\) \{[\s\S]*?process\.exit\(0\)/)
    expect(script.indexOf("const stamp = new Date()")).toBeLessThan(
      script.lastIndexOf("await sql.begin"),
    )
    expect(script).toMatch(/mkdirSync\(dir, \{ recursive: true \}\)/)
  })

  it("refuses to delete a row that carries somebody's work", () => {
    expect(script).toMatch(/function isUntouched\(/)
    expect(script).toMatch(/const blocked = outside\.filter\(\(r\) => !isUntouched\(r\)\)/)
    expect(script).toMatch(/if \(blocked\.length\) \{[\s\S]*?process\.exit\(1\)/)
    expect(script).toMatch(
      /delete from task_instances[\s\S]*?and status = 'todo'[\s\S]*?and notes is null[\s\S]*?and completed_at is null/,
    )
  })
})

describe("the tasks panel shows today", () => {
  const page = codeOnly(src("app/dashboard/tasks/page.tsx"))

  it("renders the windowed selector instead of the grid tail", () => {
    expect(page).toMatch(/planInstanceWindow\(instances, todayIso\)/)
    expect(page).toMatch(/win\.upcoming\.map\(/)
    // The pre-fix list sorted the grid descending and cut ten rows, which showed the end of
    // next month and buried today.
    expect(page).not.toMatch(/b\.instanceDate\.localeCompare\(a\.instanceDate\)/)
  })

  it("collapses missed days to a line with no repeatable CTA", () => {
    expect(page).toMatch(/win\.missedCount > 0/)
    expect(page).not.toMatch(/win\.missedDates\.map\(/)
  })
})

describe("every registered career signal is both counted and openable", () => {
  it.each([...CAREER_SIGNAL_KEYS])("%s has a count", (key) => {
    expect(codeOnly(src("lib/career/counts.ts"))).toContain(`${key}:`)
  })

  it.each([...CAREER_SIGNAL_KEYS])("%s has evidence rows", (key) => {
    expect(codeOnly(src("lib/career/evidence.ts"))).toContain(`wanted.has("${key}")`)
  })
})
