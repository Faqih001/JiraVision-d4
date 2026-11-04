// `task_instances.completed_at` is a Drizzle `timestamp` in the default (date) mode, which maps
// its value by calling `value.toISOString()`. Handing it a string therefore throws inside the
// query builder — the instance PATCH did exactly that, `updateTaskInstance` swallowed the throw
// and returned null, and the board answered "Move failed" to a Done click that never landed.
//
// The route hid this from tsc by typing its patch bag `Record<string, unknown>`, so these guards
// hold both halves: the constraint itself, and the route's refusal to go untyped again.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { eq } from "drizzle-orm"
import { taskInstances } from "@/drizzle/schema"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

// `toSQL()` builds the statement without opening a connection, so an unreachable URL is enough.
const db = drizzle(postgres("postgres://nobody@127.0.0.1:1/none", { max: 0 }))

const buildCompletedAt = (completedAt: unknown) =>
  db
    .update(taskInstances)
    .set({ status: "done", completedBy: 1, completedAt } as never)
    .where(eq(taskInstances.id, -1))
    .toSQL()

describe("a timestamp column takes a Date", () => {
  it("builds from a Date", () => {
    expect(buildCompletedAt(new Date()).sql).toMatch(/"completed_at"/)
  })

  it("throws on an ISO string", () => {
    expect(() => buildCompletedAt(new Date().toISOString())).toThrow()
  })
})

describe("the instance PATCH stamps the finish as a Date", () => {
  const route = codeOnly(src("app/api/task-instances/[id]/route.ts"))

  it("never stringifies the value it writes to completed_at", () => {
    expect(route).not.toMatch(/completedAt\s*=\s*[^=\n]*\.toISOString\(\)/)
  })

  it("sets completedAt to a Date", () => {
    expect(route).toMatch(/updateData\.completedAt = new Date\(\)\s*$/m)
  })

  it("types the patch bag off the writer, so tsc sees the columns", () => {
    expect(route).toMatch(/const updateData: Parameters<typeof updateTaskInstance>\[1\] = \{\}/)
    expect(route).not.toMatch(/const updateData: Record<string, unknown> = \{\}/)
  })
})
