import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

function src(path: string) {
  return readFileSync(path, "utf-8")
}

describe("builder lifecycle UI", () => {
  const client = src("app/dashboard/reports-work/reports-client.tsx")

  it("shows the report status", () => {
    expect(client).toMatch(/status/u)
  })

  it("has a submit action", () => {
    expect(client).toMatch(/submit/iu)
  })

  it("has a recipient picker", () => {
    expect(client).toMatch(/recipient/iu)
  })

  it("has a revise action for filed reports", () => {
    expect(client).toMatch(/revise/iu)
  })
})
