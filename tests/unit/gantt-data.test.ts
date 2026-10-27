import { describe, it, expect } from "vitest"
import {
  buildGanttData,
  calculateDateRange,
  groupIntoLanes,
  calculateBarPosition,
  resolveDependencies,
  generateTimeAxisLabels,
  calculateMovedDates,
  type GanttItem,
} from "@/lib/planner/gantt-data"

describe("gantt-data", () => {
  const mockItems: GanttItem[] = [
    {
      id: 1,
      title: "Task 1",
      startDate: "2026-01-01",
      dueDate: "2026-01-07",
      status: "todo",
      discipline: "civil",
      assigneeId: 1,
      milestone: false,
      dependsOn: [],
    },
    {
      id: 2,
      title: "Task 2",
      startDate: "2026-01-05",
      dueDate: "2026-01-10",
      status: "in-progress",
      discipline: "electrical",
      assigneeId: 2,
      milestone: false,
      dependsOn: [0],
    },
    {
      id: 3,
      title: "Milestone",
      startDate: "2026-01-15",
      dueDate: "2026-01-15",
      status: "todo",
      discipline: "civil",
      assigneeId: 1,
      milestone: true,
      dependsOn: [1],
    },
  ]

  describe("calculateDateRange", () => {
    it("calculates range from items", () => {
      const range = calculateDateRange(mockItems)
      expect(range.start).toBeInstanceOf(Date)
      expect(range.end).toBeInstanceOf(Date)
      expect(range.days).toBeGreaterThan(0)
    })

    it("includes padding days", () => {
      const range = calculateDateRange(mockItems, 7)
      const firstItemStart = new Date("2026-01-01")
      const diffDays = Math.round(
        (firstItemStart.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24),
      )
      expect(diffDays).toBe(7)
    })

    it("handles empty items array", () => {
      const range = calculateDateRange([])
      expect(range.days).toBeGreaterThan(0)
    })

    it("handles items without dates", () => {
      const items: GanttItem[] = [
        {
          id: 1,
          title: "No dates",
          startDate: null,
          dueDate: null,
          status: "todo",
          discipline: null,
          assigneeId: null,
          milestone: false,
          dependsOn: [],
        },
      ]
      const range = calculateDateRange(items)
      expect(range.days).toBeGreaterThan(0)
    })
  })

  describe("groupIntoLanes", () => {
    it("groups by discipline", () => {
      const lanes = groupIntoLanes(mockItems, "discipline")
      expect(lanes.length).toBe(2)
      expect(lanes.find((l) => l.key === "civil")).toBeDefined()
      expect(lanes.find((l) => l.key === "electrical")).toBeDefined()
    })

    it("groups by assignee", () => {
      const lanes = groupIntoLanes(mockItems, "assignee")
      expect(lanes.length).toBe(2)
      expect(lanes.find((l) => l.key === "1")).toBeDefined()
      expect(lanes.find((l) => l.key === "2")).toBeDefined()
    })

    it("handles null discipline", () => {
      const items: GanttItem[] = [
        {
          id: 1,
          title: "No discipline",
          startDate: "2026-01-01",
          dueDate: "2026-01-07",
          status: "todo",
          discipline: null,
          assigneeId: null,
          milestone: false,
          dependsOn: [],
        },
      ]
      const lanes = groupIntoLanes(items, "discipline")
      expect(lanes[0].key).toBe("unassigned")
      expect(lanes[0].label).toBe("Unassigned")
    })

    it("preserves all items", () => {
      const lanes = groupIntoLanes(mockItems, "discipline")
      const totalItems = lanes.reduce((sum, lane) => sum + lane.items.length, 0)
      expect(totalItems).toBe(mockItems.length)
    })
  })

  describe("calculateBarPosition", () => {
    it("calculates position for item with dates", () => {
      const range = calculateDateRange(mockItems)
      const pos = calculateBarPosition(mockItems[0], range, "week", 40)
      expect(pos).not.toBeNull()
      expect(pos!.left).toBeGreaterThanOrEqual(0)
      expect(pos!.width).toBeGreaterThan(0)
    })

    it("returns null for item without dates", () => {
      const item: GanttItem = {
        id: 1,
        title: "No dates",
        startDate: null,
        dueDate: null,
        status: "todo",
        discipline: null,
        assigneeId: null,
        milestone: false,
        dependsOn: [],
      }
      const range = calculateDateRange(mockItems)
      const pos = calculateBarPosition(item, range, "week", 40)
      expect(pos).toBeNull()
    })

    it("adjusts for zoom level", () => {
      const range = calculateDateRange(mockItems)
      const dayPos = calculateBarPosition(mockItems[0], range, "day", 40)
      const weekPos = calculateBarPosition(mockItems[0], range, "week", 40)
      const monthPos = calculateBarPosition(mockItems[0], range, "month", 40)

      expect(dayPos).not.toBeNull()
      expect(weekPos).not.toBeNull()
      expect(monthPos).not.toBeNull()

      expect(dayPos!.width).toBeGreaterThan(weekPos!.width)
      expect(weekPos!.width).toBeGreaterThan(monthPos!.width)
    })
  })

  describe("resolveDependencies", () => {
    it("resolves dependency indices to IDs", () => {
      const deps = resolveDependencies(mockItems)
      expect(deps.get(2)).toEqual([1])
      expect(deps.get(3)).toEqual([2])
    })

    it("handles items without dependencies", () => {
      const deps = resolveDependencies(mockItems)
      expect(deps.get(1)).toBeUndefined()
    })

    it("ignores invalid indices", () => {
      const items: GanttItem[] = [
        {
          id: 1,
          title: "Task",
          startDate: "2026-01-01",
          dueDate: "2026-01-07",
          status: "todo",
          discipline: null,
          assigneeId: null,
          milestone: false,
          dependsOn: [99],
        },
      ]
      const deps = resolveDependencies(items)
      expect(deps.get(1)).toBeUndefined()
    })
  })

  describe("buildGanttData", () => {
    it("builds complete Gantt data structure", () => {
      const data = buildGanttData(mockItems, "discipline", "week")
      expect(data.lanes).toBeDefined()
      expect(data.dateRange).toBeDefined()
      expect(data.zoom).toBe("week")
      expect(data.lanes.length).toBeGreaterThan(0)
    })
  })

  describe("generateTimeAxisLabels", () => {
    it("generates day labels", () => {
      const range = calculateDateRange(mockItems)
      const labels = generateTimeAxisLabels(range, "day")
      expect(labels.length).toBeGreaterThan(0)
      expect(labels[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("generates week labels", () => {
      const range = calculateDateRange(mockItems)
      const labels = generateTimeAxisLabels(range, "week")
      expect(labels.length).toBeGreaterThan(0)
      expect(labels[0]).toMatch(/^Week \d+$/)
    })

    it("generates month labels", () => {
      const range = calculateDateRange(mockItems)
      const labels = generateTimeAxisLabels(range, "month")
      expect(labels.length).toBeGreaterThan(0)
    })
  })

  describe("calculateMovedDates", () => {
    it("calculates new dates with positive delta", () => {
      const newDates = calculateMovedDates(mockItems[0], 3)
      expect(newDates.startDate).toBe("2026-01-04")
      expect(newDates.dueDate).toBe("2026-01-10")
    })

    it("calculates new dates with negative delta", () => {
      const newDates = calculateMovedDates(mockItems[0], -1)
      expect(newDates.startDate).toBe("2025-12-31")
      expect(newDates.dueDate).toBe("2026-01-06")
    })

    it("returns original dates with zero delta", () => {
      const newDates = calculateMovedDates(mockItems[0], 0)
      expect(newDates.startDate).toBe("2026-01-01")
      expect(newDates.dueDate).toBe("2026-01-07")
    })

    it("handles null dates", () => {
      const item: GanttItem = {
        id: 1,
        title: "No dates",
        startDate: null,
        dueDate: null,
        status: "todo",
        discipline: null,
        assigneeId: null,
        milestone: false,
        dependsOn: [],
      }
      const newDates = calculateMovedDates(item, 5)
      expect(newDates.startDate).toBeNull()
      expect(newDates.dueDate).toBeNull()
    })
  })
})
