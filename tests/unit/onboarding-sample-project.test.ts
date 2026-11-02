import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

import { sampleForDiscipline } from "@/lib/onboarding/sample-project"
import { DISCIPLINE_LABEL, WORK_DISCIPLINES } from "@/lib/roles"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

describe("sampleForDiscipline", () => {
  it("gives every one of the 75 disciplines a usable, bounded sample", () => {
    for (const discipline of WORK_DISCIPLINES) {
      const sample = sampleForDiscipline(discipline)
      expect(sample.discipline).toBe(discipline)
      expect(sample.title).toMatch(/^Sample project — a first week in /u)
      expect(sample.title.length).toBeLessThanOrEqual(200)
      expect(sample.summary.length).toBeGreaterThan(0)
      expect(sample.items.length).toBeGreaterThanOrEqual(1)
      expect(sample.items.length).toBeLessThanOrEqual(12)
      for (const item of sample.items) {
        expect(item.title.length).toBeGreaterThan(0)
        expect(item.description.length).toBeGreaterThan(0)
      }
      expect(sample.title).toContain(DISCIPLINE_LABEL[discipline])
    }
  })

  it("is discipline-specific: two different roles get different starter content", () => {
    const technician = sampleForDiscipline("technician")
    const finance = sampleForDiscipline("finance")
    expect(technician.title).not.toBe(finance.title)
    expect(technician.method.join(" ")).not.toBe(finance.method.join(" "))
    expect(technician.items.map((i) => i.title)).not.toEqual(finance.items.map((i) => i.title))
  })

  it("draws the method from the discipline's seed JSON", () => {
    const sample = sampleForDiscipline("technician")
    expect(sample.method).toEqual(["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"])
    expect(sample.seed).not.toBeNull()
    expect(sample.seed!.discipline.key).toBe("technician")
  })

  it("falls back to the general pack when no discipline is mapped", () => {
    const sample = sampleForDiscipline(null)
    expect(sample.discipline).toBeNull()
    expect(sample.title).toContain("your role")
    expect(sample.items).toHaveLength(3)
    expect(sample.seed).toBeNull()
  })

  it("includes seed preview data when the JSON file exists", () => {
    const sample = sampleForDiscipline("technician")
    expect(sample.seed).not.toBeNull()
    expect(sample.seed!.registers.length).toBeGreaterThan(0)
    expect(sample.seed!.playbooks.length).toBeGreaterThan(0)
    expect(sample.seed!.tasks.length).toBeGreaterThan(0)
    expect(sample.seed!.kpis.length).toBeGreaterThan(0)
  })
})

describe("the onboarding sample no longer hard-codes IT support", () => {
  it("derives the title from the discipline through the shared module", () => {
    expect(src("lib/onboarding/write.ts")).toContain("sampleForDiscipline")
    expect(src("lib/onboarding/write.ts")).not.toContain("one week of IT support")
  })

  it("shows the tailored sample preview in the wizard behind an expandable disclosure", () => {
    const wizard = src("app/onboarding/onboarding-wizard.tsx")
    expect(wizard).toContain("sampleForDiscipline")
    expect(wizard).toContain("See what you")
    expect(wizard).toContain("projectMode === \"sample\"")
  })

  it("fetches the seed preview from the API route for the rich preview", () => {
    const wizard = src("app/onboarding/onboarding-wizard.tsx")
    expect(wizard).toContain("/api/onboarding/sample")
    expect(wizard).toContain("seedPreview")
    expect(wizard).toContain("Register rows")
    expect(wizard).toContain("Playbook drafts")
    expect(wizard).toContain("Recurring tasks")
    expect(wizard).toContain("KPIs")
  })
})
