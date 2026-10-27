import { describe, expect, it } from "vitest"
import { isFail, readRecipientIds, MAX_RECIPIENTS } from "@/lib/reports/recipients"

describe("readRecipientIds", () => {
  it("accepts a sorted array of distinct positive integers", () => {
    const result = readRecipientIds([3, 1, 2])
    expect(isFail(result)).toBe(false)
    if (!isFail(result)) expect(result.value).toEqual([1, 2, 3])
  })

  it("refuses an empty array", () => {
    const result = readRecipientIds([])
    expect(isFail(result)).toBe(true)
  })

  it("refuses more than MAX_RECIPIENTS", () => {
    const tooMany = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => i + 1)
    const result = readRecipientIds(tooMany)
    expect(isFail(result)).toBe(true)
  })

  it("refuses duplicates", () => {
    const result = readRecipientIds([1, 1, 2])
    expect(isFail(result)).toBe(true)
  })

  it("refuses non-integer or non-positive values", () => {
    expect(isFail(readRecipientIds([0]))).toBe(true)
    expect(isFail(readRecipientIds([-1]))).toBe(true)
    expect(isFail(readRecipientIds([1.5]))).toBe(true)
    expect(isFail(readRecipientIds(["1"]))).toBe(true)
    expect(isFail(readRecipientIds(null))).toBe(true)
    expect(isFail(readRecipientIds("not-array"))).toBe(true)
  })
})
