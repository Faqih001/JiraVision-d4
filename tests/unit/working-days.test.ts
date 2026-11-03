import { describe, expect, it } from "vitest"
import { formatDay, fromIsoDate, isWeekend, toIsoDate, workingDaysBetween } from "@/lib/working-days"

describe("iso day round-trip", () => {
  it("parses exactly YYYY-MM-DD into a local midnight", () => {
    const d = fromIsoDate("2026-11-03")
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getMonth()).toBe(10)
    expect(d!.getDate()).toBe(3)
    expect(toIsoDate(d!)).toBe("2026-11-03")
  })

  it("rejects malformed strings and impossible days", () => {
    expect(fromIsoDate(null)).toBeNull()
    expect(fromIsoDate(undefined)).toBeNull()
    expect(fromIsoDate("")).toBeNull()
    expect(fromIsoDate("2026-1-3")).toBeNull()
    expect(fromIsoDate("2026-11-03T00:00:00Z")).toBeNull()
    expect(fromIsoDate("2026-02-30")).toBeNull()
    expect(fromIsoDate("2026-13-01")).toBeNull()
  })
})

describe("isWeekend", () => {
  it("separates Mon–Fri from Sat–Sun", () => {
    expect(isWeekend(new Date(2026, 10, 2))).toBe(false) // Mon
    expect(isWeekend(new Date(2026, 10, 6))).toBe(false) // Fri
    expect(isWeekend(new Date(2026, 10, 7))).toBe(true) // Sat
    expect(isWeekend(new Date(2026, 10, 8))).toBe(true) // Sun
  })
})

describe("workingDaysBetween", () => {
  it("counts an inclusive Mon–Fri week as five days", () => {
    expect(workingDaysBetween("2026-11-02", "2026-11-06")).toBe(5)
  })

  it("skips the weekend inside a seven-day range", () => {
    expect(workingDaysBetween("2026-11-02", "2026-11-08")).toBe(5)
  })

  it("counts a weekend-only range as zero working days", () => {
    expect(workingDaysBetween("2026-11-07", "2026-11-08")).toBe(0)
  })

  it("measures a reversed range between the swapped endpoints", () => {
    expect(workingDaysBetween("2026-11-06", "2026-11-02")).toBe(5)
  })

  it("returns null when either endpoint is missing or invalid", () => {
    expect(workingDaysBetween(null, "2026-11-06")).toBeNull()
    expect(workingDaysBetween("2026-11-02", null)).toBeNull()
    expect(workingDaysBetween("2026-11-02", "not-a-day")).toBeNull()
  })

  it("spans multiple weeks correctly (two weeks plus the odd weekend = 10)", () => {
    expect(workingDaysBetween("2026-11-02", "2026-11-15")).toBe(10)
  })
})

describe("formatDay", () => {
  it("renders a short US label", () => {
    expect(formatDay("2026-11-03")).toBe("Nov 3, 2026")
  })

  it("renders empty for an unusable value", () => {
    expect(formatDay(null)).toBe("")
    expect(formatDay("2026-02-30")).toBe("")
  })
})
