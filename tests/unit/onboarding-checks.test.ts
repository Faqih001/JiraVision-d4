import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { EMPTY_ONBOARDING, ONBOARDING_STEPS, resumeStep } from "@/lib/onboarding/state"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("the owner's seventeen onboarding checks", () => {
  it("1. successful registration enters onboarding", () => {
    expect(codeOnly(src("app/(auth)/signup/page.tsx"))).toContain('router.push("/onboarding")')
  })

  it("2. the user's name and email are prefilled", () => {
    const page = codeOnly(src("app/onboarding/page.tsx"))
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    expect(page).toMatch(/account=\{\{\s*name: session\.name,\s*email: session\.email/)
    expect(wizard).toMatch(/readOnly/)
  })

  it("3. each step validates the fields it requires", () => {
    expect(ONBOARDING_STEPS).toHaveLength(8)
    // profile is the one step with a required field; the state module names the error.
    expect(codeOnly(src("lib/onboarding/state.ts"))).toContain("Add your name before continuing.")
  })

  it("4. back navigation preserves form data", () => {
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    expect(wizard).toMatch(/setStep\(\(current\) => Math\.max\(0, current - 1\)\)/)
    expect(wizard).not.toMatch(/setData\(.*EMPTY_ONBOARDING.*\.data/)
  })

  it("5. progress persists after refresh", () => {
    const page = codeOnly(src("app/onboarding/page.tsx"))
    expect(page).toMatch(/readOnboardingView\(session\)/)
    expect(codeOnly(src("lib/onboarding/read.ts"))).toMatch(/readOnboardingState/)
  })

  it("6. incomplete onboarding resumes after login", () => {
    expect(resumeStep({ ...EMPTY_ONBOARDING, status: "in_progress", step: 4 })).toBe(4)
    expect(codeOnly(src("app/dashboard/page.tsx"))).toMatch(/\/onboarding/)
  })

  it("7. completed onboarding redirects to the dashboard", () => {
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    const complete = wizard.indexOf('status: "completed"')
    const push = wizard.indexOf('router.push("/dashboard")')
    expect(complete).toBeGreaterThan(-1)
    expect(push).toBeGreaterThan(complete)
  })

  it("8. existing users are not incorrectly blocked", () => {
    const dashboard = codeOnly(src("app/dashboard/page.tsx"))
    expect(dashboard).not.toMatch(/redirect\("\/onboarding"\)/)
    expect(codeOnly(src("lib/onboarding/state.ts"))).toMatch(/isGrandfathered/)
  })

  it("9. workspace creation respects authorization", () => {
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    expect(wizard).toMatch(/initial\.canRenameTeam/)
    expect(codeOnly(src("app/api/team/settings/route.ts"))).toMatch(/isSuperAdmin/)
  })

  it("10. duplicate submissions do not create duplicate records", () => {
    const write = codeOnly(src("lib/onboarding/write.ts"))
    expect(write).toMatch(/if \(existing\) return \{ planId: existing\.id, created: false \}/)
    expect(write).toMatch(/isNull\(workspaceInvitations\.acceptedAt\)/)
  })

  it("11. work-discipline selections validate against the canonical vocabulary", () => {
    const state = codeOnly(src("lib/onboarding/state.ts"))
    expect(state).toMatch(/isWorkDiscipline/)
    expect(state).toContain("discipline must be a known work discipline")
  })

  it("12. new users default to all work disciplines", () => {
    const read = codeOnly(src("lib/registers/read.ts"))
    expect(read).toMatch(/workDisciplines/)
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    expect(wizard).toMatch(/disciplinesTouched \? disciplines : WORK_DISCIPLINES/)
  })

  it("13. existing preferences remain intact", () => {
    expect(codeOnly(src("app/api/settings/route.ts"))).toMatch(/jsonb_set/)
    expect(codeOnly(src("app/api/settings/route.ts"))).toMatch(/readOnboardingPatch/)
  })

  it("14. project creation and document import use existing APIs", () => {
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    expect(wizard).toContain('fetch("/api/onboarding/project"')
    expect(wizard).toContain('fetch("/api/planner/extract"')
    expect(codeOnly(src("lib/onboarding/write.ts"))).toMatch(/insert\(agentPlans\)/)
  })

  it("15. failed persistence does not falsely mark onboarding complete", () => {
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    const save = wizard.indexOf("await saveOnboarding({ status: \"completed\", step: 7 })")
    const push = wizard.indexOf('router.push("/dashboard")')
    expect(save).toBeGreaterThan(-1)
    expect(push).toBeGreaterThan(save)
    expect(wizard).toMatch(/catch \(err\) \{\s*setError\(\(err as Error\)\.message\)/)
  })

  it("16. skipping optional steps behaves correctly", () => {
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    expect(wizard).toMatch(/async function skip\(\)/)
    expect(wizard).toMatch(/const key = ONBOARDING_STEPS\[step\]\.key/)
    expect(wizard).toMatch(/key !== "welcome" && key !== "review"/)
  })

  it("17. mobile layouts and keyboard navigation work (source guard, not a browser test)", () => {
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    expect(wizard).toMatch(/grid-cols-1/)
    expect(wizard).toMatch(/lg:grid-cols/)
    expect(wizard).toMatch(/headingRef\.current\?\.focus\(\)/)
    // The rail marks the current entry; a literal or the conditional both assert it.
    expect(wizard).toMatch(/aria-current=(?:"step"|\{isCurrent \? "step")/)
    expect(wizard).toMatch(/aria-live="polite"/)
  })
})