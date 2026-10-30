import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

const propose = src("app/api/ops/config/propose/route.ts")
const apply = src("app/api/ops/config/apply/route.ts")
const reset = src("app/api/ops/config/reset/route.ts")

describe("ops config propose route", () => {
  it("requires a session and resolves the pack from it, never from a parameter", () => {
    expect(propose).toContain("getSession()")
    expect(propose).toContain("unauthorized()")
    expect(propose).toContain("defaultDisciplineOf(session)")
    expect(propose).toContain("loadOpsConfigForDiscipline(discipline)")
    expect(propose).not.toMatch(/searchParams|body\.packKey|\}\s*\.packKey/)
  })

  it("bounds the document the way the extractor does", () => {
    expect(propose).toContain("ALLOWED_MIMES")
    expect(propose).toContain("application/pdf")
    expect(propose).toContain("MAX_FILE_SIZE")
    expect(propose).toContain("base64.length > MAX_FILE_SIZE")
  })

  it("sends the document through the one Gemini door and returns a diff", () => {
    expect(propose).toContain("proposeConfigFromDocument(ctx.config, mimeType, base64")
    expect(propose).toContain("diffConfig(ctx.config, outcome.proposal)")
    expect(propose).toContain("rejected: outcome.rejected")
    expect(propose).not.toContain("gemini")
    expect(propose).not.toContain("generativelanguage")
  })

  it("carries the same disclosure the document import page shows", () => {
    expect(propose).toContain("sent to Google for processing and is not stored")
    expect(propose).toContain("Credential values are refused")
  })

  it("stores nothing at all", () => {
    expect(propose).not.toMatch(/from "@\/lib\/db"|\binsert\(|\bupdate\(|\bdelete\(/)
    expect(propose).not.toContain("@/lib/db")
  })

  it("answers quota and missing-key with their own statuses", () => {
    expect(propose).toContain("isGeminiQuotaError(error)")
    expect(propose).toContain("{ status: 429 }")
    expect(propose).toContain("isGeminiAuthError(error)")
    expect(propose).toContain("{ status: 503 }")
  })
})

describe("ops config apply route", () => {
  it("requires a session and refuses anyone who is not an admin", () => {
    expect(apply).toContain("getSession()")
    expect(apply).toContain("unauthorized()")
    expect(apply).toMatch(/session\.role !== "admin"[\s\S]*session\.role !== "super_admin"/u)
    expect(apply).toContain('forbidden("Only an admin can change a pack\'s operations rules.")')
  })

  it("re-normalises whatever the browser sends instead of trusting it", () => {
    expect(apply).toContain("normaliseProposal(ctx.config, proposal)")
    expect(apply).toMatch(/normaliseProposal[\s\S]*diffConfig[\s\S]*mergeAndValidate/u)
    expect(apply).toContain("mergeAndValidate(ctx.config")
  })

  it("refuses an empty selection and a merge the schema rejects", () => {
    expect(apply).toContain("selectedRefs.length === 0")
    expect(apply).toContain("Select at least one proposed item to apply.")
    expect(apply).toContain("if (!merged.ok)")
    expect(apply).toContain("errors: merged.errors")
    expect(apply).toContain("{ status: 400 }")
  })

  it("writes only this pack's ops_config, and only the pack the session resolves to", () => {
    expect(apply).toContain("loadOpsConfigForDiscipline(discipline)")
    expect(apply).toContain("update(rolePacks)")
    expect(apply).toContain("set({ opsConfig: merged.config")
    expect(apply).toContain("eq(rolePacks.packKey, ctx.packKey)")
    expect(apply).not.toMatch(/body[^]{0,40}packKey/)
  })

  it("returns the config it replaced so the reviewer can see what moved", () => {
    expect(apply).toContain("const previous = ctx.config")
    expect(apply).toContain("previous,")
    expect(apply).toContain("applied: merged.applied")
  })

  it("keeps the document and the member's email out of the log line", () => {
    expect(apply).not.toContain("base64")
    expect(apply).not.toContain("session.email")
    expect(apply).toMatch(/console\.log\(`opsConfig apply: user=\$\{session\.id\}/u)
  })
})

describe("ops config reset route", () => {
  it("is admin-only and needs an explicit confirmation", () => {
    expect(reset).toContain('session.role !== "admin"')
    expect(reset).toContain("confirm !== true")
    expect(reset).toContain("Pass { confirm: true }")
  })

  it("restores the code-authored config, validated before it is written", () => {
    expect(reset).toContain("opsConfigForPackKey(ctx.packKey)")
    expect(reset).toContain("safeValidateOpsConfig(authored)")
    expect(reset).toContain("set({ opsConfig: checked.data")
    expect(reset).toContain("eq(rolePacks.packKey, ctx.packKey)")
  })

  it("says so when a pack has no authored config to fall back to", () => {
    expect(reset).toContain("nothing to reset to")
    expect(reset).toContain("{ status: 409 }")
  })
})

describe("the write door is named where the config is documented", () => {
  it("no longer claims that nothing but the seed script writes config", () => {
    const registry = src("lib/packs/ops/registry.ts")
    expect(registry).toContain("/api/ops/config/apply")
    expect(registry).not.toContain("Nothing else writes config")
  })

  it("keeps the read-only page as the only GET of the config", () => {
    const read = src("app/api/ops/config/route.ts")
    expect(read).toContain("export async function GET()")
    expect(read).not.toContain("export async function POST")
  })
})
