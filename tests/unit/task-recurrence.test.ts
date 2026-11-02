import { describe, expect, it } from "vitest"
import { computeInstanceDates, nextInstanceDate } from "@/lib/tasks/recurrence"

describe("computeInstanceDates", () => {
  it("generates 30 daily dates from a start date", () => {
    const dates = computeInstanceDates("daily", new Date("2026-11-02"))
    expect(dates).toHaveLength(30)
    expect(dates[0]).toBe("2026-11-02")
    expect(dates[29]).toBe("2026-12-01")
  })

  it("generates 12 weekly dates", () => {
    const dates = computeInstanceDates("weekly", new Date("2026-11-02"))
    expect(dates).toHaveLength(12)
    expect(dates[0]).toBe("2026-11-02")
    expect(dates[1]).toBe("2026-11-09")
  })

  it("generates 12 monthly dates", () => {
    const dates = computeInstanceDates("monthly", new Date("2026-11-02"))
    expect(dates).toHaveLength(12)
    expect(dates[0]).toBe("2026-11-02")
  })

  it("generates 4 yearly dates", () => {
    const dates = computeInstanceDates("yearly", new Date("2026-11-02"))
    expect(dates).toHaveLength(4)
    expect(dates[0]).toBe("2026-11-02")
    expect(dates[3]).toBe("2029-11-02")
  })

  it("returns empty array for one-off", () => {
    const dates = computeInstanceDates("one-off", new Date("2026-11-02"))
    expect(dates).toHaveLength(0)
  })

  it("handles month boundary for monthly cadence", () => {
    const dates = computeInstanceDates("monthly", new Date("2026-01-31"))
    expect(dates).toHaveLength(12)
    expect(dates[0]).toBe("2026-01-31")
    // Jan 31 + 1 month via setUTCMonth rolls to Mar 3 (Feb has no 31st)
    expect(dates[1]).toBe("2026-03-03")
  })
})

describe("nextInstanceDate", () => {
  it("returns null for one-off", () => {
    expect(nextInstanceDate("one-off", new Date("2026-11-02"))).toBeNull()
  })

  it("returns tomorrow for daily", () => {
    expect(nextInstanceDate("daily", new Date("2026-11-02"))).toBe("2026-11-03")
  })

  it("returns next week for weekly", () => {
    expect(nextInstanceDate("weekly", new Date("2026-11-02"))).toBe("2026-11-09")
  })
})
