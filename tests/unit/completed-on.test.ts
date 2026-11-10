// Which day a finished task was actually finished, and what a Done column shows for a window of
// those days.
//
// `tasks.status` says a card is done; it does not say when. `tasks.updated_at` is mutable, so a
// card edited last Tuesday is not a card finished last Tuesday. `task_events` is the honest record
// — one row per status change — so the completion day is the latest finished event, read in the
// member's own timezone so it agrees with the day the board is drawing. Two production rows have
// no event (imported seed history); they fall back to `updated_at`, and this module is where that
// one concession is written down.
//
// The window itself is a page preference, not a server one: the board wants a week, the task list
// wants everything. Junk gets the conservative answer — a window nobody can read hides nothing.

import { describe, expect, it } from "vitest"
import {
  SERVER_DONE_WINDOW,
  completionDayLabel,
  completedOnFrom,
  doneWindowBounds,
  doneWindowPhrase,
  earlierDoneLabel,
  groupByCompletionDay,
  isDoneWindow,
  resolveDoneWindow,
} from "@/lib/tasks/completed-on"

const TODAY = "2026-11-08"

describe("reading the window out of a query string", () => {
  it("accepts the three words it offers", () => {
    expect(isDoneWindow("day")).toBe(true)
    expect(isDoneWindow("week")).toBe(true)
    expect(isDoneWindow("all")).toBe(true)
  })

  it("refuses anything else", () => {
    for (const junk of [null, undefined, "", "weekk", "7", "month", "DAY ", 0, { window: "day" }]) {
      expect(isDoneWindow(junk)).toBe(false)
    }
  })

  it("keeps a page's own default when the value is junk", () => {
    expect(resolveDoneWindow("week", "day")).toBe("week")
    expect(resolveDoneWindow("month", "week")).toBe("week")
    expect(resolveDoneWindow(null, "week")).toBe("week")
    expect(resolveDoneWindow(undefined, "all")).toBe("all")
  })

  it("hides nothing when there is no default to fall back on", () => {
    // The server cannot tell which page asked. An unreadable preference must not silently drop
    // rows the member never asked to drop.
    expect(resolveDoneWindow("yesterday")).toBe(SERVER_DONE_WINDOW)
    expect(SERVER_DONE_WINDOW).toBe("all")
  })
})

describe("the days a window covers", () => {
  it("holds one day for `day`", () => {
    expect(doneWindowBounds("day", TODAY)).toEqual({ fromIso: "2026-11-08", toIso: "2026-11-08" })
  })

  it("holds seven days ending on the drawn day for `week`", () => {
    expect(doneWindowBounds("week", TODAY)).toEqual({ fromIso: "2026-11-02", toIso: "2026-11-08" })
    // A week anchored on the day being browsed, not on Monday, so browsing back to a Friday shows
    // the week that Friday sits in rather than a calendar week the member did not ask about.
    expect(doneWindowBounds("week", "2026-11-13")).toEqual({ fromIso: "2026-11-07", toIso: "2026-11-13" })
  })

  it("opens the past but not the future for `all`", () => {
    // A board turned to last Friday is a view as of that day. A card finished since then is not
    // something that Friday's Done column ever held.
    expect(doneWindowBounds("all", TODAY)).toEqual({ fromIso: null, toIso: "2026-11-08" })
    expect(doneWindowBounds("all", "2025-03-01")).toEqual({ fromIso: null, toIso: "2025-03-01" })
  })

  it("crosses a month and a year edge without losing days", () => {
    expect(doneWindowBounds("week", "2026-01-03")).toEqual({ fromIso: "2025-12-28", toIso: "2026-01-03" })
    expect(doneWindowBounds("week", "2026-03-04")).toEqual({ fromIso: "2026-02-26", toIso: "2026-03-04" })
  })
})

describe("the day a task was finished", () => {
  it("reads the event, not the row", () => {
    expect(completedOnFrom("2026-11-04T06:20:00.000Z", "2026-11-08T09:00:00.000Z", "UTC")).toBe("2026-11-04")
  })

  it("counts the event in the member's own day", () => {
    // 23:30Z is already tomorrow in Nairobi (+3), and the board the card sits on is drawn with
    // localDay(..., timezone) too. A Done column dated in UTC would list this card on a day the
    // member never saw it finished.
    expect(completedOnFrom("2026-11-08T23:30:00.000Z", null, "Africa/Nairobi")).toBe("2026-11-09")
    expect(completedOnFrom("2026-11-08T23:30:00.000Z", null, "UTC")).toBe("2026-11-08")
    expect(completedOnFrom("2026-11-08T01:00:00.000Z", null, "America/Los_Angeles")).toBe("2026-11-07")
  })

  it("falls back to updated_at only when there is no event to trust", () => {
    expect(completedOnFrom(null, "2026-11-05T12:00:00.000Z", "UTC")).toBe("2026-11-05")
    // The fallback is the whole answer for imported history, and it moves when the row is edited.
    expect(completedOnFrom(null, null, "UTC")).toBeNull()
  })

  it("refuses a nonsense zone the same way the rest of the app does", () => {
    expect(completedOnFrom("2026-11-08T23:30:00.000Z", null, "Mars/Olympus")).toBe("2026-11-08")
    expect(completedOnFrom("2026-11-08T23:30:00.000Z", null, null)).toBe("2026-11-08")
  })

  it("names no day for a card that is not finished", () => {
    // The caller only asks for open rows never — but an unanswered event on an open card must not
    // invent a completion day out of the edit timestamp.
    expect(completedOnFrom("2026-11-08T23:30:00.000Z", "2026-11-09T01:00:00.000Z", "UTC", false)).toBeNull()
  })
})

describe("grouping a Done column by day", () => {
  type Card = { id: number; completedOn: string | null }
  const cards = (...days: (string | null)[]): Card[] => days.map((d, i) => ({ id: i, completedOn: d }))
  const dayOf = (c: Card) => c.completedOn

  it("newest day first, one group per day", () => {
    const groups = groupByCompletionDay(cards("2026-11-08", "2026-11-04", "2026-11-08", "2026-11-05"), dayOf, TODAY)
    expect(groups.map((g) => [g.dayIso, g.rows.length])).toEqual([
      ["2026-11-08", 2],
      ["2026-11-05", 1],
      ["2026-11-04", 1],
    ])
    expect(groups[0].label).toBe("Today")
    expect(groups[0].rows.map((r) => r.id)).toEqual([0, 2])
  })

  it("draws nothing for a card with no completion day", () => {
    expect(groupByCompletionDay(cards(null, null), dayOf, TODAY)).toEqual([])
    expect(groupByCompletionDay([], dayOf, TODAY)).toEqual([])
  })

  it("puts the cards the page says belong to the drawn day on that day", () => {
    // A schedule's Done card was finished when its occurrence row was closed, which is the day
    // being drawn; the page answers that with its own accessor.
    const groups = groupByCompletionDay(cards(null, "2026-11-08"), (c) => c.completedOn ?? "2026-11-08", TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0].rows).toHaveLength(2)
  })

  it("names a day the way the board names a day", () => {
    const groups = groupByCompletionDay(cards("2026-11-08", "2026-11-07", "2026-11-04", "2025-03-01"), dayOf, TODAY)
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Wed 4 Nov", "Sat 1 Mar 2025"])
  })
})

describe("naming the window on screen", () => {
  it("says today when the day drawn is today", () => {
    expect(doneWindowPhrase("day", true)).toBe("today")
    expect(doneWindowPhrase("week", true)).toBe("this week")
    expect(doneWindowPhrase("all", true)).toBe("total")
  })

  it("says which day when it is not", () => {
    expect(doneWindowPhrase("day", false)).toBe("on this day")
    expect(doneWindowPhrase("week", false)).toBe("in these 7 days")
    expect(doneWindowPhrase("all", false)).toBe("by this day")
  })

  it("counts what the window left out in the column's own words", () => {
    expect(earlierDoneLabel(0)).toBeNull()
    expect(earlierDoneLabel(1)).toBe("1 done earlier")
    expect(earlierDoneLabel(31)).toBe("31 done earlier")
  })

  it("labels a group header day on its own", () => {
    expect(completionDayLabel("2026-11-08", "2026-11-08")).toBe("Today")
    expect(completionDayLabel("2026-11-07", "2026-11-08")).toBe("Yesterday")
    expect(completionDayLabel("2026-11-06", "2026-11-08")).toBe("Fri 6 Nov")
    expect(completionDayLabel("2025-12-31", "2026-11-08")).toBe("Wed 31 Dec 2025")
  })
})
