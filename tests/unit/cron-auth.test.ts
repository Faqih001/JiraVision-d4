// The hourly schedule is the first route in this app that a browser never opens and no cookie
// protects: Vercel calls it with `Authorization: Bearer <CRON_SECRET>` and nothing else. A check
// that "helpfully" allows an unset secret would leave a public endpoint that mutates tasks, runs
// reports and sends email to anyone who guesses the URL. So the property under test is that the
// gate fails closed — every shape that is not the exact expected header is refused.

import { afterEach, describe, expect, it, vi } from "vitest"
import { isAuthorizedCron } from "@/app/api/cron/_auth"

const SECRET = "0123456789abcdef0123456789abcdef"

function requestWith(authorization?: string): Request {
  return new Request("https://jiravision.vercel.app/api/cron/hourly", {
    headers: authorization === undefined ? {} : { authorization },
  })
}

describe("the cron bearer gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("accepts the exact bearer header Vercel sends", () => {
    expect(isAuthorizedCron(requestWith(`Bearer ${SECRET}`), SECRET)).toBe(true)
  })

  it("refuses a request with no authorization header", () => {
    expect(isAuthorizedCron(requestWith(), SECRET)).toBe(false)
  })

  it("refuses a different secret", () => {
    expect(isAuthorizedCron(requestWith("Bearer not-the-secret"), SECRET)).toBe(false)
  })

  it("refuses a different scheme carrying the right secret", () => {
    expect(isAuthorizedCron(requestWith(`Basic ${SECRET}`), SECRET)).toBe(false)
    expect(isAuthorizedCron(requestWith(SECRET), SECRET)).toBe(false)
  })

  it("refuses everything when no secret is configured", () => {
    // The deployment-time mistake this exists for: CRON_SECRET missing from the environment.
    // Vercel then sends no header at all, and the route must not fall back to "allow".
    expect(isAuthorizedCron(requestWith(`Bearer ${SECRET}`), undefined)).toBe(false)
    expect(isAuthorizedCron(requestWith("Bearer "), "")).toBe(false)
    expect(isAuthorizedCron(requestWith(), undefined)).toBe(false)
  })

  it("refuses a secret that only differs by surrounding whitespace", () => {
    // A trailing newline in the env value is what Vercel rejects at build time with
    // INVALID_CRON_SECRET; a value that silently trimmed would hide the mismatch instead.
    expect(isAuthorizedCron(requestWith(`Bearer ${SECRET}`), `${SECRET}\n`)).toBe(false)
  })

  it("reads the secret from the environment when none is passed", () => {
    vi.stubEnv("CRON_SECRET", SECRET)
    expect(isAuthorizedCron(requestWith(`Bearer ${SECRET}`))).toBe(true)
    expect(isAuthorizedCron(requestWith("Bearer wrong"))).toBe(false)
  })
})
