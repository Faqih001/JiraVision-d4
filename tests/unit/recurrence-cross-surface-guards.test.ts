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
