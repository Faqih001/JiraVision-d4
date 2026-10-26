import { describe, expect, it } from "vitest"
import {
  CADENCES,
  CADENCE_DAYS,
  CADENCE_LABEL,
  computeNextRun,
  isCadence,
} from "@/lib/cadence"

// Lifted out of app/api/reports/_shared.ts:47,88 so the work log, the register queue
// and the report builder share one recurrence definition. The three cadences that
// already ship must keep producing exactly the timestamps they produced before.
describe("CADENCES", () => {
  it("keeps the three shipped values and adds one-off and yearly", () => {
    expect(CADENCES).toEqual(["one-off", "daily", "weekly", "monthly", "yearly"])
  })

  it("labels every member, so a select can render from the vocabulary alone", () => {
    for (const cadence of CADENCES) {
      expect(CADENCE_LABEL[cadence]).toBeTruthy()
      expect(CADENCE_LABEL[cadence]).not.toBe(cadence)
    }
  })

  it("accepts a member and rejects everything shaped like one but is not", () => {
    expect(isCadence("yearly")).toBe(true)
    expect(isCadence("annual")).toBe(false)
    expect(isCadence("")).toBe(false)
    expect(isCadence(undefined)).toBe(false)
  })
})

describe("computeNextRun", () => {
  const from = new Date("2026-10-26T07:30:00.000Z")

  it("keeps the existing daily step", () => {
    expect(computeNextRun("daily", from)).toBe("2026-10-27T07:30:00.000Z")
  })

  it("keeps the existing weekly step", () => {
    expect(computeNextRun("weekly", from)).toBe("2026-11-02T07:30:00.000Z")
  })

  it("keeps the existing monthly step", () => {
    expect(computeNextRun("monthly", from)).toBe("2026-11-26T07:30:00.000Z")
  })

  it("advances a year for yearly", () => {
    expect(computeNextRun("yearly", from)).toBe("2027-10-26T07:30:00.000Z")
  })

  it("advances a year from a leap day and says where it lands", () => {
    // JS date math rolls an out-of-range day forward rather than clamping it, so a
    // yearly schedule first run on 2028-02-29 next fires on 2029-03-01. Documented here
    // because silently accepting that in a report period would look like an off-by-one.
    expect(computeNextRun("yearly", new Date("2028-02-29T00:00:00.000Z"))).toBe(
      "2029-03-01T00:00:00.000Z",
    )
  })

  it("has no next run at all for a one-off schedule", () => {
    expect(computeNextRun("one-off", from)).toBeNull()
  })

  it("defaults to now, so a caller can pass nothing", () => {
    const before = Date.now()
    const next = computeNextRun("daily")
    expect(next).not.toBeNull()
    expect(Date.parse(next as string) - before).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 5000)
  })

  it("states a period length for everything but one-off", () => {
    expect(CADENCE_DAYS["one-off"]).toBeNull()
    expect(CADENCE_DAYS.yearly).toBe(365)
  })
})
