import { describe, expect, it } from "vitest"
import {
  buildRecommendations,
  readAiSuggestions,
  type RecommendInput,
} from "@/lib/recommend/next"

const base: RecommendInput = {
  today: "2026-10-27",
  registers: [],
  entriesToday: 0,
  deliverables: [],
  periods: [],
  career: null,
}

const staleRegister = {
  id: 7,
  title: "IP addressing document",
  status: "in_service",
  lastVerifiedAt: "2026-06-01",
  verifyIntervalDays: 30,
  fields: {},
  staleness: "stale" as const,
}

describe("buildRecommendations", () => {
  it("fires only the log nudge for a calm member with nothing logged", () => {
    const result = buildRecommendations(base)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe("missing_log")
    expect(result[0].href).toBe("/dashboard/worklog")
  })

  it("puts a stale register first and names its interval", () => {
    const result = buildRecommendations({ ...base, entriesToday: 2, registers: [staleRegister] })
    expect(result[0].kind).toBe("stale_register")
    expect(result[0].why).toContain("30")
    expect(result[0].refs).toEqual([{ table: "register_items", id: 7 }])
  })

  it("surfaces a never-verified row only when an interval is set", () => {
    const withInterval = buildRecommendations({
      ...base,
      entriesToday: 1,
      registers: [{ ...staleRegister, id: 8, lastVerifiedAt: null, staleness: "unknown" }],
    })
    expect(withInterval.some((entry) => entry.kind === "stale_register" && entry.refs[0].id === 8)).toBe(true)

    const noInterval = buildRecommendations({
      ...base,
      entriesToday: 1,
      registers: [{ ...staleRegister, id: 9, lastVerifiedAt: null, verifyIntervalDays: null, staleness: "unknown" }],
    })
    expect(noInterval.some((entry) => entry.refs[0]?.id === 9)).toBe(false)
  })

  it("fires an overdue renewal only when the stored date has passed", () => {
    const overdue = buildRecommendations({
      ...base,
      entriesToday: 1,
      registers: [{ ...staleRegister, id: 11, lastVerifiedAt: "2026-10-20", staleness: "fresh", fields: { renewal: "2026-10-01" } }],
    })
    expect(overdue.some((entry) => entry.kind === "overdue_renewal")).toBe(true)

    const future = buildRecommendations({
      ...base,
      entriesToday: 1,
      registers: [{ ...staleRegister, id: 12, lastVerifiedAt: "2026-10-20", staleness: "fresh", fields: { renewal: "2026-12-01" } }],
    })
    expect(future.some((entry) => entry.kind === "overdue_renewal")).toBe(false)
  })

  it("waits three days before calling a review stuck", () => {
    const twoDays = buildRecommendations({
      ...base,
      entriesToday: 1,
      deliverables: [{ id: 3, name: "Backup restore test", status: "in_review", updatedOn: "2026-10-25" }],
    })
    expect(twoDays.some((entry) => entry.kind === "deliverable_stuck")).toBe(false)

    const threeDays = buildRecommendations({
      ...base,
      entriesToday: 1,
      deliverables: [{ id: 3, name: "Backup restore test", status: "in_review", updatedOn: "2026-10-24" }],
    })
    expect(threeDays.some((entry) => entry.kind === "deliverable_stuck")).toBe(true)
  })

  it("names the largest career gap with its real numbers", () => {
    const result = buildRecommendations({
      ...base,
      entriesToday: 1,
      career: {
        levelId: 42,
        nextTitle: "Senior IT technician",
        gaps: [
          { key: "incident", label: "Incidents resolved", actual: 3, target: 10 },
          { key: "document", label: "Documents written", actual: 1, target: 2 },
        ],
      },
    })
    const gap = result.find((entry) => entry.kind === "career_gap")
    expect(gap?.why).toContain("Incidents resolved")
    expect(gap?.why).toContain("3")
    expect(gap?.why).toContain("10")
    expect(gap?.refs).toEqual([{ table: "career_levels", id: 42 }])
  })

  it("asks for a report only for a period that has work in it", () => {
    const result = buildRecommendations({
      ...base,
      entriesToday: 1,
      periods: [
        { periodType: "weekly", periodStart: "2026-10-19", periodEnd: "2026-10-25", hasEntries: true, hasReport: false },
        { periodType: "monthly", periodStart: "2026-09-01", periodEnd: "2026-09-30", hasEntries: false, hasReport: false },
      ],
    })
    const reports = result.filter((entry) => entry.kind === "report_missing")
    expect(reports).toHaveLength(1)
    expect(reports[0].why).toContain("2026-10-19")
  })

  it("orders by confidence and caps the list", () => {
    const registers = Array.from({ length: 10 }, (_, index) => ({
      ...staleRegister,
      id: 100 + index,
      title: `Document ${index}`,
    }))
    const result = buildRecommendations({ ...base, entriesToday: 2, registers }, 8)
    expect(result).toHaveLength(8)
    const confidences = result.map((entry) => entry.confidence)
    expect([...confidences].sort((a, b) => b - a)).toEqual(confidences)
  })
})

describe("readAiSuggestions", () => {
  const input: RecommendInput = {
    ...base,
    entriesToday: 2,
    registers: [staleRegister],
    deliverables: [{ id: 3, name: "Backup restore test", status: "in_review", updatedOn: "2026-10-20" }],
  }

  const suggestion = {
    why: "Document 7 was last verified on 2026-06-01 and its 30-day renewal is due.",
    action: "Open the register",
    href: "/dashboard/registers",
    confidence: 0.6,
    refs: [{ table: "register_items", id: 7 }],
  }

  it("keeps a suggestion whose refs exist and whose numbers are in the input", () => {
    const result = readAiSuggestions({ suggestions: [suggestion] }, input)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe("ai")
    expect(result[0].refs).toEqual([{ table: "register_items", id: 7 }])
  })

  it("drops a suggestion that names a row the member cannot see", () => {
    expect(() =>
      readAiSuggestions({ suggestions: [{ ...suggestion, refs: [{ table: "register_items", id: 999 }] }] }, input),
    ).toThrow(/no suggestion survived/i)
  })

  it("drops a suggestion whose href is not an internal page", () => {
    expect(() =>
      readAiSuggestions({ suggestions: [{ ...suggestion, href: "https://evil.example/x" }] }, input),
    ).toThrow(/no suggestion survived/i)
  })

  it("drops a suggestion that invents a number", () => {
    expect(() =>
      readAiSuggestions({ suggestions: [{ ...suggestion, why: "You are 42 days behind." }] }, input),
    ).toThrow(/no suggestion survived/i)
  })

  it("drops a suggestion with no refs at all", () => {
    expect(() => readAiSuggestions({ suggestions: [{ ...suggestion, refs: [] }] }, input)).toThrow(
      /no suggestion survived/i,
    )
  })
})
