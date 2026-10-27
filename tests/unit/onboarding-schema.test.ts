import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
const columns = (table: PgTable) => getTableConfig(table).columns.map((column) => column.name)

describe("the invitations table", () => {
  it("declares workspace_invitations under its SQL name", () => {
    expect(schema.workspaceInvitations).toBeInstanceOf(PgTable)
    expect(getTableConfig(schema.workspaceInvitations).name).toBe("workspace_invitations")
  })

  it("stores a token hash, never a token", () => {
    expect(columns(schema.workspaceInvitations)).toContain("token_hash")
    expect(columns(schema.workspaceInvitations).some((name) => /token$/.test(name))).toBe(false)
  })

  it("carries the expiry, the single-use stamp and the role it grants", () => {
    for (const column of ["email", "role", "invited_by", "expires_at", "accepted_at", "accepted_by"]) {
      expect(columns(schema.workspaceInvitations)).toContain(column)
    }
  })

  it("adds no users column", () => {
    const users = columns(schema.users)
    expect(users).not.toContain("onboarding")
    expect(users).not.toContain("onboarding_status")
  })
})

describe("the invitations migration", () => {
  const script = codeOnly(src("scripts/create-invitations-table.mjs"))

  it("is additive only", () => {
    expect(script).not.toMatch(/\bDROP\b/i)
    expect(script).not.toMatch(/DELETE FROM/i)
    expect(script).toContain("CREATE TABLE IF NOT EXISTS workspace_invitations")
    expect(script).toContain("CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx")
  })

  it("rolls back only when asked", () => {
    const rollback = codeOnly(src("scripts/rollback-invitations-table.mjs"))
    expect(rollback).toContain("INVITATIONS_ROLLBACK")
    expect(rollback).toContain("DROP TABLE IF EXISTS workspace_invitations")
  })
})