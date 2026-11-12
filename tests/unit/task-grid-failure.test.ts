// The grid half of the silent-reader sweep. Two different properties are in play here and they must
// not be confused:
//
//   A read that cannot answer says so — getTaskInstances, getTaskInstanceById, generateNextInstance
//   and generateInitialInstances stop resolving an invented empty answer.
//
//   A save that already committed is never reported as failed — the instance PATCH marks an
//   occurrence done and *then* asks what is next. If that second question throws, the member's done
//   still happened. So the tolerance lives at the call site, where the fact "the save landed" is
//   known, and not in the reader, where every future caller would inherit the lie.
//
// ensureInstanceHorizon keeps its own documented tolerance: it is a best-effort top-up, and a board
// that cannot grow a grid still shows the rows already there.

import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  error: new Error("Failed query: read ETIMEDOUT"),
  /** Reject from this query number onward (1-based). Null means never fail. */
  failFrom: null as number | null,
  queries: 0,
  /** Result sets consumed in order, so a multi-query function can be given a realistic sequence. */
  selects: [] as unknown[][],
  rows: [] as unknown[],
  updated: [] as unknown[],
  inserted: [] as unknown[],
}))

const session = vi.hoisted(() => ({
  id: 1,
  name: "Amina",
  role: "admin",
  timezone: "Africa/Nairobi",
}))

vi.mock("@/lib/db", () => {
  const settled = (value: unknown) => {
    state.queries += 1
    if (state.failFrom !== null && state.queries >= state.failFrom) return Promise.reject(state.error)
    return Promise.resolve(value)
  }
  const chain = (result: () => unknown) => {
    const builder: Record<string, unknown> = {}
    for (const method of ["from", "where", "orderBy", "limit", "offset", "as", "innerJoin", "set", "values", "onConflictDoNothing", "returning"]) {
      builder[method] = () => builder
    }
    builder.then = (resolve: (v: unknown) => void, reject: (r: unknown) => void) =>
      settled(result()).then(resolve, reject)
    return builder
  }
  return {
    db: {
      select: () => chain(() => state.selects.shift() ?? state.rows),
      update: () => chain(() => state.updated),
      insert: () => chain(() => state.inserted),
    },
  }
})

vi.mock("@/lib/auth-actions", () => ({ getSession: async () => session }))

// The task row's commit, stubbed: what matters below is that it already happened before the grid
// insert is attempted. The capture and notification writers have their own tolerances, tested
// elsewhere, and are stubbed so they cannot add queries to the count.
vi.mock("@/lib/data-access", () => ({
  createTask: async (data: Record<string, unknown>) => ({ id: 5, ...data }),
  getPaginatedTasks: async () => ({ tasks: [], pagination: {}, doneEarlier: 0 }),
}))
vi.mock("@/lib/worklog/capture", () => ({ captureTaskBirths: async () => 0 }))
vi.mock("@/lib/notifications", () => ({ createNotification: async () => null }))

import {
  getTaskInstances,
  getTaskInstanceById,
  generateNextInstance,
  generateInitialInstances,
  ensureInstanceHorizon,
} from "@/lib/data-access-task-instances"
import { occurrencesForDay } from "@/lib/tasks/day-occurrence"
import { PATCH } from "@/app/api/task-instances/[id]/route"
import { POST } from "@/app/api/tasks/route"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function codeOnly(relative: string): string {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
}

const TODAY = "2026-11-12"

describe("a grid read that cannot answer says so", () => {
  beforeEach(() => {
    state.failFrom = null
    state.queries = 0
    state.selects = []
    state.rows = []
    state.updated = []
    state.inserted = []
  })

  it("getTaskInstances lets a driver failure reach the caller", async () => {
    state.failFrom = 1
    await expect(getTaskInstances({ taskId: 5 })).rejects.toThrow("read ETIMEDOUT")
  })

  it("getTaskInstances still answers a grid that is genuinely empty", async () => {
    state.rows = []
    await expect(getTaskInstances({ taskId: 5 })).resolves.toEqual([])
  })

  it("getTaskInstanceById lets a driver failure reach the caller", async () => {
    state.failFrom = 1
    await expect(getTaskInstanceById(9)).rejects.toThrow("read ETIMEDOUT")
  })

  it("getTaskInstanceById still answers null when no row matched", async () => {
    state.rows = []
    await expect(getTaskInstanceById(9)).resolves.toBeNull()
  })

  it("generateNextInstance lets a driver failure reach the caller", async () => {
    state.failFrom = 1
    await expect(generateNextInstance(5, TODAY)).rejects.toThrow("read ETIMEDOUT")
  })

  it("generateNextInstance still answers null for a one-off task", async () => {
    state.selects = [[{ id: 5, cadence: "one-off", assigneeId: 1 }]]
    await expect(generateNextInstance(5, TODAY)).resolves.toBeNull()
  })

  it("generateNextInstance still returns the earliest open occurrence", async () => {
    state.selects = [
      [{ id: 5, cadence: "daily", assigneeId: 1 }],
      // Coverage already reaches the horizon, so the top-up writes nothing and asks no more.
      [{ held: 7 }],
      [{ id: 9, taskId: 5, instanceDate: TODAY, status: "todo" }],
    ]
    const next = await generateNextInstance(5, TODAY)
    expect(next?.id).toBe(9)
    expect(next?.status).toBe("todo")
  })

  it("generateInitialInstances lets a failed insert reach the caller", async () => {
    state.failFrom = 1
    await expect(generateInitialInstances(5, "daily", TODAY, null)).rejects.toThrow("read ETIMEDOUT")
  })

  it("generateInitialInstances still reports the grid it wrote", async () => {
    state.inserted = []
    const count = await generateInitialInstances(5, "daily", TODAY, null)
    expect(count).toBeGreaterThan(0)
  })

  it("generateInitialInstances still writes nothing for a one-off", async () => {
    await expect(generateInitialInstances(5, "one-off", TODAY, null)).resolves.toBe(0)
    expect(state.queries).toBe(0)
  })

  // The documented exception. A top-up is a write inside a read: losing it costs one day's card,
  // and the rows already found are still a true answer.
  it("ensureInstanceHorizon keeps its best-effort tolerance", async () => {
    state.failFrom = 1
    await expect(ensureInstanceHorizon(5, "daily", TODAY)).resolves.toEqual([])
  })
})

describe("the board's occurrence read is not allowed to invent an empty day", () => {
  beforeEach(() => {
    state.failFrom = null
    state.queries = 0
    state.selects = []
    state.rows = []
  })

  const schedules = [
    { id: 5, cadence: "daily", assigneeId: 1 },
    { id: 6, cadence: "daily", assigneeId: 1 },
  ]

  it("lets a failed occurrence read reach the caller", async () => {
    state.failFrom = 1
    // An empty Map here draws every schedule card with no day state: a daily finished this
    // morning reappears as To do, and nothing on screen says the read never ran.
    await expect(occurrencesForDay(schedules, TODAY, [1], TODAY)).rejects.toThrow("read ETIMEDOUT")
  })

  it("still returns the occurrences it found when the top-up fails", async () => {
    state.selects = [[{ taskId: 5, id: 9, status: "done" }]]
    state.failFrom = 2
    const found = await occurrencesForDay(schedules, TODAY, [1], TODAY)
    expect(found.get(5)).toEqual({ id: 9, status: "done" })
    expect(found.has(6)).toBe(false)
  })

  it("still answers a day with no schedules", async () => {
    state.failFrom = 1
    await expect(occurrencesForDay([{ id: 5, cadence: "one-off", assigneeId: 1 }], TODAY, [1], TODAY))
      .resolves.toEqual(new Map())
    expect(state.queries).toBe(0)
  })
})

// The property that makes the rethrow safe: the member's done already committed before the
// next-occurrence question was asked, so a failed question must not turn their save into a 500.
describe("a committed instance save survives a failed next-occurrence read", () => {
  beforeEach(() => {
    state.failFrom = null
    state.queries = 0
    state.selects = []
    state.rows = []
    state.updated = []
  })

  it("PATCH still answers 200 with the saved row and no next occurrence", async () => {
    state.selects = [
      // getTaskInstanceById
      [{ id: 9, taskId: 5, status: "todo", instanceDate: TODAY, notes: null, checklistResponses: null }],
      // the ownership read
      [{ assigneeId: 1 }],
    ]
    state.updated = [{ id: 9, taskId: 5, status: "done", instanceDate: TODAY }]
    // Four queries reach this point: the instance read, the ownership read, the update that
    // commits the member's done, and then generateNextInstance's template read. Only the last fails.
    state.failFrom = 4

    const response = await PATCH(
      new Request("http://localhost/api/task-instances/9", {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "9" }) },
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe("done")
    expect(body.nextInstance).toBeNull()
  })
})

// The same property on the create path. The task row commits before its grid is written, so a
// failed insert answers "a schedule with no occurrences yet" — not "your task was not created",
// which is what makes a member create it a second time.
describe("a committed task creation survives a failed grid insert", () => {
  beforeEach(() => {
    state.failFrom = null
    state.queries = 0
    state.selects = []
    state.rows = []
    state.inserted = []
  })

  const create = () =>
    POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Check the backups", cadence: "daily" }),
        headers: { "content-type": "application/json" },
      }),
    )

  it("POST still answers 200 with the created task and no occurrences", async () => {
    // Query 1 is the discipline default read, query 2 is the grid insert. Only the insert fails.
    state.failFrom = 2
    const response = await create()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(5)
    expect(body.instanceCount).toBe(0)
  })

  it("POST still reports the grid it wrote when the insert succeeds", async () => {
    const response = await create()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.instanceCount).toBeGreaterThan(0)
  })
})

describe("the tolerances are written down where they are decided", () => {
  it("no grid reader resolves an empty answer from its catch except the documented top-up", () => {
    const source = codeOnly("lib/data-access-task-instances.ts")
    const catches = [...source.matchAll(/\} catch \(error\) \{([\s\S]*?)\n  \}/g)]
    expect(catches.length).toBeGreaterThan(0)
    for (const [, body] of catches) {
      if (/Error topping up instance horizon/.test(body)) {
        expect(body).toMatch(/return \[\]/)
        continue
      }
      expect(body).toMatch(/throw error/)
      expect(body).not.toMatch(/return (\[\]|null|0)/)
    }
  })

  it("the event capture keeps its documented never-fail-the-save tolerance", () => {
    const source = codeOnly("lib/worklog/capture.ts")
    expect(source).toMatch(/\} catch \(error\) \{[\s\S]*?return 0/)
  })
})