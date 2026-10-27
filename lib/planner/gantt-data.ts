// Gantt data model — pure functions to transform plan_items or tasks into Gantt lanes.
// No database imports; this module is testable without a connection.

export type GanttZoom = "day" | "week" | "month"
export type GanttGroupBy = "discipline" | "assignee"

export type GanttItem = {
  id: number
  title: string
  startDate: string | null
  dueDate: string | null
  status: string
  discipline: string | null
  assigneeId: number | null
  milestone: boolean
  dependsOn: number[]
}

export type GanttLane = {
  key: string
  label: string
  items: GanttItem[]
}

export type GanttDateRange = {
  start: Date
  end: Date
  days: number
}

export type GanttData = {
  lanes: GanttLane[]
  dateRange: GanttDateRange
  zoom: GanttZoom
}

const MS_PER_DAY = 86400000

function parseDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Calculate the date range that encompasses all items, with padding. */
export function calculateDateRange(items: GanttItem[], paddingDays: number = 7): GanttDateRange {
  const dates: Date[] = []

  for (const item of items) {
    if (item.startDate) dates.push(parseDate(item.startDate))
    if (item.dueDate) dates.push(parseDate(item.dueDate))
  }

  if (dates.length === 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return {
      start: today,
      end: addDays(today, 30),
      days: 30,
    }
  }

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  const start = addDays(minDate, -paddingDays)
  const end = addDays(maxDate, paddingDays)
  const days = daysBetween(start, end)

  return { start, end, days }
}

/** Group items into lanes by discipline or assignee. */
export function groupIntoLanes(items: GanttItem[], groupBy: GanttGroupBy): GanttLane[] {
  const laneMap = new Map<string, { label: string; items: GanttItem[] }>()

  for (const item of items) {
    let key: string
    let label: string

    if (groupBy === "discipline") {
      key = item.discipline || "unassigned"
      label = item.discipline || "Unassigned"
    } else {
      key = item.assigneeId !== null ? String(item.assigneeId) : "unassigned"
      label = item.assigneeId !== null ? `User ${item.assigneeId}` : "Unassigned"
    }

    if (!laneMap.has(key)) {
      laneMap.set(key, { label, items: [] })
    }
    laneMap.get(key)!.items.push(item)
  }

  return Array.from(laneMap.entries()).map(([key, { label, items }]) => ({
    key,
    label,
    items,
  }))
}

/** Calculate the pixel position and width for an item bar. */
export function calculateBarPosition(
  item: GanttItem,
  dateRange: GanttDateRange,
  zoom: GanttZoom,
  pixelsPerUnit: number,
): { left: number; width: number } | null {
  if (!item.startDate && !item.dueDate) return null

  const start = item.startDate ? parseDate(item.startDate) : parseDate(item.dueDate!)
  const end = item.dueDate ? parseDate(item.dueDate) : parseDate(item.startDate!)

  const startOffset = daysBetween(dateRange.start, start)
  const duration = daysBetween(start, end) + 1

  let pixelsPerDay: number
  switch (zoom) {
    case "day":
      pixelsPerDay = pixelsPerUnit
      break
    case "week":
      pixelsPerDay = pixelsPerUnit / 7
      break
    case "month":
      pixelsPerDay = pixelsPerUnit / 30
      break
  }

  return {
    left: startOffset * pixelsPerDay,
    width: duration * pixelsPerDay,
  }
}

/** Resolve dependency indices to actual item IDs. */
export function resolveDependencies(items: GanttItem[]): Map<number, number[]> {
  const deps = new Map<number, number[]>()

  for (const item of items) {
    const resolvedDeps = item.dependsOn
      .map((index) => items[index]?.id)
      .filter((id): id is number => id !== undefined)

    if (resolvedDeps.length > 0) {
      deps.set(item.id, resolvedDeps)
    }
  }

  return deps
}

/** Build the complete Gantt data structure from items. */
export function buildGanttData(
  items: GanttItem[],
  groupBy: GanttGroupBy,
  zoom: GanttZoom,
): GanttData {
  const lanes = groupIntoLanes(items, groupBy)
  const dateRange = calculateDateRange(items)

  return {
    lanes,
    dateRange,
    zoom,
  }
}

/** Generate time axis labels for the given zoom level. */
export function generateTimeAxisLabels(dateRange: GanttDateRange, zoom: GanttZoom): string[] {
  const labels: string[] = []
  const { start, days } = dateRange

  switch (zoom) {
    case "day":
      for (let i = 0; i < days; i++) {
        const date = addDays(start, i)
        labels.push(formatDate(date))
      }
      break
    case "week":
      const weeks = Math.ceil(days / 7)
      for (let i = 0; i < weeks; i++) {
        labels.push(`Week ${i + 1}`)
      }
      break
    case "month":
      const months = Math.ceil(days / 30)
      for (let i = 0; i < months; i++) {
        const monthStart = addDays(start, i * 30)
        const monthName = monthStart.toLocaleString("default", { month: "short" })
        labels.push(`${monthName} ${monthStart.getFullYear()}`)
      }
      break
  }

  return labels
}

/** Calculate new dates after a drag operation. */
export function calculateMovedDates(
  item: GanttItem,
  dayDelta: number,
): { startDate: string | null; dueDate: string | null } {
  if (dayDelta === 0) {
    return { startDate: item.startDate, dueDate: item.dueDate }
  }

  const newStart = item.startDate ? formatDate(addDays(parseDate(item.startDate), dayDelta)) : null
  const newDue = item.dueDate ? formatDate(addDays(parseDate(item.dueDate), dayDelta)) : null

  return { startDate: newStart, dueDate: newDue }
}
