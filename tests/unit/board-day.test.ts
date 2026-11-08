// The day a board draws, and whether anybody may write on it.
//
// The board used to draw only today. Browsing a day is a read, so the rule has to answer three
// questions the same way on the server and in the page: which day is actually drawn when the
// URL holds junk, is that day behind/ahead of the member's own today, and may a card be moved
// on it. A future day is a preview — marking next Friday's backup done is not a thing anybody
// should be able to do by paging forward.

import { describe, expect, it } from "vitest"
import { boardDayParam, boardDayTitle, resolveBoardDay } from "@/lib/tasks/board-day"
import { shiftDays } from "@/lib/worklog/local-day"

const TODAY = "2026-11-08"

describe("a browsed day falls back to the member's today", () => {
  it("draws today when nothing was asked for", () => {
    for (const requested of [null, undefined, ""]) {
      const day = resolveBoardDay(requested, TODAY)
      expect(day.iso).toBe(TODAY)
      expect(day.relation).toBe("today")
      expect(day.isToday).toBe(true)
      expect(day.readOnly).toBe(false)
      expect(day.daysFromToday).toBe(0)
    }
  })

  it("refuses anything that is not a real calendar day", () => {
    // 2026 is not a leap year, and a date column would reject these too. Accepting them would
    // silently query a day nobody asked for.
    for (const requested of [
      "tomorrow",
      "2026-02-30",
      "2026-02-29",
      "2026-13-01",
      "2026-00-10",
      "2026-11-00",
      "2026-11-8",
      "20261108",
      "2026-11-08T00:00:00Z",
      " 2026-11-08 ",
      42,
      {},
      ["2026-11-08"],
    ]) {
      expect(resolveBoardDay(requested, TODAY).iso).toBe(TODAY)
    }
  })

  it("accepts a leap day in a leap year", () => {
    expect(resolveBoardDay("2028-02-29", TODAY).iso).toBe("2028-02-29")
  })
})

describe("a day behind today is still work somebody can settle", () => {
  it("keeps a missed occurrence actionable", () => {
    const day = resolveBoardDay("2026-11-06", TODAY)
    expect(day.relation).toBe("past")
    expect(day.isToday).toBe(false)
    expect(day.readOnly).toBe(false)
    expect(day.daysFromToday).toBe(-2)
  })

  it("counts across a month and a year boundary", () => {
    expect(resolveBoardDay("2026-10-31", TODAY).daysFromToday).toBe(-8)
    expect(resolveBoardDay("2025-11-08", TODAY).daysFromToday).toBe(-365)
  })
})

describe("a day ahead of today is a preview", () => {
  it("makes tomorrow read-only", () => {
    const day = resolveBoardDay(shiftDays(TODAY, 1), TODAY)
    expect(day.iso).toBe("2026-11-09")
    expect(day.relation).toBe("future")
    expect(day.readOnly).toBe(true)
    expect(day.daysFromToday).toBe(1)
  })

  it("stays read-only however far forward the member pages", () => {
    const day = resolveBoardDay("2027-06-01", TODAY)
    expect(day.relation).toBe("future")
    expect(day.readOnly).toBe(true)
    expect(day.daysFromToday).toBe(205)
  })
})

describe("the URL only carries a day when it is not today", () => {
  it("drops the parameter on today so the board's default address stays clean", () => {
    expect(boardDayParam(TODAY, TODAY)).toBeNull()
    expect(boardDayParam(resolveBoardDay("nonsense", TODAY).iso, TODAY)).toBeNull()
  })

  it("keeps a browsed day so a reload or a shared link lands on it", () => {
    expect(boardDayParam("2026-11-06", TODAY)).toBe("2026-11-06")
    expect(boardDayParam("2026-11-13", TODAY)).toBe("2026-11-13")
  })
})

describe("the board says which day it is showing", () => {
  it("names today, tomorrow and yesterday", () => {
    expect(boardDayTitle(TODAY, TODAY)).toBe("Today · Sun 8 Nov")
    expect(boardDayTitle("2026-11-09", TODAY)).toBe("Tomorrow · Mon 9 Nov")
    expect(boardDayTitle("2026-11-07", TODAY)).toBe("Yesterday · Sat 7 Nov")
  })

  it("spells out any other day, with the year when it is not this one", () => {
    expect(boardDayTitle("2026-11-13", TODAY)).toBe("Fri 13 Nov")
    expect(boardDayTitle("2027-01-04", TODAY)).toBe("Mon 4 Jan 2027")
  })
})