import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
const columns = (table: PgTable) => getTableConfig(table).columns.map((column) => column.name)

describe("the auth_sessions table", () => {
  it("declares auth_sessions under its SQL name", () => {
    expect(schema.authSessions).toBeInstanceOf(PgTable)
    expect(getTableConfig(schema.authSessions).name).toBe("auth_sessions")
  })

  it("stores a token hash, never a token", () => {
    expect(columns(schema.authSessions)).toContain("token_hash")
    expect(columns(schema.authSessions).some((name) => /token$/.test(name))).toBe(false)
  })

  it("carries the lifecycle columns an idle expiry needs", () => {
    for (const column of ["user_id", "created_at", "last_seen_at", "expires_at", "revoked_at"]) {
      expect(columns(schema.authSessions)).toContain(column)
    }
  })

  it("adds no users column — a session is a row, not a field on the profile", () => {
    const users = columns(schema.users)
    expect(users).not.toContain("session_id")
    expect(users).not.toContain("session_expires_at")
  })

  it("uses a sequence id, not an identity column", () => {
    // drizzle-kit treats BIGSERIAL and GENERATED ... AS IDENTITY as different column
    // types, and that pairing has produced a destructive diff in this repo before.
    expect(src("drizzle/schema.ts")).toContain('bigserial("id", { mode: "number" })')
  })
})

describe("the auth sessions migration", () => {
  const script = codeOnly(src("scripts/create-auth-sessions-table.mjs"))

  it("is additive only", () => {
    expect(script).not.toMatch(/\bDROP\b/i)
    expect(script).not.toMatch(/DELETE FROM/i)
    expect(script).toContain("CREATE TABLE IF NOT EXISTS auth_sessions")
    expect(script).toContain("CREATE INDEX IF NOT EXISTS auth_sessions_user_idx")
  })

  it("cascades away a deleted user's sessions", () => {
    expect(script).toContain("REFERENCES users(id) ON DELETE CASCADE")
  })

  it("talks to Postgres with literal queries so a waking compute cannot stall it", () => {
    expect(script).not.toMatch(/await sql`/)
    expect(script).toContain("sql.unsafe")
  })

  it("rolls back only when asked", () => {
    const rollback = codeOnly(src("scripts/rollback-auth-sessions-table.mjs"))
    expect(rollback).toContain("AUTH_SESSIONS_ROLLBACK")
    expect(rollback).toContain("DROP TABLE IF EXISTS auth_sessions")
  })
})
