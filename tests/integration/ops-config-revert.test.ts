import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("/api/ops/config/revert after PR 11e", () => {
  const route = src("app/api/ops/config/revert/route.ts")

  it("is a POST-only route", () => {
    expect(route).toContain("export async function POST")
    expect(route).not.toContain("export async function GET")
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

  it("requires the previous config in the body", () => {
    expect(route).toContain("const { previous } = body")
    expect(route).toContain("!previous || typeof previous !== \"object\"")
  })

  it("re-validates the previous config against the schema before writing", () => {
    expect(route).toContain("safeValidateOpsConfig(previous)")
    expect(route).toContain("checked.success")
    expect(route).toContain("checked.data")
  })

  it("scopes the revert to the caller's discipline, not a body-supplied packKey", () => {
    expect(route).toContain("defaultDisciplineOf(session)")
    expect(route).toContain("loadOpsConfigForDiscipline(discipline)")
    expect(route).not.toMatch(/body\.packKey/)
    expect(route).not.toMatch(/request\.packKey/)
  })

  it("writes the previous config to role_packs.ops_config", () => {
    expect(route).toContain("db")
    expect(route).toContain(".update(rolePacks)")
    expect(route).toContain(".set({ opsConfig: checked.data")
    expect(route).toContain(".where(eq(rolePacks.packKey, ctx.packKey))")
  })

  it("returns the replaced config so the admin can undo the undo", () => {
    expect(route).toContain("replaced")
    expect(route).toContain("config: checked.data")
  })

  it("logs an audit line without document content", () => {
    expect(route).toMatch(/console\.log\(`opsConfig revert:/)
    expect(route).toContain("user=${session.id}")
    expect(route).toContain("pack=${ctx.packKey}")
  })

  it("uses force-dynamic to skip the route cache", () => {
    expect(route).toContain('export const dynamic = "force-dynamic"')
  })

  it("never reads GOOGLE_GEMINI_API_KEY", () => {
    expect(route).not.toContain("GOOGLE_GEMINI_API_KEY")
    expect(route).not.toContain("geminiJson")
  })
})
