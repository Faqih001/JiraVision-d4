import { describe, expect, it } from "vitest"
import { isMatch } from "react-day-picker"
import {
  combineDateTime,
  disabledDayMatchers,
  formatDateTime,
  splitDateTime,
} from "@/lib/date-picker"

const SAT = new Date(2026, 10, 7) // Saturday
const SUN = new Date(2026, 10, 8) // Sunday
const MON = new Date(2026, 10, 2) // Monday

describe("disabledDayMatchers", () => {
  it("mutes both weekend days by default", () => {
    const matchers = disabledDayMatchers({})
    expect(isMatch(SAT, matchers)).toBe(true)
    expect(isMatch(SUN, matchers)).toBe(true)
    expect(isMatch(MON, matchers)).toBe(false)
  })

  it("allows every day when the allowWeekends prop is set", () => {
    const matchers = disabledDayMatchers({ allowWeekends: true })
    expect(isMatch(SAT, matchers)).toBe(false)
    expect(isMatch(SUN, matchers)).toBe(false)
  })

  it("allows weekends when the per-open toggle override is on", () => {
    const matchers = disabledDayMatchers({ weekendOverride: true })
    expect(isMatch(SAT, matchers)).toBe(false)
  })

  it("keeps the allowWeekends prop authoritative even with the toggle off", () => {
    const matchers = disabledDayMatchers({ allowWeekends: true, weekendOverride: false })
    expect(isMatch(SAT, matchers)).toBe(false)
  })

  it("disables days outside the min/max boundaries", () => {
    const matchers = disabledDayMatchers({ allowWeekends: true, min: "2026-11-05", max: "2026-11-10" })
    expect(isMatch(new Date(2026, 10, 4), matchers)).toBe(true) // before min
    expect(isMatch(new Date(2026, 10, 11), matchers)).toBe(true) // after max
    expect(isMatch(new Date(2026, 10, 6), matchers)).toBe(false) // inside the window
  })
})

describe("combineDateTime", () => {
  it("joins a day and a time into YYYY-MM-DDTHH:mm", () => {
    expect(combineDateTime("2026-11-03", "14:30")).toBe("2026-11-03T14:30")
  })

  it("returns null when either part is missing", () => {
    expect(combineDateTime(null, "14:30")).toBeNull()
    expect(combineDateTime("2026-11-03", null)).toBeNull()
    expect(combineDateTime(null, null)).toBeNull()
  })

  it("rejects an impossible day or an out-of-range time", () => {
    expect(combineDateTime("2026-02-30", "14:30")).toBeNull()
    expect(combineDateTime("2026-11-03", "25:00")).toBeNull()
    expect(combineDateTime("2026-11-03", "12:60")).toBeNull()
    expect(combineDateTime("2026-11-03", "9:5")).toBeNull()
  })
})

describe("splitDateTime", () => {
  it("splits a stored datetime into its day and time", () => {
    expect(splitDateTime("2026-11-03T14:30")).toEqual({ date: "2026-11-03", time: "14:30" })
  })

  it("drops seconds from the time part", () => {
    expect(splitDateTime("2026-11-03T14:30:00")).toEqual({ date: "2026-11-03", time: "14:30" })
  })

  it("returns nulls for an empty value and a null time for a date-only value", () => {
    expect(splitDateTime(null)).toEqual({ date: null, time: null })
    expect(splitDateTime("")).toEqual({ date: null, time: null })
    expect(splitDateTime("2026-11-03")).toEqual({ date: "2026-11-03", time: null })
  })
})

describe("formatDateTime", () => {
  it("renders a day and time label", () => {
    expect(formatDateTime("2026-11-03T14:30")).toBe("Nov 3, 2026 · 14:30")
  })

  it("renders just the day when no time is set", () => {
    expect(formatDateTime("2026-11-03")).toBe("Nov 3, 2026")
  })

  it("renders empty for an unusable value", () => {
    expect(formatDateTime(null)).toBe("")
    expect(formatDateTime("2026-02-30T14:30")).toBe("")
  })
})