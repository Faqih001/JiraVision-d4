import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// scripts/place-ladder-owner.mjs writes two rows to production: the owner's users.role and one
// career_placement row. These guards keep the rails honest — the conflict target matches the real
// primary key, the backup exists before any write, and the script never reaches for the tables
// whose history it must not invent.

const source = readFileSync(resolve(process.cwd(), "scripts/place-ladder-owner.mjs"), "utf8")
const codeOnly = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
const code = codeOnly(source)

const restoreBody = code.slice(code.indexOf("async function restore"), code.indexOf("async function main"))
const mainBody = code.slice(code.indexOf("async function main"))

// A stand-in with the shape of a real Neon URL. Nothing here is a production credential.
const FAKE_URL =
  "postgresql://kiibridge_admin:hunter2@ep-blue-123.us-east-2.aws.neon.tech/neondb?sslmode=require"

describe("the ladder placement script", () => {
  it("grants the owner role and places exactly one rung", () => {
    expect(code).toMatch(/const OWNER_EMAIL = "fakiiahmad001@gmail\.com"/u)
    expect(code).toMatch(/const DISCIPLINE = "technician"/u)
    expect(code).toMatch(/const LEVEL = 1/u)
  })

  it("conflicts on the real career_placement primary key", () => {
    // drizzle/schema.ts declares primaryKey({ columns: [userId, discipline] }); a wrong target
    // makes the insert throw instead of leaving an existing placement alone.
    expect(code).toMatch(/insert into career_placement[\s\S]{0,200}on conflict \(user_id, discipline\)/u)
  })

  it("scopes the role write to the verified account and stays idempotent", () => {
    expect(code).toMatch(/update users set role = 'superadmin'[\s\S]{0,200}where id = \$\{owner\.id\} and email = \$\{OWNER_EMAIL\} and role is distinct from 'superadmin'/u)
  })

  it("writes the backup before it touches the database", () => {
    expect(code).toContain("mkdirSync")
    expect(code.indexOf("writeFileSync")).toBeLessThan(code.indexOf("update users set role = 'superadmin'"))
    expect(code.indexOf("update users set role = 'superadmin'")).toBeLessThan(code.indexOf("insert into career_placement"))
  })

  it("refuses a bare invocation and separates apply from restore", () => {
    expect(code).toMatch(/--dry-run, --apply, or --restore/u)
    expect(code).toMatch(/--apply and --restore are mutually exclusive/u)
  })

  it("keeps every delete inside the restore path", () => {
    expect(code.match(/delete from/gu)).toHaveLength(1)
    expect(restoreBody).toContain("delete from career_placement")
    expect(mainBody).not.toMatch(/delete from/u)
  })

  it("only removes a placement it inserted", () => {
    // A backup that already held a placement means the insert was a no-op, so the row is not
    // this script's to delete.
    expect(restoreBody).toMatch(/backup\.placement\s*\?\s*\[\s*\]/u)
  })

  it("never invents task history", () => {
    for (const table of ["task_events", "work_log_entries", "deliverables"]) {
      expect(code, table).not.toContain(table)
    }
    expect(code).not.toMatch(/insert into tasks|update tasks/u)
  })

  it("prints the masked host, never the credential", () => {
    expect(code).toMatch(/const mask = \(url\) => url\.replace\(/u)
    // The one console line that touches the resolved URL must route it through mask().
    const urlLines = (code.match(/[^\n]*match\[1\][^\n]*/gu) ?? []).filter((line) =>
      /console\.(log|error)/u.test(line),
    )
    expect(urlLines).toHaveLength(1)
    expect(urlLines[0]).toContain("mask(match[1])")

    // And the mask itself has to work: apply the script's own pattern to a fake URL, so a
    // loosened regex fails here instead of leaking a production credential into a terminal.
    const definition = source.match(/url\.replace\(\/(.*?)\/, "(.*?)"\)/u)
    if (!definition) throw new Error("mask() no longer builds its own pattern")
    const masked = FAKE_URL.replace(new RegExp(definition[1], "u"), definition[2])
    expect(masked).not.toContain("hunter2")
    expect(masked).not.toContain("kiibridge")
    expect(masked).toContain("ep-blue-123.us-east-2.aws.neon.tech/neondb")
  })
})
