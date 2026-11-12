// The heartbeat line has three states, and two of them are easy to confuse: "the scheduler has
// never fired" and "the read that would tell us failed". Rendering the second as the first is the
// same lie batch C removed from the data readers — an outage dressed as an empty workspace. The
// label logic is a pure module so those states are asserted on real output, not on JSX regexes.
//
// The mount guards below are source guards because the repo has no DOM test harness; they pin that
// all three surfaces actually render the component, which is the part a pure test cannot see.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  HEARTBEAT_NEVER,
  HEARTBEAT_UNKNOWN,
  heartbeatView,
} from "@/lib/cron/heartbeat-view"
import type { HeartbeatDto } from "@/app/api/cron/_heartbeat"

const FIRED_AT = "2026-11-12T14:03:00Z"
const NOW = Date.parse("2026-11-12T14:15:00Z")

const heartbeat = (over: Partial<HeartbeatDto> = {}): HeartbeatDto => ({
  lastFiredAt: FIRED_AT,
  ok: true,
  jobs: {
    reports: { ok: true, due: 0, ran: 0, failed: 0 },
    rules: { ok: true, due: 0, ran: 0, failed: 0, acted: 0 },
    digest: { ok: true, due: 0, delivered: 0, failed: 0, refused: 0 },
  },
  ...over,
})

describe("the heartbeat line", () => {
  it("says the scheduler has never fired when there is no row", () => {
    expect(heartbeatView(null, NOW)).toEqual({ tone: "muted", text: HEARTBEAT_NEVER })
  })

  it("reports a green fire that found nothing to do", () => {
    // This is production's current state: the cron is alive and every queue is empty. Before the
    // heartbeat there was no way to see that from inside the product.
    expect(heartbeatView(heartbeat(), NOW)).toEqual({
      tone: "ok",
      text: "Scheduler last fired 12m ago · ok · reports 0 · rules 0 · digest 0",
    })
  })

  it("names the job that failed and marks the whole fire as failed", () => {
    const view = heartbeatView(
      heartbeat({
        ok: false,
        jobs: {
          reports: { ok: false, error: "relation does not exist" },
          rules: { ok: true, due: 0, ran: 0, failed: 0, acted: 0 },
          digest: { ok: true, due: 0, delivered: 0, failed: 0, refused: 0 },
        },
      }),
      NOW,
    )
    expect(view.tone).toBe("failed")
    expect(view.text).toContain("· failed ·")
    expect(view.text).toContain("reports failed")
    expect(view.text).not.toContain("undefined")
  })

  it("counts the work each job actually did, not how many rows it looked at", () => {
    const view = heartbeatView(
      heartbeat({
        jobs: {
          reports: { ok: true, due: 4, ran: 2, failed: 0 },
          rules: { ok: true, due: 3, ran: 3, failed: 0, acted: 5 },
          digest: { ok: true, due: 7, delivered: 3, failed: 1, refused: 3 },
        },
      }),
      NOW,
    )
    expect(view.text).toContain("reports 2")
    expect(view.text).toContain("rules 3")
    expect(view.text).toContain("digest 3")
    expect(view.text).not.toContain("due")
  })

  it("ages the timestamp against the clock it is given", () => {
    const threeHours = Date.parse("2026-11-12T17:03:00Z")
    expect(heartbeatView(heartbeat(), threeHours).text).toContain("3h ago")
  })

  it("keeps the unreadable state distinct from the never-fired state", () => {
    expect(HEARTBEAT_UNKNOWN).not.toBe(HEARTBEAT_NEVER)
    expect(HEARTBEAT_UNKNOWN).not.toMatch(/never/i)
  })
})

describe("the three surfaces that show the heartbeat", () => {
  const source = (path: string) =>
    readFileSync(resolve(process.cwd(), path), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")

  const component = source("components/dashboard/scheduler-heartbeat.tsx")

  it("the component is a client component that reads the member-gated status route", () => {
    expect(component).toMatch(/^"use client"/)
    expect(component).toContain("/api/cron/status")
    // The bearer-gated hourly route mutates and mails; a dashboard read must never call it.
    expect(component).not.toContain("/api/cron/hourly")
  })

  it("the component renders all three states rather than defaulting to 'never'", () => {
    expect(component).toContain("HEARTBEAT_UNKNOWN")
    expect(component).toContain("heartbeatView")
    expect(component).toMatch(/catch/)
  })

  it.each([
    ["app/dashboard/reports/page.tsx", "Saved schedules"],
    ["app/dashboard/automation/page.tsx", "Rules"],
    ["app/dashboard/email/page.tsx", "Digest delivery"],
  ])("%s mounts it in the %s section", (path) => {
    const page = source(path)
    expect(page).toContain("SchedulerHeartbeat")
    expect(page).toMatch(/import\s*\{[^}]*SchedulerHeartbeat/)
  })
})