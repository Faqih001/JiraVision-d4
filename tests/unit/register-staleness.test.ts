import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  cadenceForInterval,
  daysBetween,
  nextCheckDay,
  stalenessOf,
} from "@/lib/registers/staleness"

const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("computed staleness", () => {
  it("is fresh inside the interval and stale after it", () => {
    expect(stalenessOf({ lastVerifiedAt: "2026-10-01", verifyIntervalDays: 30 }, "2026-10-31")).toBe("fresh")
    expect(stalenessOf({ lastVerifiedAt: "2026-10-01", verifyIntervalDays: 30 }, "2026-11-01")).toBe("stale")
  })

  it("treats an unverified or unscheduled row as unknown, never fresh", () => {
    expect(stalenessOf({ lastVerifiedAt: null, verifyIntervalDays: 30 }, "2026-10-27")).toBe("unknown")
    expect(stalenessOf({ lastVerifiedAt: "2026-10-01", verifyIntervalDays: null }, "2026-10-27")).toBe("unknown")
    expect(stalenessOf({ lastVerifiedAt: "not-a-day", verifyIntervalDays: 30 }, "2026-10-27")).toBe("unknown")
    expect(stalenessOf({ lastVerifiedAt: "2026-10-01", verifyIntervalDays: -1 }, "2026-10-27")).toBe("unknown")
  })

  it("makes an interval of zero days mean today only", () => {
    expect(stalenessOf({ lastVerifiedAt: "2026-10-27", verifyIntervalDays: 0 }, "2026-10-27")).toBe("fresh")
    expect(stalenessOf({ lastVerifiedAt: "2026-10-27", verifyIntervalDays: 0 }, "2026-10-28")).toBe("stale")
  })

  it("never calls a future verification stale", () => {
    expect(stalenessOf({ lastVerifiedAt: "2026-12-01", verifyIntervalDays: 7 }, "2026-10-27")).toBe("fresh")
  })

  it("counts a leap day and a month boundary correctly", () => {
    expect(daysBetween("2024-02-29", "2024-03-01")).toBe(1)
    expect(stalenessOf({ lastVerifiedAt: "2024-02-29", verifyIntervalDays: 1 }, "2024-03-01")).toBe("fresh")
    expect(stalenessOf({ lastVerifiedAt: "2024-02-29", verifyIntervalDays: 1 }, "2024-03-02")).toBe("stale")
    expect(daysBetween("2026-01-31", "2026-03-01")).toBe(29)
    expect(stalenessOf({ lastVerifiedAt: "2026-01-31", verifyIntervalDays: 28 }, "2026-03-01")).toBe("stale")
    expect(stalenessOf({ lastVerifiedAt: "2026-01-31", verifyIntervalDays: 29 }, "2026-03-01")).toBe("fresh")
  })

  it("is never stored", () => {
    const source = codeOnly(src("lib/registers/staleness.ts"))
    expect(source).not.toMatch(/@\/lib\/db|drizzle/)
  })

  it("maps a verification interval to a cadence", () => {
    expect(cadenceForInterval(null)).toBe("one-off")
    expect(cadenceForInterval(0)).toBe("daily")
    expect(cadenceForInterval(1)).toBe("daily")
    expect(cadenceForInterval(7)).toBe("weekly")
    expect(cadenceForInterval(30)).toBe("monthly")
    expect(cadenceForInterval(365)).toBe("yearly")
  })

  it("pulls an overdue next check back to today", () => {
    expect(nextCheckDay({ lastVerifiedAt: "2026-10-01", verifyIntervalDays: 30 }, "2026-10-27")).toBe("2026-10-31")
    expect(nextCheckDay({ lastVerifiedAt: "2026-10-01", verifyIntervalDays: 10 }, "2026-10-27")).toBe("2026-10-27")
    expect(nextCheckDay({ lastVerifiedAt: null, verifyIntervalDays: 30 }, "2026-10-27")).toBe("2026-10-27")
  })
})
