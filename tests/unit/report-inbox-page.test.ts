import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

function src(path: string) {
  return readFileSync(path, "utf-8")
}

describe("inbox page", () => {
  const page = src("app/dashboard/reports-work/inbox/page.tsx")
  const client = src("app/dashboard/reports-work/inbox/inbox-client.tsx")

  it("page wraps the client in Suspense", () => {
    expect(page).toMatch(/Suspense/u)
  })

  it("client fetches from /api/reports/inbox", () => {
    expect(client).toMatch(/\/api\/reports\/inbox/u)
  })

  it("client renders ack and return actions", () => {
    expect(client).toMatch(/ack/iu)
    expect(client).toMatch(/return/iu)
  })

  it("client shows the author name and period for each report", () => {
    expect(client).toMatch(/authorName/u)
    expect(client).toMatch(/periodStart/u)
  })
})
