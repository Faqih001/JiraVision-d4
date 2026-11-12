// One schedule drives three unrelated jobs. The failure mode worth guarding is not "a job throws"
// — it is "a job throws and the other two never run", which would leave the digest queue and the
// automation rules silently frozen behind whichever job happens to be first. Vercel does not retry
// a failed run, so a partial failure has to be both visible (non-2xx, recorded in execution history)
// and contained (the remaining jobs still execute).
//
// The three job modules are mocked because each one owns a database and, in the digest case, a live
// mail provider. What is under test here is the route's own contract: gate first, isolate, report.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const SECRET = "0123456789abcdef0123456789abcdef"

const state = vi.hoisted(() => {
  const calls: string[] = []
  const fail: Record<string, boolean> = {}
  const heartbeats: { ok: boolean; jobs: Record<string, unknown> }[] = []
  const job = (key: string) => async () => {
    calls.push(key)
    if (fail[key]) throw new Error(`${key} exploded`)
    return { ok: true, ran: 0 }
  }
  return { calls, fail, heartbeats, heartbeatFails: false, job }
})

vi.mock("@/app/api/reports/_runner", () => ({ runDueSchedules: state.job("reports") }))
vi.mock("@/app/api/automation/_scheduler", () => ({ runActiveRules: state.job("rules") }))
vi.mock("@/app/api/email/_dispatcher", () => ({ flushDigestQueue: state.job("digest") }))
vi.mock("@/app/api/cron/_heartbeat", () => ({
  recordHeartbeat: async (ok: boolean, jobs: Record<string, unknown>) => {
    state.heartbeats.push({ ok, jobs })
    if (state.heartbeatFails) throw new Error("heartbeat write failed")
  },
}))

import { GET } from "@/app/api/cron/hourly/route"

function call(authorization?: string) {
  return GET(
    new NextRequest("https://jiravision.vercel.app/api/cron/hourly", {
      headers: authorization === undefined ? {} : { authorization },
    }),
  )
}

describe("the hourly maintenance route", () => {
  beforeEach(() => {
    state.calls.length = 0
    state.heartbeats.length = 0
    state.heartbeatFails = false
    for (const key of Object.keys(state.fail)) delete state.fail[key]
    vi.stubEnv("CRON_SECRET", SECRET)
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("refuses an unsigned call before any job runs", async () => {
    const response = await call()
    expect(response.status).toBe(401)
    expect(state.calls).toEqual([])
  })

  it("refuses a wrong secret before any job runs", async () => {
    const response = await call("Bearer wrong")
    expect(response.status).toBe(401)
    expect(state.calls).toEqual([])
  })

  it("runs all three jobs for a signed call and reports each one", async () => {
    const response = await call(`Bearer ${SECRET}`)
    expect(response.status).toBe(200)
    expect(state.calls).toEqual(["reports", "rules", "digest"])

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(Object.keys(body.data.jobs).sort()).toEqual(["digest", "reports", "rules"])
    expect(body.data.jobs.reports).toEqual({ ok: true, ran: 0 })
  })

  it("still runs the other two jobs when the first one throws", async () => {
    state.fail.reports = true
    const response = await call(`Bearer ${SECRET}`)
    expect(state.calls).toEqual(["reports", "rules", "digest"])
    // Vercel shows this in the schedule's execution history; a 200 would hide it.
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.data.jobs.reports.ok).toBe(false)
    expect(body.data.jobs.reports.error).toContain("reports exploded")
    expect(body.data.jobs.rules.ok).toBe(true)
    expect(body.data.jobs.digest.ok).toBe(true)
  })

  it("reports a failure in the last job without discarding the earlier results", async () => {
    state.fail.digest = true
    const response = await call(`Bearer ${SECRET}`)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.data.jobs.reports.ok).toBe(true)
    expect(body.data.jobs.digest.ok).toBe(false)
  })
})

// The heartbeat is the only record of a run that found nothing to do. Without it an empty workspace
// is indistinguishable from a dead cron: every per-item "Last run" reads "Never run" either way.
describe("the hourly route records that it fired", () => {
  beforeEach(() => {
    state.calls.length = 0
    state.heartbeats.length = 0
    state.heartbeatFails = false
    for (const key of Object.keys(state.fail)) delete state.fail[key]
    vi.stubEnv("CRON_SECRET", SECRET)
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("records the fire even when all three jobs found nothing", async () => {
    const response = await call(`Bearer ${SECRET}`)
    expect(response.status).toBe(200)
    expect(state.heartbeats).toHaveLength(1)
    expect(state.heartbeats[0].ok).toBe(true)
    expect(Object.keys(state.heartbeats[0].jobs).sort()).toEqual(["digest", "reports", "rules"])
  })

  it("records a run with a failed job as not ok", async () => {
    state.fail.rules = true
    await call(`Bearer ${SECRET}`)
    expect(state.heartbeats).toHaveLength(1)
    expect(state.heartbeats[0].ok).toBe(false)
  })

  it("records nothing for an unsigned call", async () => {
    await call()
    expect(state.heartbeats).toEqual([])
  })

  it("does not turn a green run red when the heartbeat write itself fails", async () => {
    // The three jobs already ran. Reporting 500 because a convenience write failed would tell
    // Vercel the maintenance run failed when the reports, rules and mail all went out.
    state.heartbeatFails = true
    const response = await call(`Bearer ${SECRET}`)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(state.calls).toEqual(["reports", "rules", "digest"])
  })
})
