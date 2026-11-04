// A Drizzle `timestamp` column in the default (date) mode maps its value by calling
// `value.toISOString()`, so handing it a string throws inside the statement builder. Two write
// routes did exactly that behind a `Record<string, unknown>` patch bag, which hides the column
// types from tsc: the instance PATCH stamped `completed_at` and the task-report PATCH stamped
// `updated_at`. Both threw, the failure was swallowed into a 500, and the board answered
// "Move failed" to a Done click that never landed.
//
// These tests hold the constraint itself and then sweep every server writer for the class.

import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { eq } from "drizzle-orm"
import { taskInstances, taskReports } from "@/drizzle/schema"

const repo = path.resolve(__dirname, "..", "..")

const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

function tsFilesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry)
    if (statSync(absolute).isDirectory()) out.push(...tsFilesIn(absolute))
    else if (entry.endsWith(".ts")) out.push(absolute)
  }
  return out
}

// `toSQL()` builds the statement without opening a connection, so an unreachable URL is enough.
const db = drizzle(postgres("postgres://nobody@127.0.0.1:1/none", { max: 0 }))

describe("a timestamp column takes a Date, not a string", () => {
  const buildInstance = (completedAt: unknown) =>
    db
      .update(taskInstances)
      .set({ completedAt } as never)
      .where(eq(taskInstances.id, -1))
      .toSQL()

  const buildReport = (updatedAt: unknown) =>
    db
      .update(taskReports)
      .set({ updatedAt } as never)
      .where(eq(taskReports.id, -1))
      .toSQL()

  it("task_instances.completed_at builds from a Date", () => {
    expect(buildInstance(new Date()).sql).toMatch(/"completed_at"/)
  })

  it("task_instances.completed_at throws on an ISO string", () => {
    expect(() => buildInstance(new Date().toISOString())).toThrow()
  })

  it("task_reports.updated_at builds from a Date", () => {
    expect(buildReport(new Date()).sql).toMatch(/"updated_at"/)
  })

  it("task_reports.updated_at throws on an ISO string", () => {
    expect(() => buildReport(new Date().toISOString())).toThrow()
  })
})

describe("the two routes that hit it", () => {
  it("the instance PATCH stamps the finish as a Date", () => {
    const route = codeOnly(readFileSync(path.join(repo, "app/api/task-instances/[id]/route.ts"), "utf8"))
    expect(route).toMatch(/updateData\.completedAt = new Date\(\)\s*$/m)
    // Typed off the writer, so tsc sees the columns instead of `unknown`.
    expect(route).toMatch(/const updateData: Parameters<typeof updateTaskInstance>\[1\] = \{\}/)
  })

  it("the task-report PATCH stamps the edit as a Date", () => {
    const route = codeOnly(readFileSync(path.join(repo, "app/api/task-reports/[id]/route.ts"), "utf8"))
    expect(route).toMatch(/updateData\.updatedAt = new Date\(\)\s*$/m)
    expect(route).toMatch(/const updateData: Partial<typeof taskReports\.\$inferInsert> = \{\}/)
  })
})

describe("no server writer stringifies into a patch bag timestamp", () => {  const offenders = ["app/api", "lib"]
    .flatMap((dir) => tsFilesIn(path.join(repo, dir)))
    .map((file) => ({
      file: path.relative(repo, file),
      code: codeOnly(readFileSync(file, "utf8")),
    }))
    .filter(({ code }) =>
      // A bag field named like a moment, assigned a string. `date` columns are string mode and
      // correctly take `toISOString().slice(0, 10)`, so a slice is not an offence.
      /(?:patch|updateData|updates|setData)\.\w*(?:At|Time)\s*=\s*[^=\n]*\.toISOString\(\)(?!\.slice)/.test(
        code,
      ),
    )
    .map(({ file }) => file)

  it("finds none", () => {
    expect(offenders).toEqual([])
  })
})

describe("a failed write is reported, not swallowed", () => {
  // `updateTaskInstance` used to catch, log and return null, so a throw from the statement
  // builder reached the client as a bare "Failed to update instance" naming nothing.
  it("updateTaskInstance has no catch", () => {
    const source = codeOnly(
      readFileSync(path.join(repo, "lib/data-access-task-instances.ts"), "utf8"),
    )
    const start = source.indexOf("export async function updateTaskInstance(")
    expect(start).toBeGreaterThan(-1)
    const body = source.slice(start, source.indexOf("\nexport ", start + 1))
    expect(body).not.toMatch(/\bcatch\b/)
    expect(body).toMatch(/return results\[0\] \?\? null/)
  })

  it("the instance PATCH reports the underlying message on a 500", () => {
    const route = codeOnly(readFileSync(path.join(repo, "app/api/task-instances/[id]/route.ts"), "utf8"))
    expect(route).toMatch(/error: \(error as Error\)\.message/)
  })
})
