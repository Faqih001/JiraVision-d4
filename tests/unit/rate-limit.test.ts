import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearBucket, clientIp, rateLimited, retryAfterSeconds } from "@/lib/rate-limit"

// The buckets live in module state, so every test owns a key nobody else uses.
let seq = 0
const freshKey = () => `unit:${process.pid}:${++seq}`

describe("rateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-28T09:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows up to the limit and blocks the next attempt", () => {
    const key = freshKey()
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(rateLimited(key, { max: 3, windowMs: 60_000 })).toBe(false)
    }
    expect(rateLimited(key, { max: 3, windowMs: 60_000 })).toBe(true)
  })

  it("starts a fresh window once the old one expires", () => {
    const key = freshKey()
    for (let attempt = 0; attempt < 2; attempt += 1) rateLimited(key, { max: 2, windowMs: 60_000 })
    expect(rateLimited(key, { max: 2, windowMs: 60_000 })).toBe(true)

    vi.advanceTimersByTime(60_001)

    expect(rateLimited(key, { max: 2, windowMs: 60_000 })).toBe(false)
  })

  it("counts each key on its own", () => {
    const first = freshKey()
    const second = freshKey()
    expect(rateLimited(first, { max: 1, windowMs: 60_000 })).toBe(false)
    expect(rateLimited(first, { max: 1, windowMs: 60_000 })).toBe(true)
    expect(rateLimited(second, { max: 1, windowMs: 60_000 })).toBe(false)
  })

  it("defaults to five attempts in a minute", () => {
    const key = freshKey()
    for (let attempt = 0; attempt < 5; attempt += 1) expect(rateLimited(key)).toBe(false)
    expect(rateLimited(key)).toBe(true)
  })

  describe("retryAfterSeconds", () => {
    it("reports the whole seconds left in the window", () => {
      const key = freshKey()
      rateLimited(key, { max: 1, windowMs: 60_000 })
      vi.advanceTimersByTime(15_500)

      expect(retryAfterSeconds(key)).toBe(45)
    })

    it("never returns zero, so a client is not told to retry instantly", () => {
      expect(retryAfterSeconds(freshKey())).toBe(1)
    })
  })

  describe("clearBucket", () => {
    it("gives the attempts back", () => {
      const key = freshKey()
      rateLimited(key, { max: 1, windowMs: 60_000 })
      expect(rateLimited(key, { max: 1, windowMs: 60_000 })).toBe(true)

      clearBucket(key)

      expect(rateLimited(key, { max: 1, windowMs: 60_000 })).toBe(false)
    })
  })
})

describe("clientIp", () => {
  it("takes the client from the front of x-forwarded-for", () => {
    const request = new Request("https://jiravision.test/", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" },
    })
    expect(clientIp(request)).toBe("203.0.113.7")
  })

  it("falls back to a shared key when the header is absent", () => {
    expect(clientIp(new Request("https://jiravision.test/"))).toBe("unknown")
  })
})
