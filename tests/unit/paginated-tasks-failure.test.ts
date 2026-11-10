// `getPaginatedTasks` is the board's only source of rows, and until now its `catch` turned any
// query failure into `{tasks: [], total: 0}` with an HTTP 200 on top. The first deploy of the Done
// window proved what that costs: a `Date` bound where postgres.js wanted a string threw on the
// COUNT wrapper, the catch swallowed it, and the screen showed a member with no tasks in every
// column rather than an error. Nothing on screen was wrong, so nothing was reported.
//
// So this file is not about the window. It is about the one property the fix needed to keep: a read
// that cannot answer says so. `@/lib/db` is mocked here because the failure under test happens at
// the driver, before a database is involved — and a live database cannot be made to fail on demand.

import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  failWith: null as unknown,
  rows: [] as unknown[],
  counts: [] as number[],
}))

// lib/data-access.ts imports the schema as `../drizzle/schema`, which Vitest resolves to the stale
// drizzle/schema.js subset — where `tasks` has no columns and every query would die on a TypeError
// before reaching the driver. The vitest alias only pins the `@/` form, so the relative specifier is
// redirected at the real module here rather than widening the config for every test file.
vi.mock("../../drizzle/schema", async () => import("@/drizzle/schema"))

vi.mock("@/lib/db", () => ({
  // The real builder is thenable at several points in the chain, so each method hands back the same
  // object and only `then` decides. The read runs two COUNT(*) queries — the page's total, then the
  // window's "done earlier" — and the fake answers them in that order from `state.counts`.
  db: {
    select(selection?: Record<string, unknown>) {
      const isCount = Boolean(selection && "count" in selection)
      const builder: Record<string, unknown> = {}
      for (const method of ["from", "where", "orderBy", "limit", "offset", "as"]) {
        builder[method] = () => builder
      }
      builder.then = (
        resolve: (value: unknown) => void,
        reject: (reason: unknown) => void,
      ) => {
        if (state.failWith) return reject(state.failWith)
        if (!isCount) return resolve(state.rows)
        const [next, ...rest] = state.counts
        state.counts = rest
        return resolve([{ count: next ?? 0 }])
      }
      return builder
    },
  },
}))

import { getPaginatedTasks } from "@/lib/data-access"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/** The GET handler of a tasks route, without its comments — the half the board actually calls. */
function getHandler(relative: string): string {
  const source = readFileSync(resolve(process.cwd(), relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
  const start = source.indexOf("export async function GET")
  const end = source.indexOf("export async function POST")
  return source.slice(start, end === -1 ? undefined : end)
}

const FROM = new Date("2026-11-02T00:00:00.000Z")
const TO = new Date("2026-11-09T00:00:00.000Z")

describe("a tasks read that cannot answer says so", () => {
  beforeEach(() => {
    state.failWith = null
    state.rows = []
    state.counts = []
  })

  it("lets a driver failure reach the caller instead of an empty page", async () => {
    // The exact failure shape from production: postgres.js rejecting a `Date` param before the
    // statement is ever sent.
    state.failWith = new TypeError('The "string" argument must be of type string or an instance of Buffer or ArrayBuffer.')
    await expect(
      getPaginatedTasks(1, 200, { memberUserId: 1, doneWindow: { from: FROM, to: TO } }),
    ).rejects.toBeInstanceOf(TypeError)
  })

  it("does not answer a windowed read with zero when the query threw", async () => {
    // The assertion the old catch satisfied and no caller could tell apart from an empty board: a
    // resolved page has to mean the database actually said so.
    state.failWith = new Error("Failed query")
    await expect(
      getPaginatedTasks(1, 200, { doneWindow: { from: null, to: TO } }),
    ).rejects.toThrow("Failed query")
  })

  it("still reports the window's own numbers when the read succeeds", async () => {
    // Guards the fix from becoming "always throw": the shape the board renders is unchanged.
    state.rows = [{ id: 1 }, { id: 2 }]
    state.counts = [2, 15]
    const result = await getPaginatedTasks(1, 200, { doneWindow: { from: FROM, to: TO } })
    expect(result.tasks).toHaveLength(2)
    expect(result.pagination).toEqual({ total: 2, page: 1, pageSize: 200, pageCount: 1 })
    expect(result.doneEarlier).toBe(15)
  })
})

// The throw only surfaces if the route carries it. Both handlers already answer 500, so these are
// source guards rather than calls — they exist to stop a future "be helpful and return an empty
// list" edit from putting the silence back into the one read the board depends on.
describe("the tasks routes carry the failure out", () => {
  for (const relative of ["app/api/tasks/route.ts", "app/api/test/tasks/route.ts"]) {
    it(`${relative} answers a failed read as a server error`, () => {
      const handler = getHandler(relative)
      expect(handler).toMatch(/getPaginatedTasks\(/)
      expect(handler).toMatch(/success: false/)
      expect(handler).toMatch(/status: 500/)
      // The old shape of the bug: a successful envelope whose rows were an invented empty list.
      expect(handler).not.toMatch(/tasks:\s*\[\]/)
      expect(handler).not.toMatch(/data:\s*\[\]/)
    })
  }
})
