import { describe, expect, it } from "vitest"
import { cadenceTotal, cadenceWeeks, statusCounts, turnaroundStats } from "@/lib/reports/overview"
import { REPORT_STATUSES, type ReportDto } from "@/lib/reports/report-fields"
import { REPORT_TEMPLATES } from "@/lib/reports/templates"

function report(overrides: Partial<ReportDto> = {}): ReportDto {
  return {
    id: 1,
    userId: 1,
    title: "A week",
    template: REPORT_TEMPLATES[0],
    periodType: "weekly",
    periodStart: "2026-11-09",
    periodEnd: "2026-11-15",
    status: "draft",
    content: {},
    metrics: null,
    revisionOf: null,
    submittedAt: null,
    acknowledgedAt: null,
    returnedNote: null,
    createdAt: "2026-11-18T09:00:00.000Z",
    updatedAt: "2026-11-18T09:00:00.000Z",
    ...overrides,
  }
}

describe("statusCounts", () => {
  it("reads zero for every status when there are no reports", () => {
    expect(statusCounts([])).toEqual({ draft: 0, submitted: 0, acknowledged: 0, returned: 0 })
  })

  it("counts each lifecycle phase once per report", () => {
    const reports = [
      report({ id: 1, status: "draft" }),
      report({ id: 2, status: "draft" }),
      report({ id: 3, status: "submitted" }),
      report({ id: 4, status: "acknowledged" }),
      report({ id: 5, status: "returned" }),
    ]
    expect(statusCounts(reports)).toEqual({ draft: 2, submitted: 1, acknowledged: 1, returned: 1 })
  })

  it("covers exactly the declared status vocabulary", () => {
    expect(Object.keys(statusCounts([]))).toEqual([...REPORT_STATUSES])
  })
})

describe("cadenceWeeks", () => {
  // 2026-11-18 is a Wednesday; its Monday is 2026-11-16.
  const today = "2026-11-18"

  it("returns eight empty weeks ending on the current one when nothing was created", () => {
    const weeks = cadenceWeeks([], today, "UTC")
    expect(weeks).toHaveLength(8)
    expect(weeks[0].weekStart).toBe("2026-09-28")
    expect(weeks[7].weekStart).toBe("2026-11-16")
    expect(weeks.every((w) => w.count === 0)).toBe(true)
  })

  it("labels each week with its Monday's month and day", () => {
    const weeks = cadenceWeeks([], today, "UTC")
    expect(weeks[0].label).toBe("Sep 28")
    expect(weeks[7].label).toBe("Nov 16")
  })

  it("puts a report created today in the current week", () => {
    const weeks = cadenceWeeks([report({ createdAt: "2026-11-18T09:00:00.000Z" })], today, "UTC")
    expect(weeks[7].count).toBe(1)
    expect(weeks.slice(0, 7).every((w) => w.count === 0)).toBe(true)
  })

  it("buckets by the Monday of the creation week, not the period covered", () => {
    // Created Nov 2 (a Monday) but covering the previous week: the bar belongs to Nov 2.
    const weeks = cadenceWeeks(
      [report({ createdAt: "2026-11-02T10:00:00.000Z", periodStart: "2026-10-26", periodEnd: "2026-11-01" })],
      today,
      "UTC",
    )
    expect(weeks.find((w) => w.weekStart === "2026-11-02")?.count).toBe(1)
    expect(weeks.find((w) => w.weekStart === "2026-10-26")?.count).toBe(0)
  })

  it("drops reports created before the window", () => {
    const weeks = cadenceWeeks([report({ createdAt: "2026-09-01T10:00:00.000Z" })], today, "UTC")
    expect(weeks.every((w) => w.count === 0)).toBe(true)
  })

  it("counts several reports in one week together", () => {
    const weeks = cadenceWeeks(
      [
        report({ id: 1, createdAt: "2026-11-16T08:00:00.000Z" }),
        report({ id: 2, createdAt: "2026-11-17T08:00:00.000Z" }),
        report({ id: 3, createdAt: "2026-11-18T08:00:00.000Z" }),
      ],
      today,
      "UTC",
    )
    expect(weeks[7].count).toBe(3)
  })

  it("reads the creation instant in the member's zone, so a Sunday-night UTC report lands on Monday in Auckland", () => {
    // 2026-11-15T23:00Z is Sunday in UTC but Monday 12:00 in Pacific/Auckland (+13).
    const created = "2026-11-15T23:00:00.000Z"
    const utc = cadenceWeeks([report({ createdAt: created })], today, "UTC")
    const akld = cadenceWeeks([report({ createdAt: created })], today, "Pacific/Auckland")
    expect(utc.find((w) => w.weekStart === "2026-11-09")?.count).toBe(1)
    expect(akld.find((w) => w.weekStart === "2026-11-16")?.count).toBe(1)
  })

  it("honours a shorter window", () => {
    const weeks = cadenceWeeks([], today, "UTC", 4)
    expect(weeks).toHaveLength(4)
    expect(weeks[0].weekStart).toBe("2026-10-26")
    expect(weeks[3].weekStart).toBe("2026-11-16")
  })

  it("totals the window for the caption", () => {
    const weeks = cadenceWeeks(
      [
        report({ id: 1, createdAt: "2026-11-16T08:00:00.000Z" }),
        report({ id: 2, createdAt: "2026-11-02T08:00:00.000Z" }),
        report({ id: 3, createdAt: "2026-09-01T08:00:00.000Z" }),
      ],
      today,
      "UTC",
    )
    expect(cadenceTotal(weeks)).toBe(2)
    expect(cadenceTotal(cadenceWeeks([], today, "UTC"))).toBe(0)
  })
})

describe("turnaroundStats", () => {
  it("reads zero and null when there is nothing to measure", () => {
    expect(turnaroundStats([])).toEqual({
      awaiting: 0,
      acknowledged: 0,
      returned: 0,
      avgDays: null,
      fastestDays: null,
      slowestDays: null,
    })
  })

  it("counts the phases that matter to a sender", () => {
    const reports = [
      report({ id: 1, status: "draft" }),
      report({ id: 2, status: "submitted" }),
      report({ id: 3, status: "submitted" }),
      report({ id: 4, status: "acknowledged" }),
      report({ id: 5, status: "returned" }),
    ]
    const stats = turnaroundStats(reports)
    expect(stats.awaiting).toBe(2)
    expect(stats.acknowledged).toBe(1)
    expect(stats.returned).toBe(1)
  })

  it("measures submit-to-acknowledge in days, to one decimal", () => {
    const stats = turnaroundStats([
      report({
        status: "acknowledged",
        submittedAt: "2026-11-10T09:00:00.000Z",
        acknowledgedAt: "2026-11-12T21:00:00.000Z",
      }),
    ])
    expect(stats.avgDays).toBe(2.5)
    expect(stats.fastestDays).toBe(2.5)
    expect(stats.slowestDays).toBe(2.5)
  })

  it("averages several turnarounds and keeps the extremes", () => {
    const stats = turnaroundStats([
      report({
        id: 1,
        status: "acknowledged",
        submittedAt: "2026-11-10T09:00:00.000Z",
        acknowledgedAt: "2026-11-12T21:00:00.000Z",
      }),
      report({
        id: 2,
        status: "acknowledged",
        submittedAt: "2026-11-10T00:00:00.000Z",
        acknowledgedAt: "2026-11-11T00:00:00.000Z",
      }),
    ])
    expect(stats.avgDays).toBe(1.8)
    expect(stats.fastestDays).toBe(1)
    expect(stats.slowestDays).toBe(2.5)
  })

  it("keeps a same-day acknowledgement as a fraction of a day", () => {
    const stats = turnaroundStats([
      report({
        status: "acknowledged",
        submittedAt: "2026-11-10T00:00:00.000Z",
        acknowledgedAt: "2026-11-10T12:00:00.000Z",
      }),
    ])
    expect(stats.avgDays).toBe(0.5)
  })

  it("ignores an acknowledgement stamped before its submission", () => {
    const stats = turnaroundStats([
      report({
        status: "acknowledged",
        submittedAt: "2026-11-12T09:00:00.000Z",
        acknowledgedAt: "2026-11-10T09:00:00.000Z",
      }),
    ])
    expect(stats.acknowledged).toBe(1)
    expect(stats.avgDays).toBeNull()
    expect(stats.fastestDays).toBeNull()
    expect(stats.slowestDays).toBeNull()
  })

  it("needs both stamps before it measures anything", () => {
    const stats = turnaroundStats([
      report({ status: "acknowledged", submittedAt: "2026-11-10T09:00:00.000Z", acknowledgedAt: null }),
      report({ status: "submitted", submittedAt: null, acknowledgedAt: null }),
    ])
    expect(stats.avgDays).toBeNull()
    expect(stats.awaiting).toBe(1)
  })
})