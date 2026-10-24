import { describe, expect, it } from "vitest"
import { BURNOUT_FACTORS, burnoutRisk } from "@/lib/calculations/burnout"

const neutral = {
  workload: 5,
  autonomy: 5,
  unclearAsks: 5,
  afterHours: 5,
  recognitionGap: 5,
}

describe("burnoutRisk", () => {
  it("returns a 0-100 score for every input inside range", () => {
    const r = burnoutRisk(neutral)
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })

  it("all-zero input is Steady with score 0", () => {
    const r = burnoutRisk({ workload: 0, autonomy: 0, unclearAsks: 0, afterHours: 0, recognitionGap: 0 })
    expect(r.score).toBe(0)
    expect(r.band).toBe("Steady")
  })

  it("maxed input is At risk with score 100", () => {
    const r = burnoutRisk({ workload: 10, autonomy: 10, unclearAsks: 10, afterHours: 10, recognitionGap: 10 })
    expect(r.score).toBe(100)
    expect(r.band).toBe("At risk")
  })

  it("maps bands at the documented boundaries (35/55/75)", () => {
    // Weights sum to 1, so a uniform slider value v yields score v × 10 exactly.
    const at = (v: number) =>
      burnoutRisk({ workload: v, autonomy: v, unclearAsks: v, afterHours: v, recognitionGap: v })
    expect(at(3.4).band).toBe("Steady")
    expect(at(3.5).band).toBe("Watch")
    expect(at(5.4).band).toBe("Watch")
    expect(at(5.5).band).toBe("Strained")
    expect(at(7.4).band).toBe("Strained")
    expect(at(7.5).band).toBe("At risk")
  })

  it("clamps out-of-range inputs instead of exploding", () => {
    const r = burnoutRisk({ workload: 99, autonomy: -20, unclearAsks: 5, afterHours: 5, recognitionGap: 5 })
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.score).toBeGreaterThanOrEqual(0)
  })

  it("topDriver is the heaviest weighted contributor", () => {
    const r = burnoutRisk({ ...neutral, afterHours: 10, workload: 1 })
    const expected = BURNOUT_FACTORS.find((f) => f.key === "afterHours")!.label
    expect(r.topDriver).toBe(expected)
  })

  it("weights sum to 1", () => {
    const sum = BURNOUT_FACTORS.reduce((s, f) => s + f.weight, 0)
    expect(sum).toBeCloseTo(1, 5)
  })
})
