// `sprints.completed` is a stored column, and the only thing that writes it is the sprint's own
// PUT (app/api/sprints/[id]/route.ts). Moving a card to Done never touches it, so the column
// holds whatever was last saved — including 0 for a sprint created and then worked in without
// ever being edited. Every meter that reads the column instead of the live task rows is wrong.
//
// The column still earns its keep for imported history: sprints 1-8 came in from a spreadsheet
// with their closed totals and no task rows behind them, so there is nothing to measure and the
// recorded figure is the only answer. This rule is the difference between those two cases.

import { describe, expect, it } from "vitest"
import { reportedCompleted } from "@/lib/sprints/completed"

describe("reportedCompleted", () => {
  it("reports the points actually done when the sprint has task rows", () => {
    // The common case: a sprint created at 0, worked in, never edited again.
    expect(reportedCompleted(0, { donePoints: 8, taskCount: 12 })).toBe(8)
  })

  it("drops a stale recorded figure once real work is behind the sprint", () => {
    expect(reportedCompleted(15, { donePoints: 4, taskCount: 9 })).toBe(4)
  })

  it("reports zero, not the old total, when nothing in the sprint is done", () => {
    expect(reportedCompleted(15, { donePoints: 0, taskCount: 9 })).toBe(0)
  })

  it("keeps the recorded figure for a sprint with no task rows to measure", () => {
    // Imported history: the spreadsheet total outlives the tasks it described.
    expect(reportedCompleted(34, { donePoints: 0, taskCount: 0 })).toBe(34)
  })

  it("says zero for a sprint that is both empty and never scored", () => {
    expect(reportedCompleted(0, { donePoints: 0, taskCount: 0 })).toBe(0)
  })
})
