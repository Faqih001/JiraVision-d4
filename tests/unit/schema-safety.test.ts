import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

// Comments in the seeders describe the truncate they used to contain, so the
// destructive-call scan has to look at code only.
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

function filesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(path.join(repo, dir))) {
    const relative = `${dir}/${entry}`
    const absolute = path.join(repo, relative)
    if (statSync(absolute).isDirectory()) out.push(...filesIn(relative))
    else if (/\.(ts|tsx)$/.test(entry)) out.push(relative)
  }
  return out
}

describe("auth no longer bootstraps the schema", () => {
  // lib/auth-actions.ts used to await initializeDatabase() inside signup,
  // forgotPassword, verifyResetToken and resetPassword. That path reached
  // drizzle/seed-team.ts, whose first statement was `db.delete(users)` — so a
  // single registration truncated the whole users table. Schema setup now lives
  // only in GET /api/setup.
  it("lib/auth-actions.ts does not reference initializeDatabase", () => {
    expect(src("lib/auth-actions.ts")).not.toContain("initializeDatabase")
  })

  it("signup stamps the role instead of leaving the grant implicit", () => {
    expect(src("lib/auth-actions.ts")).toMatch(/role:\s*roleForSignup\(email\)/)
  })

  it("only the setup route calls initializeDatabase", () => {
    const callers = filesIn("app")
      .filter((f) => src(f).includes("initializeDatabase(") && !f.endsWith("lib/db-init.ts"))
      .map((f) => f.replace(/\\/g, "/"))
    expect(callers.sort()).toEqual(["app/api/setup/route.ts"])
  })
})

describe("seeders are non-destructive", () => {
  // A DELETE with no WHERE clause is a truncate. Only the team-member endpoint
  // may delete a user, and it scopes the delete by id inside a transaction.
  const seeders = ["drizzle/seed-team.ts", "scripts/seed-team.js", "lib/seed-data.ts"]

  it.each(seeders)("%s has no unscoped delete on users", (file) => {
    const unscoped = /\.delete\(\s*users\s*\)(?!\s*\.where)/.test(codeOnly(src(file)))
    expect(unscoped).toBe(false)
  })

  it("lib/seed-data.ts keeps its already-seeded guard", () => {
    const source = src("lib/seed-data.ts")
    expect(source).toMatch(/existingUsers\[0\]\.count[\s\S]{0,120}return/)
  })
})

describe("route handlers use Next 16 async params", () => {
  // In Next.js 15+ the second argument's `params` is a Promise. A handler typed
  // as `{ params: { id: string } }` compiles against a stale shape but receives
  // a Promise, so `params.id` is undefined and the endpoint silently 500s.
  const routes = filesIn("app").filter((f) => f.endsWith("route.ts"))

  it("every route.ts is present", () => {
    expect(routes.length).toBeGreaterThan(100)
  })

  it.each(routes)("%s awaits or omits params", (file) => {
    expect(codeOnly(src(file))).not.toMatch(/params:\s*\{[^}]*\}\s*\}/)
  })
})
