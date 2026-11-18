import { describe, expect, it } from "vitest"
import { METRIC_KEYS } from "@/lib/reports/aggregate"
import {
  CHART_KEYS,
  CHART_LABEL,
  LEADING_METRICS,
  METRIC_LABEL,
  PROSE_SECTIONS,
  REPORT_CHARTS,
  REPORT_SECTIONS,
  REPORT_TEMPLATES,
  SECTION_ORDER,
  SECTION_SOURCE,
  SECTION_TITLE,
  emptyContent,
  formatMetricValue,
  isProseSection,
  isReportTemplate,
} from "@/lib/reports/templates"

describe("the ten sections", () => {
  it("declares the spec's ten in order, each with a title and a source", () => {
    expect(REPORT_SECTIONS.map((s) => s.key)).toEqual([
      "header",
      "summary",
      "completed",
      "deliverables",
      "inProgress",
      "blocked",
      "overdue",
      "nextPeriod",
      "metrics",
      "notes",
    ])
    for (const section of REPORT_SECTIONS) {
      expect(SECTION_TITLE[section.key]).toBeTruthy()
      expect(["server", "author", "both"]).toContain(SECTION_SOURCE[section.key])
    }
  })

  it("keeps Header and Metrics server-owned so nobody can type a number into them", () => {
    expect(SECTION_SOURCE.header).toBe("server")
    expect(SECTION_SOURCE.metrics).toBe("server")
    expect(SECTION_SOURCE.summary).toBe("author")
    expect(SECTION_SOURCE.notes).toBe("author")
    expect(isProseSection("metrics")).toBe(false)
    expect(isProseSection("blocked")).toBe(true)
  })

  it("lists as prose exactly the sections the member types into", () => {
    expect([...PROSE_SECTIONS].sort()).toEqual(
      REPORT_SECTIONS.filter((s) => SECTION_SOURCE[s.key] !== "server").map((s) => s.key).sort(),
    )
  })
})

describe("the universal report", () => {
  it("keeps the stored template vocabulary so old rows still validate", () => {
    // The column stays for rows written before templates were retired; the UI no longer offers
    // a choice, but a stored "technical" must still read as a known value, not a crash.
    expect(REPORT_TEMPLATES).toContain("general")
    expect(isReportTemplate("assurance")).toBe(true)
    expect(isReportTemplate("Assurance")).toBe(false)
    expect(isReportTemplate("sprint")).toBe(false)
  })

  it("reads every section in the one canonical order, exactly once", () => {
    expect(SECTION_ORDER).toEqual(REPORT_SECTIONS.map((s) => s.key))
    expect(new Set(SECTION_ORDER).size).toBe(SECTION_ORDER.length)
    expect(SECTION_ORDER[0]).toBe("header")
    expect(SECTION_ORDER[SECTION_ORDER.length - 1]).toBe("notes")
  })

  it("leads with at most six metrics that the aggregate actually computes", () => {
    expect(LEADING_METRICS.length).toBeGreaterThan(0)
    expect(LEADING_METRICS.length).toBeLessThanOrEqual(6)
    expect(new Set(LEADING_METRICS).size).toBe(LEADING_METRICS.length)
    for (const metric of LEADING_METRICS) expect(METRIC_KEYS).toContain(metric)
  })

  it("labels every metric the aggregate can produce", () => {
    // The KPI strip indexes METRIC_LABEL by MetricKey, so a missing label is a hole in a
    // supervisor-facing document, not a styling problem.
    for (const metric of METRIC_KEYS) expect(METRIC_LABEL[metric]).toBeTruthy()
    expect(Object.keys(METRIC_LABEL).sort()).toEqual([...METRIC_KEYS].sort())
  })

  it("charts only declared charts, and at least one", () => {
    expect(REPORT_CHARTS.length).toBeGreaterThan(0)
    expect(new Set(REPORT_CHARTS).size).toBe(REPORT_CHARTS.length)
    for (const chart of REPORT_CHARTS) {
      expect(CHART_KEYS).toContain(chart)
      expect(CHART_LABEL[chart]).toBeTruthy()
    }
  })

  it("reads the minutes metric as time and every other metric as a count", () => {
    expect(formatMetricValue("minutes", { value: 95, refs: ["entry:1", "entry:2"] })).toBe("1h 35m")
    expect(formatMetricValue("completedTasks", { value: 3, refs: ["task:1"] })).toBe("3")
    expect(formatMetricValue("storyPointsCompleted", { value: 8, refs: ["task:1"] })).toBe("8")
  })

  it("says nothing was logged instead of printing 0m on a quiet period", () => {
    expect(formatMetricValue("minutes", { value: 0, refs: [] })).toBe("None logged")
  })

  it("never lets a metric reach the strip as an empty string", () => {
    for (const key of METRIC_KEYS) {
      expect(formatMetricValue(key, { value: 0, refs: [] })).toBeTruthy()
    }
  })
})

describe("emptyContent", () => {
  it("opens every prose section with empty text and nothing else", () => {
    const content = emptyContent()
    expect(Object.keys(content).sort()).toEqual([...PROSE_SECTIONS].sort())
    for (const key of PROSE_SECTIONS) expect(content[key]).toEqual({ text: "" })
    expect(content.metrics).toBeUndefined()
  })
})