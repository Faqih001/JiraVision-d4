// Deleting a sprint is not one statement. Every column in the schema that points at
// sprints.id carries ON DELETE NO ACTION — the Drizzle default when .references() is written
// without .onDelete() — so PostgreSQL (SQLSTATE 23503) refuses the parent delete while a single
// child row is left behind. On production, sprint 1 — "Sprint 12 — Realtime Foundations" — could
// not be deleted because it still owned a sprint_analytics row; the route swallowed the
// violation and answered with the generic "Failed to delete sprint".
//
// The list of dependents is derived from the schema rather than restated here, so a new foreign
// key to sprints fails this test until the delete handler is taught about it. Guards assert on
// code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const ROUTE = "app/api/sprints/[id]/route.ts"
const SCHEMA = "drizzle/schema.ts"

type Dependent = { table: string; column: string; notNull: boolean }

/** Every `export const X = pgTable(...)` column whose FK targets sprints.id. */
function sprintDependents(): Dependent[] {
  const schema = codeOnly(src(SCHEMA))
  const found: Dependent[] = []
  // Capture up to the column's closing comma: a .notNull() chained on the next line is part of
  // the same column definition and decides whether the child can be orphaned at all.
  const fk = /\.references\(\(\) => sprints\.id\)([^,]*)/g
  let match: RegExpExecArray | null
  while ((match = fk.exec(schema)) !== null) {
    const before = schema.slice(0, match.index)
    const tables = [...before.matchAll(/export const (\w+) = pgTable\(/g)]
    const columns = [...before.matchAll(/(?:^|[,{\s])(\w+):\s*\w+\("/gm)]
    const lastColumn = columns[columns.length - 1]
    found.push({
      table: tables[tables.length - 1]?.[1] ?? "?",
      column: lastColumn?.[1] ?? "?",
      notNull: match[1].includes(".notNull("),
    })
  }
  return found
}

function deleteHandler(): string {
  const route = codeOnly(src(ROUTE))
  const start = route.indexOf("export async function DELETE")
  if (start < 0) throw new Error(`${ROUTE} has no DELETE handler`)
  return route.slice(start)
}

describe("sprint delete dependents", () => {
  const dependents = sprintDependents()

  it("really reads the schema (a parser that found nothing would pass every later guard)", () => {
    expect(dependents.length).toBeGreaterThanOrEqual(3)
    expect(dependents.map((d) => d.table)).toContain("sprintAnalytics")
    expect(dependents.map((d) => d.table)).toContain("tasks")
    expect(dependents.every((d) => d.table !== "?" && d.column !== "?")).toBe(true)
  })

  it("removes or unlinks every table that holds a foreign key to sprints", () => {
    const body = deleteHandler()
    for (const d of dependents) {
      // A NOT NULL child cannot be orphaned — the row describes the sprint and dies with it.
      // A nullable one is pushed back to the backlog, which is what tasks already did.
      const subject = "\\b(?:db|tx)\\s*\\.\\s*"
      const resolver = d.notNull
        ? new RegExp(`${subject}delete\\(${d.table}\\)`)
        : new RegExp(`${subject}update\\(${d.table}\\)[\\s\\S]{0,120}${d.column}: null`)
      expect(body, `${d.table}.${d.column} is not resolved before the sprint is deleted`).toMatch(resolver)
    }
  })

  it("runs the whole unlink-and-delete in one transaction", () => {
    // The old handler moved the tasks to the backlog and *then* tripped the foreign key, so a
    // failed delete still displaced every task in the sprint for nothing.
    const body = deleteHandler()
    expect(body).toMatch(/await db\.transaction\(/)
    expect(body).not.toMatch(/\bdb\.(update|delete)\((tasks|kanbanTasks|sprintAnalytics|sprints)\)/)
  })
})
