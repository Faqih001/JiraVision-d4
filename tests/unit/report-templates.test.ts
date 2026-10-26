import { describe, expect, it } from "vitest"
import { DISCIPLINE_TEMPLATE, WORK_DISCIPLINES } from "@/lib/roles"
import { METRIC_KEYS } from "@/lib/reports/aggregate"
import {
  CHART_LABEL,
  METRIC_LABEL,
  PROSE_SECTIONS,
  REPORT_SECTIONS,
  REPORT_TEMPLATES,
  SECTION_SOURCE,
  SECTION_TITLE,
  TEMPLATE_CHARTS,
  TEMPLATE_LABEL,
  TEMPLATE_METRICS,
  TEMPLATE_SECTIONS,
  emptyContent,
  isProseSection,
  isReportTemplate,
  sectionsFor,
  templateForDiscipline,
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

describe("the five templates", () => {
  it("matches the template ids already stored in lib/roles.ts", () => {
    // CATEGORY_TEMPLATE writes these five strings into DISCIPLINE_TEMPLATE; a sixth here, or a
    // rename, would leave a real discipline with no report shape.
    const roleTemplates = [...new Set(Object.values(DISCIPLINE_TEMPLATE))]
    expect([...REPORT_TEMPLATES].sort()).toEqual(roleTemplates.sort())
  })

  it("labels every template", () => {
    for (const key of REPORT_TEMPLATES) expect(TEMPLATE_LABEL[key]).toBeTruthy()
  })

  it("rejects an unknown template instead of defaulting", () => {
    expect(isReportTemplate("assurance")).toBe(true)
    expect(isReportTemplate("Assurance")).toBe(false)
    expect(isReportTemplate("sprint")).toBe(false)
  })

  it("gives every template all ten sections exactly once, in its own order", () => {
    for (const key of REPORT_TEMPLATES) {
      const order = TEMPLATE_SECTIONS[key]
      expect([...order].sort()).toEqual(REPORT_SECTIONS.map((s) => s.key).sort())
      expect(new Set(order).size).toBe(order.length)
      expect(order[0]).toBe("header")
      expect(order[order.length - 1]).toBe("notes")
    }
  })

  it("orders the templates the spec names, so the shape differs where it must", () => {
    // A technician's report must not lead with story points, and a developer's puts the sprint
    // work above the paperwork. The position of the row sections is where the difference lives;
    // metrics always sits second-from-last because every template keeps all ten.
    expect(sectionsFor("engineering").indexOf("completed")).toBeLessThan(
      sectionsFor("engineering").indexOf("deliverables"),
    )
    expect(sectionsFor("technical").indexOf("deliverables")).toBeLessThan(
      sectionsFor("technical").indexOf("completed"),
    )
    expect(sectionsFor("assurance").indexOf("deliverables")).toBeLessThan(
      sectionsFor("assurance").indexOf("completed"),
    )
    expect(TEMPLATE_METRICS.engineering[0]).toBe("storyPointsCompleted")
    expect(TEMPLATE_METRICS.technical[0]).toBe("deliverablesProduced")
    expect(TEMPLATE_METRICS.creative[0]).toBe("deliverablesProduced")
  })

  it("leads every template with at most six metrics that the aggregate actually computes", () => {
    for (const key of REPORT_TEMPLATES) {
      const metrics = TEMPLATE_METRICS[key]
      expect(metrics.length).toBeGreaterThan(0)
      expect(metrics.length).toBeLessThanOrEqual(6)
      expect(new Set(metrics).size).toBe(metrics.length)
      for (const metric of metrics) expect(METRIC_KEYS).toContain(metric)
    }
  })

  it("labels every metric the aggregate can produce", () => {
    // The KPI strip indexes METRIC_LABEL by MetricKey, so a missing label is a hole in a
    // supervisor-facing document, not a styling problem.
    for (const metric of METRIC_KEYS) expect(METRIC_LABEL[metric]).toBeTruthy()
    expect(Object.keys(METRIC_LABEL).sort()).toEqual([...METRIC_KEYS].sort())
  })

  it("gives every template at least one chart and only declared charts", () => {
    for (const key of REPORT_TEMPLATES) {
      expect(TEMPLATE_CHARTS[key].length).toBeGreaterThan(0)
      for (const chart of TEMPLATE_CHARTS[key]) expect(CHART_LABEL[chart]).toBeTruthy()
    }
  })
})

describe("templateForDiscipline", () => {
  it("resolves every one of the 75 disciplines to a real template", () => {
    for (const discipline of WORK_DISCIPLINES) {
      const template = templateForDiscipline(discipline)
      expect(REPORT_TEMPLATES).toContain(template)
    }
  })

  it("keeps the five spec disciplines on their five distinct shapes", () => {
    expect(templateForDiscipline("developer")).toBe("engineering")
    expect(templateForDiscipline("technician")).toBe("technical")
    expect(templateForDiscipline("designer")).toBe("creative")
    expect(templateForDiscipline("auditor")).toBe("assurance")
    expect(templateForDiscipline("coordinator")).toBe("general")
  })

  it("falls back to general for a null or unknown discipline, never a guess", () => {
    expect(templateForDiscipline(null)).toBe("general")
    expect(templateForDiscipline(undefined)).toBe("general")
    expect(templateForDiscipline("pile-of-rocks")).toBe("general")
    expect(templateForDiscipline("Developer")).toBe("general")
  })
})

describe("emptyContent", () => {
  it("opens every prose section with empty text and nothing else", () => {
    const content = emptyContent("assurance")
    expect(Object.keys(content).sort()).toEqual([...PROSE_SECTIONS].sort())
    for (const key of PROSE_SECTIONS) expect(content[key]).toEqual({ text: "" })
    expect(content.metrics).toBeUndefined()
  })

  it("is the same prose set for every template — the template changes order, not what a member may type", () => {
    for (const key of REPORT_TEMPLATES) {
      expect(Object.keys(emptyContent(key)).sort()).toEqual(Object.keys(emptyContent("general")).sort())
    }
  })
})
