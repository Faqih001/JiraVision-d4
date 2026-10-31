import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("/api/ops/config/audit after PR 11f", () => {
  const route = src("app/api/ops/config/audit/route.ts")

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

  it("reads from the ops_config_audit table", () => {
    expect(route).toContain("opsConfigAudit")
    expect(route).toContain(".from(opsConfigAudit)")
  })

  it("returns the last 50 events, newest first", () => {
    expect(route).toContain(".limit(50)")
    expect(route).toContain("desc(opsConfigAudit.createdAt)")
  })

  it("returns only the audit fields, not the full config snapshots", () => {
    expect(route).toContain("id: opsConfigAudit.id")
    expect(route).toContain("operation: opsConfigAudit.operation")
    expect(route).toContain("summary: opsConfigAudit.summary")
    expect(route).toContain("createdAt: opsConfigAudit.createdAt")
    expect(route).toContain("userId: opsConfigAudit.userId")
    expect(route).not.toContain("config:")
    expect(route).not.toContain("previous:")
  })

  it("uses force-dynamic to skip the route cache", () => {
    expect(route).toContain('export const dynamic = "force-dynamic"')
  })

  it("never reads GOOGLE_GEMINI_API_KEY", () => {
    expect(route).not.toContain("GOOGLE_GEMINI_API_KEY")
    expect(route).not.toContain("geminiJson")
  })
})

describe("the apply, revert, and reset routes write audit events", () => {
  it("apply writes an audit event with operation='apply'", () => {
    const route = src("app/api/ops/config/apply/route.ts")
    expect(route).toContain("opsConfigAudit")
    expect(route).toContain('.insert(opsConfigAudit)')
    expect(route).toContain('operation: "apply"')
  })

  it("revert writes an audit event with operation='revert'", () => {
    const route = src("app/api/ops/config/revert/route.ts")
    expect(route).toContain("opsConfigAudit")
    expect(route).toContain('.insert(opsConfigAudit)')
    expect(route).toContain('operation: "revert"')
  })

  it("reset writes an audit event with operation='reset'", () => {
    const route = src("app/api/ops/config/reset/route.ts")
    expect(route).toContain("opsConfigAudit")
    expect(route).toContain('.insert(opsConfigAudit)')
    expect(route).toContain('operation: "reset"')
  })
})
