import { describe, expect, it } from "vitest"
import {
  dayBoundsUtc,
  isIsoDate,
  localDay,
  monthBoundsIso,
  rangeDays,
  safeZone,
  shiftDays,
  weekDays,
  weekStartIso,
} from "@/lib/worklog/local-day"

describe("localDay", () => {
  it("puts a late-evening UTC instant on the next member day", () => {
    // 22:30 UTC is 01:30 the following day in Africa/Nairobi (UTC+3, no DST).
    const instant = new Date("2026-03-15T22:30:00Z")
    expect(instant.toISOString().slice(0, 10)).toBe("2026-03-15")
    expect(localDay(instant, "Africa/Nairobi")).toBe("2026-03-16")
  })

  it("puts an early-morning UTC instant on the previous member day", () => {
    const instant = new Date("2026-10-26T01:30:00Z")
    expect(localDay(instant, "America/Los_Angeles")).toBe("2026-10-25")
  })

  it("falls back to UTC for a missing or unusable timezone", () => {
    const instant = new Date("2026-10-26T23:59:00Z")
    expect(localDay(instant, null)).toBe("2026-10-26")
    expect(localDay(instant, "Not/AZone")).toBe("2026-10-26")
    expect(safeZone("Mars/Olympus")).toBe("UTC")
  })
})

describe("dayBoundsUtc", () => {
  it("is a fixed 24 hours in a zone without DST", () => {
    const { start, end } = dayBoundsUtc("2026-10-26", "Africa/Nairobi")
    expect(start.toISOString()).toBe("2026-10-25T21:00:00.000Z")
    expect(end.toISOString()).toBe("2026-10-26T21:00:00.000Z")
  })

  it("is 23 hours on the spring-forward day", () => {
    const { start, end } = dayBoundsUtc("2026-03-08", "America/New_York")
    expect(start.toISOString()).toBe("2026-03-08T05:00:00.000Z")
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000)
  })

  it("is 25 hours on the fall-back day", () => {
    const { start, end } = dayBoundsUtc("2026-11-01", "America/New_York")
    expect(start.toISOString()).toBe("2026-11-01T04:00:00.000Z")
    expect(end.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000)
  })

  it("returns whole-minute instants even for half-hour zones", () => {
    const { start } = dayBoundsUtc("2026-01-15", "Asia/Kolkata")
    expect(start.toISOString()).toBe("2026-01-14T18:30:00.000Z")
  })
})

describe("ISO day arithmetic", () => {
  it("walks a non-leap February without inventing a 29th", () => {
    expect(shiftDays("2026-02-28", 1)).toBe("2026-03-01")
    expect(shiftDays("2024-02-28", 1)).toBe("2024-02-29")
    expect(shiftDays("2026-01-01", -1)).toBe("2025-12-31")
  })

  it("anchors a week on Monday and rolls Sunday back", () => {
    expect(weekStartIso("2026-10-27")).toBe("2026-10-26")
    expect(weekStartIso("2026-10-26")).toBe("2026-10-26")
    expect(weekStartIso("2026-11-01")).toBe("2026-10-26")
    expect(weekDays(weekStartIso("2026-11-01"))).toHaveLength(7)
    expect(weekDays("2026-10-26")[6]).toBe("2026-11-01")
  })

  it("clamps a range instead of returning an empty month", () => {
    expect(rangeDays("2026-10-01", "2026-10-05")).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
    ])
    expect(rangeDays("2026-10-06", "2026-10-01")).toEqual([])
    expect(rangeDays("2026-01-01", "2026-12-31", 40)).toHaveLength(40)
  })

  it("gives the real calendar month bounds", () => {
    expect(monthBoundsIso("2026-02-14")).toEqual({ from: "2026-02-01", to: "2026-02-28" })
    expect(monthBoundsIso("2024-02-14")).toEqual({ from: "2024-02-01", to: "2024-02-29" })
    expect(monthBoundsIso("2026-12-30")).toEqual({ from: "2026-12-01", to: "2026-12-31" })
  })

  it("rejects a string that is a real format but not a real date", () => {
    expect(isIsoDate("2026-10-26")).toBe(true)
    expect(isIsoDate("2026-13-01")).toBe(false)
    expect(isIsoDate("2026-02-30")).toBe(false)
    expect(isIsoDate("26-10-26")).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })
})
