import { describe, expect, it } from "vitest"
import { promoteTaskValues, type PromotableItem } from "@/lib/planner/promote-values"

const item = (over: Partial<PromotableItem> = {}): PromotableItem => ({
  title: "Renew the firewall licence",
  description: "Before it lapses.",
  estimatePoints: 3,
  startDate: "2026-11-10",
  dueDate: "2026-11-30",
  discipline: "it_support",
  cadence: null,
  ...over,
})

describe("promoteTaskValues", () => {
  it("keeps a known cadence and marks the row as a schedule", () => {
    const values = promoteTaskValues(item({ cadence: "daily" }), { id: 7 })
    expect(values.cadence).toBe("daily")
    expect(values.isTemplate).toBe(true)
  })

  it("treats no cadence as a one-off task", () => {
    const values = promoteTaskValues(item(), { id: 7 })
    expect(values.cadence).toBe("one-off")
    expect(values.isTemplate).toBe(false)
  })

  it("degrades an unknown cadence word instead of persisting it", () => {
    const values = promoteTaskValues(item({ cadence: "fortnightly" }), { id: 7 })
    expect(values.cadence).toBe("one-off")
    expect(values.isTemplate).toBe(false)
  })

  it("assigns the promoted task to the promoter, every time", () => {
    for (const cadence of ["daily", "monthly", null, "nonsense"] as const) {
      expect(promoteTaskValues(item({ cadence }), { id: 42 }).assigneeId).toBe(42)
    }
  })

  it("carries the item's own fields through", () => {
    const values = promoteTaskValues(item({ cadence: "quarterly" }), { id: 7 })
    expect(values).toMatchObject({
      title: "Renew the firewall licence",
      description: "Before it lapses.",
      status: "todo",
      priority: "medium",
      storyPoints: 3,
      startDate: "2026-11-10",
      dueDate: "2026-11-30",
      discipline: "it_support",
    })
  })
})
