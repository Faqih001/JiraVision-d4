// Production runs four sprints at once (2026-11-09 census: 4 active, 5 completed). Every surface
// that summarised "the active sprint" picked one of them with `sprints.find(...)`, so three were
// invisible: the kanban header named one, its capacity bar metered one, and /dashboard's sprint
// strip did the same. These four functions are the one place that decides what "active" means and
// what the workspace looks like while several are running.

import { describe, expect, it } from "vitest"
import {
  activeSprints,
  capacityPct,
  defaultSprintId,
  progressPct,
  summarizeActiveSprints,
  type SprintActivity,
} from "@/lib/sprints/active"

const sprint = (over: Partial<SprintActivity> & { id: number }): SprintActivity => ({
  name: `Sprint ${over.id}`,
  status: "active",
  capacity: 20,
  totalPoints: 10,
  donePoints: 5,
  startDate: "2026-11-01",
  endDate: "2026-11-14",
  ...over,
})

describe("activeSprints", () => {
  it("returns every active sprint, not the first", () => {
    const rows = [sprint({ id: 1 }), sprint({ id: 2 }), sprint({ id: 3, status: "completed" }), sprint({ id: 4 })]
    expect(activeSprints(rows).map((s) => s.id)).toEqual([1, 2, 4])
  })

  it("keeps the order the API sent, so the newest window stays on top", () => {
    const rows = [sprint({ id: 7, startDate: "2026-11-09" }), sprint({ id: 3, startDate: "2026-10-05" })]
    expect(activeSprints(rows).map((s) => s.id)).toEqual([7, 3])
  })

  it("treats a planned or closed sprint as not running", () => {
    expect(activeSprints([sprint({ id: 1, status: "planned" }), sprint({ id: 2, status: "planning" })])).toEqual([])
  })
})

describe("capacityPct", () => {
  it("meters committed points against the capacity the planner set", () => {
    expect(capacityPct(sprint({ id: 1, capacity: 40, totalPoints: 10 }))).toBe(25)
  })

  it("reports overcommit rather than capping at 100", () => {
    expect(capacityPct(sprint({ id: 1, capacity: 20, totalPoints: 34 }))).toBe(170)
  })

  it("has no opinion when capacity was never set", () => {
    // A 0% bar reads as spare room the sprint never promised. "—" is the honest answer.
    expect(capacityPct(sprint({ id: 1, capacity: 0, totalPoints: 12 }))).toBeNull()
  })
})

describe("progressPct", () => {
  it("is the share of committed points already done", () => {
    expect(progressPct(sprint({ id: 1, totalPoints: 40, donePoints: 10 }))).toBe(25)
  })

  it("is zero when nothing is committed", () => {
    expect(progressPct(sprint({ id: 1, totalPoints: 0, donePoints: 0 }))).toBe(0)
  })
})

describe("summarizeActiveSprints", () => {
  it("adds the workspace's running load across every active sprint", () => {
    const summary = summarizeActiveSprints([
      sprint({ id: 1, capacity: 20, totalPoints: 18, donePoints: 6, endDate: "2026-11-14" }),
      sprint({ id: 2, capacity: 30, totalPoints: 22, donePoints: 11, endDate: "2026-11-21" }),
      sprint({ id: 3, status: "completed" }),
    ])
    expect(summary).toMatchObject({ count: 2, committed: 40, done: 17, capacity: 50, overCapacity: false })
    expect(summary.capacityPct).toBe(80)
    expect(summary.progressPct).toBe(43)
  })

  it("calls the workspace over capacity when the running sprints together exceed it", () => {
    const summary = summarizeActiveSprints([
      sprint({ id: 1, capacity: 10, totalPoints: 14 }),
      sprint({ id: 2, capacity: 10, totalPoints: 12 }),
    ])
    expect(summary.overCapacity).toBe(true)
    expect(summary.capacityPct).toBe(130)
  })

  it("names the binding deadline as the earliest close, not the last", () => {
    // Four overlapping sprints: the one that ends first is the one the team can still miss.
    const summary = summarizeActiveSprints([
      sprint({ id: 1, endDate: "2026-11-28" }),
      sprint({ id: 2, endDate: "2026-11-12" }),
      sprint({ id: 3, endDate: "2026-11-19" }),
    ])
    expect(summary.nextEnds).toBe("2026-11-12")
  })

  it("ignores capacity nobody set rather than inventing a denominator", () => {
    const summary = summarizeActiveSprints([sprint({ id: 1, capacity: 0, totalPoints: 9 }), sprint({ id: 2, capacity: 0, totalPoints: 4 })])
    expect(summary.capacity).toBe(0)
    expect(summary.capacityPct).toBeNull()
    expect(summary.overCapacity).toBe(false)
    expect(summary.committed).toBe(13)
  })

  it("is an empty workspace when nothing is running", () => {
    expect(summarizeActiveSprints([])).toEqual({
      count: 0,
      committed: 0,
      done: 0,
      capacity: 0,
      capacityPct: null,
      overCapacity: false,
      progressPct: 0,
      nextEnds: null,
    })
  })
})

describe("defaultSprintId", () => {
  it("names the sprint a new card should land in when exactly one is running", () => {
    expect(defaultSprintId([sprint({ id: 4 }), sprint({ id: 9, status: "planned" })])).toBe(4)
  })

  it("declines to guess while several are running", () => {
    // Filing work into one of four live sprints on a hunch is worse than leaving the choice open.
    expect(defaultSprintId([sprint({ id: 4 }), sprint({ id: 5 })])).toBeNull()
  })

  it("is null when nothing is running", () => {
    expect(defaultSprintId([sprint({ id: 4, status: "completed" })])).toBeNull()
  })

  it("reads a lean picker row, which is all a dropdown carries", () => {
    expect(defaultSprintId([{ id: 2, name: "One", status: "active" }])).toBe(2)
  })
})
