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

describe("user mappers read the skills column", () => {
  // users.skills is a real jsonb column (drizzle/schema.ts) and the team
  // directory writes it, but both auth-side User mappers hardcoded `skills: []`
  // behind a "once schema is updated" TODO — so every session reported an empty
  // skill list no matter what was stored.
  it.each(["lib/db.ts", "lib/db.js"])("%s has no discarded-skills literal", (file) => {
    expect(codeOnly(src(file))).not.toMatch(/skills:\s*\[\]/)
  })

  it("lib/db.ts passes the row value through a normaliser", () => {
    const source = src("lib/db.ts")
    expect(source).toMatch(/function toSkills\(/)
    expect(source.match(/skills: toSkills\(/g)).toHaveLength(3)
  })
})

describe("auth escape hatches are production-inert", () => {
  // app/api/tasks/route.ts used to OR in ENABLE_TEST_MODE unconditionally, so one
  // stray environment variable in a production deploy made task reads and writes
  // anonymous. The published API reference promises 401 in production.
  it("ENABLE_TEST_MODE is only defined behind a non-production check", () => {
    const files = filesIn("app")
      .concat(filesIn("lib"))
      .filter((f) => src(f).includes("ENABLE_TEST_MODE"))
    expect(files).toEqual(["app/api/tasks/route.ts"])
    const source = codeOnly(src("app/api/tasks/route.ts"))
    expect(source).toMatch(/NODE_ENV\s*!==?\s*["']production["'][\s\S]{0,120}ENABLE_TEST_MODE/)
  })

  it("no route fabricates a signed-in user", () => {
    expect(codeOnly(src("app/api/user/current/route.ts"))).not.toMatch(/Demo User/)
  })
})

describe("task writes go through the column whitelist", () => {
  // drizzle's `.set()` interpolates every key it receives as a column identifier,
  // so spreading a request body let callers write to `id` or craft an identifier.
  const writers = [
    "app/api/tasks/[id]/route.ts",
    "app/api/tasks/bulk/route.ts",
    "app/api/test/tasks/[id]/route.ts",
    "app/api/test/tasks/bulk/route.ts",
  ]

  it.each(writers)("%s imports pickTaskUpdates", (file) => {
    expect(src(file)).toMatch(/pickTaskUpdates/)
  })

  it.each(writers)("%s spreads no raw request body into a write", (file) => {
    expect(codeOnly(src(file))).not.toMatch(/\.\.\.\s*(data|updateData|body|patch)\s*[,}]/)
  })
})

describe("no anonymous route leaks the schema or relays mail", () => {
  // Found by enumerating every route handler that lacks a session check. Three of
  // them were reachable without credentials on the production domain:
  // /api/db-test and /api/db-migrations-check answered with the table list and full
  // column types, and /api/send-reset-email emailed any address a link built from a
  // caller-supplied token. They are deleted, and this guards the same class of bug.
  // `worklogSession` counts because it is the same check behind a different name — it
  // resolves the cookie session and returns null without one. tests/unit/worklog-api.test.ts
  // is what proves each work log route acts on that null instead of ignoring it.
  // `reportSession` is phase 3's same-shaped helper for /api/reports/work/*, guarded by
  // tests/unit/report-api.test.ts for the same reason.
  const authGated = (file: string) =>
    /getCurrentUser|getSession|worklogSession|reportSession|isSuperAdmin|requireSuperAdmin|requireRole|requireUser|requireAdmin|verifySession/.test(
      codeOnly(src(file)),
    )

  const apiRoutes = filesIn("app/api").filter((f) => f.endsWith("/route.ts"))

  it.each([
    "app/api/db-test/route.ts",
    "app/api/db-migrations-check/route.ts",
    "app/api/send-reset-email/route.ts",
  ])("%s stays deleted", (file) => {
    expect(apiRoutes).not.toContain(file)
  })

  it("only a gated route reads information_schema", () => {
    const leakers = apiRoutes
      .filter((f) => codeOnly(src(f)).includes("information_schema"))
      .filter((f) => !authGated(f))
    expect(leakers).toEqual([])
  })

  it("no route emails a token it was handed in the body", () => {
    const offenders = apiRoutes
      .filter((f) => codeOnly(src(f)).includes("resetUrl"))
      .filter((f) => /const\s*\{[^}]*resetToken[^}]*\}\s*=\s*await\s+\w+\.json\(\)/.test(codeOnly(src(f))))
    expect(offenders).toEqual([])
  })

  it("the documented public endpoints are the only ones without a session check", () => {
    const ungated = apiRoutes.filter((f) => !authGated(f))
    expect(ungated.sort()).toEqual(
      [
        "app/api/aitopia/[...path]/route.ts",
        "app/api/auth/forgot-password/route.ts",
        "app/api/auth/login/route.ts",
        "app/api/auth/logout/route.ts",
        "app/api/auth/register/route.ts",
        "app/api/auth/reset-password/route.ts",
        "app/api/auth/signup/route.ts",
        "app/api/auth/verify-token/route.ts",
        "app/api/careers/route.ts",
        "app/api/contact/route.ts",
        "app/api/demo/route.ts",
        "app/api/newsletter/confirm/route.ts",
        "app/api/newsletter/route.ts",
        "app/api/quote/route.ts",
        "app/api/status/route.ts",
      ].sort(),
    )
  })
})

describe("phase 1 worklog migration", () => {
  // The app's schema file is never pushed — drizzle-kit push can remove columns the
  // file does not declare, and this database is production. So the tables are added by
  // one reviewed additive script, and this case is what keeps it additive.
  it("scripts/create-worklog-tables.mjs is additive only", () => {
    const script = src("scripts/create-worklog-tables.mjs")
    const code = codeOnly(script)
    expect(code).not.toMatch(/\bDROP\b/i)
    expect(code).not.toMatch(/DELETE FROM/i)
    expect(code).not.toMatch(/TRUNCATE/i)
    expect(code).not.toMatch(/ALTER COLUMN/i)
    expect(code).toMatch(/CREATE TABLE IF NOT EXISTS/i)
    expect(code).toMatch(/ADD COLUMN IF NOT EXISTS/i)
    expect(code).toMatch(/information_schema/i)
  })

  it("the rollback script is gated behind an explicit environment opt-in", () => {
    const code = codeOnly(src("scripts/rollback-worklog-tables.mjs"))
    expect(code).toMatch(/WORKLOG_ROLLBACK !== "yes"/)
  })
})
