// Source guards for the recurrence cross-surface wave (A–G). Behaviour lives in the pure
// modules and is unit-tested there; these guards hold the wiring, because every fix here is
// a rule a future reader can quietly bypass by dropping one predicate.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

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
