import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { INSTANCE_COUNTS } from "@/lib/tasks/recurrence"

// The import list lives as data, not code: scripts/data/it-technician-tasks.json is
// transcribed from the owner's IT Technician Task Import List (2026-11-03). These
// guards fail if the transcription drops a task, invents a vocabulary value, or the
// quarterly→one-off ruling (app cadence vocabulary has no quarterly) is broken.

const repo = path.resolve(__dirname, "..", "..")
const raw = readFileSync(path.join(repo, "scripts/data/it-technician-tasks.json"), "utf8")
const tasks = JSON.parse(raw) as Array<{
  seq: number
  section: number
  title: string
  description: string
  priority: string
  storyPoints: number
  tags: string[]
  cadence: string
}>

const PRIORITIES = new Set(["urgent", "high", "medium", "low"])
// lib/task-updates.ts: "cadence must be one of: one-off, daily, weekly, monthly, yearly"
const CADENCES = new Set(["one-off", "daily", "weekly", "monthly", "yearly"])

describe("it-technician import data", () => {
  it("carries all 41 tasks, sequenced 1..41 across the document's 7 sections", () => {
    expect(tasks).toHaveLength(41)
    expect(tasks.map((t) => t.seq)).toEqual(Array.from({ length: 41 }, (_, i) => i + 1))
    expect(new Set(tasks.map((t) => t.section))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]))
  })

  it("uses only vocabulary the task system validates", () => {
    for (const t of tasks) {
      expect(PRIORITIES.has(t.priority), `${t.seq}:${t.priority}`).toBe(true)
      expect(CADENCES.has(t.cadence), `${t.seq}:${t.cadence}`).toBe(true)
    }
  })

  it("matches the document's cadence counts", () => {
    const count = (cadence: string) => tasks.filter((t) => t.cadence === cadence).length
    expect(count("daily")).toBe(7)
    expect(count("weekly")).toBe(10)
    expect(count("monthly")).toBe(7)
    expect(count("one-off")).toBe(17)
  })

  it("keeps quarterly reviews as one-off with the quarterly wording in the description", () => {
    for (const seq of [33, 34, 35, 36]) {
      const t = tasks.find((x) => x.seq === seq)!
      expect(t.cadence).toBe("one-off")
      expect(t.description).toMatch(/quarterly/i)
    }
  })

  it("has exactly one urgent task — the critical-incident escalation", () => {
    const urgent = tasks.filter((t) => t.priority === "urgent")
    expect(urgent.map((t) => t.seq)).toEqual([30])
  })

  it("carries non-empty titles, real descriptions, tags and sane story points", () => {
    for (const t of tasks) {
      expect(t.title.trim().length).toBeGreaterThan(4)
      expect(t.description.trim().length).toBeGreaterThan(20)
      expect(Array.isArray(t.tags)).toBe(true)
      expect(t.tags.length).toBeGreaterThan(0)
      expect(t.tags.every((tag) => typeof tag === "string" && tag.trim().length > 0)).toBe(true)
      expect(Number.isInteger(t.storyPoints)).toBe(true)
      expect(t.storyPoints).toBeGreaterThanOrEqual(1)
      expect(t.storyPoints).toBeLessThanOrEqual(5)
    }
    const titles = tasks.map((t) => t.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})

describe("import script", () => {
  const source = readFileSync(path.join(repo, "scripts/import-it-technician-tasks.mjs"), "utf8")

  it("refuses --apply without a fresh backup of the rows it replaces", () => {
    expect(source).toContain("backup")
    // The apply path must not be reachable when the backup write failed.
    expect(source).toMatch(/backup[\s\S]*(abort|process\.exit)|abort[\s\S]*backup/i)
  })

  it("backs up before deleting, and deletes inside one transaction with the inserts", () => {
    // Scoped to the apply branch: the --restore branch opens its own transaction earlier
    // in the file, and whole-file offsets would compare against that one.
    const apply = source.slice(source.indexOf("if (!APPLY)"))
    const backupAt = apply.indexOf("writeFileSync(backupFile")
    const verifyAt = apply.indexOf("written.tasks.length !== current.tasks.length")
    const txAt = apply.indexOf("sql.begin(async (tx)")
    const deleteAt = apply.indexOf("DELETE FROM tasks")
    const insertAt = apply.indexOf("INSERT INTO tasks")
    expect([backupAt, verifyAt, txAt, deleteAt, insertAt]).not.toContain(-1)
    // The backup is written and re-read for verification before the transaction opens.
    expect(backupAt).toBeLessThan(txAt)
    expect(verifyAt).toBeLessThan(txAt)
    // Delete and inserts share one transaction, so a failed import cannot leave an
    // empty task list behind.
    expect(txAt).toBeLessThan(deleteAt)
    expect(txAt).toBeLessThan(insertAt)
  })

  it("materializes instances with the app's own horizon counts", () => {
    // lib/tasks/recurrence.ts INSTANCE_COUNTS is the app's horizon; the script mirrors it
    // because an .mjs script cannot import the .ts module. Drift here means the imported
    // tasks show a different instance horizon than tasks created through the app.
    expect(source).toContain("computeInstanceDates")
    const literal = source.match(/const INSTANCE_COUNTS = \{[^}]*\}/)?.[0]
    expect(literal).toBeTruthy()
    for (const [cadence, count] of Object.entries(INSTANCE_COUNTS)) {
      expect(literal).toMatch(new RegExp(`['"]?${cadence}['"]?:\\s*${count}\\b`))
    }
  })

  it("maps the list onto the Backlog contract: sprint_id NULL, status todo, assignee id 1 lookup by email", () => {
    expect(source).toContain("fakiiahmad001@gmail.com")
    expect(source).toMatch(/const SPRINT_ID = null/)
    expect(source).toMatch(/const STATUS = "todo"/)
  })
})
