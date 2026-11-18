import { describe, expect, it } from "vitest"
import { weekdayMinutes } from "@/lib/worklog/rhythm"
import type { DayBucket } from "@/lib/worklog/entries"

const bucket = (day: string, minutes: number): DayBucket => ({ day, count: minutes > 0 ? 1 : 0, minutes })

describe("weekdayMinutes", () => {
  it("returns seven Monday-first zeroes for an empty log", () => {
    expect(weekdayMinutes([])).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it("puts each day's minutes on its own weekday, Monday first", () => {
    // 2026-11-02 is a Monday, 2026-11-03 a Tuesday, 2026-11-08 a Sunday.
    const days = [bucket("2026-11-02", 90), bucket("2026-11-03", 30), bucket("2026-11-08", 45)]
    expect(weekdayMinutes(days)).toEqual([90, 30, 0, 0, 0, 0, 45])
  })

  it("adds days that fall on the same weekday", () => {
    const days = [bucket("2026-11-02", 60), bucket("2026-11-09", 40), bucket("2026-11-04", 15)]
    expect(weekdayMinutes(days)).toEqual([100, 0, 15, 0, 0, 0, 0])
  })

  it("counts a zero-minute day as zero, not as a missing weekday", () => {
    expect(weekdayMinutes([bucket("2026-11-06", 0)])).toEqual([0, 0, 0, 0, 0, 0, 0])
  })
})