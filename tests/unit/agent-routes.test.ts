import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const ROUTES = [
  "app/api/agent/handover/route.ts",
  "app/api/agent/handover/commit/route.ts",
] as const

describe("the handover routes", () => {
  it.each(ROUTES)("%s exists", (file) => {
    expect(existsSync(resolve(process.cwd(), file))).toBe(true)
  })

  it.each(ROUTES)("%s is session-gated and dynamic", (file) => {
    const body = codeOnly(src(file))
    expect(body).toMatch(/await agentSession\(\)/)
    expect(body).toMatch(/401/)
    expect(body).toMatch(/export const dynamic = "force-dynamic"/)
  })

  it("previews without writing anything", () => {
    const route = codeOnly(src("app/api/agent/handover/route.ts"))
    expect(route).not.toMatch(/insert\(/)
    expect(route).not.toMatch(/update\(/)
    expect(route).toMatch(/geminiJson/)
    expect(route).toMatch(/readHandover\(/)
  })

  it("never logs the pasted source", () => {
    const route = codeOnly(src("app/api/agent/handover/route.ts"))
    expect(route).not.toMatch(/console\.log/)
    expect(route).not.toMatch(/console\.error\([^)]*text/)
  })

  it("takes exactly one source and bounds both", () => {
    const route = codeOnly(src("app/api/agent/handover/route.ts"))
    expect(route).toMatch(/MAX_TEXT = 60_000/)
    expect(route).toMatch(/MAX_PDF_BYTES = 15 \* 1024 \* 1024/)
    expect(route).toMatch(/application\/pdf/)
  })

  it("commit re-runs the same validators instead of trusting the preview", () => {
    const route = codeOnly(src("app/api/agent/handover/commit/route.ts"))
    expect(route).toMatch(/stripCredentialValues\(/)
    expect(route).toMatch(/readRegisterFields\(/)
    expect(route).toMatch(/readPlaybookInput\(/)
    expect(route).toMatch(/isRegisterCustody\(/)
  })

  it("commit stamps provenance itself", () => {
    const route = codeOnly(src("app/api/agent/handover/commit/route.ts"))
    expect(route).toMatch(/source: "gemini"/)
    expect(route).toMatch(/aiMarked: true/)
    expect(route).toMatch(/status: "draft"/)
    expect(route).toMatch(/version: 1/)
    expect(route).toMatch(/authorId: gate\.id/)
    expect(route).not.toMatch(/insert\(tasks\)/)
  })

  it("commit dedupes by pack, kind and title", () => {
    const route = codeOnly(src("app/api/agent/handover/commit/route.ts"))
    expect(route).toMatch(/toLowerCase\(\)/)
    expect(route).toMatch(/existing/)
  })

  it("keeps extraction under the wait: thinking off, one retry inside the same budget", () => {
    const route = codeOnly(src("app/api/agent/handover/route.ts"))
    expect(route).toMatch(/thinkingBudget: 0/)
    expect(route).toMatch(/retries: 1/)
    expect(route).toMatch(/timeoutMs: 120_000/)
  })

  it("maps provider failures to honest statuses", () => {
    const shared = codeOnly(src("app/api/agent/_shared.ts"))
    expect(shared).toMatch(/auth:\s*503/)
    expect(shared).toMatch(/quota:\s*429/)
    expect(shared).toMatch(/timeout:\s*504/)
    expect(shared).toMatch(/blocked:\s*422/)
  })
})

describe("the agent's advice routes", () => {
  const ADVICE_ROUTES = [
    "app/api/agent/precautions/route.ts",
    "app/api/agent/recommendations/route.ts",
  ] as const

  it.each(ADVICE_ROUTES)("%s is session-gated and dynamic", (file) => {
    const body = codeOnly(src(file))
    expect(body).toMatch(/await agentSession\(\)/)
    expect(body).toMatch(/401/)
    expect(body).toMatch(/export const dynamic = "force-dynamic"/)
  })

  it("suggests precautions without writing one", () => {
    const route = codeOnly(src("app/api/agent/precautions/route.ts"))
    expect(route).toMatch(/readPrecautionDraft\(/)
    expect(route).toMatch(/readPrecautions\(/)
    expect(route).not.toMatch(/insert\(/)
    expect(route).not.toMatch(/update\(/)
  })

  it("re-reads the member's rows instead of trusting the request", () => {
    const route = codeOnly(src("app/api/agent/recommendations/route.ts"))
    expect(route).toMatch(/loadRecommendInput\(/)
    expect(route).toMatch(/buildRecommendations\(/)
    expect(route).not.toMatch(/body\.registers/)
  })

  it("serves rules with no key and validates the AI twin", () => {
    const route = codeOnly(src("app/api/agent/recommendations/route.ts"))
    expect(route).toMatch(/GOOGLE_GEMINI_API_KEY/)
    expect(route).toMatch(/readAiSuggestions\(/)
    expect(route).toMatch(/aiAvailable/)
  })
})
