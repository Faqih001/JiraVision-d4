import { describe, expect, it } from "vitest"
import { periodDelta, previousRange } from "@/lib/worklog/period-delta"

describe("previousRange", () => {
  it("returns the equal-length window immediately before the range", () => {
    expect(previousRange({ from: "2026-11-10", to: "2026-11-16" })).toEqual({
      from: "2026-11-03",
      to: "2026-11-09",
    })
  })

  it("handles a single day", () => {
    expect(previousRange({ from: "2026-11-18", to: "2026-11-18" })).toEqual({
      from: "2026-11-17",
      to: "2026-11-17",
    })
  })

  it("crosses a month boundary without drifting", () => {
    expect(previousRange({ from: "2026-11-01", to: "2026-11-03" })).toEqual({
      from: "2026-10-29",
      to: "2026-10-31",
    })
  })
})

describe("periodDelta", () => {
  it("is null when the previous period was never read", () => {
    // A missing comparison is not a zero: the chip must not claim "same as prev".
    expect(periodDelta(5, null, "count")).toBeNull()
  })

  it("labels a minutes gain with the shared formatter", () => {
    const delta = periodDelta(200, 120, "minutes")
    expect(delta).toEqual({ diff: 80, direction: "up", label: "+1h 20m vs prev" })
  })

  it("labels a minutes loss with a minus", () => {
    expect(periodDelta(30, 90, "minutes")).toEqual({ diff: -60, direction: "down", label: "-1h vs prev" })
  })

  it("labels a flat period without a sign", () => {
    expect(periodDelta(4, 4, "count")).toEqual({ diff: 0, direction: "flat", label: "same as prev" })
  })

  it("counts entries as plain numbers", () => {
    expect(periodDelta(7, 2, "count")).toEqual({ diff: 5, direction: "up", label: "+5 vs prev" })
  })

  it("treats a previous zero as a real comparison, not a missing one", () => {
    expect(periodDelta(3, 0, "count")?.label).toBe("+3 vs prev")
  })
})