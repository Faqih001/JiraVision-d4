import { describe, expect, it } from "vitest"
import {
  senioritySource,
  seniorityTierOf,
  tierFromCareerLevel,
} from "@/lib/career/seniority"

describe("tierFromCareerLevel", () => {
  it("maps the four rungs onto the three load bands", () => {
    expect(tierFromCareerLevel(1)).toBe(1)
    expect(tierFromCareerLevel(2)).toBe(2)
    expect(tierFromCareerLevel(3)).toBe(3)
    expect(tierFromCareerLevel(4)).toBe(3)
  })

  it("returns null for anything that is not a rung", () => {
    expect(tierFromCareerLevel(null)).toBeNull()
    expect(tierFromCareerLevel(undefined)).toBeNull()
    expect(tierFromCareerLevel(0)).toBeNull()
    expect(tierFromCareerLevel(5)).toBeNull()
    expect(tierFromCareerLevel(2.5)).toBeNull()
  })
})

describe("seniorityTierOf", () => {
  it("prefers a real placement over the job-title heuristic", () => {
    expect(seniorityTierOf("Principal Engineer", "user", 1)).toBe(1)
    expect(seniorityTierOf("Junior Developer", "user", 4)).toBe(3)
  })

  it("falls back to the heuristic when there is no placement", () => {
    expect(seniorityTierOf("Junior Developer", "user", null)).toBe(1)
    expect(seniorityTierOf("Developer", "user", null)).toBe(2)
    expect(seniorityTierOf("Head of Operations", null, null)).toBe(3)
  })

  it("keeps the heuristic case-insensitive", () => {
    expect(seniorityTierOf("LEAD DESIGNER", null)).toBe(3)
    expect(seniorityTierOf(null, "INTERN")).toBe(1)
  })

  it("uses the heuristic for a level outside the ladder", () => {
    expect(seniorityTierOf("Developer", "user", 9)).toBe(2)
  })
})

describe("senioritySource", () => {
  it("names which source decided the tier", () => {
    expect(senioritySource(2)).toBe("placement")
    expect(senioritySource(null)).toBe("job_title")
    expect(senioritySource(9)).toBe("job_title")
  })
})
