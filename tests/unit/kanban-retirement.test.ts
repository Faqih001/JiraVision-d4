// The legacy kanban cluster is retired in code while its four tables still exist in production.
// Nothing reads them: the board at /dashboard/kanban runs on /api/tasks, and the four
// /api/dashboard/kanban* routes have no caller. Two of those routes were already rewritten onto
// the real tasks table, so they are duplicate writers rather than broken code — deleting them
// removes a second way to write a task that skips the board's own rules.
//
// Sequencing: drizzle/schema.ts must mirror production at every commit, so the four kanban
// declarations STAY until the DROP actually lands. The last describe block is what keeps a
// well-meaning cleanup from deleting them early, which would hand drizzle-kit push four live
// tables to drop. It flips in the same commit as the DROP.
//
// The 13 lib/data-access.ts readers go in the same wave: batch C made them rethrow, but a reader
// with no caller cannot be reached by any page, so the honest fix is deletion, not maintenance.

import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

function filesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(path.join(repo, dir))) {
    const relative = `${dir}/${entry}`
    if (statSync(path.join(repo, relative)).isDirectory()) out.push(...filesIn(relative))
    else if (/\.(ts|tsx)$/.test(entry)) out.push(relative)
  }
  return out
}

const LEGACY_ROUTES = [
  "app/api/dashboard/kanban/route.ts",
  "app/api/dashboard/kanban/tasks/route.ts",
  "app/api/dashboard/kanban/update-status/route.ts",
  "app/api/dashboard/kanban/reorder/route.ts",
]

const LEGACY_COMPONENTS = [
  "components/kanban/kanban-column.tsx",
  "components/kanban/kanban-task.tsx",
  "components/kanban/kanban-task-form.tsx",
]

const LEGACY_SCRIPTS = [
  "scripts/fix-kanban-tables.js",
  "scripts/fix-kanban-tables-fixed.js",
  "scripts/fix-kanban-tables-new.js",
  "scripts/kanban-tables.sql",
  "scripts/kanban-tables-pg.sql",
]

describe("the legacy kanban surface is gone", () => {
  it.each(LEGACY_ROUTES)("%s is deleted", (file) => {
    expect(existsSync(path.join(repo, file))).toBe(false)
  })

  it.each(LEGACY_COMPONENTS)("%s is deleted", (file) => {
    expect(existsSync(path.join(repo, file))).toBe(false)
  })

  it.each(LEGACY_SCRIPTS)("%s is deleted", (file) => {
    expect(existsSync(path.join(repo, file))).toBe(false)
  })

  it("no eslint ignore rule survives for the deleted component directory", () => {
    expect(src("eslint.config.mjs")).not.toContain("components/kanban")
  })
})

describe("nothing writes the kanban tables any more", () => {
  const live = [...filesIn("app"), ...filesIn("components"), ...filesIn("lib")]

  it("no app, component or lib file names a kanban schema export", () => {
    const offenders = live.filter((file) =>
      /\bkanban(Tasks|Columns|TaskComments|TaskAttachments)\b/.test(codeOnly(src(file))),
    )
    expect(offenders).toEqual([])
  })

  it.each(["lib/db-init.ts", "lib/seed-data.ts"])("%s no longer creates or seeds kanban rows", (file) => {
    expect(codeOnly(src(file))).not.toMatch(/kanban_/)
  })

  it("the board page keeps no orphaned card type", () => {
    expect(codeOnly(src("app/dashboard/kanban/page.tsx"))).not.toMatch(/export type KanbanTask\b/)
  })

  // Positive control: the retirement must not take the working board with it.
  it("the live board still reads /api/tasks", () => {
    expect(codeOnly(src("app/dashboard/kanban/page.tsx"))).toMatch(/\/api\/tasks/)
  })
})

const DEAD_READERS = [
  "getActiveSprint",
  "getSprintById",
  "getSprintHistory",
  "getTasksByAssignee",
  "getTasksByStatus",
  "getTeamWellbeing",
  "getUserWellbeing",
  "getUserGamification",
  "getTeamLeaderboard",
  "getLatestEthicalMetrics",
  "getActiveAIInsights",
  "getSprintAnalytics",
  "getTeamMembers",
]

describe("the 13 uncalled data-access readers are deleted", () => {
  it.each(DEAD_READERS)("%s is no longer exported", (name) => {
    expect(codeOnly(src("lib/data-access.ts"))).not.toContain(`export async function ${name}(`)
  })

  it("no app, component or lib file references a deleted reader", () => {
    const pattern = new RegExp(`\\b(${DEAD_READERS.join("|")})\\b`)
    const offenders = [...filesIn("app"), ...filesIn("components"), ...filesIn("lib")].filter((file) =>
      pattern.test(codeOnly(src(file))),
    )
    expect(offenders).toEqual([])
  })

  // The two readers that do have callers stay, and keep reporting their own failures.
  it.each(["getTasksBySprintId", "getTaskById", "getUserProfile"])(
    "%s survives the cull",
    (name) => {
      expect(codeOnly(src("lib/data-access.ts"))).toContain(`export async function ${name}(`)
    },
  )
})

describe("the kanban declarations wait for the DROP", () => {
  it.each(["kanban_columns", "kanban_tasks", "kanban_task_comments", "kanban_task_attachments"])(
    "%s is still declared while production still holds it",
    (name) => {
      const table = Object.values(schema).find(
        (value) => value instanceof PgTable && getTableConfig(value).name === name,
      )
      expect(table, `${name} exists in prod, so the schema must still describe it`).toBeInstanceOf(
        PgTable,
      )
    },
  )
})