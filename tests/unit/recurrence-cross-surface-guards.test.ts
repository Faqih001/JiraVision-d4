// Source guards for the recurrence cross-surface wave (A–G). Behaviour lives in the pure
// modules and is unit-tested there; these guards hold the wiring, because every fix here is
// a rule a future reader can quietly bypass by dropping one predicate.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { INSTANCE_COUNTS } from "@/lib/tasks/recurrence"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("the calendar reads only the schedules you may see", () => {
  const route = codeOnly(src("app/api/calendar/events/route.ts"))

  it("resolves the visible member set once per request", () => {
    expect(route).toMatch(/loadVisibleMemberIds\(session\.id\)/)
  })

  it("scopes the instance branch by assignee instead of drawing every member's grid", () => {
    expect(route).toMatch(/const assigneeScope =/)
    expect(route).toMatch(/instanceConditions\.push\(assigneeScope\)/)
  })

  it("keeps unassigned schedules visible under scope=all and hidden under scope=mine", () => {
    expect(route).toMatch(/eq\(tasks\.assigneeId, session\.id\)/)
    expect(route).toMatch(/or\(inArray\(tasks\.assigneeId, visibleIds\), isNull\(tasks\.assigneeId\)\)/)
  })

  it("never leaves a derived branch on an unfiltered sql`true`", () => {
    expect(route).not.toMatch(/instanceConditions\.length > 0/)
  })
})

describe("a schedule draws occurrences and a deadline draws its due date", () => {
  const route = codeOnly(src("app/api/calendar/events/route.ts"))

  it("has no template branch left", () => {
    expect(route).not.toMatch(/recurringTasksList/)
    expect(route).not.toMatch(/recurringEvents/)
  })

  it("reads only non-template tasks in the deadline branch", () => {
    expect(route).toMatch(/eq\(tasks\.isTemplate, false\)/)
    expect(route).toMatch(/isNotNull\(tasks\.dueDate\)/)
    // Ruling 1, counted rather than pattern-matched: exactly one derived shape is an occurrence
    // and exactly one is a deadline. Task 3 reads `isTemplate = true` again to find the grids it
    // must top up, so a bare token check would reject a legitimate SELECT.
    expect(route.match(/isRecurring: true/g)?.length).toBe(1)
    expect(route.match(/isRecurring: false/g)?.length).toBe(1)
  })

  it("never stamps an event with the request clock", () => {
    expect(route).not.toMatch(/startTime:[^\n]*new Date\(\)\.toISOString\(\)/)
  })

  it("carries the assignee predicate on both derived branches", () => {
    expect(route.match(/push\(assigneeScope\)/g)?.length).toBe(2)
  })

  it("treats a one-off deadline as a deadline, not a schedule", () => {
    const page = codeOnly(src("app/dashboard/calendar/page.tsx"))
    expect(page).toMatch(/isCompletedTaskStatus\(t\.status\)/)
    expect(page).toMatch(/isRecurringTask\(t\)/)
  })
})

describe("a calendar read tops up the grid it is about to draw", () => {
  const route = codeOnly(src("app/api/calendar/events/route.ts"))
  const recurrence = codeOnly(src("lib/tasks/recurrence.ts"))

  it("sits in front of the instance query", () => {
    expect(route.indexOf("ensureInstanceHorizon(")).toBeLessThan(
      route.indexOf("instancesWithTasks = await db"),
    )
    expect(route).toMatch(/horizonOccurrencesForWindow\(/)
  })

  it("is bounded in rows and in tasks", () => {
    expect(recurrence).toMatch(/export const MAX_HORIZON_OCCURRENCES = 90/)
    expect(route).toMatch(/const HORIZON_TASK_LIMIT = 25/)
    expect(route).toMatch(/limit\(HORIZON_TASK_LIMIT \+ 1\)/)
    expect(route).toMatch(/horizon deferred/)
  })

  it("tops up only schedules that have an owner", () => {
    expect(route).toMatch(/const topUpScope =/)
    // exactly one `isNull(tasks.assigneeId)` exists: Task 1's visible-scope predicate. A second
    // would mean the top-up reached for an unassigned schedule, and a write into someone's grid
    // needs an owner.
    expect(route.match(/isNull\(tasks\.assigneeId\)/g)?.length).toBe(1)
  })

  it("anchors on the member's local day and never fails the read", () => {
    expect(route).toMatch(/localDay\(new Date\(\), session\.timezone\)/)
    expect(route).toMatch(/horizon top-up failed/)
  })
})

describe("one cadence vocabulary", () => {
  // Scoped to task-cadence sites. `agent_plans.cadence` and `task_report_templates.cadence`
  // are different schedules that merely share the word (spec §F), and lib/reports/period.ts,
  // lib/packs/ops/validator.ts and lib/ops/config/proposal.ts legitimately repeat a subset —
  // so the guard names the four files that must not carry a private copy.
  const files = [
    "lib/planner/extract.ts",
    "app/dashboard/planner/[id]/plan-editor-client.tsx",
    "app/api/planner/[id]/items/[itemId]/route.ts",
  ]

  it("keeps no private copy of the schedule list", () => {
    for (const file of files) {
      expect(codeOnly(src(file))).not.toMatch(/"daily",\s*"weekly",\s*"monthly"/)
    }
  })

  it("points every consumer at the shared list", () => {
    expect(codeOnly(src("lib/planner/extract.ts"))).toMatch(/z\.enum\(SCHEDULE_CADENCES\)/)
    expect(codeOnly(src("lib/planner/extract.ts"))).toMatch(/enum: \[\.\.\.SCHEDULE_CADENCES\]/)
    expect(codeOnly(src("app/dashboard/planner/[id]/plan-editor-client.tsx"))).toMatch(
      /SCHEDULE_CADENCES\.map/,
    )
    expect(codeOnly(src("app/api/planner/[id]/items/[itemId]/route.ts"))).toMatch(
      /cadenceOrNone\(body\.cadence\)/,
    )
  })

  it("keeps the migration script's mirrored grid counts honest", () => {
    // A script may not import app code, so equality with the module the app uses is the most it
    // can be held to. The quoted alternation is the script's own key style, not a second list.
    const script = src("scripts/import-it-technician-tasks.mjs")
    for (const [cadence, count] of Object.entries(INSTANCE_COUNTS)) {
      expect(script).toMatch(new RegExp(`"?${cadence}"?:\\s*${count}`))
    }
  })
})
