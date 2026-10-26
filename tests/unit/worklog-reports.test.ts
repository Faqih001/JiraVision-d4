import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

function routeFilesUnder(dir: string): string[] {
  const out: string[] = []
  const walk = (current: string) => {
    for (const entry of readdirSync(path.join(repo, current))) {
      const relative = `${current}/${entry}`
      if (entry === "route.ts") out.push(relative)
      else if (!/\./.test(entry)) walk(relative)
    }
  }
  walk(dir)
  return out
}

// Phase 1 invariants of the worklog design. Later phases add blocks here — this file is
// what keeps the invariants true after the person who wrote them has moved on.

describe("task_events capture covers every status-writing route", () => {
  const captured = [
    "app/api/tasks/[id]/route.ts",
    "app/api/tasks/bulk/route.ts",
    "app/api/dashboard/tasks/route.ts",
    "app/api/test/tasks/[id]/route.ts",
    "app/api/test/tasks/bulk/route.ts",
  ]

  it.each(captured)("%s calls captureStatusChanges", (file) => {
    expect(src(file)).toMatch(/captureStatusChanges\(/)
  })

  it("reads the before-state on every bulk or blind write", () => {
    for (const file of [
      "app/api/tasks/bulk/route.ts",
      "app/api/dashboard/tasks/route.ts",
      "app/api/test/tasks/bulk/route.ts",
    ]) {
      const body = src(file)
      expect(body).toMatch(/select\(\{ id: tasks\.id, status: tasks\.status \}\)/)
    }
  })

  it("captures before the notification branches, not inside them", () => {
    const body = src("app/api/tasks/[id]/route.ts")
    const capture = body.indexOf("captureStatusChanges(")
    const notify = body.indexOf("createNotification({")
    expect(capture).toBeGreaterThan(-1)
    expect(notify).toBeGreaterThan(-1)
    expect(capture).toBeLessThan(notify)
  })

  it("leaves the kanban board out, because it writes kanban_tasks not tasks", () => {
    for (const file of [
      "app/api/dashboard/kanban/update-status/route.ts",
      "app/api/dashboard/kanban/reorder/route.ts",
    ]) {
      expect(src(file)).not.toMatch(/captureStatusChanges/)
      expect(src(file)).toMatch(/kanbanTasks/)
    }
  })
})

describe("nothing manufactures history", () => {
  it("no worklog or report module infers a day from tasks.updated_at", () => {
    const offenders = routeFilesUnder("app/api").filter((file) => {
      const body = codeOnly(src(file))
      return /workLogEntries|taskEvents|workReports/.test(body) && /workedOn[\s\S]{0,80}updatedAt/.test(body)
    })
    expect(offenders).toEqual([])
  })

  it("task_events has no backfill script", () => {
    const scripts = readdirSync(path.join(repo, "scripts"))
    expect(scripts.filter((name) => /backfill.*task.*(event|histor)/i.test(name))).toEqual([])
  })
})

describe("vocabulary has one owner", () => {
  it("cadences are declared in lib/cadence.ts and nowhere else", () => {
    const declared = routeFilesUnder("app")
      .concat(["app/api/reports/_shared.ts", "app/dashboard/reports/page.tsx"])
      .filter((file) => /type Cadence =|CADENCES = \[/.test(src(file)))
    expect(declared).toEqual([])
    expect(src("lib/cadence.ts")).toMatch(/export const CADENCES/)
  })

  it("disciplines are declared in lib/roles.ts and nowhere else", () => {
    const declared = routeFilesUnder("app")
      .concat(["app/dashboard/reports/page.tsx"])
      .filter((file) => /WORK_DISCIPLINES = \[/.test(src(file)))
    expect(declared).toEqual([])
    expect(src("lib/roles.ts")).toMatch(/export const WORK_DISCIPLINES/)
  })

  it("the whitelist still refuses the audit and promote-only columns", () => {
    const body = src("lib/task-updates.ts")
    expect(body).toMatch(/startDate/)
    expect(body).toMatch(/discipline/)
    expect(body).not.toMatch(/"sourcePlanId"/)
  })
})

describe("capture cannot be lost silently", () => {
  it("the writer logs a named failure instead of swallowing it", () => {
    const body = src("lib/worklog/capture.ts")
    expect(body).toMatch(/\[task_events\] capture failed/)
    expect(body).toMatch(/catch/)
  })

  it("the events table is inserted into only through the capture module", () => {
    const files = routeFilesUnder("app").concat(["lib/data-access.ts"])
    const offenders = files.filter((file) => /insert\(taskEvents\)/.test(src(file)))
    expect(offenders).toEqual([])
    expect(src("lib/worklog/capture.ts")).toMatch(/insert\(taskEvents\)/)
  })
})
