// `getTaskById` returning null on a driver error is the sharpest version of the silent-reader bug:
// the route reads null as "no such row" and answers 404 "Task with ID N not found". A member whose
// Neon compute was waking got told their task had been deleted. The task was fine; the read never
// ran.
//
// These are behavioural tests against the real handlers, not source guards, because the property
// that matters is the status code a member receives. 404 must mean the database answered and the
// row was not there. A read that never answered is a 500, and it must carry the driver's message so
// the failure is diagnosable rather than anonymous.

import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  failWith: null as unknown,
  rows: [] as unknown[],
}))

const session = vi.hoisted(() => ({
  id: 1,
  name: "Amina",
  role: "admin",
  timezone: "Africa/Nairobi",
}))

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

vi.mock("@/lib/auth-actions", () => ({
  getSession: async () => session,
}))

import { GET, PUT, DELETE } from "@/app/api/tasks/[id]/route"
import {
  GET as testGET,
  PUT as testPUT,
  DELETE as testDELETE,
} from "@/app/api/test/tasks/[id]/route"

const DRIVER_FAILURE = new Error("Failed query: read ETIMEDOUT")

const ROUTES = [
  { label: "app/api/tasks/[id]", GET, PUT, DELETE },
  { label: "app/api/test/tasks/[id]", GET: testGET, PUT: testPUT, DELETE: testDELETE },
] as const

const params = Promise.resolve({ id: "7" })

function request(method: string): Request {
  return new Request("http://localhost/api/tasks/7", {
    method,
    ...(method === "PUT"
      ? { body: JSON.stringify({ status: "in_progress" }), headers: { "content-type": "application/json" } }
      : {}),
  })
}

describe("a failed task read is a server error, not a missing task", () => {
  beforeEach(() => {
    state.failWith = null
    state.rows = []
  })

  for (const route of ROUTES) {
    it(`${route.label} GET answers 500 when the read failed`, async () => {
      state.failWith = DRIVER_FAILURE
      const response = await route.GET(request("GET"), { params })
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      // The message that told a member their task had been deleted.
      expect(body.message).not.toMatch(/not found/)
      expect(body.error).toContain("read ETIMEDOUT")
    })

    it(`${route.label} PUT answers 500 when the existence read failed`, async () => {
      state.failWith = DRIVER_FAILURE
      const response = await route.PUT(request("PUT"), { params })
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).not.toMatch(/not found/)
      expect(body.error).toContain("read ETIMEDOUT")
    })

    it(`${route.label} DELETE answers 500 when the existence read failed`, async () => {
      state.failWith = DRIVER_FAILURE
      const response = await route.DELETE(request("DELETE"), { params })
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).not.toMatch(/not found/)
      expect(body.error).toContain("read ETIMEDOUT")
    })

    // The other half of the ruling: 404 stays available for the answer it was always meant to give.
    // Without this, "rethrow" could decay into "no task is ever found".
    it(`${route.label} GET still answers 404 when the row is genuinely absent`, async () => {
      state.rows = []
      const response = await route.GET(request("GET"), { params })
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.message).toMatch(/not found/)
    })

    it(`${route.label} GET still answers the task when the read succeeds`, async () => {
      state.rows = [{ id: 7, title: "Replace the UPS battery", status: "todo", assigneeId: 1 }]
      const response = await route.GET(request("GET"), { params })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.id).toBe(7)
    })
  }
})