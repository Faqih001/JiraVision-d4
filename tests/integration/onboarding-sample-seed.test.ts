import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("/api/onboarding/sample after the seed-based sample project", () => {
  const route = src("app/api/onboarding/sample/route.ts")

  it("is a GET-only route", () => {
    expect(route).toContain("export async function GET")
    expect(route).not.toContain("export async function POST")
    expect(route).not.toContain("export async function PATCH")
    expect(route).not.toContain("export async function DELETE")
  })

  it("reads the discipline from the query string", () => {
    expect(route).toContain("searchParams.get(\"discipline\")")
    expect(route).toContain("normaliseDiscipline")
  })

  it("loads the seed preview from the discipline JSON file", () => {
    expect(route).toContain("loadDisciplineSeed")
  })

  it("returns a null data with a message when no seed is found", () => {
    expect(route).toContain("data: null")
    expect(route).toContain("message:")
  })

  it("uses force-dynamic to skip the route cache", () => {
    expect(route).toContain('export const dynamic = "force-dynamic"')
  })

  it("never reads GOOGLE_GEMINI_API_KEY", () => {
    expect(route).not.toContain("GOOGLE_GEMINI_API_KEY")
    expect(route).not.toContain("geminiJson")
  })
})

describe("the sample seed reader", () => {
  const reader = src("lib/onboarding/sample-seed-reader.ts")

  it("guards against browser execution", () => {
    expect(reader).toContain('typeof window !== "undefined"')
  })

  it("reads from public/files/disciplines/", () => {
    expect(reader).toContain("public")
    expect(reader).toContain("files")
    expect(reader).toContain("disciplines")
  })

  it("extracts registers, playbooks, tasks and KPIs from the seed JSON", () => {
    expect(reader).toContain("extractRegisters")
    expect(reader).toContain("extractPlaybooks")
    expect(reader).toContain("extractTasks")
    expect(reader).toContain("extractKpis")
  })

  it("returns null for a missing or malformed file", () => {
    expect(reader).toContain("return null")
    expect(reader).toContain("catch")
  })
})

describe("the sample project module after the seed-based rewrite", () => {
  const sample = src("lib/onboarding/sample-project.ts")

  it("tries the seed JSON first, then falls back to the pack", () => {
    expect(sample).toContain("loadDisciplineSeed")
    expect(sample).toContain("sampleFromSeed")
    expect(sample).toContain("sampleFromPack")
  })

  it("returns the seed preview alongside the plan items", () => {
    expect(sample).toContain("seed: DisciplineSeedPreview | null")
    expect(sample).toContain("seed,")
  })

  it("derives plan items from register rows, playbook seeds, task templates and KPIs", () => {
    expect(sample).toContain("seed.registers")
    expect(sample).toContain("seed.playbooks")
    expect(sample).toContain("seed.tasks")
    expect(sample).toContain("seed.kpis")
  })
})

describe("the onboarding wizard preview after the seed-based rewrite", () => {
  const wizard = src("app/onboarding/onboarding-wizard.tsx")

  it("fetches the seed preview from the API route", () => {
    expect(wizard).toContain("/api/onboarding/sample")
    expect(wizard).toContain("fetchSeedPreview")
  })

  it("shows register rows in the preview", () => {
    expect(wizard).toContain("Register rows")
    expect(wizard).toContain("seedPreview.registers")
  })

  it("shows playbook drafts in the preview", () => {
    expect(wizard).toContain("Playbook drafts")
    expect(wizard).toContain("seedPreview.playbooks")
  })

  it("shows recurring tasks in the preview", () => {
    expect(wizard).toContain("Recurring tasks")
    expect(wizard).toContain("seedPreview.tasks")
  })

  it("shows KPIs in the preview", () => {
    expect(wizard).toContain("KPIs")
    expect(wizard).toContain("seedPreview.kpis")
  })

  it("shows a needs-confirmation panel when the seed has items to confirm", () => {
    expect(wizard).toContain("needsConfirmation")
    expect(wizard).toContain("Needs your confirmation")
  })

  it("falls back to the simple item list when no seed preview is available", () => {
    expect(wizard).toContain("sampleDraft.items")
  })
})
