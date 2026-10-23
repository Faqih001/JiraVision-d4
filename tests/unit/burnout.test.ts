import { describe, expect, it } from "vitest"

import {
  BURNOUT_FACTORS,
  burnoutRisk,
  type BurnoutInput,
} from "@/lib/calculations/burnout"

const input = (
  partial: Partial<BurnoutInput> & Partial<Record<keyof BurnoutInput, number>> = {},
): BurnoutInput => ({
  workload: 0,
  autonomy: 0,
  unclearAsks: 0,
  afterHours: 0,
  recognitionGap: 0,
  ...partial,
})

/** Uniform input across all five factors. Weights sum to 1, so score = value × 10. */
const uniform = (v: number): BurnoutInput =>
  input({ workload: v, autonomy: v, unclearAsks: v, afterHours: v, recognitionGap: v })

describe("burnoutRisk — score range", () => {
  it("keeps the factor weights summing to 1 (score = weighted mean × 10)", () => {
    const sum = BURNOUT_FACTORS.reduce((s, f) => s + f.weight, 0)
    expect(sum).toBeCloseTo(1, 10)
  })

  it.each([
    uniform(0),
    uniform(3),
    uniform(6.5),
    uniform(10),
    input({ workload: 10, afterHours: 10 }),
    input({ workload: -5, autonomy: 42 }), // clamped per factor
  ])("stays inside 0–100 for every input", (i) => {
    const { score } = burnoutRisk(i)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("maps all-zero input to 0 and max input to 100", () => {
    expect(burnoutRisk(input()).score).toBe(0)
    expect(burnoutRisk(uniform(10)).score).toBe(100)
  })
})

describe("burnoutRisk — band boundaries at 35 / 55 / 75", () => {
  it("34 is Steady, 35 flips to Watch", () => {
    expect(burnoutRisk(uniform(3.4)).band).toBe("Steady") // score 34
    expect(burnoutRisk(uniform(3.5)).band).toBe("Watch") // score 35
  })

  it("54 is Watch, 55 flips to Strained", () => {
    expect(burnoutRisk(uniform(5.4)).band).toBe("Watch") // score 54
    expect(burnoutRisk(uniform(5.5)).band).toBe("Strained") // score 55
  })

  it("74 is Strained, 75 flips to At risk", () => {
    expect(burnoutRisk(uniform(7.4)).band).toBe("Strained") // score 74
    expect(burnoutRisk(uniform(7.5)).band).toBe("At risk") // score 75
  })

  it("all-zero input is Steady with the matching advice", () => {
    const r = burnoutRisk(input())
    expect(r.band).toBe("Steady")
    expect(r.bandAdvice).toContain("sustainable")
  })

  it("maxed input is At risk with the now-problem advice", () => {
    const r = burnoutRisk(uniform(10))
    expect(r.band).toBe("At risk")
    expect(r.bandAdvice).toContain("now-problem")
  })
})

describe("burnoutRisk — topDriver", () => {
  it("returns the heaviest weighted contributor, not the biggest raw number", () => {
    // workload 8 → 0.28×8 = 2.24 vs afterHours 10 → 0.24×10 = 2.4
    const r = burnoutRisk(input({ workload: 8, afterHours: 10 }))
    expect(r.topDriver).toBe("After-hours bleed")
  })

  it("breaks raw-value ties in favour of the higher weight", () => {
    const r = burnoutRisk(input({ workload: 6, recognitionGap: 6 }))
    expect(r.topDriver).toBe("Sustained overload") // weight 0.28 > 0.14
  })

  it("is the label of the only non-zero factor", () => {
    expect(burnoutRisk(input({ unclearAsks: 7 })).topDriver).toBe("Unclear priorities")
    expect(burnoutRisk(input({ autonomy: 7 })).topDriver).toBe("Low autonomy")
  })
})
