import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  LEGACY_DISCIPLINE_NAMES,
  readLegacyDiscipline,
  WORK_DISCIPLINES,
} from "@/lib/roles"

// The planner kept its own nine-value discipline list before the 75-entry registry existed, so
// a plan item could hold `civil` — a string no other screen reads, which promote then copied
// into tasks.discipline. The reader is the seam: it accepts the registry, translates the
// retired names, and refuses everything else with null rather than storing an unknown token.

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

describe("readLegacyDiscipline", () => {
  it("accepts a registry id as written", () => {
    expect(readLegacyDiscipline("technician")).toBe("technician")
    expect(readLegacyDiscipline("environmental")).toBe("environmental")
  })

  it("trims and lower-cases before matching", () => {
    expect(readLegacyDiscipline("  Civil_Engineering ")).toBe("civil_engineering")
  })

  it("translates the nine names the planner used to retire", () => {
    expect(readLegacyDiscipline("civil")).toBe("civil_engineering")
    expect(readLegacyDiscipline("electrical")).toBe("electrical_engineering")
    expect(readLegacyDiscipline("mechanical")).toBe("mechanical_engineering")
    expect(readLegacyDiscipline("structural")).toBe("civil_engineering")
    expect(readLegacyDiscipline("geotechnical")).toBe("civil_engineering")
    expect(readLegacyDiscipline("environmental")).toBe("environmental")
    expect(readLegacyDiscipline("planning")).toBe("program")
    expect(readLegacyDiscipline("management")).toBe("manager")
    expect(readLegacyDiscipline("other")).toBeNull()
  })

  it("answers null for anything the registry does not know", () => {
    for (const value of [null, undefined, "", "none", "landscaping", 42, {}, ["civil"]]) {
      expect(readLegacyDiscipline(value)).toBeNull()
    }
  })

  it("translates exactly the nine names the planner used to offer", () => {
    expect(Object.keys(LEGACY_DISCIPLINE_NAMES).sort()).toEqual(
      ["civil", "electrical", "mechanical", "structural", "geotechnical", "environmental", "planning", "management", "other"].sort(),
    )
    // `other` is the only name with no successor; everything else lands on a real discipline.
    const unclassified = Object.entries(LEGACY_DISCIPLINE_NAMES).filter(([, target]) => target === null)
    expect(unclassified.map(([key]) => key)).toEqual(["other"])
  })

  it("leaves every live discipline untouched by the translation", () => {
    // A legacy key that is also a registry id would shadow the real value.
    for (const discipline of WORK_DISCIPLINES) {
      expect(readLegacyDiscipline(discipline)).toBe(discipline)
    }
  })
})

describe("the routes read discipline through the module", () => {
  it("stops copying a raw slice of the body into plan_items", () => {
    for (const file of ["app/api/planner/[id]/items/route.ts", "app/api/planner/[id]/items/[itemId]/route.ts"]) {
      expect(src(file)).toMatch(/readLegacyDiscipline/u)
      expect(src(file)).not.toMatch(/body\.discipline\.slice/u)
    }
  })

  it("normalises the model's answer instead of trusting it", () => {
    expect(src("app/api/planner/extract/route.ts")).toMatch(/readLegacyDiscipline\(item\.discipline\)/u)
  })

  it("keeps a promoted task inside the vocabulary", () => {
    const promote = src("app/api/planner/[id]/promote/route.ts")
    expect(promote).toMatch(/readLegacyDiscipline/u)
    expect(promote).not.toMatch(/discipline: item\.discipline,/u)
  })

  it("offers the registry, not the retired nine, in the editor", () => {
    const editor = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(editor).toMatch(/disciplinesInCategory/u)
    expect(editor).not.toMatch(/const DISCIPLINES = \[/u)
  })

  it("names the registry in the extraction prompt", () => {
    const prompt = src("app/api/planner/extract/route.ts")
    expect(prompt).toMatch(/WORK_DISCIPLINES/u)
    expect(prompt).not.toMatch(/civil, electrical, mechanical/u)
  })

  it("carries the playbook's discipline onto the tasks its steps become", () => {
    const commit = src("app/api/agent/handover/commit/route.ts")
    expect(commit).toMatch(/const playbookDiscipline = readLegacyDiscipline\(row\.discipline\)/u)
    expect(commit).toMatch(/discipline: playbookDiscipline/u)
  })

  it("has no write path that falls back to one general discipline", () => {
    // `DEFAULT_DISCIPLINE` used to be the catch-all every silent create path stamped onto a row.
    for (const file of [
      "app/api/tasks/route.ts",
      "app/api/worklog/entries/route.ts",
      "lib/worklog/entry-fields.ts",
      "app/api/agent/handover/commit/route.ts",
    ]) {
      expect(src(file), file).not.toMatch(/DEFAULT_DISCIPLINE/u)
    }
  })
})
