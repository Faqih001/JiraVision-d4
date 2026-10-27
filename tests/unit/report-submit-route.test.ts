import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function src(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
}

describe("submit route", () => {
  const route = src("app/api/reports/work/[id]/submit/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("refuses to submit a non-draft report", () => {
    expect(route).toMatch(/isDraft\(existing\.status\)/u)
  })

  it("sets status to submitted and stamps submittedAt", () => {
    expect(route).toMatch(/status: "submitted"/u)
    expect(route).toMatch(/submittedAt: new Date\(\)/u)
  })

  it("writes recipients via writeRecipients", () => {
    expect(route).toMatch(/writeRecipients\(/u)
  })

  it("notifies recipients with type report and a link to the inbox", () => {
    expect(route).toMatch(/type: "report"/u)
    expect(route).toMatch(/\/dashboard\/reports-work\/inbox/u)
  })

  it("falls back to default reporting line when no recipientIds are sent", () => {
    expect(route).toMatch(/readDefaultRecipients/u)
  })
})
