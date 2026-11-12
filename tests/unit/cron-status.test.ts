// The heartbeat is read by a signed-in member on three dashboard surfaces, not by Vercel. It sits
// under /api/cron/ next to the route that writes it, but the two gates are different: the hourly
// route takes a bearer secret and no cookie, this one takes a cookie and no secret. A bearer header
// must not open it, and a missing cookie must not reach the database.
//
// The failure case is the one that matters. "Never fired" is a real answer — the table is empty
// until the first scheduled run — so a failed read must not be rendered as that answer. It has to
// surface as a 500 the component can distinguish.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  session: null as { id: number } | null,
  heartbeat: null as unknown,
  reads: 0,
  fails: false,
}))

vi.mock("@/lib/auth-actions", () => ({ getSession: async () => state.session }))
vi.mock("@/app/api/cron/_heartbeat", () => ({
  readHeartbeat: async () => {
    state.reads += 1
    if (state.fails) throw new Error('relation "scheduler_heartbeat" does not exist')
    return state.heartbeat
  },
}))

import { GET } from "@/app/api/cron/status/route"

const FIRED = {
  lastFiredAt: "2026-11-12T14:03:00Z",
  ok: true,
  jobs: { reports: { ok: true, due: 0, ran: 0, failed: 0 } },
}

function call(headers: Record<string, string> = {}) {
  return GET(new Request("https://jiravision.vercel.app/api/cron/status", { headers }))
}

describe("GET /api/cron/status", () => {
  beforeEach(() => {
    state.session = { id: 1 }
    state.heartbeat = FIRED
    state.reads = 0
    state.fails = false
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("refuses a call with no session before reading anything", async () => {
    state.session = null
    const response = await call()
    expect(response.status).toBe(401)
    expect(state.reads).toBe(0)
  })

  it("refuses a session with no numeric id", async () => {
    state.session = {} as { id: number }
    const response = await call()
    expect(response.status).toBe(401)
    expect(state.reads).toBe(0)
  })

  it("refuses the cron bearer secret — this route is for members, not for Vercel", async () => {
    state.session = null
    const response = await call({ authorization: `Bearer ${process.env.CRON_SECRET ?? "secret"}` })
    expect(response.status).toBe(401)
    expect(state.reads).toBe(0)
  })

  it("answers the last fire, its outcome and the per-job counts", async () => {
    const response = await call()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual(FIRED)
  })

  it("answers null data when the scheduler has never fired", async () => {
    state.heartbeat = null
    const response = await call()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
  })

  it("answers 500 with the driver message when the read fails, not 'never fired'", async () => {
    state.fails = true
    const response = await call()
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.message).toContain("scheduler_heartbeat")
    expect(body.data).toBeUndefined()
  })
})