import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("/api/ops/config/compare after PR 11h", () => {
  const route = src("app/api/ops/config/compare/route.ts")

  it("is a GET-only route", () => {
    expect(route).toContain("export async function GET")
    expect(route).not.toContain("export async function POST")
    expect(route).not.toContain("export async function PATCH")
    expect(route).not.toContain("export async function DELETE")
  })

  it("requires a signed-in session", () => {
    expect(route).toContain("getSession()")
    expect(route).toContain("unauthorized()")
  })

  it("requires an admin role", () => {
    expect(route).toContain('session.role !== "admin"')
    expect(route).toContain('session.role !== "super_admin"')
    expect(route).toContain("forbidden(")
  })

  it("scopes the read to the caller's discipline, not a body-supplied packKey", () => {
    expect(route).toContain("defaultDisciplineOf(session)")
    expect(route).toContain("loadOpsConfigForDiscipline(discipline)")
    expect(route).not.toMatch(/body\.packKey/)
    expect(route).not.toMatch(/request\.packKey/)
  })

  it("returns both the current config and the code-authored baseline", () => {
    expect(route).toContain("current: ctx.config")
    expect(route).toContain("baseline: checked.data")
  })

  it("computes the diff server-side using diffConfig", () => {
    expect(route).toContain("diffConfig")
    expect(route).toContain("diff:")
  })

  it("handles the case where no code-authored baseline exists", () => {
    expect(route).toContain("No code-authored baseline exists")
  })

  it("handles the case where the baseline no longer validates", () => {
    expect(route).toContain("The code-authored baseline no longer validates")
  })

  it("uses force-dynamic to skip the route cache", () => {
    expect(route).toContain('export const dynamic = "force-dynamic"')
  })

  it("never reads GOOGLE_GEMINI_API_KEY", () => {
    expect(route).not.toContain("GOOGLE_GEMINI_API_KEY")
    expect(route).not.toContain("geminiJson")
  })
})

describe("the comparison UI after PR 11h", () => {
  const compare = src("app/dashboard/ops/config/config-compare.tsx")

  it("is a client component that fetches the compare route", () => {
    expect(compare.startsWith('"use client"')).toBe(true)
    expect(compare).toContain('fetch("/api/ops/config/compare")')
  })

  it("shows a collapsed state with a button to expand", () => {
    expect(compare).toContain("Show comparison")
    expect(compare).toContain("setExpanded(true)")
  })

  it("displays the diff with status badges for each item", () => {
    expect(compare).toContain("StatusBadge")
    expect(compare).toContain("added")
    expect(compare).toContain("modified")
    expect(compare).toContain("removed")
  })

  it("shows an empty state when there are no customizations", () => {
    expect(compare).toContain("No customizations — this pack matches the code-authored baseline exactly.")
  })

  it("is mounted in the config client for admins only", () => {
    const client = src("app/dashboard/ops/config/config-client.tsx")
    expect(client).toContain("import ConfigCompare")
    expect(client).toContain("<ConfigCompare")
    expect(client).toMatch(/data\.admin && data\.packKey/)
  })
})
