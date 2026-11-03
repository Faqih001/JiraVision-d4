import { describe, expect, it } from "vitest"
import { MAX_ORG_NAME, validateOrgName, visibleIdsFor } from "@/lib/organizations"

describe("validateOrgName", () => {
  it("trims and accepts a normal name", () => {
    expect(validateOrgName("  AAC Kenya  ")).toEqual({ ok: true, name: "AAC Kenya" })
  })

  it("rejects empty, non-string and over-long names", () => {
    expect(validateOrgName("").ok).toBe(false)
    expect(validateOrgName("   ").ok).toBe(false)
    expect(validateOrgName(undefined).ok).toBe(false)
    expect(validateOrgName(42).ok).toBe(false)
    expect(validateOrgName("x".repeat(MAX_ORG_NAME + 1)).ok).toBe(false)
    expect(validateOrgName("x".repeat(MAX_ORG_NAME)).ok).toBe(true)
  })
})

describe("visibleIdsFor", () => {
  it("returns only the viewer for a personal account", () => {
    expect(visibleIdsFor(null, 7, [1, 2, 3])).toEqual([7])
  })

  it("returns the org roster for a member", () => {
    expect(visibleIdsFor(3, 7, [7, 8])).toEqual([7, 8])
  })

  it("never hides the viewer when roster reads come back empty", () => {
    expect(visibleIdsFor(3, 7, [])).toEqual([7])
  })
})
