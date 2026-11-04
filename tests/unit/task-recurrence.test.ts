import { describe, expect, it } from "vitest"
import {
  HORIZON_OCCURRENCES,
  MAX_HORIZON_OCCURRENCES,
  computeInstanceDates,
  horizonDates,
  horizonOccurrencesForWindow,
  isWeekendDay,
  nextInstanceDate,
  workingDayOnOrAfter,
} from "@/lib/tasks/recurrence"

describe("workingDayOnOrAfter", () => {
  it("leaves a weekday alone", () => {
    expect(workingDayOnOrAfter("2026-11-04")).toBe("2026-11-04")
    expect(workingDayOnOrAfter("2026-11-06")).toBe("2026-11-06")
  })

  it("moves a Saturday to the Monday", () => {
    expect(workingDayOnOrAfter("2026-11-07")).toBe("2026-11-09")
  })

  it("moves a Sunday to the Monday, never back to the Friday", () => {
    expect(workingDayOnOrAfter("2026-11-08")).toBe("2026-11-09")
  })

  it("crosses a month boundary", () => {
    // 2026-08-01 is a Saturday, so the roll lands in the same month; 2026-10-31 is a Saturday
    // and rolls into November.
    expect(workingDayOnOrAfter("2026-10-31")).toBe("2026-11-02")
  })

  it("knows a weekend day from a weekday", () => {
    expect(isWeekendDay("2026-11-07")).toBe(true)
    expect(isWeekendDay("2026-11-08")).toBe(true)
    expect(isWeekendDay("2026-11-09")).toBe(false)
    expect(isWeekendDay("not-a-date")).toBe(false)
  })
})

describe("computeInstanceDates", () => {
  it("generates 30 daily working days from a start date", () => {
    const dates = computeInstanceDates("daily", new Date("2026-11-02"))
    expect(dates).toHaveLength(30)
    expect(dates[0]).toBe("2026-11-02")
    // 30 working days from Monday 2 November span six weeks, not four.
    expect(dates[29]).toBe("2026-12-11")
    expect(dates.some(isWeekendDay)).toBe(false)
  })

  it("starts a grid created at the weekend on the Monday", () => {
    const dates = computeInstanceDates("daily", new Date("2026-11-07"))
    expect(dates[0]).toBe("2026-11-09")
    expect(dates[1]).toBe("2026-11-10")
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
    // 2026-01-31 is a Saturday, so the first occurrence is worked on Monday 2 February and the
    // grid keeps stepping from the day it wrote.
    const dates = computeInstanceDates("monthly", new Date("2026-01-31"))
    expect(dates).toHaveLength(12)
    expect(dates[0]).toBe("2026-02-02")
    expect(dates[1]).toBe("2026-03-02")
    expect(dates.some(isWeekendDay)).toBe(false)
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

  it("holds seven daily working days starting today on a fresh grid", () => {
    expect(horizonDates("daily", null, today)).toEqual([
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
    ])
  })

  it("starts at the first occurrence after the grid, not after today", () => {
    // 2026-11-06 is a Friday, so the next working day is the Monday rather than the Saturday.
    expect(horizonDates("daily", "2026-11-06", today)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-16",
      "2026-11-17",
    ])
  })

  it("counts a legacy weekend row as covering its own week", () => {
    // Grids written before the working-day rule can end on a Sunday. The roll makes that row
    // stand for the Monday, so the next date asked for is the Tuesday — the week is not owed
    // twice.
    expect(horizonDates("daily", "2026-11-08", today)[0]).toBe("2026-11-10")
  })

  it("walks a stale grid up to today without inventing the missed days", () => {
    // The 30-row horizon ran out 10 days ago. Nothing may claim those days as work owed.
    const dates = horizonDates("daily", "2026-10-25", today)
    expect(dates[0]).toBe(today)
    expect(dates).toHaveLength(HORIZON_OCCURRENCES)
    expect(dates.some((d) => d < today)).toBe(false)
  })

  it("moves a weekly anchor that lands on a weekend to the Monday", () => {
    // 2026-11-01 is a Sunday, so the grid starts on the Monday and the next occurrence is the
    // Monday after that — the office does not open at the weekend.
    expect(horizonDates("weekly", "2026-11-01", today)[0]).toBe("2026-11-09")
  })

  it("advances a monthly grid past today in one step", () => {
    const dates = horizonDates("monthly", "2026-10-15", today)
    // 2026-11-15 is a Sunday, so the occurrence is worked on the Monday.
    expect(dates[0]).toBe("2026-11-16")
    expect(dates).toHaveLength(HORIZON_OCCURRENCES)
    expect(dates.some(isWeekendDay)).toBe(false)
  })

  it("steps a quarterly grid three months at a time", () => {
    expect(horizonDates("quarterly", "2026-08-20", today).slice(0, 2)).toEqual([
      "2026-11-20",
      // 2027-02-20 is a Saturday, so the occurrence moves to the Monday.
      "2027-02-22",
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

  it("never returns a weekend date, whatever the cadence", () => {
    for (const cadence of ["daily", "weekly", "monthly", "quarterly", "yearly"] as const) {
      for (const latest of [null, "2026-11-07", "2026-11-08", "2025-06-14"]) {
        expect(horizonDates(cadence, latest, today).some(isWeekendDay)).toBe(false)
      }
    }
  })

  it("starts a fresh grid on the Monday when today is itself a weekend", () => {
    // 2026-11-07 is a Saturday: nobody is in, so the first occurrence is Monday the 9th.
    expect(horizonDates("daily", null, "2026-11-07", 3)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ])
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

  it("skips the weekend for a daily step out of Friday", () => {
    expect(nextInstanceDate("daily", new Date("2026-11-06"))).toBe("2026-11-09")
  })

  it("rolls a weekly step that lands on a Saturday", () => {
    // 2026-11-07 is a Saturday, so the next Saturday the 14th is worked on Monday the 16th.
    expect(nextInstanceDate("weekly", new Date("2026-11-07"))).toBe("2026-11-16")
  })
})

describe("horizonOccurrencesForWindow", () => {
  it("covers a 42-day month grid on a daily cadence", () => {
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", "2026-12-16")).toBe(43)
  })

  it("needs two yearly rows to reach next year", () => {
    expect(horizonOccurrencesForWindow("yearly", "2026-11-04", "2027-11-04")).toBe(2)
  })

  it("falls back to the standing horizon when the reader sent no window", () => {
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", null)).toBe(HORIZON_OCCURRENCES)
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", "not-a-date")).toBe(HORIZON_OCCURRENCES)
  })

  it("caps a 12-month daily view at the bound rather than writing 366 rows", () => {
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", "2027-11-04")).toBe(
      MAX_HORIZON_OCCURRENCES,
    )
  })

  it("never asks for a negative or zero window", () => {
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", "2026-10-01")).toBe(1)
  })

  it("treats a one-off as no window demand", () => {
    // CADENCE_DAYS["one-off"] is null: the caller never tops one up, and the answer is the
    // standing horizon rather than a division by nothing.
    expect(horizonOccurrencesForWindow("one-off", "2026-11-04", "2026-12-16")).toBe(
      HORIZON_OCCURRENCES,
    )
  })
})
