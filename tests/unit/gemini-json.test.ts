import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  GeminiError,
  computeAttemptMs,
  geminiJson,
  parseJsonObject,
  resetModelCache,
  stripJsonFences,
} from "@/lib/ai/gemini"

// The provider is stubbed at the fetch boundary: discovery is skipped by pinning
// GEMINI_MODEL, and generateContent answers from a queue of canned Responses so
// the truncation and fence paths are exercised without any network.

const schema = { type: "object", properties: { a: { type: "number" } }, required: ["a"] } as const
const identity = (raw: unknown) => raw as { a: number }

function jsonReply(text: string, finishReason: string, usage: Record<string, number> = {}) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] }, finishReason }],
      usageMetadata: usage,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}

beforeEach(() => {
  process.env.GEMINI_MODEL = "gemini-2.5-flash"
  process.env.GOOGLE_GEMINI_API_KEY = "test-key"
  resetModelCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GEMINI_MODEL
  delete process.env.GOOGLE_GEMINI_API_KEY
})

function stubFetch(...replies: Response[]) {
  const queue = [...replies]
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => queue.shift() ?? new Response("no reply queued", { status: 500 })),
  )
}

describe("stripJsonFences", () => {
  it("removes a leading ```json fence and trailing ```", () => {
    expect(stripJsonFences("```json\n{\"a\":1}\n```")).toBe('{"a":1}')
    expect(stripJsonFences("```\n{\"a\":1}\n```")).toBe('{"a":1}')
  })

  it("leaves plain JSON untouched", () => {
    expect(stripJsonFences('{"a":1}')).toBe('{"a":1}')
  })

  it("trims surrounding whitespace", () => {
    expect(stripJsonFences("\n\n {\"a\":1}  \n")).toBe('{"a":1}')
  })
})

describe("parseJsonObject", () => {
  it("parses fenced JSON as a fallback", () => {
    expect(parseJsonObject("```json\n{\"a\":7}\n```")).toEqual({ a: 7 })
  })

  it("throws when neither the raw nor the de-fenced body is JSON", () => {
    expect(() => parseJsonObject("not json at all")).toThrow()
  })
})

describe("computeAttemptMs", () => {
  it("splits the total budget across the retries", () => {
    expect(computeAttemptMs(120_000, 1)).toBe(60_000)
    expect(computeAttemptMs(120_000, 0)).toBe(120_000)
    expect(computeAttemptMs(90_000, 2)).toBe(30_000)
  })

  it("never goes below a one second floor", () => {
    expect(computeAttemptMs(1_000, 5)).toBe(1_000)
  })
})

describe("geminiJson truncation detection", () => {
  it("tags a MAX_TOKENS finish as badjson/truncated, distinct from a parse failure", async () => {
    stubFetch(jsonReply('{"a":1,"b":', "MAX_TOKENS", { thoughtsTokenCount: 8000 }))
    await expect(
      geminiJson({ contents: [{ text: "x" }], responseSchema: schema }, identity),
    ).rejects.toMatchObject({ kind: "badjson", tag: "truncated" })
  })

  it("surfaces the truncated tag without ever leaking the provider body", async () => {
    stubFetch(jsonReply('{"a":1,"b":', "MAX_TOKENS"))
    const error = await geminiJson(
      { contents: [{ text: "x" }], responseSchema: schema },
      identity,
    ).catch((e) => e)
    expect(error).toBeInstanceOf(GeminiError)
    expect((error as GeminiError).kind).toBe("badjson")
    expect((error as GeminiError).tag).toBe("truncated")
    expect((error as GeminiError).message).not.toContain('{"a"')
  })
})

describe("geminiJson fenced parsing", () => {
  it("recovers a valid object that arrived inside code fences", async () => {
    stubFetch(jsonReply("```json\n{\"a\":42}\n```", "STOP"))
    const result = await geminiJson({ contents: [{ text: "x" }], responseSchema: schema }, identity)
    expect(result.data).toEqual({ a: 42 })
  })

  it("passes through clean JSON unchanged", async () => {
    stubFetch(jsonReply("{\"a\":1}", "STOP"))
    const result = await geminiJson({ contents: [{ text: "x" }], responseSchema: schema }, identity)
    expect(result.data).toEqual({ a: 1 })
  })
})
