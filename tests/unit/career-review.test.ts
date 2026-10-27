import { describe, expect, it } from "vitest"
import {
  CAREER_REQUEST_STATUSES,
  MAX_CHECKLIST_ITEMS,
  canReview,
  isCareerRequestStatus,
  isOpenRequest,
  latestRequest,
  nextLevelOf,
  readChecklist,
  readTargets,
} from "@/lib/career/review"

describe("request status vocabulary", () => {
  it("lists the four states in lifecycle order", () => {
    expect([...CAREER_REQUEST_STATUSES]).toEqual(["draft", "submitted", "approved", "returned"])
  })

  it("recognises only those four", () => {
    expect(isCareerRequestStatus("submitted")).toBe(true)
    expect(isCareerRequestStatus("cancelled")).toBe(false)
    expect(isCareerRequestStatus(null)).toBe(false)
  })

  it("treats draft and submitted as open, and the outcomes as closed", () => {
    expect(isOpenRequest("draft")).toBe(true)
    expect(isOpenRequest("submitted")).toBe(true)
    expect(isOpenRequest("approved")).toBe(false)
    expect(isOpenRequest("returned")).toBe(false)
    expect(isOpenRequest(undefined)).toBe(false)
  })

  it("lets an admin review only a submitted request", () => {
    expect(canReview("submitted")).toBe(true)
    expect(canReview("draft")).toBe(false)
    expect(canReview("approved")).toBe(false)
    expect(canReview("returned")).toBe(false)
  })
})

describe("nextLevelOf", () => {
  it("moves one rung at a time", () => {
    expect(nextLevelOf(1)).toBe(2)
    expect(nextLevelOf(2)).toBe(3)
    expect(nextLevelOf(3)).toBe(4)
  })

  it("has no rung above 4 and nothing below 1", () => {
    expect(nextLevelOf(4)).toBeNull()
    expect(nextLevelOf(0)).toBeNull()
    expect(nextLevelOf(5)).toBeNull()
    expect(nextLevelOf(2.5)).toBeNull()
  })
})

describe("latestRequest", () => {
  it("returns the newest row by requestedAt", () => {
    const rows = [
      { id: 1, requestedAt: "2026-09-01T10:00:00.000Z" },
      { id: 2, requestedAt: "2026-10-01T10:00:00.000Z" },
      { id: 3, requestedAt: "2026-09-15T10:00:00.000Z" },
    ]
    expect(latestRequest(rows)?.id).toBe(2)
  })

  it("returns null for an empty list and tolerates Date values", () => {
    expect(latestRequest([])).toBeNull()
    const rows = [
      { id: 1, requestedAt: new Date("2026-10-02T00:00:00.000Z") },
      { id: 2, requestedAt: new Date("2026-10-03T00:00:00.000Z") },
    ]
    expect(latestRequest(rows)?.id).toBe(2)
  })
})

describe("readChecklist", () => {
  it("accepts trimmed items and an optional hint", () => {
    const result = readChecklist([
      { key: " l3-code ", label: " Ships reviewed code ", hint: " Two reviewers " },
      { key: "l3-review", label: "Reviews peers" },
    ])
    expect(result).toEqual({
      ok: true,
      items: [
        { key: "l3-code", label: "Ships reviewed code", hint: "Two reviewers" },
        { key: "l3-review", label: "Reviews peers", hint: "" },
      ],
    })
  })

  it("accepts an empty checklist", () => {
    expect(readChecklist([])).toEqual({ ok: true, items: [] })
  })

  it("refuses a non-list", () => {
    expect(readChecklist(null).ok).toBe(false)
    expect(readChecklist({ key: "x" }).ok).toBe(false)
    expect(readChecklist("nope").ok).toBe(false)
  })

  it("refuses duplicate keys", () => {
    const result = readChecklist([
      { key: "same", label: "One" },
      { key: "same", label: "Two" },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/unique/i)
  })

  it("refuses an empty key or label", () => {
    expect(readChecklist([{ key: " ", label: "One" }]).ok).toBe(false)
    expect(readChecklist([{ key: "k", label: " " }]).ok).toBe(false)
  })

  it("caps the key at 80 characters because career_signoffs.item_key is 80", () => {
    const long = "k".repeat(81)
    const result = readChecklist([{ key: long, label: "Too long" }])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/80/)
  })

  it("refuses more than 20 items", () => {
    const items = Array.from({ length: MAX_CHECKLIST_ITEMS + 1 }, (_, i) => ({
      key: `k${i}`,
      label: `Item ${i}`,
    }))
    expect(readChecklist(items).ok).toBe(false)
  })
})

describe("readTargets", () => {
  it("accepts registry keys with non-negative integers", () => {
    expect(readTargets({ days_logged_90: 20, tasks_completed_90: 6 })).toEqual({
      ok: true,
      targets: { days_logged_90: 20, tasks_completed_90: 6 },
    })
  })

  it("accepts an empty object", () => {
    expect(readTargets({})).toEqual({ ok: true, targets: {} })
  })

  it("refuses unknown keys instead of silently dropping them", () => {
    const result = readTargets({ days_logged_90: 20, tenure_years: 3 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("tenure_years")
  })

  it("refuses negative, fractional, string and oversized values", () => {
    expect(readTargets({ days_logged_90: -1 }).ok).toBe(false)
    expect(readTargets({ days_logged_90: 1.5 }).ok).toBe(false)
    expect(readTargets({ days_logged_90: "20" }).ok).toBe(false)
    expect(readTargets({ days_logged_90: 1_000_001 }).ok).toBe(false)
  })

  it("refuses a non-object", () => {
    expect(readTargets(null).ok).toBe(false)
    expect(readTargets([]).ok).toBe(false)
  })
})
