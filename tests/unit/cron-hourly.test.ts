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
  const job = (key: string) => async () => {
    calls.push(key)
    if (fail[key]) throw new Error(`${key} exploded`)
    return { ok: true, ran: 0 }
  }
  return { calls, fail, job }
})

vi.mock("@/app/api/reports/_runner", () => ({ runDueSchedules: state.job("reports") }))
vi.mock("@/app/api/automation/_scheduler", () => ({ runActiveRules: state.job("rules") }))
vi.mock("@/app/api/email/_dispatcher", () => ({ flushDigestQueue: state.job("digest") }))

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
