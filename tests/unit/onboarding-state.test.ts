import { describe, expect, it } from "vitest"
import { WORK_DISCIPLINES } from "@/lib/roles"
import {
  EMPTY_ONBOARDING,
  ONBOARDING_EPOCH_ISO,
  ONBOARDING_STEPS,
  completionProblem,
  effectiveStatus,
  isGrandfathered,
  onboardingSecretPath,
  readOnboardingPatch,
  readOnboardingState,
  resumeStep,
  stepProblem,
} from "@/lib/onboarding/state"
import type { OnboardingState } from "@/lib/onboarding/state"

const NOW = "2026-10-27T09:00:00.000Z"
const inProgress = (): OnboardingState => ({
  ...EMPTY_ONBOARDING,
  status: "in_progress",
  step: 1,
  data: { ...EMPTY_ONBOARDING.data, profile: { ...EMPTY_ONBOARDING.data.profile, name: "Amina" } },
})

describe("the eight steps", () => {
  it("are the owner's order and nothing else", () => {
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual([
      "welcome",
      "profile",
      "workspace",
      "industry",
      "role",
      "preferences",
      "project",
      "review",
    ])
  })
})

describe("reading stored state", () => {
  it("never throws on junk and falls back to not_started", () => {
    expect(readOnboardingState("nonsense").status).toBe("not_started")
    expect(readOnboardingState({ status: "finished", step: 99 }).status).toBe("not_started")
    expect(readOnboardingState(null).step).toBe(0)
  })

  it("clamps a stored step into the wizard", () => {
    expect(readOnboardingState({ status: "in_progress", step: 42 }).step).toBe(7)
    expect(readOnboardingState({ status: "in_progress", step: -3 }).step).toBe(0)
  })

  it("keeps the disciplines the wizard saved and drops unknown ids", () => {
    const state = readOnboardingState({
      data: { role: { disciplines: ["technician", "not-a-role", "technician"] } },
    })
    expect(state.data.role.disciplines).toEqual(["technician"])
  })
})

describe("writing a step patch", () => {
  it("merges one section without clearing the others", () => {
    const current = inProgress()
    const parsed = readOnboardingPatch(
      { step: 3, data: { industry: { primary: "Education", secondary: [], unsure: false } } },
      current,
      NOW,
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.step).toBe(3)
    expect(parsed.value.data.profile.name).toBe("Amina")
    expect(parsed.value.data.industry.primary).toBe("Education")
  })

  it("refuses a discipline outside the canonical vocabulary", () => {
    const parsed = readOnboardingPatch(
      { data: { role: { disciplines: ["wizard"] } } },
      inProgress(),
      NOW,
    )
    expect(parsed).toEqual({ ok: false, error: "discipline must be a known work discipline" })
  })

  it("accepts every discipline the registry knows", () => {
    const parsed = readOnboardingPatch(
      { data: { role: { disciplines: [...WORK_DISCIPLINES] } } },
      inProgress(),
      NOW,
    )
    expect(parsed.ok).toBe(true)
  })

  it("refuses a credential-looking key anywhere and names only the path", () => {
    const parsed = readOnboardingPatch(
      { data: { workspace: { kind: "personal", vaultPassword: "hunter2" } } },
      inProgress(),
      NOW,
    )
    expect(parsed).toEqual({
      ok: false,
      error: "workspace.vaultPassword looks like a credential; onboarding never stores secrets.",
    })
  })

  it("refuses an unknown top-level field instead of storing it", () => {
    const parsed = readOnboardingPatch({ password: "hunter2" }, inProgress(), NOW)
    expect(parsed.ok).toBe(false)
  })

  it("cannot downgrade a completed member to in_progress", () => {
    const completed: OnboardingState = { ...inProgress(), status: "completed", completedAt: NOW }
    const parsed = readOnboardingPatch({ status: "in_progress" }, completed, NOW)
    expect(parsed).toEqual({ ok: false, error: "Setup is already complete." })
  })

  it("refuses completion before the member has a name", () => {
    const empty: OnboardingState = { ...EMPTY_ONBOARDING, status: "in_progress" }
    const parsed = readOnboardingPatch({ status: "completed" }, empty, NOW)
    expect(parsed).toEqual({ ok: false, error: "Add your name before finishing setup." })
  })

  it("stamps completedAt only when the status becomes completed", () => {
    const parsed = readOnboardingPatch({ status: "completed" }, inProgress(), NOW)
    expect(parsed.ok && parsed.value.completedAt).toBe(NOW)
    const again = readOnboardingPatch({ data: { profile: { name: "Amina B" } } }, inProgress(), NOW)
    expect(again.ok && again.value.completedAt).toBeNull()
  })
})

describe("the grandfather rule", () => {
  it("treats an account created before the feature as completed", () => {
    expect(isGrandfathered("2026-10-01T08:00:00.000Z", false)).toBe(true)
    expect(effectiveStatus(EMPTY_ONBOARDING, { createdAtIso: "2026-10-01T08:00:00.000Z", hasActivity: false })).toBe("completed")
  })

  it("treats an account with work behind it as completed even if it is newer", () => {
    expect(effectiveStatus(EMPTY_ONBOARDING, { createdAtIso: "2026-10-27T12:00:00.000Z", hasActivity: true })).toBe("completed")
  })

  it("lets a stored status win over the rule", () => {
    expect(effectiveStatus({ ...EMPTY_ONBOARDING, status: "in_progress" }, { createdAtIso: "2026-01-01T00:00:00.000Z", hasActivity: true })).toBe("in_progress")
  })

  it("does not grandfather a brand-new account without activity", () => {
    expect(isGrandfathered(ONBOARDING_EPOCH_ISO + "T00:00:01.000Z", false)).toBe(false)
  })
})

describe("resume and step requirements", () => {
  it("resumes at the saved step", () => {
    expect(resumeStep({ ...EMPTY_ONBOARDING, status: "in_progress", step: 4 })).toBe(4)
    expect(resumeStep(EMPTY_ONBOARDING)).toBe(0)
  })

  it("requires a name on profile and blocks completion without it", () => {
    expect(stepProblem("profile", EMPTY_ONBOARDING.data)).toBe("Add your name before continuing.")
    expect(completionProblem(EMPTY_ONBOARDING.data)).toBe("Add your name before finishing setup.")
    expect(stepProblem("industry", EMPTY_ONBOARDING.data)).toBeNull()
  })

  it("finds a nested credential key for the standalone scan", () => {
    expect(onboardingSecretPath({ a: [{ b: { apiKey: "x" } }] })).toBe("a[0].b.apiKey")
    expect(onboardingSecretPath({ a: "fine" })).toBeNull()
  })
})