// A read that cannot answer must say so. `getPaginatedTasks` learned this the expensive way (see
// tests/unit/paginated-tasks-failure.test.ts): its catch turned a driver error into an empty page
// with HTTP 200 on top, so a board with no rows looked exactly like a member with nothing assigned.
// The sweep that followed found the same catch in every other reader in lib/data-access.ts. Thirteen
// of those readers had no caller at all and were deleted with the legacy kanban cluster; the two that
// pages do call are what remains here, alongside getPaginatedTasks in its own file.
//
// This file holds those readers to the same property. `@/lib/db` is mocked because the failure under
// test happens at the driver, before a database is involved — and a live database cannot be made to
// fail on demand. Each reader gets two cases: the failure must reach the caller, and a *successful*
// read that genuinely matched nothing must still resolve empty. Without the second, the fix could
// decay into "always throw" and every empty state in the product would become an error screen.

import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  failWith: null as unknown,
  rows: [] as unknown[],
}))

// lib/data-access.ts imports the schema as `../drizzle/schema`, which Vitest resolves to the stale
// drizzle/schema.js subset. The alias only pins the `@/` form, so the relative specifier is
// redirected at the real module here rather than widening the config for every test file.
vi.mock("../../drizzle/schema", async () => import("@/drizzle/schema"))

vi.mock("@/lib/db", () => ({
  db: {
    select() {
      const builder: Record<string, unknown> = {}
      for (const method of ["from", "where", "orderBy", "limit", "offset", "as", "innerJoin"]) {
        builder[method] = () => builder
      }
      builder.then = (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => {
        if (state.failWith) return reject(state.failWith)
        return resolve(state.rows)
      }
      return builder
    },
  },
}))

import {
  getTasksBySprintId,
  getTaskById,
  getUserProfile,
} from "@/lib/data-access"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// The shape the owner actually sees when the Neon compute is waking: postgres.js reports a failed
// query wrapping a socket timeout. It is an outage, not an absence.
const DRIVER_FAILURE = new Error("Failed query: read ETIMEDOUT")

/** `absent` is what a successful read that matched nothing resolves to — a real answer. */
const READERS = [
  { name: "getTasksBySprintId", call: () => getTasksBySprintId(7), absent: [] },
  { name: "getTaskById", call: () => getTaskById(7), absent: null },
] as const

describe("a data-access read that cannot answer says so", () => {
  beforeEach(() => {
    state.failWith = null
    state.rows = []
  })

  it.each(READERS)("$name lets a driver failure reach the caller", async ({ call }) => {
    state.failWith = DRIVER_FAILURE
    await expect(call()).rejects.toThrow("read ETIMEDOUT")
  })

  it.each(READERS)("$name still answers a read that genuinely matched nothing", async ({ call, absent }) => {
    state.rows = []
    await expect(call()).resolves.toEqual(absent)
  })

  // The positive control. This reader already rethrows, so it passes before the fix and after it —
  // proof the harness can tell the two behaviours apart rather than failing everything for a
  // shared reason (a bad mock, a broken import).
  it("getUserProfile, which already rethrows, is unaffected", async () => {
    state.failWith = DRIVER_FAILURE
    await expect(getUserProfile(1)).rejects.toThrow("read ETIMEDOUT")
  })

  it("still returns the row when the read succeeds", async () => {
    state.rows = [{ id: 7, title: "Replace the UPS battery" }]
    await expect(getTaskById(7)).resolves.toEqual({ id: 7, title: "Replace the UPS battery" })
  })
})

// The behavioural cases above prove the readers throw. This one proves the silence cannot be put
// back by a later "be helpful and return an empty list" edit — the same regression the paginated
// read already suffered once.
describe("no data-access reader resolves an empty answer from its catch", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/data-access.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

  /** The slice from one export to the next, so a catch is read in its own function's context. */
  function readerSlice(name: string): string {
    const start = source.indexOf(`export async function ${name}(`)
    expect(start, `${name} is exported from lib/data-access.ts`).toBeGreaterThan(-1)
    const next = source.indexOf("export async function ", start + 1)
    return source.slice(start, next === -1 ? undefined : next)
  }

  function catchBody(name: string): string {
    const slice = readerSlice(name)
    const at = slice.indexOf("} catch (error) {")
    expect(at, `${name} logs and rethrows in a catch`).toBeGreaterThan(-1)
    return slice.slice(at + "} catch (error) {".length)
  }

  it.each(READERS)("$name rethrows rather than inventing an absence", ({ name }) => {
    const body = catchBody(name)
    expect(body).toMatch(/throw error/)
    expect(body).not.toMatch(/return (\[\]|null)/)
  })
})