import { describe, expect, it } from "vitest"
import { parseQuickAdd } from "@/lib/worklog/quick-add"

// The repo's grammar for a `{ value } | { error }` union in a test: narrow, then read.
function parsed(raw: string) {
  const result = parseQuickAdd(raw)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result
}

function why(raw: string): string {
  const result = parseQuickAdd(raw)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

describe("parseQuickAdd", () => {
  it("takes a plain sentence as an action with no minutes", () => {
    expect(parsed("Replaced the pump seal")).toEqual({
      title: "Replaced the pump seal",
      minutes: null,
      kind: "action",
    })
  })

  it("lifts a #minutes token out of the title", () => {
    expect(parsed("#45 rewired the distribution board")).toEqual({
      title: "rewired the distribution board",
      minutes: 45,
      kind: "action",
    })
  })

  it("lifts a kind token and keeps the rest", () => {
    expect(parsed("#blocker waiting on the landlord for roof access")).toEqual({
      title: "waiting on the landlord for roof access",
      minutes: null,
      kind: "blocker",
    })
  })

  it("takes both tokens in any order", () => {
    expect(parsed("#review #90 audit sample walkthrough")).toEqual(
      parsed("audit sample walkthrough #review #90"),
    )
    expect(parsed("#review #90 audit sample walkthrough")).toEqual({
      title: "audit sample walkthrough",
      minutes: 90,
      kind: "review",
    })
  })

  it("keeps an unrecognised tag in the title instead of dropping it", () => {
    expect(parsed("#rooftop replaced the antenna mount")).toEqual({
      title: "#rooftop replaced the antenna mount",
      minutes: null,
      kind: "action",
    })
  })

  it("refuses two different minutes or two different kinds", () => {
    expect(why("#30 fix #45 fix")).toMatch(/one/iu)
    expect(why("#note #review same thing")).toMatch(/one/iu)
  })

  it("refuses minutes that cannot fit in a day", () => {
    expect(why("#1441 something")).toMatch(/1440/u)
    expect(why("#0 something")).toMatch(/1440/u)
  })

  it("refuses to invent a deliverable row through the quick add", () => {
    expect(why("#deliverable pump report")).toMatch(/convert/iu)
  })

  it("refuses nothing but tags", () => {
    expect(why("#45")).toMatch(/what you did/iu)
    expect(why("   ")).toMatch(/what you did/iu)
  })

  it("collapses whitespace and caps the title length", () => {
    expect(why(`  a   b    ${"c".repeat(600)}  `)).toMatch(/too long/iu)
    expect(parsed("  trimmed   twice  ").title).toBe("trimmed twice")
  })
})
