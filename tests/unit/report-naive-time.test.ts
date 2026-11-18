import { describe, expect, it } from "vitest"
import { naiveUtcIso } from "@/lib/reports/naive-time"

// The chat and email tables store TIMESTAMP without time zone. The neon http driver hands
// those back as naive wall-time strings; the house convention (app/api/chat/route.ts toUtcDate)
// reads them as UTC. A report must resolve them the same way or a message lands on the wrong day.

describe("naiveUtcIso", () => {
  it("reads a naive space-separated wall-time as UTC", () => {
    expect(naiveUtcIso("2026-10-27 09:00:00")).toBe("2026-10-27T09:00:00.000Z")
  })

  it("reads a naive T-separated wall-time as UTC", () => {
    expect(naiveUtcIso("2026-10-27T09:00:00")).toBe("2026-10-27T09:00:00.000Z")
  })

  it("leaves an already-UTC instant unchanged", () => {
    expect(naiveUtcIso("2026-10-27T09:00:00.000Z")).toBe("2026-10-27T09:00:00.000Z")
  })

  it("honours an explicit offset rather than overwriting it", () => {
    expect(naiveUtcIso("2026-10-27T09:00:00+03:00")).toBe("2026-10-27T06:00:00.000Z")
  })

  it("passes a real Date straight through", () => {
    expect(naiveUtcIso(new Date("2026-10-27T09:00:00.000Z"))).toBe("2026-10-27T09:00:00.000Z")
  })
})