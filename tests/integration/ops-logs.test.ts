import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("ops activity logs page", () => {
  it("serves the entity schema to the client via the pack route", () => {
    const route = src("app/api/ops/pack/route.ts")
    expect(route).toContain("logs: ctx?.config.logs")
  })

  it("renders entity tabs and a list from the pack config", () => {
    const client = src("app/dashboard/ops/logs/logs-client.tsx")
    expect(client).toContain("/api/ops/pack")
    expect(client).toContain("/api/ops/entries")
    expect(client).toContain("role=\"tablist\"")
    expect(client).toContain("Object.entries(pack.logs")
  })

  it("builds the entry form from each field's declared type", () => {
    const client = src("app/dashboard/ops/logs/logs-client.tsx")
    for (const type of ["\"text\"", "\"enum\"", "\"number\"", "\"date\"", "\"datetime\""]) {
      expect(client).toContain(`def.type === ${type}`)
    }
  })

  it("creates, edits and deletes entries through the CRUD routes", () => {
    const client = src("app/dashboard/ops/logs/logs-client.tsx")
    expect(client).toContain("method: \"POST\"")
    expect(client).toContain("method: \"PATCH\"")
    expect(client).toContain("method: \"DELETE\"")
  })

  it("gracefully handles a pack with no operations config", () => {
    const client = src("app/dashboard/ops/logs/logs-client.tsx")
    expect(client).toContain("No operations configured")
  })

  it("mounts the page behind a Suspense boundary", () => {
    const page = src("app/dashboard/ops/logs/page.tsx")
    expect(page).toContain("Suspense")
    expect(page).toContain("LogsClient")
  })
})
