import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { readGrounding } from "@/lib/ai/gemini"

const source = readFileSync(resolve("lib/ai/gemini.ts"), "utf8")

describe("the Gemini provider module", () => {
  it("exports geminiText and geminiJson functions", () => {
    expect(source).toContain("export async function geminiText")
    expect(source).toContain("export async function geminiJson")
  })

  it("uses plain fetch, no SDK", () => {
    expect(source).not.toMatch(/import.*@google\/genai/u)
    expect(source).toMatch(/fetch\(`/u)
  })

  it("targets the Gemini API base URL", () => {
    expect(source).toContain("generativelanguage.googleapis.com/v1beta")
  })

  it("defines GeminiError with six error kinds", () => {
    expect(source).toContain("export class GeminiError")
    expect(source).toContain("auth")
    expect(source).toContain("quota")
    expect(source).toContain("blocked")
    expect(source).toContain("timeout")
    expect(source).toContain("transport")
    expect(source).toContain("badjson")
  })

  it("implements model discovery when GEMINI_MODEL is unset", () => {
    expect(source).toContain("discoverModel")
    expect(source).toContain("process.env.GEMINI_MODEL")
    expect(source).toContain("cachedModel")
  })

  it("uses AbortController for timeouts", () => {
    expect(source).toContain("AbortController")
    expect(source).toContain("timeoutMs")
  })

  it("defines default timeouts for chat, extraction, and prose", () => {
    expect(source).toContain("chat: 20_000")
    expect(source).toContain("extraction: 120_000")
    expect(source).toContain("prose: 45_000")
  })

  it("geminiJson requires responseSchema", () => {
    expect(source).toMatch(/if\s*\(!req\.responseSchema\)/u)
    expect(source).toContain("responseSchema is required for geminiJson")
  })

  it("sets responseMimeType to application/json for structured output", () => {
    expect(source).toContain("responseMimeType")
    expect(source).toContain("application/json")
  })

  it("parses JSON response and validates with zod", () => {
    expect(source).toContain("JSON.parse")
    expect(source).toContain("parse(parsed)")
  })

  it("classifies HTTP errors into error kinds", () => {
    expect(source).toContain("classifyError")
    expect(source).toMatch(/status\s*===\s*401.*auth/u)
    expect(source).toMatch(/status\s*===\s*429.*quota/u)
  })

  it("extracts usage metadata from response", () => {
    expect(source).toContain("usageMetadata")
    expect(source).toContain("promptTokenCount")
    expect(source).toContain("candidatesTokenCount")
    expect(source).toContain("totalTokenCount")
  })

  it("exports resetModelCache for testing", () => {
    expect(source).toContain("export function resetModelCache")
  })
})

describe("thinking and retry budget", () => {
  it("only sends thinkingConfig when the request sets a budget, and only to models that think", () => {
    expect(source).toContain("thinkingBudget?: number")
    expect(source).toContain("thinkingConfig")
    expect(source).toMatch(/if \(req\.thinkingBudget !== undefined && thinks\(model\)\)/u)
  })

  it("treats pre-2.5 models and versioned aliases correctly", () => {
    expect(source).toContain("function thinks(model: string): boolean")
    expect(source).toMatch(/major === 2 && minor >= 5/u)
    expect(source).toMatch(/if \(!version\) return true/u)
  })

  it("splits the timeout across retries and retries only a timeout", () => {
    expect(source).toContain("retries?: number")
    expect(source).toMatch(/const attempts = Math\.max\(1, \(req\.retries \?\? 0\) \+ 1\)/u)
    expect(source).toMatch(/const attemptMs = Math\.max\(1_000, Math\.floor\(timeoutMs \/ attempts\)\)/u)
    expect(source).toMatch(/error\.kind === "timeout" && attempt < attempts/u)
  })
})

describe("grounding support", () => {
  it("opts into google_search only when asked", () => {
    expect(source).toContain("googleSearch?: boolean")
    expect(source).toContain("google_search")
    expect(source).toMatch(/if \(req\.googleSearch\)/)
  })

  it("normalises grounding chunks into http(s) sources", () => {
    expect(
      readGrounding({
        candidates: [
          {
            groundingMetadata: {
              webSearchQueries: ["nestjs mentoring"],
              groundingChunks: [
                { web: { uri: "https://example.com/course/", title: "Course" } },
                { web: { uri: "not-a-url", title: "Bad" } },
                { web: { uri: "https://example.com/two#frag" } },
              ],
            },
          },
        ],
      }),
    ).toEqual({
      queries: ["nestjs mentoring"],
      sources: [
        { url: "https://example.com/course", title: "Course" },
        { url: "https://example.com/two", title: null },
      ],
    })
  })

  it("returns null when the answer carried no grounding", () => {
    expect(readGrounding({ candidates: [{ content: { parts: [{ text: "x" }] } }] })).toBeNull()
    expect(readGrounding(null)).toBeNull()
  })
})
