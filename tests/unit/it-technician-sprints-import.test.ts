import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { SPRINT_STATUSES } from "@/lib/sprints/statuses"

// The owner's sprint plan arrived as a document (2026-11-03) and lives as data:
// scripts/data/it-technician-sprints.json. These guards fail if the transcription drops a
// sprint, invents a status the sprints/retros CHECK rejects, opens a date gap or overlap,
// or — the load-bearing one — if the 41-task allocation stops covering every task exactly
// once. Capacity is deliberately NOT in the file; it is derived from the mapping, so a
// hand-typed number can never disagree with the tasks that actually land in a sprint.

const repo = path.resolve(__dirname, "..", "..")
const plan = JSON.parse(readFileSync(path.join(repo, "scripts/data/it-technician-sprints.json"), "utf8")) as {
  sprints: Array<{
    seq: number
    name: string
    description: string
    startDate: string
    endDate: string
    status: string
    taskSeqs: number[]
    capacity?: number
  }>
  retros: Array<{ seq: number; sprintSeq: number; title: string; date: string; status: string }>
}
const tasks = JSON.parse(readFileSync(path.join(repo, "scripts/data/it-technician-tasks.json"), "utf8")) as Array<{
  seq: number
  storyPoints: number
  priority: string
}>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY = 86_400_000
const days = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const sprint = (seq: number) => plan.sprints.find((s) => s.seq === seq)!

describe("it-technician sprint data", () => {
  it("carries all 4 sprints in document order with the document's names", () => {
    expect(plan.sprints).toHaveLength(4)
    expect(plan.sprints.map((s) => s.seq)).toEqual([1, 2, 3, 4])
    expect(plan.sprints.map((s) => s.name)).toEqual([
      "IT Operations Foundation and Daily Support",
      "Backup, Maintenance and Asset Management",
      "IT Security, Documentation and Recovery Readiness",
      "IT Review, Reporting and Handover Completion",
    ])
    for (const s of plan.sprints) {
      expect(s.description.trim().length).toBeGreaterThan(40)
      // GET /api/sprints dedupes by name (lowest id wins), so a duplicate would vanish.
      expect(s.name.length).toBeLessThanOrEqual(255)
    }
    expect(new Set(plan.sprints.map((s) => s.name)).size).toBe(4)
  })

  it("tiles 3 Nov – 31 Dec with no gap and no overlap", () => {
    // The owner's four windows; a gap would leave days of the quarter unplanned and an
    // overlap would make two sprints claim the same task's due date.
    expect(plan.sprints[0].startDate).toBe("2026-11-03")
    expect(plan.sprints[3].endDate).toBe("2026-12-31")
    expect(plan.sprints.map((s) => s.startDate)).toEqual([
      "2026-11-03",
      "2026-11-18",
      "2026-12-03",
      "2026-12-17",
    ])
    for (const s of plan.sprints) {
      expect(s.startDate).toMatch(ISO_DATE)
      expect(s.endDate).toMatch(ISO_DATE)
      expect(days(s.endDate)).toBeGreaterThan(days(s.startDate))
      // two working weeks, like every sprint in the document
      expect(Math.round((days(s.endDate) - days(s.startDate)) / DAY) + 1).toBeGreaterThanOrEqual(14)
      expect(Math.round((days(s.endDate) - days(s.startDate)) / DAY) + 1).toBeLessThanOrEqual(15)
    }
    for (let i = 1; i < plan.sprints.length; i++) {
      expect(days(plan.sprints[i].startDate) - days(plan.sprints[i - 1].endDate)).toBe(DAY)
    }
  })

  it("uses only statuses /api/sprints will accept, with exactly one active sprint", () => {
    // Read from the shared vocabulary the routes themselves validate against, so a status change
    // breaks here rather than silently.
    const statuses = [...SPRINT_STATUSES]
    expect(statuses).toEqual(["planned", "planning", "active", "completed"])

    for (const s of plan.sprints) expect(statuses).toContain(s.status)
    // "Status: Active" once — the page's active-sprint card takes the first active row.
    expect(plan.sprints.filter((s) => s.status === "active").map((s) => s.seq)).toEqual([1])
    expect(plan.sprints.filter((s) => s.seq > 1).every((s) => s.status === "planned")).toBe(true)
  })

  it("leaves capacity to be derived, never typed", () => {
    for (const s of plan.sprints) expect(s.capacity).toBeUndefined()
  })

  it("allocates every one of the 41 imported tasks to exactly one sprint", () => {
    const allocated = plan.sprints.flatMap((s) => s.taskSeqs)
    expect(allocated).toHaveLength(41)
    expect([...allocated].sort((a, b) => a - b)).toEqual(Array.from({ length: 41 }, (_, i) => i + 1))
  })

  it("derives capacity from the mapping: 32 / 29 / 35 / 27 points, 123 in total", () => {
    const points = (s: (typeof plan.sprints)[number]) =>
      s.taskSeqs.reduce((sum, seq) => sum + tasks.find((t) => t.seq === seq)!.storyPoints, 0)
    expect(plan.sprints.map(points)).toEqual([32, 29, 35, 27])
    expect(plan.sprints.reduce((sum, s) => sum + points(s), 0)).toBe(123)
    expect(plan.sprints.map((s) => s.taskSeqs.length)).toEqual([13, 12, 9, 7])
  })

  it("puts each task in the sprint whose description covers it", () => {
    // Sprint 1 is the daily-operations foundation: all of §1 plus the urgent escalation and
    // the ad-hoc user-issue fixes ("address urgent user issues").
    for (const seq of [1, 2, 3, 4, 5, 6, 7, 12, 23, 24, 26, 27, 30]) expect(sprint(1).taskSeqs).toContain(seq)
    // Sprint 2 is weekly + monthly backup/maintenance/asset review.
    for (const seq of [8, 9, 11, 13, 14, 15, 16, 17, 18, 19, 21, 25]) expect(sprint(2).taskSeqs).toContain(seq)
    // Sprint 3 is recovery readiness: §6's four reviews, restoration testing (10),
    // on/offboarding (28, 29) and the security/access + documentation habits (31, 32).
    for (const seq of [10, 28, 29, 31, 32, 33, 34, 35, 36]) expect(sprint(3).taskSeqs).toContain(seq)
    // Sprint 4 closes the quarter: recurring incidents, reporting, docs, inventory, handover.
    expect(sprint(4).taskSeqs).toEqual([20, 22, 37, 38, 39, 40, 41])
    // The one urgent task is in the sprint that is actually running.
    expect(sprint(1).taskSeqs).toContain(tasks.find((t) => t.priority === "urgent")!.seq)
  })

  it("carries all 4 retros, one per sprint, dated on its sprint's last day", () => {
    expect(plan.retros).toHaveLength(4)
    expect(plan.retros.map((r) => r.seq)).toEqual([1, 2, 3, 4])
    expect(plan.retros.map((r) => r.sprintSeq)).toEqual([1, 2, 3, 4])
    for (const r of plan.retros) {
      const linked = sprint(r.sprintSeq)
      expect(r.title).toBe(`${linked.name} Retrospective`)
      expect(r.date).toBe(linked.endDate)
      expect(r.title.length).toBeLessThanOrEqual(255)
    }
    expect(new Set(plan.retros.map((r) => r.title)).size).toBe(4)
  })

  it("opens every retro as a draft, using a status the retros CHECK allows", () => {
    // scripts/create-retro-tables.mjs bakes the CHECK into the column; POST /api/retros
    // only ever enters a retro as draft or scheduled.
    const ddl = readFileSync(path.join(repo, "scripts/create-retro-tables.mjs"), "utf8")
    const allowed = ddl
      .match(/CHECK \(status IN \(([^)]*)\)\)/)![1]
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
    expect(allowed).toEqual(["draft", "scheduled", "completed", "archived"])
    // "Initial status: Draft" for all four — the retro has not been held yet.
    expect(new Set(plan.retros.map((r) => r.status))).toEqual(new Set(["draft"]))
    for (const r of plan.retros) expect(allowed).toContain(r.status)
  })
})

describe("import script", () => {
  const source = readFileSync(path.join(repo, "scripts/import-it-technician-sprints.mjs"), "utf8")

  it("backs up every row it touches before writing, inside one transaction", () => {
    const apply = source.slice(source.indexOf("if (!APPLY)"))
    expect(apply).toMatch(/writeFileSync\(backupFile/)
    expect(apply.indexOf("writeFileSync(backupFile")).toBeLessThan(apply.indexOf("sql.begin(async (tx)"))
    expect(apply).toContain("sql.begin(async (tx)")
    // nothing executes before the backup is re-read and verified
    expect(apply).toMatch(/Backup verification failed/)
  })

  it("refuses to double-import sprints and retros", () => {
    expect(source).toMatch(/name = ANY/i)
    expect(source).toMatch(/title = ANY/i)
    expect(source).toMatch(/already exist/i)
  })

  it("assigns tasks by title, scoped to the document's owner", () => {
    // restore() also updates tasks, so read the allocation out of the apply path only.
    const apply = source.slice(source.indexOf("async function main"))
    const update = apply.match(/UPDATE tasks SET sprint_id[\s\S]{0,400}?`\s*$/m)![0]
    expect(update).toMatch(/title = ANY/i)
    expect(update).toContain("assignee_id")
    // the route's own unlink stamps updatedAt (app/api/sprints/[id]/route.ts:374), so linking does too
    expect(update).toMatch(/updated_at = /)
  })

  it("closes legacy sprints only from rows read at runtime that hold no tasks", () => {
    // Never a hardcoded id: the candidate set is selected, printed in the dry run, then
    // updated by the ids it returned, and only while the sprint still has zero tasks.
    expect(source).not.toMatch(/WHERE id = 1\b/)
    expect(source).not.toMatch(/id IN \(1, 3\)/)
    expect(source).toMatch(/NOT EXISTS \(SELECT 1 FROM tasks/i)
    expect(source).toMatch(/UPDATE sprints SET status/i)
    // their updated_at stays untouched — the page derives "ended on time" from it
    expect(source).not.toMatch(/UPDATE sprints SET status[^`]*updated_at/)
  })

  it("deletes nothing outside the restore path", () => {
    const apply = source.slice(source.indexOf("async function restore"))
    const main = source.slice(source.indexOf("async function main"))
    expect(apply).toMatch(/DELETE FROM retros/i)
    expect(apply).toMatch(/DELETE FROM sprints/i)
    expect(main).not.toMatch(/DELETE FROM/i)
    expect(main).not.toMatch(/TRUNCATE/i)
  })

  it("binds values instead of building SQL strings, and imports for the document's owner", () => {
    expect(source).not.toContain("sql.unsafe")
    expect(source).not.toContain("tx.unsafe")
    expect(source).toContain("fakiiahmad001@gmail.com")
  })
})
