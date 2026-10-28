import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

// A cold handshake to the Neon pooler measures 3.6-9.0s from this network while the
// compute wakes, though TCP (~250ms) and TLS (~500ms) to the same host are clean and
// never dropped across eight attempts. lib/db.ts was tuned for a fast, reliable
// connect, so it threw warm sockets away after 20s idle and then aborted the
// replacement handshake at 10s — right at the measured worst case. Requests hung
// until the kernel gave up (~75s) and answered 401, which reads as "signed out".
describe("the pool outlives the gaps between requests", () => {
  const options = codeOnly(src("lib/db.ts"))

  it("keeps an idle connection for at least five minutes", () => {
    const idle = Number(options.match(/idle_timeout:\s*(\d+)/)?.[1])
    expect(idle).toBeGreaterThanOrEqual(300)
  })

  it("gives a waking compute longer than the slowest measured handshake", () => {
    const connect = Number(options.match(/connect_timeout:\s*(\d+)/)?.[1])
    expect(connect).toBeGreaterThanOrEqual(30)
  })
})

describe("hot reload does not leak pools", () => {
  // Next re-evaluates this module on every HMR pass. Each pass used to build a fresh
  // ten-slot pool and abandon the last one; the orphaned sockets reject with nobody
  // awaiting them, which is the unhandledRejection flood after every timeout.
  const source = codeOnly(src("lib/db.ts"))

  it("caches the client on globalThis", () => {
    expect(source).toMatch(/globalThis as unknown as \{ jiravisionQueryClient\?/)
    expect(source).toMatch(/globalForDb\.jiravisionQueryClient \?\? postgres\(/)
  })

  it("builds the module-level client exactly once", () => {
    expect(source.match(/postgres\(connectionString, connectionOptions\)/g)).toHaveLength(2)
  })
})

describe("a stalled connect is retried, not reported as no user", () => {
  // Back-to-back connects measured 6189ms then 3644ms, and 5078ms then 9037ms: the
  // compute answers once the wake that stalled the first attempt has finished.
  const source = codeOnly(src("lib/db.ts"))

  it("recognises driver and Postgres connection failures", () => {
    for (const code of ["ETIMEDOUT", "CONNECT_TIMEOUT", "ECONNRESET", "57P03"]) {
      expect(source).toContain(`'${code}'`)
    }
  })

  it("walks the cause chain drizzle wraps the driver error in", () => {
    expect(source).toMatch(/current\.cause/)
  })

  it("routes both session-read helpers through the retry", () => {
    expect(source.match(/withConnectionRetry\(\(\) => db\.select\(\)/g)).toHaveLength(2)
  })

  it("does not leave a bare select in the two helpers that decide who is signed in", () => {
    expect(source).not.toMatch(/await db\.select\(\)\.from\(users\)\.where\(eq\(users\.(id|email)/)
  })

  it("says the database was unreachable instead of implying a missing user", () => {
    expect(source).toMatch(/Database unreachable while loading user/)
  })
})
