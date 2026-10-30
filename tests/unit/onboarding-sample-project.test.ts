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
      expect(sample.items).toHaveLength(3)
      for (const item of sample.items) {
        expect(item.title.length).toBeGreaterThan(0)
        expect(item.description.length).toBeGreaterThan(0)
      }
      // The name step always carries the discipline label, so the preview is recognisably its own.
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

  it("draws each sample from the discipline's authored method, not a generic one", () => {
    // The technician pack stores its own six-step method; the sample surfaces it verbatim.
    const sample = sampleForDiscipline("technician")
    expect(sample.method).toEqual(["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"])
    expect(sample.items[1].title).toContain("Identify → Reproduce → Diagnose → Fix → Test → Document")
  })

  it("falls back to the general pack when no discipline is mapped", () => {
    const sample = sampleForDiscipline(null)
    expect(sample.discipline).toBeNull()
    expect(sample.title).toContain("your role")
    expect(sample.items).toHaveLength(3)
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
})
