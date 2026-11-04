import { describe, expect, it } from "vitest"
import {
  HORIZON_OCCURRENCES,
  computeInstanceDates,
  horizonDates,
  nextInstanceDate,
} from "@/lib/tasks/recurrence"

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

  it("generates 8 quarterly dates", () => {
    // The planner extraction enum and lib/seed/tasks.ts both emit `quarterly`, so the value
    // has to carry a count or computeInstanceDates loops over `undefined` and yields no grid.
    const dates = computeInstanceDates("quarterly", new Date("2026-11-02"))
    expect(dates).toHaveLength(8)
    expect(dates[0]).toBe("2026-11-02")
    expect(dates[1]).toBe("2027-02-02")
  })
})

describe("horizonDates", () => {
  const today = "2026-11-04"

  it("holds seven daily occurrences starting today on a fresh grid", () => {
    expect(horizonDates("daily", null, today)).toEqual([
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
    ])
  })

  it("starts at the first occurrence after the grid, not after today", () => {
    expect(horizonDates("daily", "2026-11-08", today)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ])
  })

  it("walks a stale grid up to today without inventing the missed days", () => {
    // The 30-row horizon ran out 10 days ago. Nothing may claim those days as work owed.
    const dates = horizonDates("daily", "2026-10-25", today)
    expect(dates[0]).toBe(today)
    expect(dates).toHaveLength(HORIZON_OCCURRENCES)
    expect(dates.some((d) => d < today)).toBe(false)
  })

  it("keeps a weekly grid on its own weekday", () => {
    // 2026-11-01 is a Sunday, so the next occurrence after Wednesday the 4th is Sunday the 8th.
    expect(horizonDates("weekly", "2026-11-01", today)[0]).toBe("2026-11-08")
  })

  it("advances a monthly grid past today in one step", () => {
    expect(horizonDates("monthly", "2026-10-15", today)).toEqual([
      "2026-11-15",
      "2026-12-15",
      "2027-01-15",
      "2027-02-15",
      "2027-03-15",
      "2027-04-15",
      "2027-05-15",
    ])
  })

  it("steps a quarterly grid three months at a time", () => {
    expect(horizonDates("quarterly", "2026-08-20", today).slice(0, 2)).toEqual([
      "2026-11-20",
      "2027-02-20",
    ])
  })

  it("produces nothing for a one-off task", () => {
    expect(horizonDates("one-off", "2026-11-01", today)).toEqual([])
  })

  it("never returns a date before today, however stale the grid is", () => {
    const dates = horizonDates("yearly", "2019-01-01", today)
    expect(dates.every((d) => d >= today)).toBe(true)
    expect(dates).toHaveLength(HORIZON_OCCURRENCES)
  })

  it("respects a shorter horizon when the caller asks for one", () => {
    expect(horizonDates("daily", null, today, 3)).toEqual([
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ])
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
