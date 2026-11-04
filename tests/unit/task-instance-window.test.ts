import { describe, expect, it } from "vitest"
import { HORIZON_OCCURRENCES } from "@/lib/tasks/recurrence"
import { planInstanceWindow, type InstanceWindowRow } from "@/lib/tasks/instance-window"

// The grid a member opens is a list of dated rows, and the old panel sorted it by date
// descending and kept ten — which for a daily task means the ten furthest future dates, with
// today's row sitting unreachable at the bottom. These tests pin the opposite: today first,
// the coming occurrences after it, and the days nobody worked reduced to a count.

function row(instanceDate: string, status = "todo"): InstanceWindowRow {
  return { instanceDate, status }
}

describe("planInstanceWindow", () => {
  const today = "2026-11-04"

  it("picks today's row out of the grid", () => {
    const instances = [row("2026-11-03"), row(today), row("2026-11-05")]
    const window = planInstanceWindow(instances, today)
    expect(window.today?.instanceDate).toBe(today)
  })

  it("reports no today row when the grid has none", () => {
    const window = planInstanceWindow([row("2026-11-06")], today)
    expect(window.today).toBeNull()
  })

  it("lists the coming occurrences ascending, today included first", () => {
    const instances = [
      row("2026-11-10"),
      row("2026-11-08"),
      row(today),
      row("2026-11-05"),
      row("2026-10-30"),
    ]
    const window = planInstanceWindow(instances, today)
    expect(window.upcoming.map((r) => r.instanceDate)).toEqual([
      today,
      "2026-11-05",
      "2026-11-08",
      "2026-11-10",
    ])
  })

  it("caps the list at the horizon so a 30-row grid stays scannable", () => {
    const instances = Array.from({ length: 30 }, (_, i) =>
      row(`2026-11-${String(i + 1).padStart(2, "0")}`),
    )
    const window = planInstanceWindow(instances, today)
    expect(window.upcoming).toHaveLength(HORIZON_OCCURRENCES)
    expect(window.upcoming[0].instanceDate).toBe(today)
    expect(window.upcoming[HORIZON_OCCURRENCES - 1].instanceDate).toBe("2026-11-10")
  })

  it("counts the days before today that are still open", () => {
    const instances = [
      row("2026-11-01"),
      row("2026-11-02", "done"),
      row("2026-11-03", "skipped"),
      row(today),
    ]
    const window = planInstanceWindow(instances, today)
    expect(window.missedCount).toBe(1)
  })

  it("does not hide the missed days entirely", () => {
    const instances = [row("2026-11-01"), row("2026-11-02"), row(today)]
    const window = planInstanceWindow(instances, today)
    expect(window.missedDates).toEqual(["2026-11-01", "2026-11-02"])
  })

  it("treats a missing date as not today", () => {
    const window = planInstanceWindow([{ instanceDate: null, status: "todo" }], today)
    expect(window.today).toBeNull()
    expect(window.upcoming).toEqual([])
    expect(window.missedCount).toBe(0)
  })

  it("survives an empty grid", () => {
    const window = planInstanceWindow([], today)
    expect(window).toEqual({ today: null, upcoming: [], missedDates: [], missedCount: 0 })
  })

  it("keeps the caller's rows, not copies of them", () => {
    const first = row(today)
    const window = planInstanceWindow([first], today)
    expect(window.today).toBe(first)
  })
})
