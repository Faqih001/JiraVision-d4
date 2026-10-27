import { describe, expect, it } from "vitest"
import { formatBand, readBand, type CareerBand } from "@/lib/career/bands"

describe("readBand", () => {
  it("accepts an unpublished band with nothing filled in", () => {
    expect(readBand({})).toEqual({
      ok: true,
      band: { min: null, max: null, currency: null },
    })
    expect(readBand({ min: null, max: null, currency: null }).ok).toBe(true)
  })

  it("accepts an equal min and max", () => {
    expect(readBand({ min: 10, max: 10, currency: "usd" })).toEqual({
      ok: true,
      band: { min: 10, max: 10, currency: "USD" },
    })
  })

  it("refuses half a range", () => {
    const minOnly = readBand({ min: 10, currency: "USD" })
    expect(minOnly.ok).toBe(false)
    if (!minOnly.ok) expect(minOnly.error).toMatch(/both/i)

    const maxOnly = readBand({ max: 10, currency: "USD" })
    expect(maxOnly.ok).toBe(false)
  })

  it("refuses a range without a currency and does not default one", () => {
    const result = readBand({ min: 10, max: 20 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/currency/i)
  })

  it("refuses a currency with no range", () => {
    expect(readBand({ currency: "USD" }).ok).toBe(false)
  })

  it("refuses a reversed, negative or fractional range", () => {
    expect(readBand({ min: 20, max: 10, currency: "USD" }).ok).toBe(false)
    expect(readBand({ min: -1, max: 10, currency: "USD" }).ok).toBe(false)
    expect(readBand({ min: 1.5, max: 10, currency: "USD" }).ok).toBe(false)
  })

  it("refuses values that are not numbers", () => {
    expect(readBand({ min: "10", max: "20", currency: "USD" }).ok).toBe(false)
  })

  it("refuses a currency that is not exactly three letters", () => {
    expect(readBand({ min: 10, max: 20, currency: "US" }).ok).toBe(false)
    expect(readBand({ min: 10, max: 20, currency: "USDD" }).ok).toBe(false)
    expect(readBand({ min: 10, max: 20, currency: "U5D" }).ok).toBe(false)
  })
})

describe("formatBand", () => {
  it("returns null when the band is not published", () => {
    const unpublished: CareerBand = { min: null, max: null, currency: null }
    expect(formatBand(unpublished)).toBeNull()
    expect(formatBand({ min: 10, max: null, currency: "USD" })).toBeNull()
  })

  it("formats a published range with thousands separators and the code", () => {
    expect(formatBand({ min: 10000, max: 20000, currency: "USD" })).toBe("10,000–20,000 USD")
  })
})
