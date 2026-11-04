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
      expect(body).toMatch(/select\(\{ id: tasks\.id, status: tasks\.status\b/)
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

// A task written with a finished status never moves, so no captureStatusChanges call will ever
// see it. These paths must speak for the arrival themselves, or real completed work stays
// invisible to every count that reads task_events. The counterpart guard below is the half that
// keeps fiction out of the log: sample and demo rows are invented, so they get no birth row.
describe("a task that arrives finished records its own birth", () => {
  const createPaths = [
    "app/api/tasks/route.ts",
    "app/api/test/tasks/route.ts",
    "app/api/dashboard/tasks/route.ts",
    "app/api/dashboard/kanban/tasks/route.ts",
    "lib/ops/import/commit.ts",
  ]

  it.each(createPaths)("%s calls captureTaskBirths", (file) => {
    expect(codeOnly(src(file))).toMatch(/captureTaskBirths\(/)
  })

  it("asks the shared completed list, never one literal", () => {
    const rule = codeOnly(src("lib/worklog/task-events.ts"))
    expect(rule).toMatch(/import \{ isCompletedTaskStatus \} from "@\/lib\/tasks\/statuses"/u)
    expect(rule).toMatch(/isCompletedTaskStatus\(/)
  })

  it("keeps the birth sentinel out of the transition rule", () => {
    // statusChanges still refuses to invent a move for a creation; only the birth rule speaks
    // for arrivals, so a task born as todo writes exactly zero rows.
    const rule = codeOnly(src("lib/worklog/task-events.ts"))
    expect(rule).toMatch(/export const BIRTH_FROM_STATUS = "none"/)
    const transitions = rule.slice(
      rule.indexOf("export function statusChanges"),
      rule.indexOf("export function bornFinishedChanges"),
    )
    expect(transitions).not.toMatch(/BIRTH_FROM_STATUS/)
    expect(transitions).toMatch(/if \(before\.length === 0 \|\| after\.length === 0\) return \[\]/)
  })

  it("gives the invented rows no place in the log", () => {
    for (const file of [
      "lib/seed-data.ts",
      "lib/seed/tasks.ts",
      "lib/onboarding/write.ts",
      "scripts/seed-tasks.mjs",
    ]) {
      const body = codeOnly(src(file))
      expect(body, file).not.toMatch(/captureTaskBirths|insert\(taskEvents\)/)
    }
  })
})

describe("nothing manufactures history", () => {
  // The hazard is a day *derived* from a touch stamp — `workedOn: tasks.updatedAt`, or
  // `date(tasks.updated_at)` written into worked_on. Phase 2 legitimately writes both
  // fields in one statement (a member re-dates a row and the row is touched), which the old
  // 80-character proximity window could not tell apart from the real bug. This keeps the
  // rule to one line per field, and the self-check below is what stops the narrowing from
  // quietly becoming a guard that catches nothing.
  const derivesDayFromTouchStamp = (body: string) =>
    /workedOn[^\n,]*updatedAt|updatedAt[^\n,]*workedOn/iu.test(body) ||
    /worked_on[^\n,]*updated_at|updated_at[^\n,]*worked_on/iu.test(body)

  it("the guard still catches a day taken from updated_at", () => {
    expect(derivesDayFromTouchStamp("const row = { workedOn: tasks.updatedAt }")).toBe(true)
    expect(derivesDayFromTouchStamp("sql`select date(tasks.updated_at) as worked_on from tasks`")).toBe(true)
    // and still waves through the two independent writes phase 2 makes
    expect(derivesDayFromTouchStamp(".set({ workedOn: body.workedOn, redatedAt: d, updatedAt: d })")).toBe(false)
  })

  it("no worklog or report module infers a day from tasks.updated_at", () => {
    const offenders = routeFilesUnder("app/api").filter((file) => {
      const body = codeOnly(src(file))
      return /workLogEntries|taskEvents|workReports/.test(body) && derivesDayFromTouchStamp(body)
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

  it("the events table is inserted into only through the capture module and promote route", () => {
    const files = routeFilesUnder("app").concat(["lib/data-access.ts"])
    const offenders = files.filter(
      (file) =>
        /insert\(taskEvents\)/.test(src(file)) &&
        !file.includes("app/api/planner/[id]/promote/route.ts"),
    )
    expect(offenders).toEqual([])
    expect(src("lib/worklog/capture.ts")).toMatch(/insert\(taskEvents\)/)
    expect(src("app/api/planner/[id]/promote/route.ts")).toMatch(/insert\(taskEvents\)/)
  })
})

describe("a playbook run lands in the log, not in the task board", () => {
  // Following a published SOP is a record of work, so it writes one action row per method
  // phase with the playbook and version named. It never creates tasks: a run is a diary
  // entry, and turning steps into work items is the planner's promote, not this route.
  const run = () => codeOnly(src("app/api/playbooks/[id]/run/route.ts"))

  it("names the playbook and the version on every row it writes", () => {
    expect(run()).toMatch(/insert\(workLogEntries\)/)
    expect(run()).toMatch(/playbookId:\s*draft\.playbookId/)
    expect(run()).toMatch(/playbookVersion:\s*draft\.playbookVersion/)
  })

  it("never writes tasks or a task id", () => {
    expect(run()).not.toMatch(/\btasks\b/)
    expect(run()).not.toMatch(/taskId/)
  })

  it("refuses to run anything that is not published", () => {
    expect(run()).toMatch(/row\.status !== "published"[\s\S]{0,80}409/)
  })
})

describe("playbook visibility and the publish gate", () => {
  it("the read path applies the same rule the editor does", () => {
    const body = codeOnly(src("lib/playbooks/read.ts"))
    expect(body).toMatch(/canReadPlaybook\(playbook, viewer\)/)
    expect(body).toMatch(/eq\(playbooks\.status, "published"\)/)
    expect(body).toMatch(/eq\(playbooks\.authorId, viewer\.id\)/)
  })

  it("publish asks publishProblem before it writes the new status", () => {
    const body = codeOnly(src("app/api/playbooks/[id]/publish/route.ts"))
    const gate = body.indexOf("publishProblem(row)")
    const write = body.indexOf('status: "published"')
    expect(gate).toBeGreaterThan(-1)
    expect(write).toBeGreaterThan(-1)
    expect(gate).toBeLessThan(write)
  })

  it("the printed sheet says when its prose is still model-authored", () => {
    const body = codeOnly(src("lib/export/pdf.ts"))
    expect(body).toMatch(/aiMarked/)
    expect(body).toContain("Model draft")
  })
})

describe("onboarding does not become a second schema", () => {
  it("keeps onboarding out of the users table", () => {
    // Slice the raw source: the end marker is a comment, and codeOnly() would erase it.
    const raw = src("drizzle/schema.ts")
    const usersBlock = codeOnly(
      raw.slice(raw.indexOf('export const users = pgTable("users"'), raw.indexOf("// Chat tables")),
    )
    expect(usersBlock).not.toMatch(/onboarding/i)
  })

  it("never gates the dashboard behind a redirect", () => {
    expect(codeOnly(src("app/dashboard/page.tsx"))).not.toMatch(/redirect\("\/onboarding"\)/)
  })

  it("sends the session, never a client flag, to decide the step", () => {
    const page = codeOnly(src("app/onboarding/page.tsx"))
    expect(page).toMatch(/getCurrentUser\(\)/)
    // Anonymous goes to /login carrying the path (and the invite query) it was asked for.
    expect(page).toMatch(/redirect\(`\/login\?next=\$\{encodeURIComponent\(requested\)\}`\)/)
  })

  it("does not read the invitation token from a header or log it", () => {
    const route = codeOnly(src("app/api/team/invitations/route.ts"))
    expect(route).not.toMatch(/x-invite/i)
    expect(route).not.toMatch(/console\.(log|error)\([^)]*invite\.token/)
  })
})
