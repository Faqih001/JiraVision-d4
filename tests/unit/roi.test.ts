import { describe, expect, it } from "vitest"
import { formatUsd, roiProjection, type RoiInput } from "@/lib/calculations/roi"

const base: RoiInput = {
  teamSize: 12,
  hourlyCostUsd: 90,
  planningHoursPerWeek: 4,
  overrunRate: 0.3,
  recoveryShare: 0.25,
  pricePerUserMonth: 19,
}

describe("roiProjection", () => {
  it("current loss matches hours × 46 weeks × seats × rate", () => {
    const r = roiProjection(base)
    expect(r.currentLossUsd).toBe(base.teamSize * 46 * base.planningHoursPerWeek * base.hourlyCostUsd)
  })

  it("annual tooling honours the 20% annual discount", () => {
    const r = roiProjection(base)
    expect(r.annualToolingUsdAnnual).toBeCloseTo(r.annualToolingUsd * 0.8, 5)
  })

  it("is monotonic in teamSize and price", () => {
    const small = roiProjection({ ...base, teamSize: 5 })
    const big = roiProjection({ ...base, teamSize: 50 })
    expect(big.currentLossUsd).toBeGreaterThan(small.currentLossUsd)
    expect(big.annualToolingUsd).toBeGreaterThan(small.annualToolingUsd)

    const cheap = roiProjection({ ...base, pricePerUserMonth: 9 })
    const pricey = roiProjection({ ...base, pricePerUserMonth: 49 })
    expect(pricey.netSavingsUsd).toBeLessThan(cheap.netSavingsUsd)
  })

  it("caps recovery share at 0.4 (conservative assumption)", () => {
    const capped = roiProjection({ ...base, recoveryShare: 0.9 })
    const atCap = roiProjection({ ...base, recoveryShare: 0.4 })
    expect(capped.recoverableUsd).toBe(atCap.recoverableUsd)
  })

  it("the 'doesn't pay for itself' branch is reachable", () => {
    const r = roiProjection({
      teamSize: 20,
      hourlyCostUsd: 5,
      planningHoursPerWeek: 0.5,
      overrunRate: 0,
      recoveryShare: 0.05,
      pricePerUserMonth: 49,
    })
    expect(r.netSavingsUsd).toBeLessThan(0)
    expect(r.paybackWeeks).toBe(0)
  })

  it("payback is at least one week when net-positive", () => {
    const r = roiProjection({ ...base, planningHoursPerWeek: 10, recoveryShare: 0.4 })
    expect(r.netSavingsUsd).toBeGreaterThan(0)
    expect(r.paybackWeeks).toBeGreaterThanOrEqual(1)
  })

  it("formats currency without decimals", () => {
    expect(formatUsd(1234.56)).toBe("$1,235")
  })
})
