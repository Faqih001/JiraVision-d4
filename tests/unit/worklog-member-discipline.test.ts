import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { WORK_DISCIPLINES } from "@/lib/roles"
import { disciplineFromPreferenceList, resolveDisciplineDefault } from "@/lib/worklog/discipline-default"

// The owner picked one discipline at onboarding and expects the log form to open already
// classified. Two rules make that safe: the ranking below, and a value outside the
// 75-discipline vocabulary is never offered as a default — it would render as an undefined
// label and write a string no report can group.

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

describe("resolveDisciplineDefault", () => {
  it("prefers the discipline last logged", () => {
    expect(resolveDisciplineDefault({ lastLogged: "developer", jobTitle: "IT Technician", onboarding: "technician" })).toBe("developer")
  })

  it("uses the job title when nothing has been logged yet", () => {
    // The owner's saved preference list is every discipline — onboarding wrote that before it
    // learned to store only the mapped one — so the job title is what still identifies them.
    expect(resolveDisciplineDefault({ lastLogged: null, jobTitle: "IT Technician", onboarding: "executive" })).toBe("technician")
  })

  it("falls back to the onboarding discipline when neither is available", () => {
    expect(resolveDisciplineDefault({ lastLogged: null, jobTitle: null, onboarding: "technician" })).toBe("technician")
  })

  it("returns null when there is nothing to inherit, rather than inventing a general one", () => {
    expect(resolveDisciplineDefault({ lastLogged: null, jobTitle: null, onboarding: null })).toBeNull()
    expect(resolveDisciplineDefault({})).toBeNull()
    expect(resolveDisciplineDefault({ jobTitle: "Grand Wizard of Azure" })).toBeNull()
  })

  it("ignores an off-vocabulary value in any slot instead of passing it through", () => {
    // The planner's old nine-value list (civil, electrical, …) is exactly this shape: a real
    // string in the column that is not a work discipline.
    expect(resolveDisciplineDefault({ lastLogged: "civil", onboarding: "technician" })).toBe("technician")
    expect(resolveDisciplineDefault({ lastLogged: "technician", onboarding: "other" })).toBe("technician")
    expect(resolveDisciplineDefault({ lastLogged: "civil", onboarding: "electrical" })).toBeNull()
  })

  it("treats an empty or whitespace preference entry as absent", () => {
    for (const junk of ["", "   ", "TECHNICIAN", " technician "]) {
      expect(resolveDisciplineDefault({ lastLogged: junk, onboarding: null })).toBeNull()
    }
  })

  it("accepts any real discipline in either slot", () => {
    for (const discipline of WORK_DISCIPLINES) {
      expect(resolveDisciplineDefault({ lastLogged: discipline, onboarding: null })).toBe(discipline)
      expect(resolveDisciplineDefault({ lastLogged: null, onboarding: discipline })).toBe(discipline)
    }
  })
})

describe("disciplineFromPreferenceList", () => {
  it("reads a single saved discipline as the choice it is", () => {
    expect(disciplineFromPreferenceList(["technician"])).toBe("technician")
  })

  it("reads a list of every discipline as no choice made", () => {
    // Onboarding used to store all 75 when it could not map the job title. Treating the first
    // of them as "the discipline they picked" is how a technician got a default of executive.
    expect(disciplineFromPreferenceList(WORK_DISCIPLINES)).toBeNull()
    expect(disciplineFromPreferenceList([])).toBeNull()
    expect(disciplineFromPreferenceList(["technician", "developer"])).toBeNull()
    expect(disciplineFromPreferenceList(["civil"])).toBeNull()
    expect(disciplineFromPreferenceList([null, 7])).toBeNull()
  })

})

describe("purity", () => {
  it("keeps the rule out of the database layer so both dialogs can share it", () => {
    const code = src("lib/worklog/discipline-default.ts")
    expect(code).not.toMatch(/@\/lib\/db|next\/server|@\/drizzle\/schema/u)
  })
})

describe("the member read", () => {
  const code = () => src("lib/worklog/member-discipline.ts")

  it("reads the last logged discipline from this member's own rows only", () => {
    expect(code()).toMatch(/eq\(workLogEntries\.userId, userId\)/u)
    expect(code()).toMatch(/isNotNull\(workLogEntries\.discipline\)/u)
    expect(code()).toMatch(/desc\(workLogEntries\.workedOn\)/u)
    expect(code()).toMatch(/\.limit\(1\)/u)
  })

  it("hands all three signals to the pure resolver instead of deciding here", () => {
    expect(code()).toMatch(/resolveDisciplineDefault/u)
    expect(code()).toMatch(/jobTitle: user\.jobTitle/u)
    expect(code()).toMatch(/disciplineFromPreferenceList\(workDisciplinesOf\(user\)\)/u)
  })

  it("degrades to the user row when the log read fails", () => {
    // A work-log read is a convenience default; it must never break a page load.
    expect(code()).toMatch(/catch/u)
    expect(code()).toMatch(/console\.error/u)
  })

  it("serves the page through the entries read, which already carries today and timezone", () => {
    const route = src("app/api/worklog/entries/route.ts")
    expect(route).toMatch(/defaultDiscipline/u)
    expect(route).toMatch(/memberDisciplineDefault/u)
  })
})
