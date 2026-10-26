import { describe, expect, it } from "vitest"
import {
  MAX_PERIOD_DAYS,
  PERIOD_TYPES,
  isPeriodType,
  isoWeek,
  periodBuckets,
  resolvePeriod,
  shiftPeriodAnchor,
} from "@/lib/reports/period"

describe("the period vocabulary", () => {
  it("lists exactly the five spec period types", () => {
    expect(PERIOD_TYPES).toEqual(["daily", "weekly", "monthly", "yearly", "custom"])
  })

  it("rejects an unknown period type instead of defaulting", () => {
    expect(isPeriodType("weekly")).toBe(true)
    expect(isPeriodType("fortnightly")).toBe(false)
    expect(isPeriodType(undefined)).toBe(false)
    expect(isPeriodType("")).toBe(false)
  })
})

describe("ISO week numbering", () => {
  it("puts 2026-01-01 (a Thursday) in week 1 of 2026", () => {
    expect(isoWeek("2026-01-01")).toEqual({ isoYear: 2026, week: 1 })
  })

  it("keeps the Monday of that week in 2025 but the week in 2026", () => {
    // 2025-12-29 is the Monday of 2026-W01: the calendar year and the ISO year disagree,
    // and a report labelled "week of 2025-12-29" is what loses a supervisor's trust.
    expect(isoWeek("2025-12-29")).toEqual({ isoYear: 2026, week: 1 })
    expect(resolvePeriod("weekly", "2025-12-29").start).toBe("2025-12-29")
    expect(resolvePeriod("weekly", "2025-12-29").label).toMatch(/^2026-W01/u)
  })

  it("carries 2027-01-01 back into 2026-W53", () => {
    // 2026 starts on a Thursday and is not a leap year, so it has 53 ISO weeks.
    expect(isoWeek("2027-01-01")).toEqual({ isoYear: 2026, week: 53 })
    expect(isoWeek("2026-12-28")).toEqual({ isoYear: 2026, week: 53 })
  })
})

describe("resolvePeriod", () => {
  it("resolves a daily period to exactly one day", () => {
    const period = resolvePeriod("daily", "2026-10-26")
    expect(period.start).toBe("2026-10-26")
    expect(period.end).toBe("2026-10-26")
    expect(period.days).toEqual(["2026-10-26"])
    expect(period.buckets).toHaveLength(1)
  })

  it("resolves a weekly period to Monday through Sunday", () => {
    const period = resolvePeriod("weekly", "2026-10-28") // a Wednesday
    expect(period.start).toBe("2026-10-26")
    expect(period.end).toBe("2026-11-01")
    expect(period.days).toHaveLength(7)
  })

  it("resolves a monthly period across a leap February", () => {
    const period = resolvePeriod("monthly", "2024-02-15")
    expect(period.start).toBe("2024-02-01")
    expect(period.end).toBe("2024-02-29")
    expect(period.days).toHaveLength(29)
  })

  it("resolves a yearly period to Jan 1 through Dec 31 and twelve buckets, not 365 rows", () => {
    const period = resolvePeriod("yearly", "2026-07-04")
    expect(period.start).toBe("2026-01-01")
    expect(period.end).toBe("2026-12-31")
    expect(period.days).toHaveLength(365)
    expect(period.buckets).toHaveLength(12)
    expect(period.buckets[1]).toEqual({ key: "2026-02", label: "Feb 2026", start: "2026-02-01", end: "2026-02-28" })
    expect(period.buckets[11]!.end).toBe("2026-12-31")
  })

  it("clips a February bucket inside a leap year", () => {
    const period = resolvePeriod("yearly", "2024-01-01")
    expect(period.buckets[1]!.end).toBe("2024-02-29")
  })

  it("swaps a reversed custom range", () => {
    const period = resolvePeriod("custom", "2026-10-26", { from: "2026-10-20", to: "2026-10-24" })
    expect(period.start).toBe("2026-10-20")
    expect(period.end).toBe("2026-10-24")
    expect(period.days).toHaveLength(5)
  })

  it("normalises a custom range wider than the cap rather than refusing it", () => {
    const period = resolvePeriod("custom", "2026-01-01", { from: "2020-01-01", to: "2026-12-31" })
    expect(period.end).toBe(shiftPeriodAnchor("custom", "2020-01-01", MAX_PERIOD_DAYS - 1))
    expect(period.days).toHaveLength(MAX_PERIOD_DAYS)
  })

  it("falls back to the anchor when a custom range is missing or malformed", () => {
    expect(resolvePeriod("custom", "2026-10-26").days).toEqual(["2026-10-26"])
    expect(resolvePeriod("custom", "2026-10-26", { from: "26/10/2026" }).start).toBe("2026-10-26")
  })

  it("treats a malformed anchor as the epoch rather than throwing", () => {
    const period = resolvePeriod("monthly", "not-a-date")
    expect(period.start).toBe("1970-01-01")
    expect(period.end).toBe("1970-01-31")
  })
})

describe("series buckets", () => {
  it("buckets a short period by day", () => {
    const buckets = periodBuckets("2026-10-20", "2026-10-23")
    expect(buckets.map((b) => b.key)).toEqual(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"])
  })

  it("switches to months past sixty days", () => {
    const buckets = periodBuckets("2026-01-15", "2026-04-10")
    expect(buckets.map((b) => b.key)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"])
    // Clipped to the range: a partial month reports the days it actually covers.
    expect(buckets[0]!.start).toBe("2026-01-15")
    expect(buckets[3]!.end).toBe("2026-04-10")
  })

  it("handles a December-to-January span", () => {
    const buckets = periodBuckets("2025-11-15", "2026-02-10")
    expect(buckets.map((b) => b.key)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"])
    expect(buckets[0]!.label).toBe("Nov 2025")
  })
})

describe("shiftPeriodAnchor", () => {
  it("steps days and weeks by the nominal length", () => {
    expect(shiftPeriodAnchor("daily", "2026-10-26", 1)).toBe("2026-10-27")
    expect(shiftPeriodAnchor("weekly", "2026-10-26", -1)).toBe("2026-10-19")
  })

  it("steps months without overflowing a 31st", () => {
    expect(shiftPeriodAnchor("monthly", "2026-01-31", 1)).toBe("2026-02-28")
    expect(shiftPeriodAnchor("monthly", "2026-03-31", -1)).toBe("2026-02-28")
    expect(shiftPeriodAnchor("monthly", "2026-12-15", 1)).toBe("2027-01-15")
    expect(shiftPeriodAnchor("monthly", "2026-01-15", -2)).toBe("2025-11-15")
  })

  it("steps a leap day forward to a clamped ordinary day", () => {
    expect(shiftPeriodAnchor("yearly", "2024-02-29", 1)).toBe("2025-02-28")
    expect(shiftPeriodAnchor("yearly", "2026-07-04", -1)).toBe("2025-07-04")
  })

  it("leaves a custom anchor on a plain day step", () => {
    expect(shiftPeriodAnchor("custom", "2026-10-26", 7)).toBe("2026-11-02")
  })
})
