import { describe, expect, it } from "vitest"
import { PROSE_SECTIONS } from "@/lib/reports/templates"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import {
  FORBIDDEN_REPORT_KEYS,
  MAX_CONTENT_KEYS,
  MAX_REPORT_TITLE,
  MAX_SECTION_TEXT,
  REPORT_MUTABLE_FIELDS,
  REPORT_STATUSES,
  isDraft,
  isFail,
  isReportStatus,
  parseStoredContent,
  parseStoredMetrics,
  pickReportUpdates,
  readContent,
  readReportCreate,
} from "@/lib/reports/report-fields"

const valid = {
  title: "Week of 26 Oct",
  template: "engineering",
  periodType: "weekly",
  periodStart: "2026-10-26",
  periodEnd: "2026-11-01",
}

describe("the report vocabulary", () => {
  it("lists the four lifecycle states, with draft first", () => {
    expect(REPORT_STATUSES).toEqual(["draft", "submitted", "acknowledged", "returned"])
    expect(isReportStatus("draft")).toBe(true)
    expect(isReportStatus("published")).toBe(false)
  })

  it("treats only draft as editable", () => {
    expect(isDraft("draft")).toBe(true)
    for (const status of ["submitted", "acknowledged", "returned"]) expect(isDraft(status)).toBe(false)
    expect(isDraft("anything else")).toBe(false)
  })

  it("declares the mutable fields and never overlaps them with the forbidden ones", () => {
    expect(REPORT_MUTABLE_FIELDS).toEqual([
      "title",
      "template",
      "periodType",
      "periodStart",
      "periodEnd",
      "content",
    ])
    for (const key of REPORT_MUTABLE_FIELDS) expect(FORBIDDEN_REPORT_KEYS).not.toContain(key)
    expect(FORBIDDEN_REPORT_KEYS).toContain("status")
    expect(FORBIDDEN_REPORT_KEYS).toContain("metrics")
    expect(FORBIDDEN_REPORT_KEYS).toContain("userId")
    expect(FORBIDDEN_REPORT_KEYS).toContain("revisionOf")
  })
})

describe("readReportCreate", () => {
  it("accepts a well-formed draft request", () => {
    const result = readReportCreate(valid)
    expect(isFail(result)).toBe(false)
    if (isFail(result)) return
    expect(result.value.title).toBe("Week of 26 Oct")
    expect(result.value.template).toBe("engineering")
    expect(result.value.periodType).toBe("weekly")
    expect(result.value.content).toEqual(Object.fromEntries(PROSE_SECTIONS.map((k) => [k, { text: "" }])))
  })

  it("refuses a non-object body", () => {
    for (const body of [null, undefined, "hi", 7, []]) {
      expect(isFail(readReportCreate(body))).toBe(true)
    }
  })

  it("refuses an empty, whitespace-only or over-long title by name", () => {
    expect(readReportCreate({ ...valid, title: "" })).toEqual({ error: "title is required" })
    expect(readReportCreate({ ...valid, title: "   " })).toEqual({ error: "title is required" })
    expect(readReportCreate({ ...valid, title: "x".repeat(201) })).toEqual({
      error: `title must be ${MAX_REPORT_TITLE} characters or fewer`,
    })
  })

  it("refuses an unknown template or period type instead of defaulting", () => {
    expect(readReportCreate({ ...valid, template: "sprint" })).toMatchObject({ error: /template/u })
    expect(readReportCreate({ ...valid, periodType: "fortnightly" })).toMatchObject({ error: /periodType/u })
  })

  it("refuses a malformed, reversed or impossible date pair", () => {
    expect(readReportCreate({ ...valid, periodStart: "26/10/2026" })).toMatchObject({ error: /periodStart/u })
    expect(readReportCreate({ ...valid, periodEnd: "2026-13-01" })).toMatchObject({ error: /periodEnd/u })
    expect(readReportCreate({ ...valid, periodStart: "2026-11-01", periodEnd: "2026-10-26" })).toEqual({
      error: "periodStart must be on or before periodEnd",
    })
  })

  it("refuses a range wider than the period cap", () => {
    expect(readReportCreate({ ...valid, periodStart: "2020-01-01", periodEnd: "2026-12-31" })).toMatchObject({
      error: /period is too long/u,
    })
  })

  it("names a forbidden key rather than dropping it quietly", () => {
    // A client that sends status:"submitted" must be told it cannot file its own report —
    // dropping it silently would leave a draft the member believes went in.
    for (const key of ["status", "userId", "metrics", "revisionOf", "submittedAt", "acknowledgedAt", "returnedNote"]) {
      const result = readReportCreate({ ...valid, [key]: "x" })
      expect(result).toMatchObject({ error: expect.stringContaining(key) })
    }
  })
})

describe("readContent", () => {
  const proseKey = PROSE_SECTIONS[0]!

  it("accepts trimmed text for a prose section", () => {
    expect(readContent({ [proseKey]: { text: "  Shipped two fixes  " } })).toEqual({
      value: { [proseKey]: { text: "Shipped two fixes" } },
    })
  })

  it("tolerates a plain string as shorthand for the text", () => {
    expect(readContent({ [proseKey]: "Notes here" })).toEqual({ value: { [proseKey]: { text: "Notes here" } } })
  })

  it("refuses a server-owned section by name", () => {
    expect(readContent({ metrics: { text: "9/10 excellent" } })).toMatchObject({
      error: expect.stringContaining("metrics"),
    })
    expect(readContent({ header: { text: "Signed by the CEO" } })).toMatchObject({
      error: expect.stringContaining("header"),
    })
  })

  it("refuses an unknown key rather than storing a section that renders nowhere", () => {
    expect(readContent({ achievements: { text: "everything" } })).toMatchObject({ error: /achievements/u })
  })

  it("refuses non-string text and an over-long section", () => {
    expect(readContent({ [proseKey]: { text: 42 } })).toMatchObject({ error: /text must be a string/u })
    expect(readContent({ [proseKey]: { text: "x".repeat(MAX_SECTION_TEXT + 1) } })).toMatchObject({
      error: new RegExp(String(MAX_SECTION_TEXT), "u"),
    })
  })

  it("refuses more sections than the report has", () => {
    const many = Object.fromEntries(
      Array.from({ length: MAX_CONTENT_KEYS + 1 }, (_, i) => [`section${i}`, { text: "x" }]),
    )
    expect(readContent(many)).toMatchObject({ error: /at most/u })
  })

  it("reads an absent or null body as empty content, not a failure", () => {
    expect(readContent(undefined)).toEqual({ value: {} })
    expect(readContent(null)).toEqual({ value: {} })
  })
})

describe("pickReportUpdates", () => {
  it("accepts a partial patch of the mutable fields only", () => {
    const result = pickReportUpdates({ title: "Renamed", content: { [PROSE_SECTIONS[0]!]: { text: "hello" } } }, "draft")
    expect(isFail(result)).toBe(false)
    if (isFail(result)) return
    expect(result.value).toEqual({ title: "Renamed", content: { [PROSE_SECTIONS[0]!]: { text: "hello" } } })
  })

  it("refuses an empty patch so a no-op click cannot bump updated_at", () => {
    expect(pickReportUpdates({}, "draft")).toEqual({ error: "nothing to update" })
    expect(pickReportUpdates(null, "draft")).toMatchObject({ error: /body/u })
  })

  it("refuses every forbidden key out loud, whatever the status", () => {
    expect(pickReportUpdates({ status: "submitted" }, "draft")).toMatchObject({ error: /status/u })
    expect(pickReportUpdates({ metrics: {} }, "draft")).toMatchObject({ error: /metrics/u })
    expect(pickReportUpdates({ userId: 9 }, "draft")).toMatchObject({ error: /userId/u })
    expect(pickReportUpdates({ revisionOf: 3 }, "draft")).toMatchObject({ error: /revisionOf/u })
  })

  it("locks a non-draft report and names the phase-4 way round", () => {
    for (const status of ["submitted", "acknowledged", "returned"]) {
      expect(pickReportUpdates({ title: "Sneaky" }, status)).toMatchObject({
        error: expect.stringContaining("locked"),
      })
    }
  })

  it("re-validates the period when a patch changes one half of it", () => {
    expect(pickReportUpdates({ periodStart: "2026-11-05", periodEnd: "2026-10-26" }, "draft")).toMatchObject({
      error: /periodStart/u,
    })
  })
})

describe("stored jsonb", () => {
  it("reads a legacy content blob of anything else as empty, never as a crash", () => {
    expect(parseStoredContent(null)).toEqual({})
    expect(parseStoredContent("string")).toEqual({})
    expect(parseStoredContent({ header: { text: "typed in" }, [PROSE_SECTIONS[0]!]: { text: "kept" } })).toEqual({
      [PROSE_SECTIONS[0]!]: { text: "kept" },
    })
  })

  it("returns null for metrics that are not this shape so the page can ask for a recompute", () => {
    expect(parseStoredMetrics(null)).toBeNull()
    expect(parseStoredMetrics("{}")).toBeNull()
    expect(parseStoredMetrics({ generatedAt: "2026-10-26T00:00:00.000Z", metrics: {} })).toBeNull()
    const aggregate = { generatedAt: "x", isEmpty: true, metrics: {}, period: {}, series: [] } as unknown as ReportAggregate
    expect(parseStoredMetrics(aggregate)).toBe(aggregate)
  })
})
