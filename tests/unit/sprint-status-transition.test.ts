// The edit dialog on /dashboard/sprints offers Planned / Active / Completed for every sprint, so
// the status column is presented as ordinary editable data. The PUT handler disagreed: it allowed
// only planned→active and active→completed, which meant the same dialog that offers "Active" on a
// closed sprint answered "Invalid status transition" the moment someone chose it, and a sprint
// closed by mistake could never be reopened.
//
// The rule lives in lib/sprints/statuses.ts so the route and the dialog can be checked against
// each other. `planning` is the older spelling of `planned` and both appear in production rows.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { normalizeSprintStatus, sprintTransition } from "@/lib/sprints/statuses"

const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("sprint status transitions", () => {
  it("reads a reopen as a change, not an error", () => {
    expect(sprintTransition("completed", "active")).toBe("reopened")
    expect(sprintTransition("completed", "planned")).toBe("reopened")
    expect(sprintTransition("active", "planned")).toBe("reopened")
  })

  it("reads closing a sprint that was never started as a completion", () => {
    expect(sprintTransition("planned", "completed")).toBe("completed")
  })

  it("keeps the two moves the buttons make", () => {
    expect(sprintTransition("planned", "active")).toBe("started")
    expect(sprintTransition("active", "completed")).toBe("completed")
  })

  it("reports no transition when the status did not really move", () => {
    // A name edit saves the whole draft, status included. If that counted as a transition, every
    // small edit would notify the team that the sprint had "completed".
    expect(sprintTransition("active", "active")).toBeNull()
    expect(sprintTransition("completed", "completed")).toBeNull()
    expect(sprintTransition("planned", "planning")).toBeNull()
    expect(sprintTransition("planning", "planned")).toBeNull()
  })

  it("treats planning as planned", () => {
    expect(normalizeSprintStatus("planning")).toBe("planned")
    expect(normalizeSprintStatus("active")).toBe("active")
    expect(normalizeSprintStatus("completed")).toBe("completed")
  })
})

describe("the sprint PUT route asks the rule instead of deciding for itself", () => {
  const route = codeOnly(readFileSync(resolve(process.cwd(), "app/api/sprints/[id]/route.ts"), "utf8"))

  it("uses the shared transition rule", () => {
    expect(route).toMatch(/sprintTransition\(/)
  })

  it("no longer refuses a transition the dialog offers", () => {
    expect(route).not.toMatch(/Invalid status transition/)
  })
})
