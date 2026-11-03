import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  currentQuarter,
  GOAL_STATUSES,
  METRIC_TYPES,
  computeProgress,
  type GoalStatus,
  type MetricType,
} from "@/app/api/goals/shared"

// The 12-goal IT Technician list arrived as a document (2026-11-03) and lives as data:
// scripts/data/it-technician-goals.json. These guards fail if the transcription drops a
// goal, invents a status/metric the goals CHECK constraints reject, or silently changes a
// target — the numbers the owner will be measured against.

const repo = path.resolve(__dirname, "..", "..")
const goals = JSON.parse(readFileSync(path.join(repo, "scripts/data/it-technician-goals.json"), "utf8")) as Array<{
  seq: number
  title: string
  description: string
  status: string
  quarter: string
  metricType: string
  baseline: number | null
  target: number
  current: number
  startDate: string
  dueDate: string
}>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

describe("it-technician goals data", () => {
  it("carries all 12 goals in document order", () => {
    expect(goals).toHaveLength(12)
    expect(goals.map((g) => g.seq)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1))
    const titles = goals.map((g) => g.title)
    expect(new Set(titles).size).toBe(12)
    for (const g of goals) {
      expect(g.title.trim().length).toBeGreaterThan(0)
      expect(g.title.length).toBeLessThanOrEqual(255)
      expect(g.description.trim().length).toBeGreaterThan(20)
    }
  })

  it("uses only the status and metric vocabulary the goals table CHECK allows", () => {
    // scripts/create-goals-table.mjs bakes these two CHECK lists into the table; a value
    // outside them fails the insert at the database, not at a friendly validation message.
    for (const g of goals) {
      expect(GOAL_STATUSES).toContain(g.status as GoalStatus)
      expect(METRIC_TYPES).toContain(g.metricType as MetricType)
    }
    // The document states one status for the whole list.
    expect(new Set(goals.map((g) => g.status))).toEqual(new Set(["not_started"]))
  })

  it("matches the document's metric split: ten percent goals and two count goals", () => {
    const byMetric = goals.reduce<Record<string, number>>((acc, g) => {
      acc[g.metricType] = (acc[g.metricType] ?? 0) + 1
      return acc
    }, {})
    expect(byMetric).toEqual({ percent: 10, number: 2 })
    for (const g of goals.filter((x) => x.metricType === "percent")) expect(g.target).toBe(100)
    // Goal 3 is "at least one documented restoration test", goal 9 is the two monthly reports.
    const numbers = goals.filter((x) => x.metricType === "number")
    expect(numbers.map((g) => g.seq)).toEqual([3, 9])
    expect(numbers.map((g) => g.target)).toEqual([1, 2])
  })

  it("keeps 'to be established' as NULL baseline and 0 current, never an invented number", () => {
    // Writing baseline 0 for a percent goal would fabricate a starting position the
    // document explicitly says does not exist yet.
    for (const g of goals.filter((x) => x.metricType === "percent")) {
      expect(g.baseline).toBeNull()
      expect(g.current).toBe(0)
    }
    // The two count goals state their baseline and current outright: 0.
    for (const g of goals.filter((x) => x.metricType === "number")) {
      expect(g.baseline).toBe(0)
      expect(g.current).toBe(0)
    }
  })

  it("starts every goal at 0% progress", () => {
    for (const g of goals) {
      expect(computeProgress({ ...g, metricType: g.metricType as MetricType })).toMatchObject({ progressPct: 0 })
    }
  })

  it("normalizes the quarter to the app's own label so it lands in the current-quarter view", () => {
    // The page's default filter and create form use currentQuarter() ("2026-Q4"); the
    // document's "Q4 2026" would sort into a separate bucket and hide from both.
    for (const g of goals) expect(g.quarter).toBe("2026-Q4")
    expect(currentQuarter(new Date("2026-11-03T00:00:00Z"))).toBe("2026-Q4")
  })

  it("uses the document's Q4 window on every goal", () => {
    for (const g of goals) {
      expect(g.startDate).toBe("2026-11-03")
      expect(g.dueDate).toBe("2026-12-31")
      expect(g.startDate).toMatch(ISO_DATE)
      expect(g.dueDate).toMatch(ISO_DATE)
      // /api/goals rejects a due date before the start date.
      expect(g.dueDate >= g.startDate).toBe(true)
    }
  })

  it("keeps goal 8's prose target as measurement wording, since target is numeric", () => {
    const goal8 = goals.find((g) => g.seq === 8)!
    expect(goal8.metricType).toBe("percent")
    expect(goal8.target).toBe(100)
    expect(goal8.description).toMatch(/100% of scheduled network monitoring checks completed/)
  })

  it("keeps every goal top-level", () => {
    // "Parent goal: None" for all 12 — the script inserts parent_id NULL.
    expect(goals.every((g) => !("parentId" in g) || g.parentId == null)).toBe(true)
  })
})

describe("import script", () => {
  const source = readFileSync(path.join(repo, "scripts/import-it-technician-goals.mjs"), "utf8")

  it("never deletes or rewrites existing goals", () => {
    expect(source).not.toMatch(/DELETE FROM goals/i)
    expect(source).not.toMatch(/UPDATE goals/i)
    expect(source).not.toMatch(/TRUNCATE/i)
  })

  it("refuses to double-import", () => {
    expect(source).toMatch(/title = ANY/i)
    expect(source).toMatch(/already exist/i)
  })

  it("inserts the 12 goals inside one transaction", () => {
    expect(source).toContain("sql.begin(async (tx)")
    expect(source).toMatch(/INSERT INTO goals/i)
    // The columns the goals DDL declares, in the order the insert uses.
    const cols = source.match(/INSERT INTO goals \(([^)]*)\)/i)![1]
      .split(",")
      .map((c) => c.trim())
    expect(cols).toEqual([
      "title",
      "description",
      "owner_id",
      "quarter",
      "status",
      "start_date",
      "due_date",
      "metric_type",
      "baseline",
      "target",
      "current",
      "parent_id",
      "created_by",
    ])
  })

  it("binds values instead of building SQL strings, and imports for the document's owner", () => {
    // The descriptions are prose the page renders later; sql.unsafe would give the
    // transcription a second chance to break, so the script may only use tagged templates.
    expect(source).not.toContain("sql.unsafe")
    expect(source).not.toContain("tx.unsafe")
    expect(source).toContain("fakiiahmad001@gmail.com")
  })
})
