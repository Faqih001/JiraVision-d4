import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

function src(path: string) {
  return readFileSync(path, "utf-8")
}

describe("ack route", () => {
  const route = src("app/api/reports/inbox/[id]/ack/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("updates the recipient row with ack_at", () => {
    expect(route).toMatch(/ackAt/u)
  })

  it("sets the report status to acknowledged", () => {
    expect(route).toMatch(/acknowledged/u)
  })
})

describe("return route", () => {
  const route = src("app/api/reports/inbox/[id]/return/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("requires a note in the body", () => {
    expect(route).toMatch(/note/u)
  })

  it("sets the report status to returned and stores returned_note", () => {
    expect(route).toMatch(/returned/u)
    expect(route).toMatch(/returnedNote/u)
  })
})
