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

describe("promote carries the cadence and grids after the transaction", () => {
  const route = codeOnly(src("app/api/planner/[id]/promote/route.ts"))

  it("builds task values from the plan item, not from the plan", () => {
    expect(route).toMatch(/promoteTaskValues\(item, \{ id: session\.id \}\)/)
    expect(route).not.toMatch(/agentPlans\.cadence/)
    expect(route).not.toMatch(/plan\.cadence/)
  })

  it("materialises the grid after the transaction, never inside it", () => {
    const txOpen = route.indexOf("db.transaction(")
    const txReturn = route.indexOf("return { taskIds: createdTaskIds")
    const grid = route.indexOf("ensureInstanceHorizon(")
    expect(txOpen).toBeGreaterThan(-1)
    expect(txReturn).toBeGreaterThan(txOpen)
    // The transaction's own return statement is its last line, so anything after it is outside.
    expect(grid).toBeGreaterThan(txReturn)
    expect(route.slice(txOpen, txReturn)).not.toMatch(/ensureInstanceHorizon\(/)
  })

  it("keeps the born-finished rule alone", () => {
    expect(route).not.toMatch(/captureTaskBirths/)
  })
})

describe("the server reads the completed-status list, not a literal", () => {
  const serverFiles = [
    "app/api/reports/_shared.ts",
    "app/api/sprints/[id]/route.ts",
    "app/api/sprints/route.ts",
    "app/api/analytics/route.ts",
    "app/api/activity/route.ts",
    "app/api/settings/[key]/route.ts",
    "app/api/team/members/route.ts",
    "app/api/team/members/[id]/route.ts",
    "app/api/automation/_shared.ts",
    "app/api/ethical-metrics/route.ts",
    "app/api/ethical-metrics/apply-recommendation/route.ts",
    "lib/dashboard-data.ts",
  ]

  it("leaves no status-vs-'done' comparison in a swept server file", () => {
    for (const file of serverFiles) {
      const code = codeOnly(src(file))
      expect(code, file).not.toMatch(/status\s*[!=]==?\s*["']done["']/)
      expect(code, file).not.toMatch(/status\}? (<>=?|<>) ?'done'/)
      expect(code, file).not.toMatch(/neqDone\(/)
    }
  })

  it("imports the shared rule into each of them", () => {
    for (const file of serverFiles) {
      const code = src(file)
      expect(
        /@\/lib\/tasks\/statuses(-sql)?/.test(code),
        `${file} imports neither statuses helper`,
      ).toBe(true)
    }
  })

  it("excludes schedules from the counting reads, and only those", () => {
    expect(codeOnly(src("app/api/reports/_shared.ts"))).toMatch(/isTemplate|is_template = false/)
    expect(codeOnly(src("app/api/team/members/route.ts"))).toMatch(/eq\(tasks\.isTemplate, false\)/)
    const detail = codeOnly(src("app/api/team/members/[id]/route.ts"))
    expect(detail.slice(0, detail.indexOf("export async function DELETE"))).toMatch(
      /eq\(tasks\.isTemplate, false\)/,
    )
    // ruling P7: the account-removal guard counts every owned row, schedules included
    expect(detail.slice(detail.indexOf("export async function DELETE"))).not.toMatch(/isTemplate/)
  })
})

describe("the client pages read the completed-status list", () => {
  const sweptPages = [
    "app/dashboard/kanban/page.tsx",
    "app/dashboard/tasks/page.tsx",
    "app/dashboard/backlog/page.tsx",
    "app/dashboard/gamification/page.tsx",
    "app/dashboard/gamification/leaderboard/page.tsx",
    "app/dashboard/team-wellbeing/page.tsx",
    "app/dashboard/ai-scrum-master/page.tsx",
    "app/dashboard/analytics/page.tsx",
    "app/dashboard/email/page.tsx",
    "app/dashboard/ethical-metrics/page.tsx",
    "app/dashboard/calendar/page.tsx",
    "app/dashboard/page.tsx",
  ]

  it("leaves no open-vs-done comparison in a swept page", () => {
    // ruling P11: the only "done" literal allowed in a swept page is an instance-row read.
    // task_instances.status is a whitelist that cannot hold completed/closed (ruling P3), so
    // `inst.status !== "done"` stays; every other receiver means a tasks.status comparison.
    const pinnedInstanceReaders = new Set(["inst"])
    for (const file of sweptPages) {
      const code = codeOnly(src(file))
      const receivers = [...code.matchAll(/\b([A-Za-z_$][\w$]*)\.status\s*[!=]==?\s*["']done["']/g)].map((m) => m[1])
      for (const receiver of receivers) {
        expect(pinnedInstanceReaders.has(receiver), `${file}: ${receiver}.status compared to "done"`).toBe(true)
      }
    }
  })

  it("imports the shared rule into each of them", () => {
    for (const file of sweptPages) {
      expect(src(file), file).toMatch(/@\/lib\/tasks\/statuses/)
    }
  })
})
