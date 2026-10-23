import { describe, expect, it } from "vitest"

import { roiProjection, type RoiInput } from "@/lib/calculations/roi"

const base: RoiInput = {
  teamSize: 10,
  hourlyCostUsd: 100,
  planningHoursPerWeek: 4,
  overrunRate: 0.5,
  recoveryShare: 0.25,
  pricePerUserMonth: 20,
}

const withInput = (partial: Partial<RoiInput>): RoiInput => ({ ...base, ...partial })

describe("roiProjection — monotonicity", () => {
  it("money figures grow with team size (linear in seats)", () => {
    const r5 = roiProjection(withInput({ teamSize: 5 }))
    const r10 = roiProjection(withInput({ teamSize: 10 }))
    const r20 = roiProjection(withInput({ teamSize: 20 }))

    for (const [a, b, c] of [
      [r5, r10, r20] as const,
    ]) {
      expect(b.currentLossUsd).toBeGreaterThan(a.currentLossUsd)
      expect(c.currentLossUsd).toBeGreaterThan(b.currentLossUsd)
      expect(b.recoverableUsd).toBeGreaterThan(a.recoverableUsd)
      expect(b.overrunSavingsUsd).toBeGreaterThan(a.overrunSavingsUsd)
      expect(b.annualToolingUsd).toBeGreaterThan(a.annualToolingUsd)
      expect(b.netSavingsUsd).toBeGreaterThan(a.netSavingsUsd)
      expect(c.netSavingsUsd).toBeGreaterThan(b.netSavingsUsd)
    }

    // Savings and cost are both linear in seats, so the multiple is seat-neutral.
    expect(r5.multiple).toBeCloseTo(r20.multiple, 9)
  })

  it("cost rises and net savings fall monotonically with the seat price", () => {
    const cheap = roiProjection(withInput({ pricePerUserMonth: 9 }))
    const mid = roiProjection(withInput({ pricePerUserMonth: 19 }))
    const dear = roiProjection(withInput({ pricePerUserMonth: 49 }))

    expect(mid.annualToolingUsd).toBeGreaterThan(cheap.annualToolingUsd)
    expect(dear.annualToolingUsd).toBeGreaterThan(mid.annualToolingUsd)
    expect(mid.netSavingsUsd).toBeLessThan(cheap.netSavingsUsd)
    expect(dear.netSavingsUsd).toBeLessThan(mid.netSavingsUsd)
    expect(dear.multiple).toBeLessThan(cheap.multiple)
  })
})

describe("roiProjection — payback maths", () => {
  it("computes the documented formula exactly for a worked example", () => {
    const r = roiProjection(base)
    // lost hours: 4 h/wk × 46 wk × 10 seats = 1840 → $184,000
    expect(r.currentLossUsd).toBe(184_000)
    expect(r.recoverableUsd).toBe(184_000 * 0.25)
    // overrun proxy: 4 slip-weeks × 0.5 × 10 seats × 40 h × $100
    expect(r.overrunSavingsUsd).toBe(4 * 0.5 * 10 * 40 * 100)
    expect(r.annualToolingUsd).toBe(10 * 20 * 12)
    expect(r.annualToolingUsdAnnual).toBeCloseTo(2400 * 0.8, 6)

    const gross = r.recoverableUsd + r.overrunSavingsUsd
    expect(r.netSavingsUsd).toBeCloseTo(gross - 2400 * 0.8, 6)
    const weeklyNet = (gross - 2400 * 0.8) / 46
    expect(r.paybackWeeks).toBe(Math.max(1, Math.round(2400 * 0.8 / weeklyNet)))
    expect(r.paybackWeeks).toBeGreaterThanOrEqual(1)
  })

  it("payback stretches as the model gets less rosy", () => {
    const easy = roiProjection(withInput({ recoveryShare: 0.4, overrunRate: 1 }))
    const tight = roiProjection(withInput({ recoveryShare: 0.05, overrunRate: 0.05 }))
    expect(tight.paybackWeeks).toBeGreaterThanOrEqual(easy.paybackWeeks)
    expect(tight.paybackWeeks).toBeGreaterThan(1)
  })
})

describe("roiProjection — adversarial inputs", () => {
  it("reaches the “doesn't pay for itself” branch", () => {
    const r = roiProjection(
      withInput({
        planningHoursPerWeek: 0,
        overrunRate: 0,
        recoveryShare: 0,
        pricePerUserMonth: 49,
      }),
    )
    expect(r.netSavingsUsd).toBeLessThan(0)
    expect(r.paybackWeeks).toBe(0) // UI shows the honest "doesn't pay for itself" line
  })

  it("a sky-high price also flips the branch even with real savings", () => {
    const r = roiProjection(withInput({ pricePerUserMonth: 5_000 }))
    expect(r.recoverableUsd).toBeGreaterThan(0)
    expect(r.netSavingsUsd).toBeLessThan(0)
    expect(r.paybackWeeks).toBe(0)
  })

  it("clamps nonsense inputs instead of exploding", () => {
    const r = roiProjection(
      withInput({ teamSize: 0, recoveryShare: 5, overrunRate: -3, pricePerUserMonth: -10 }),
    )
    expect(r.currentLossUsd).toBeGreaterThan(0) // seats floored at 1
    expect(r.recoverableUsd).toBeLessThanOrEqual(r.currentLossUsd * 0.4 + 1e-6)
    expect(r.overrunSavingsUsd).toBe(0)
    expect(r.annualToolingUsd).toBe(0)
    expect(Number.isFinite(r.multiple) && Number.isFinite(r.paybackWeeks)).toBe(true)
  })
})
