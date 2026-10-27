# Onboarding (Phase 17) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the eight-step adaptive onboarding wizard, the `workspace_invitations` table that makes "join a workspace" a token instead of an admin typing an email, and the grandfathered, loop-safe routing that never blocks an existing member.

**Architecture:** One new table (`workspace_invitations`) and nothing else in the database: onboarding state lives in `preferences.settings.onboarding` through the existing `jsonb_set` merge in `/api/settings`, so a save is a merge and never a rewrite. Every rule that can be wrong without a database — the state machine, the step validators, the grandfather rule, the credential refusal, token hashing and the expiry check — is pure and unit-tested in `lib/onboarding/`. The database lives in `lib/onboarding/{read,write}.ts`; the wizard is a server page that reads the session and one client component that saves each step before it advances.

**Tech Stack:** Next.js 16 App Router (`params`/`searchParams` are `Promise`s), React 19, TypeScript strict, Drizzle ORM over Neon Postgres, Vitest, existing shadcn/ui primitives, `lib/timezones.ts` for the timezone list, `lib/roles.ts` for the discipline vocabulary.

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` §12.7 (the eight steps and seven rules), §13 (`workspace_invitations`), §14 (validation and privacy), §16 phase 17. The owner's seventeen checks come from the onboarding brief kept in the phase transcript; they are reproduced verbatim in Task 5.

## Global Constraints

- **No new `users` columns and no schema change beyond `workspace_invitations`.** State is `preferences.settings.onboarding = { status, step, completedAt, version, data }`; only `status` drives routing.
- **Only one automatic redirect is added:** signup's `router.push("/dashboard")` becomes `router.push("/onboarding")`. The dashboard shows a resumable banner, never a wall, so there is no loop.
- **Existing members are grandfathered**: an account created before `ONBOARDING_EPOCH_ISO` (`"2026-10-27"`), or one that already has a task or log row, reads as `completed` and is never routed through the wizard. A stored status always wins over the grandfather rule; nothing on any path clears a saved preference.
- **One vocabulary**: disciplines validate with `isWorkDiscipline` against `WORK_DISCIPLINES`; the wizard renders them grouped by `DISCIPLINE_CATEGORIES` from `lib/roles.ts`. Industry suggests and never restricts. Defaults are all disciplines.
- **Skipping is an answer**: every step but Welcome and Review has *Skip*, and skipping writes the step index without inventing data.
- **Completion is never optimistic**: the finish action saves every outstanding step first and only then writes `status: "completed"`; a failed save leaves the status untouched and keeps the form filled.
- **No secrets**: onboarding data refuses a credential-looking key at any depth with the dotted path and never echoes a value (the §12 register rule). No password, token or session value is written or logged.
- **Invitations**: 32 random bytes, stored only as a SHA-256 hex digest, single-use (`accepted_at` claimed in an `UPDATE … WHERE accepted_at IS NULL`), 7-day expiry, bound to one email, role limited to `user`/`admin` — never `superadmin`.
- **Existing preferences stay intact**: every write merges at `preferences.settings` with the existing `jsonb_set` pattern, so unrelated keys and the rest of `preferences` are untouched.
- **Live Neon is not touched without the owner's per-action approval**; the migration is its own task (Task 6).
- Tests live under `tests/unit/`, use `readFileSync(resolve(process.cwd(), path))` with a `codeOnly()` comment stripper, and never use a regex `s` flag. No unit test imports a DB-facing module.

---

### Task 1: The pure state machine and the settings patch

**Files:**
- Create: `lib/onboarding/state.ts`
- Create: `lib/settings-patch.ts`
- Modify: `app/api/settings/route.ts` (import the moved sanitiser; validate `onboarding` against the stored state)
- Test: `tests/unit/onboarding-state.test.ts`
- Test: `tests/unit/settings-patch.test.ts`

**Interfaces:**
- Consumes: `WORK_DISCIPLINES`, `isWorkDiscipline`, `type WorkDiscipline` from `@/lib/roles`; `CREDENTIAL_KEY` from `@/lib/registers/fields`; `isMemberRole` from `@/lib/team-settings-model`.
- Produces:
  - `ONBOARDING_STEPS: readonly { key: OnboardingStepKey; title: string }[]` (8 entries, in order)
  - `ONBOARDING_EPOCH_ISO = "2026-10-27"`, `ONBOARDING_VERSION = 1`, `ONBOARDING_KEY = "onboarding"`
  - `type OnboardingStatus = "not_started" | "in_progress" | "completed"`
  - `type OnboardingData` / `type OnboardingState` / `EMPTY_ONBOARDING`
  - `readOnboardingState(value: unknown): OnboardingState`
  - `readOnboardingPatch(value: unknown, current: OnboardingState, nowIso: string): { ok: true; value: OnboardingState } | { ok: false; error: string }`
  - `isGrandfathered(createdAtIso: string | null, hasActivity: boolean): boolean`
  - `effectiveStatus(state: OnboardingState, user: { createdAtIso: string | null; hasActivity: boolean }): OnboardingStatus`
  - `resumeStep(state: OnboardingState): number`
  - `completionProblem(data: OnboardingData): string | null`
  - `stepProblem(key: OnboardingStepKey, data: OnboardingData): string | null`
  - `onboardingSecretPath(value: unknown): string | null`
  - `readSettingsPatch(body: unknown): { patch: Record<string, unknown> | null; error?: string }`

- [ ] **Step 1: Write the failing state tests**

`tests/unit/onboarding-state.test.ts`:

```ts
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
```

`tests/unit/settings-patch.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readSettingsPatch } from "@/lib/settings-patch"

describe("the settings patch sanitiser", () => {
  it("keeps primitives and arrays", () => {
    const { patch } = readSettingsPatch({ theme: "dark", notifyEmail: false, list: [1, 2] })
    expect(patch).toEqual({ theme: "dark", notifyEmail: false, list: [1, 2] })
  })

  it("still drops an unknown nested object", () => {
    const { patch } = readSettingsPatch({ billing: { plan: "pro" } })
    expect(patch).toEqual({})
  })

  it("lets the onboarding namespace through for the route to validate", () => {
    const { patch } = readSettingsPatch({ onboarding: { step: 2, data: {} } })
    expect(patch).toEqual({ onboarding: { step: 2, data: {} } })
  })

  it("refuses an onboarding value that is not an object", () => {
    const { error } = readSettingsPatch({ onboarding: "done" })
    expect(error).toBe("onboarding must be an object")
  })

  it("never accepts a __proto__ style key", () => {
    const { patch } = readSettingsPatch({ __proto__hack: 1 })
    expect(patch).toEqual({})
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npx vitest run tests/unit/onboarding-state.test.ts tests/unit/settings-patch.test.ts`
Expected: FAIL — `Cannot find module '@/lib/onboarding/state'`.

- [ ] **Step 3: Write `lib/onboarding/state.ts`**

```ts
// Onboarding is a small state machine with no database in it: the wizard, the settings
// route and the tests all read the same answers. State lives in
// preferences.settings.onboarding, so the only migration this phase needs is the
// invitations table.

import { WORK_DISCIPLINES, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import { CREDENTIAL_KEY } from "@/lib/registers/fields"
import { isMemberRole } from "@/lib/team-settings-model"

export const ONBOARDING_STEPS = [
  { key: "welcome", title: "Welcome" },
  { key: "profile", title: "Profile" },
  { key: "workspace", title: "Workspace" },
  { key: "industry", title: "Industry" },
  { key: "role", title: "Role and disciplines" },
  { key: "preferences", title: "Project management" },
  { key: "project", title: "First project" },
  { key: "review", title: "Review and finish" },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"]

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length
export const ONBOARDING_EPOCH_ISO = "2026-10-27"
export const ONBOARDING_VERSION = 1
export const ONBOARDING_KEY = "onboarding"

export const ONBOARDING_STATUSES = ["not_started", "in_progress", "completed"] as const
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number]

export const SPRINT_VIEWS = ["board", "list", "grid"] as const
export const WORKSPACE_KINDS = ["personal", "team", "joined", "requested"] as const
export const PROJECT_MODES = ["none", "created", "imported", "sample"] as const

export type OnboardingData = {
  profile: {
    name: string | null
    jobTitle: string | null
    department: string | null
    location: string | null
    timezone: string | null
    language: string | null
  }
  workspace: { kind: (typeof WORKSPACE_KINDS)[number]; teamName: string | null }
  industry: { primary: string | null; secondary: string[]; unsure: boolean }
  role: { jobTitle: string | null; department: string | null; disciplines: WorkDiscipline[] }
  preferences: {
    sprintView: (typeof SPRINT_VIEWS)[number]
    notifyEmail: boolean
    notifyRealtime: boolean
    notifyPush: boolean
  }
  project: { mode: (typeof PROJECT_MODES)[number]; planId: number | null; title: string | null }
  invitation: { acceptedAt: string | null; role: string | null }
}

export type OnboardingState = {
  status: OnboardingStatus
  step: number
  completedAt: string | null
  version: number
  data: OnboardingData
}

export const EMPTY_ONBOARDING: OnboardingState = {
  status: "not_started",
  step: 0,
  completedAt: null,
  version: ONBOARDING_VERSION,
  data: {
    profile: { name: null, jobTitle: null, department: null, location: null, timezone: null, language: null },
    workspace: { kind: "personal", teamName: null },
    industry: { primary: null, secondary: [], unsure: false },
    role: { jobTitle: null, department: null, disciplines: [] },
    preferences: { sprintView: "board", notifyEmail: true, notifyRealtime: true, notifyPush: false },
    project: { mode: "none", planId: null, title: null },
    invitation: { acceptedAt: null, role: null },
  },
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

const iso = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

const int = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) ? value : null

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback

const clampStep = (value: unknown): number => {
  const n = int(value)
  if (n === null) return 0
  return Math.min(Math.max(n, 0), ONBOARDING_STEP_COUNT - 1)
}

const joinPath = (prefix: string, key: string): string => (prefix ? `${prefix}.${key}` : key)

/** The first credential-looking key at any depth, as a dotted path. Never returns a value. */
export function onboardingSecretPath(value: unknown, prefix = ""): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = onboardingSecretPath(value[index], prefix ? `${prefix}[${index}]` : `[${index}]`)
      if (found) return found
    }
    return null
  }
  if (!value || typeof value !== "object") return null
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const here = joinPath(prefix, key)
    if (CREDENTIAL_KEY.test(key)) return here
    const found = onboardingSecretPath(nested, here)
    if (found) return found
  }
  return null
}

function readData(value: unknown): OnboardingData {
  const source = asObject(value)
  const profile = asObject(source.profile)
  const workspace = asObject(source.workspace)
  const industry = asObject(source.industry)
  const role = asObject(source.role)
  const preferences = asObject(source.preferences)
  const project = asObject(source.project)
  const invitation = asObject(source.invitation)

  const disciplines = Array.isArray(role.disciplines)
    ? [...new Set(role.disciplines.filter(isWorkDiscipline))]
    : []
  const secondary = Array.isArray(industry.secondary)
    ? [...new Set(industry.secondary.map((entry) => text(entry, 80)).filter((entry): entry is string => !!entry))].slice(0, 12)
    : []
  const planId = int(project.planId)

  return {
    profile: {
      name: text(profile.name, 120),
      jobTitle: text(profile.jobTitle, 120),
      department: text(profile.department, 120),
      location: text(profile.location, 160),
      timezone: text(profile.timezone, 64),
      language: text(profile.language, 10),
    },
    workspace: {
      kind: oneOf(workspace.kind, WORKSPACE_KINDS, "personal"),
      teamName: text(workspace.teamName, 120),
    },
    industry: {
      primary: text(industry.primary, 80),
      secondary,
      unsure: bool(industry.unsure, false),
    },
    role: {
      jobTitle: text(role.jobTitle, 120),
      department: text(role.department, 120),
      disciplines,
    },
    preferences: {
      sprintView: oneOf(preferences.sprintView, SPRINT_VIEWS, "board"),
      notifyEmail: bool(preferences.notifyEmail, true),
      notifyRealtime: bool(preferences.notifyRealtime, true),
      notifyPush: bool(preferences.notifyPush, false),
    },
    project: {
      mode: oneOf(project.mode, PROJECT_MODES, "none"),
      planId: planId !== null && planId > 0 ? planId : null,
      title: text(project.title, 200),
    },
    invitation: {
      acceptedAt: iso(invitation.acceptedAt),
      role: isMemberRole(invitation.role) ? invitation.role : null,
    },
  }
}

/** Tolerant read: a malformed stored value degrades to the empty state, never a throw. */
export function readOnboardingState(value: unknown): OnboardingState {
  const source = asObject(value)
  return {
    status: oneOf(source.status, ONBOARDING_STATUSES, "not_started"),
    step: clampStep(source.step),
    completedAt: iso(source.completedAt),
    version: int(source.version) ?? ONBOARDING_VERSION,
    data: readData(source.data),
  }
}

export function completionProblem(data: OnboardingData): string | null {
  return data.profile.name ? null : "Add your name before finishing setup."
}

export function stepProblem(key: OnboardingStepKey, data: OnboardingData): string | null {
  if (key === "profile" && !data.profile.name) return "Add your name before continuing."
  return null
}

export type OnboardingPatch =
  | { ok: true; value: OnboardingState }
  | { ok: false; error: string }

const PATCH_FIELDS = ["status", "step", "data"] as const

/**
 * Validates one wizard step against the stored state. The wizard cannot jump to
 * `completed` without the one required field, cannot downgrade a completed member, and
 * cannot store a key the state does not declare.
 */
export function readOnboardingPatch(value: unknown, current: OnboardingState, nowIso: string): OnboardingPatch {
  const source = asObject(value)
  if (Object.keys(source).length === 0) return { ok: false, error: "No onboarding change provided" }

  for (const key of Object.keys(source)) {
    if (!(PATCH_FIELDS as readonly string[]).includes(key)) {
      return { ok: false, error: `Unknown onboarding field: ${key}` }
    }
  }

  const secret = onboardingSecretPath(source.data)
  if (secret) {
    return { ok: false, error: `${secret} looks like a credential; onboarding never stores secrets.` }
  }

  const status = source.status === undefined ? current.status : source.status
  if (typeof status !== "string" || !(ONBOARDING_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Unknown onboarding status" }
  }
  if (status === "not_started" && current.status !== "not_started") {
    return { ok: false, error: "Onboarding cannot be reset through this route." }
  }
  if (status === "in_progress" && current.status === "completed") {
    return { ok: false, error: "Setup is already complete." }
  }

  const rawDisciplines = asObject(asObject(source.data).role).disciplines
  if (Array.isArray(rawDisciplines) && !rawDisciplines.every(isWorkDiscipline)) {
    return { ok: false, error: "discipline must be a known work discipline" }
  }

  const data = source.data === undefined ? current.data : readData({ ...current.data, ...asObject(source.data) })
  const step = source.step === undefined ? current.step : clampStep(source.step)

  if (status === "completed") {
    const problem = completionProblem(data)
    if (problem) return { ok: false, error: problem }
  }

  return {
    ok: true,
    value: {
      status: status as OnboardingStatus,
      step,
      completedAt: status === "completed" ? current.completedAt ?? nowIso : current.completedAt,
      version: ONBOARDING_VERSION,
      data,
    },
  }
}

export function isGrandfathered(createdAtIso: string | null, hasActivity: boolean): boolean {
  if (hasActivity) return true
  if (!createdAtIso) return false
  return createdAtIso.slice(0, 10) < ONBOARDING_EPOCH_ISO
}

/** A stored status is a decision the member made; the grandfather rule only fills silence. */
export function effectiveStatus(
  state: OnboardingState,
  user: { createdAtIso: string | null; hasActivity: boolean },
): OnboardingStatus {
  if (state.status !== "not_started") return state.status
  return isGrandfathered(user.createdAtIso, user.hasActivity) ? "completed" : "not_started"
}

export function resumeStep(state: OnboardingState): number {
  return clampStep(state.step)
}
```

Note on `readOnboardingPatch`: it merges `data` sections through `readData({ ...current.data, ...patch })`, so a step patch can send only `{ industry: {...} }` and the profile section survives. It deliberately does not deep-merge the `profile` section, so a step must send the whole section it edits.

`note`: `WORK_DISCIPLINES` is imported for the tests' convenience; if TypeScript reports it unused in the module, remove the value import and keep `type WorkDiscipline` (the test imports the list itself).

- [ ] **Step 4: Write `lib/settings-patch.ts` and rewire the route**

```ts
// The sanitiser for PATCH /api/settings, kept out of the route so the rule is unit-tested
// without a database. Onboarding is the one namespaced value the route validates further
// (against the stored state); everything else stays primitive-or-array so a settings save
// can never overwrite a namespace it does not own.

export type SettingsPatch = Record<string, unknown>

export function readSettingsPatch(body: unknown): { patch: SettingsPatch | null; error?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { patch: null, error: "Body must be a JSON object of settings keys" }
  }
  const source = body as Record<string, unknown>
  const incoming = source.settings && typeof source.settings === "object" && !Array.isArray(source.settings)
    ? (source.settings as Record<string, unknown>)
    : source
  const candidate = Object.keys(incoming).length > 0 ? incoming : source
  const patch: SettingsPatch = {}
  for (const [key, value] of Object.entries(candidate)) {
    if (key === "settings") continue
    if (key.startsWith("__")) continue
    if (typeof key !== "string" || key.length === 0 || key.length > 64) continue
    if (key === "onboarding") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { patch: null, error: "onboarding must be an object" }
      }
      patch.onboarding = value
      continue
    }
    if (typeof value === "function") continue
    if (value && typeof value === "object" && !Array.isArray(value)) continue
    patch[key] = value
  }
  return { patch }
}
```

In `app/api/settings/route.ts` delete the local `sanitizePatch` (and its `StoredPrefs`-based body), import `readSettingsPatch` and `readOnboardingPatch` / `readOnboardingState`, then in `PATCH` before computing `changedKeys`:

```ts
const { patch, error } = readSettingsPatch(body)
if (!patch || Object.keys(patch).length === 0) {
  return NextResponse.json({ success: false, message: error ?? "No settings provided" }, { status: 400 })
}

const { merged } = await readSettings(await sessionId())
if ("onboarding" in patch) {
  const parsed = readOnboardingPatch(
    patch.onboarding,
    readOnboardingState((merged as Record<string, unknown>).onboarding),
    new Date().toISOString(),
  )
  if (!parsed.ok) return NextResponse.json({ success: false, message: parsed.error }, { status: 400 })
  patch.onboarding = parsed.value
}
```

(Keep the existing `session.id` usage; the snippet above only names the pieces that change. `changedKeys` then compares objects with `!==`, so an onboarding save always counts as changed — that is what makes it persist.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npx vitest run tests/unit/onboarding-state.test.ts tests/unit/settings-patch.test.ts`
Expected: PASS (25 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/onboarding/state.ts lib/settings-patch.ts app/api/settings/route.ts tests/unit/onboarding-state.test.ts tests/unit/settings-patch.test.ts
git commit -m "feat(onboarding): the state machine, step validation and the settings merge"
```

---

### Task 2: Invitations — table, token module, migration and rollback

**Files:**
- Modify: `drizzle/schema.ts` (append `workspaceInvitations` after `playbooks`)
- Create: `lib/onboarding/invitation.ts`
- Create: `scripts/create-invitations-table.mjs`
- Create: `scripts/rollback-invitations-table.mjs`
- Modify: `package.json` (`db:invitations`, `db:invitations:rollback`)
- Test: `tests/unit/onboarding-invitation.test.ts`
- Test: `tests/unit/onboarding-schema.test.ts`

**Interfaces:**
- Produces:
  - `INVITATION_TTL_DAYS = 7`, `INVITATION_ROLES = ["user", "admin"]`, `type InvitationRole`
  - `invitationTokenHash(token: string): string`
  - `createInvitation(now: Date): { token: string; tokenHash: string; expiresAt: Date }`
  - `readInvitationInput(value: unknown): { ok: true; value: { email: string; role: InvitationRole } } | { ok: false; error: string }`
  - `invitationProblem(row: { email: string; acceptedAt: string | null; expiresAt: string }, nowIso: string, sessionEmail: string): string | null`
  - `isInvitationRole(value: unknown): value is InvitationRole`
  - schema: `workspaceInvitations` (`id`, `email`, `tokenHash`, `role`, `invitedBy`, `expiresAt`, `acceptedAt`, `acceptedBy`, `createdAt`)

- [ ] **Step 1: Write the failing invitation tests**

`tests/unit/onboarding-invitation.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  INVITATION_TTL_DAYS,
  createInvitation,
  invitationProblem,
  invitationTokenHash,
  isInvitationRole,
  readInvitationInput,
} from "@/lib/onboarding/invitation"

const NOW = new Date("2026-10-27T09:00:00.000Z")

describe("invitation tokens", () => {
  it("are random, hashed at rest and expire in seven days", () => {
    const first = createInvitation(NOW)
    const second = createInvitation(NOW)
    expect(first.token).not.toBe(second.token)
    expect(first.tokenHash).toBe(invitationTokenHash(first.token))
    expect(first.tokenHash).not.toContain(first.token)
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.expiresAt.toISOString()).toBe("2026-11-03T09:00:00.000Z")
    expect(INVITATION_TTL_DAYS).toBe(7)
  })
})

describe("invitation input", () => {
  it("accepts a user or an admin, never a superadmin", () => {
    expect(readInvitationInput({ email: "ama@example.com", role: "admin" })).toEqual({
      ok: true,
      value: { email: "ama@example.com", role: "admin" },
    })
    expect(isInvitationRole("superadmin")).toBe(false)
  })

  it("refuses a malformed email", () => {
    expect(readInvitationInput({ email: "ama", role: "user" })).toEqual({
      ok: false,
      error: "A valid email is required",
    })
  })

  it("refuses a role outside the set", () => {
    expect(readInvitationInput({ email: "ama@example.com", role: "owner" }).ok).toBe(false)
  })
})

describe("invitation use", () => {
  const row = {
    email: "ama@example.com",
    acceptedAt: null,
    expiresAt: "2026-11-03T09:00:00.000Z",
  }
  it("is accepted only by the invited email before it expires", () => {
    expect(invitationProblem(row, "2026-10-28T09:00:00.000Z", "ama@example.com")).toBeNull()
    expect(invitationProblem(row, "2026-10-28T09:00:00.000Z", "AMA@example.com")).toBeNull()
  })

  it("is single use", () => {
    expect(invitationProblem({ ...row, acceptedAt: "2026-10-27T10:00:00.000Z" }, "2026-10-28T09:00:00.000Z", "ama@example.com"))
      .toBe("That invitation has already been used.")
  })

  it("expires", () => {
    expect(invitationProblem(row, "2026-11-04T09:00:00.000Z", "ama@example.com")).toBe("That invitation has expired.")
  })

  it("does not reveal who it was for", () => {
    const message = invitationProblem(row, "2026-10-28T09:00:00.000Z", "someone@example.com")
    expect(message).toBe("That invitation was issued to a different email address.")
    expect(message).not.toContain("ama@example.com")
  })
})
```

`tests/unit/onboarding-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
const columns = (table: PgTable) => getTableConfig(table).columns.map((column) => column.name)

describe("the invitations table", () => {
  it("declares workspace_invitations under its SQL name", () => {
    expect(schema.workspaceInvitations).toBeInstanceOf(PgTable)
    expect(getTableConfig(schema.workspaceInvitations).name).toBe("workspace_invitations")
  })

  it("stores a token hash, never a token", () => {
    expect(columns(schema.workspaceInvitations)).toContain("token_hash")
    expect(columns(schema.workspaceInvitations).some((name) => /token$/.test(name))).toBe(false)
  })

  it("carries the expiry, the single-use stamp and the role it grants", () => {
    for (const column of ["email", "role", "invited_by", "expires_at", "accepted_at", "accepted_by"]) {
      expect(columns(schema.workspaceInvitations)).toContain(column)
    }
  })

  it("adds no users column", () => {
    const users = columns(schema.users)
    expect(users).not.toContain("onboarding")
    expect(users).not.toContain("onboarding_status")
  })
})

describe("the invitations migration", () => {
  const script = codeOnly(src("scripts/create-invitations-table.mjs"))

  it("is additive only", () => {
    expect(script).not.toMatch(/\bDROP\b/i)
    expect(script).not.toMatch(/DELETE FROM/i)
    expect(script).toContain("CREATE TABLE IF NOT EXISTS workspace_invitations")
    expect(script).toContain("CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx")
  })

  it("rolls back only when asked", () => {
    const rollback = codeOnly(src("scripts/rollback-invitations-table.mjs"))
    expect(rollback).toContain("INVITATIONS_ROLLBACK")
    expect(rollback).toContain("DROP TABLE IF EXISTS workspace_invitations")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npx vitest run tests/unit/onboarding-invitation.test.ts tests/unit/onboarding-schema.test.ts`
Expected: FAIL — module and table do not exist.

- [ ] **Step 3: Write `lib/onboarding/invitation.ts`**

```ts
// An invitation is a bearer token with a short life: 32 random bytes handed to the
// inviter once, stored only as a SHA-256 digest, single use, one email, never superadmin.

import { createHash, randomBytes } from "node:crypto"
import { isMemberRole } from "@/lib/team-settings-model"

export const INVITATION_TTL_DAYS = 7
export const INVITATION_ROLES = ["user", "admin"] as const
export type InvitationRole = (typeof INVITATION_ROLES)[number]

export function isInvitationRole(value: unknown): value is InvitationRole {
  return typeof value === "string" && (INVITATION_ROLES as readonly string[]).includes(value)
}

export function invitationTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function createInvitation(now: Date): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { token, tokenHash: invitationTokenHash(token), expiresAt }
}

export type InvitationInput = { ok: true; value: { email: string; role: InvitationRole } } | { ok: false; error: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function readInvitationInput(value: unknown): InvitationInput {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const email = typeof source.email === "string" ? source.email.trim().toLowerCase() : ""
  if (!EMAIL.test(email)) return { ok: false, error: "A valid email is required" }
  if (!isInvitationRole(source.role)) return { ok: false, error: "role must be user or admin" }
  return { ok: true, value: { email, role: source.role } }
}

export type InvitationRow = { email: string; acceptedAt: string | null; expiresAt: string }

/**
 * Why this token cannot be used right now, or null. Messages never repeat the invited
 * address, so a wrong-account attempt learns nothing about who the invitation was for.
 */
export function invitationProblem(row: InvitationRow, nowIso: string, sessionEmail: string): string | null {
  if (row.acceptedAt) return "That invitation has already been used."
  if (Date.parse(row.expiresAt) <= Date.parse(nowIso)) return "That invitation has expired."
  if (row.email.trim().toLowerCase() !== sessionEmail.trim().toLowerCase()) {
    return "That invitation was issued to a different email address."
  }
  return null
}
```

`isMemberRole` is imported in the plan's constraints but the roles here are narrower; keep only `isInvitationRole` (the import is unnecessary — do not import it).

- [ ] **Step 4: Add the table to `drizzle/schema.ts`**

Append after the `playbooks` block:

```ts
// Phase 17: a workspace join is a token, not an admin typing an email at the roster.
// Only the digest is stored; the raw token is shown to the inviter once.
export const workspaceInvitations = pgTable("workspace_invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  role: varchar("role", { length: 32 }).notNull().default("user"),
  invitedBy: integer("invited_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedBy: integer("accepted_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 5: Write the migration and rollback scripts, and the npm entries**

`scripts/create-invitations-table.mjs` mirrors `create-playbooks-tables.mjs`: read `.env.local`, `/^DATABASE_URL="?([^"\n]+)"?/m`, `postgres(url, { max: 1 })`, then:

```sql
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx ON workspace_invitations (email);
```

Then verify `information_schema.tables` has `workspace_invitations`, the unique constraint on `token_hash` exists, and print `count(*)` (expected 0). `scripts/rollback-invitations-table.mjs` exits with a message unless `INVITATIONS_ROLLBACK === "yes"`, then runs only `DROP TABLE IF EXISTS workspace_invitations`. `package.json` gains:

```json
"db:invitations": "node scripts/create-invitations-table.mjs",
"db:invitations:rollback": "node scripts/rollback-invitations-table.mjs"
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npx vitest run tests/unit/onboarding-invitation.test.ts tests/unit/onboarding-schema.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add drizzle/schema.ts lib/onboarding/invitation.ts scripts/create-invitations-table.mjs scripts/rollback-invitations-table.mjs package.json tests/unit/onboarding-invitation.test.ts tests/unit/onboarding-schema.test.ts
git commit -m "feat(onboarding): the invitation token, its table and the additive migration"
```

---

### Task 3: Reads, writes and the five routes

**Files:**
- Create: `lib/onboarding/read.ts`
- Create: `lib/onboarding/write.ts`
- Create: `app/api/onboarding/route.ts` (GET)
- Create: `app/api/onboarding/invitation/route.ts` (POST)
- Create: `app/api/onboarding/request-access/route.ts` (POST)
- Create: `app/api/onboarding/project/route.ts` (POST)
- Create: `app/api/team/invitations/route.ts` (GET/POST)
- Modify: `app/api/settings/[key]/route.ts` (refuse the reserved `onboarding` key)
- Modify: `lib/registers/read.ts` (`defaultDisciplineOf` reads `preferences.settings.workDisciplines`)
- Test: `tests/unit/onboarding-routes.test.ts`

**Interfaces:**
- Consumes: `readOnboardingState` (Task 1), `createInvitation`/`invitationProblem`/`invitationTokenHash`/`readInvitationInput`/`isInvitationRole` (Task 2), `loadPacks`/`defaultDisciplineOf` from `@/lib/registers/read`, `resolvePack` from `@/lib/packs/pack`, `readTeamSettings` from `@/lib/team-settings`, `createNotification`/`notifyMany` from `@/lib/notifications`, `rateLimited` from `@/lib/rate-limit`, `isSuperAdmin` from `@/lib/roles`.
- Produces:
  - `type OnboardingView = { status; step; completedAt; data; grandfathered: boolean; canRenameTeam: boolean; teamName: string; pack: { packKey: string; title: string; sections: string[] } | null }`
  - `readOnboardingView(user: SessionUser): Promise<OnboardingView>`
  - `hasActivity(userId: number): Promise<boolean>`
  - `readInvitationByToken(token: string): Promise<InvitationRecord | null>`
  - `listPendingInvitations(): Promise<InvitationSummary[]>`
  - `acceptInvitation(args: { userId: number; email: string; token: string }): Promise<{ ok: true; role: InvitationRole } | { ok: false; status: number; error: string }>`
  - `requestAccess(args: { userId: number; name: string; note: string | null }): Promise<{ notified: number }>`
  - `createOnboardingProject(args: { userId: number; input: ProjectInput }): Promise<{ planId: number; created: boolean }>`
  - `readProjectInput(value: unknown): { ok: true; value: ProjectInput } | { ok: false; error: string }`

`ProjectInput = { title: string; description: string | null; startDate: string | null; targetDate: string | null; sample: boolean }`.

- [ ] **Step 1: Write the failing route guards**

`tests/unit/onboarding-routes.test.ts` (source assertions, `codeOnly` on each route):

```ts
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const ROUTES = [
  "app/api/onboarding/route.ts",
  "app/api/onboarding/invitation/route.ts",
  "app/api/onboarding/request-access/route.ts",
  "app/api/onboarding/project/route.ts",
  "app/api/team/invitations/route.ts",
] as const

describe("the onboarding routes", () => {
  it.each(ROUTES)("%s exists", (file) => {
    expect(existsSync(resolve(process.cwd(), file))).toBe(true)
  })

  it.each(ROUTES)("%s checks the session before it reads anything", (file) => {
    const body = codeOnly(src(file))
    expect(body).toMatch(/getSession\(\)/)
    expect(body).toMatch(/401/)
  })

  it("accepts an invitation only through its hash and only once", () => {
    const write = codeOnly(src("lib/onboarding/write.ts"))
    expect(write).toMatch(/invitationTokenHash\(token\)/)
    expect(write).toMatch(/isNull\(workspaceInvitations\.acceptedAt\)/)
    expect(write).not.toMatch(/console\.log\([^)]*token/)
  })

  it("never writes tasks from the project step", () => {
    const write = codeOnly(src("lib/onboarding/write.ts"))
    expect(write).toMatch(/insert\(agentPlans\)/)
    expect(write).not.toMatch(/insert\(tasks\)/)
  })

  it("deduplicates a retried project so a second tap creates nothing", () => {
    const write = codeOnly(src("lib/onboarding/write.ts"))
    expect(write).toMatch(/sourceName/)
    expect(write).toMatch(/eq\(agentPlans\.createdBy, userId\)/)
  })

  it("grants nothing from a request for access", () => {
    const route = codeOnly(src("app/api/onboarding/request-access/route.ts"))
    expect(route).toMatch(/notifyMany|createNotification/)
    expect(route).not.toMatch(/update\(users\)/)
  })

  it("keeps invitation creation behind the super-admin wall", () => {
    const route = codeOnly(src("app/api/team/invitations/route.ts"))
    expect(route).toMatch(/isSuperAdmin\(session\)/)
    expect(route).toMatch(/403/)
  })

  it("returns the raw invitation token exactly once", () => {
    const route = codeOnly(src("app/api/team/invitations/route.ts"))
    expect(route).toMatch(/token:\s*invitation\.token/)
    expect(route).toContain("/onboarding?invite=")
  })

  it("refuses onboarding through the per-key settings route", () => {
    const route = codeOnly(src("app/api/settings/[key]/route.ts"))
    expect(route).toMatch(/RESERVED_SETTINGS_KEYS/)
    expect(route).toMatch(/onboarding/)
  })

  it("resolves the default pack from the saved disciplines under settings", () => {
    const read = codeOnly(src("lib/registers/read.ts"))
    expect(read).toMatch(/settings/)
    expect(read).toMatch(/workDisciplines/)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npx vitest run tests/unit/onboarding-routes.test.ts`
Expected: FAIL — the route files do not exist.

- [ ] **Step 3: Write `lib/onboarding/read.ts`**

```ts
// The database side of onboarding: one view for the wizard and the dashboard, the
// grandfather check that needs two row counts, and the invitation reads. The rules live in
// ./state.ts and ./invitation.ts, so this module contains no decisions.

import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, workspaceInvitations } from "@/drizzle/schema"
import type { SessionUser } from "@/lib/session"
import { isSuperAdmin } from "@/lib/roles"
import { loadPacks, defaultDisciplineOf } from "@/lib/registers/read"
import { resolvePack } from "@/lib/packs/pack"
import { readTeamSettings } from "@/lib/team-settings"
import {
  effectiveStatus,
  readOnboardingState,
  resumeStep,
  type OnboardingData,
  type OnboardingState,
  type OnboardingStatus,
} from "./state"

export type OnboardingView = {
  status: OnboardingStatus
  step: number
  completedAt: string | null
  data: OnboardingData
  grandfathered: boolean
  canRenameTeam: boolean
  teamName: string
  pack: { packKey: string; title: string; sections: string[] } | null
}

export async function hasActivity(userId: number): Promise<boolean> {
  const [row] = (await db.execute(sql`
    SELECT (
      EXISTS (SELECT 1 FROM tasks WHERE assignee_id = ${userId})
      OR EXISTS (SELECT 1 FROM work_log_entries WHERE user_id = ${userId})
    ) AS active
  `)) as unknown as { active: boolean }[]
  return Boolean(row?.active)
}

export async function readOnboardingView(user: SessionUser): Promise<OnboardingView> {
  const state: OnboardingState = readOnboardingState(
    (user.preferences as Record<string, unknown> | null)?.settings
      ? ((user.preferences as Record<string, unknown>).settings as Record<string, unknown>).onboarding
      : null,
  )
  const activity = await hasActivity(user.id)
  const createdAtIso = user.createdAt ? new Date(user.createdAt).toISOString() : null
  const status = effectiveStatus(state, { createdAtIso, hasActivity: activity })
  const packs = await loadPacks(false)
  const pack = resolvePack(packs, defaultDisciplineOf(user))
  const team = await readTeamSettings()

  return {
    status,
    step: resumeStep(state),
    completedAt: state.completedAt,
    data: state.data,
    grandfathered: status === "completed" && state.status === "not_started",
    canRenameTeam: isSuperAdmin(user),
    teamName: team.teamName,
    pack: pack ? { packKey: pack.packKey, title: pack.title, sections: pack.sections } : null,
  }
}

export type InvitationRecord = {
  id: number
  email: string
  role: string
  invitedBy: number | null
  acceptedAt: string | null
  expiresAt: string
}

export async function readInvitationByToken(token: string): Promise<InvitationRecord | null> {
  const rows = await db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      invitedBy: workspaceInvitations.invitedBy,
      acceptedAt: workspaceInvitations.acceptedAt,
      expiresAt: workspaceInvitations.expiresAt,
    })
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.tokenHash, token))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    invitedBy: row.invitedBy,
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    expiresAt: row.expiresAt.toISOString(),
  }
}

export async function listPendingInvitations() {
  const rows = await db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      expiresAt: workspaceInvitations.expiresAt,
      createdAt: workspaceInvitations.createdAt,
    })
    .from(workspaceInvitations)
    .where(and(isNull(workspaceInvitations.acceptedAt), sql`${workspaceInvitations.expiresAt} > NOW()`))
    .orderBy(sql`${workspaceInvitations.createdAt} DESC`)
    .limit(50)
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }))
}
```

(The token argument to `readInvitationByToken` is already a hash; `write.ts` hashes the raw token first.)

- [ ] **Step 4: Write `lib/onboarding/write.ts`**

```ts
// Writes for onboarding. The invite acceptance claims the token with one conditional
// UPDATE, then changes the session user's own role inside the same transaction; the
// project step writes a draft agent_plans row and never a task.

import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { agentPlans, planItems, users, workspaceInvitations } from "@/drizzle/schema"
import { createNotification, notifyMany } from "@/lib/notifications"
import { isInvitationRole, invitationProblem, invitationTokenHash, type InvitationRole } from "./invitation"
import { readInvitationByToken } from "./read"

export type AcceptResult = { ok: true; role: InvitationRole } | { ok: false; status: number; error: string }

export async function acceptInvitation(args: { userId: number; email: string; token: string }): Promise<AcceptResult> {
  const row = await readInvitationByToken(invitationTokenHash(args.token))
  if (!row) return { ok: false, status: 404, error: "That invitation is not valid." }

  const problem = invitationProblem(row, new Date().toISOString(), args.email)
  if (problem) return { ok: false, status: 410, error: problem }
  if (!isInvitationRole(row.role)) return { ok: false, status: 410, error: "That invitation grants an unknown role." }

  const claimed = await db.transaction(async (tx) => {
    const [claimedRow] = await tx
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date(), acceptedBy: args.userId })
      .where(and(eq(workspaceInvitations.id, row.id), isNull(workspaceInvitations.acceptedAt)))
      .returning({ id: workspaceInvitations.id })
    if (!claimedRow) return false
    await tx.update(users).set({ role: row.role, updatedAt: new Date() }).where(eq(users.id, args.userId))
    return true
  })
  if (!claimed) return { ok: false, status: 409, error: "That invitation has already been used." }

  if (row.invitedBy) {
    await createNotification({
      userId: row.invitedBy,
      type: "system",
      title: "Invitation accepted",
      body: `${args.email} joined the workspace as ${row.role}.`,
      link: "/dashboard/team",
      metadata: { invitationId: row.id, joinedUserId: args.userId, role: row.role },
    }).catch(() => undefined)
  }
  return { ok: true, role: row.role }
}

export async function requestAccess(args: { userId: number; name: string; note: string | null }) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(sqlRoleIn(["admin", "superadmin"]))
  const ids = admins.map((row) => row.id).filter((id) => id !== args.userId)
  await notifyMany(ids, {
    type: "system",
    title: "Workspace access requested",
    body: `${args.name} asked to join the workspace.${args.note ? ` Note: ${args.note}` : ""}`,
    link: "/dashboard/team",
    metadata: { requesterId: args.userId },
  })
  return { notified: ids.length }
}

export type ProjectInput = {
  title: string
  description: string | null
  startDate: string | null
  targetDate: string | null
  sample: boolean
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function readProjectInput(value: unknown): { ok: true; value: ProjectInput } | { ok: false; error: string } {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const sample = source.sample === true
  const title = sample ? "Sample project — one week of IT support" : typeof source.title === "string" ? source.title.trim() : ""
  if (!title) return { ok: false, error: "A project name is required" }
  if (title.length > 200) return { ok: false, error: "Keep the project name under 200 characters" }
  const description = typeof source.description === "string" && source.description.trim() ? source.description.trim().slice(0, 2000) : null
  const startDate = typeof source.startDate === "string" && DAY.test(source.startDate) ? source.startDate : null
  const targetDate = typeof source.targetDate === "string" && DAY.test(source.targetDate) ? source.targetDate : null
  return { ok: true, value: { title, description, startDate, targetDate, sample } }
}

const SAMPLE_ITEMS = [
  { title: "Log today's work", description: "Open the work log and record what you did.", discipline: "technician" as const },
  { title: "Check one register item", description: "Verify a device you are responsible for.", discipline: "technician" as const },
  { title: "Write a short handover note", description: "One paragraph a colleague could act on.", discipline: "technician" as const },
]

export async function createOnboardingProject(args: { userId: number; input: ProjectInput }) {
  const sourceName = args.input.sample ? "sample" : "onboarding"
  const [existing] = await db
    .select({ id: agentPlans.id })
    .from(agentPlans)
    .where(and(
      eq(agentPlans.createdBy, args.userId),
      eq(agentPlans.sourceName, sourceName),
      eq(agentPlans.title, args.input.title),
    ))
    .limit(1)
  if (existing) return { planId: existing.id, created: false }

  const plan = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(agentPlans)
      .values({
        title: args.input.title,
        summary: args.input.description,
        sourceKind: "text",
        sourceName,
        horizonStart: args.input.startDate,
        horizonEnd: args.input.targetDate,
        status: "draft",
        createdBy: args.userId,
      })
      .returning({ id: agentPlans.id })
    if (args.input.sample) {
      await tx.insert(planItems).values(
        SAMPLE_ITEMS.map((item, index) => ({
          planId: created.id,
          title: item.title,
          description: item.description,
          discipline: item.discipline,
          estimatePoints: 2,
          sortOrder: index,
        })),
      )
    }
    return created
  })
  return { planId: plan.id, created: true }
}
```

`sqlRoleIn` is not a real helper — inline the drizzle predicate instead: `inArray(users.role, ["admin", "superadmin"])` (import `inArray`). Delete the `sqlRoleIn` call in the implementation.

- [ ] **Step 5: Write the five routes**

`app/api/onboarding/route.ts`:

```ts
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { readOnboardingView } from "@/lib/onboarding/read"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  try {
    return NextResponse.json({ success: true, data: await readOnboardingView(session) })
  } catch (error) {
    console.error("Onboarding read error:", error)
    return NextResponse.json({ success: false, message: "Failed to load onboarding" }, { status: 500 })
  }
}
```

`app/api/onboarding/invitation/route.ts` POST: session, `{ token }` string 20–200 chars, `acceptInvitation`, map `ok:false` to its status, return `{ success: true, data: { role } }`. Log only the failure kind, never the token.

`app/api/onboarding/request-access/route.ts` POST: session; `rateLimited("onboarding-access:" + session.id, { windowMs: 24 * 60 * 60 * 1000, max: 3 })` → 429 with "You have already asked recently."; body `{ note?: string }` trimmed to 500; `requestAccess({ userId: session.id, name: session.name, note })`; return `{ success: true, data: { requested: true } }` (do not expose how many admins exist).

`app/api/onboarding/project/route.ts` POST: session; `readProjectInput(await request.json().catch(() => null))`; 400 on failure; `createOnboardingProject`; return `{ success: true, data: { planId, created } }`.

`app/api/team/invitations/route.ts`:

```ts
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { isSuperAdmin } from "@/lib/roles"
import { createInvitation, readInvitationInput } from "@/lib/onboarding/invitation"
import { listPendingInvitations, readInvitationByToken } from "@/lib/onboarding/read"

export const dynamic = "force-dynamic"
const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status })

export async function GET() {
  const session = await getSession()
  if (!session?.id) return bad("Unauthorized", 401)
  if (!isSuperAdmin(session)) return bad("Super-admin access required", 403)
  return NextResponse.json({ success: true, data: { invitations: await listPendingInvitations() } })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.id) return bad("Unauthorized", 401)
  if (!isSuperAdmin(session)) return bad("Super-admin access required", 403)

  const parsed = readInvitationInput(await request.json().catch(() => null))
  if (!parsed.ok) return bad(parsed.error)

  const [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.value.email)).limit(1)
  if (account) return bad("That person already has an account.", 409)

  const invite = createInvitation(new Date())
  await db.insert(workspaceInvitations).values({
    email: parsed.value.email,
    tokenHash: invite.tokenHash,
    role: parsed.value.role,
    invitedBy: session.id,
    expiresAt: invite.expiresAt,
  })
  return NextResponse.json({
    success: true,
    data: {
      token: invite.token,
      inviteUrl: `/onboarding?invite=${invite.token}`,
      expiresAt: invite.expiresAt.toISOString(),
      role: parsed.value.role,
      email: parsed.value.email,
    },
  })
}
```

Add the `workspaceInvitations` import. The raw token leaves the server only in this response; `readInvitationByToken` is not needed in this file — remove that import.

- [ ] **Step 6: Wire the remaining edits**

`app/api/settings/[key]/route.ts`: add near `VALID_KEY`:

```ts
const RESERVED_SETTINGS_KEYS = ["onboarding"]
```

and in `PUT` (and `DELETE`) after the key validation:

```ts
if (RESERVED_SETTINGS_KEYS.includes(key)) {
  return NextResponse.json(
    { success: false, message: "Use PATCH /api/settings for the onboarding namespace" },
    { status: 400 },
  )
}
```

`lib/registers/read.ts` — `defaultDisciplineOf` reads the settings namespace first, then the legacy top-level key:

```ts
const prefs = session.preferences as Record<string, unknown>
const settings = prefs.settings && typeof prefs.settings === "object" && !Array.isArray(prefs.settings)
  ? (prefs.settings as Record<string, unknown>)
  : {}
const list = settings.workDisciplines ?? prefs.workDisciplines
```

- [ ] **Step 7: Run the guards and the full suite**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npx vitest run tests/unit/onboarding-routes.test.ts`
Expected: PASS. Then `npm test` to confirm nothing regressed.

- [ ] **Step 8: Commit**

```bash
git add lib/onboarding/read.ts lib/onboarding/write.ts app/api/onboarding app/api/team/invitations app/api/settings/[key]/route.ts lib/registers/read.ts tests/unit/onboarding-routes.test.ts
git commit -m "feat(onboarding): session-scoped views, invitation acceptance and the first-project write"
```

---

### Task 4: The wizard, the routing and the dashboard door

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `app/onboarding/onboarding-wizard.tsx`
- Modify: `app/(auth)/signup/page.tsx:42` (`router.push("/onboarding")`)
- Modify: `proxy.ts` (protect `/onboarding`, extend the matcher)
- Modify: `app/dashboard/page.tsx` (resumable banner + pack-ordered strip)
- Modify: `app/dashboard/settings/page.tsx` (a "Setup wizard" card linking back)
- Modify: `app/dashboard/team/page.tsx` (an "Invite by link" dialog for admins)

**Interfaces:**
- Consumes: `OnboardingView` from Task 3, `OnboardingState`/`ONBOARDING_STEPS`/`readOnboardingState`/`stepProblem` from Task 1, `WORK_DISCIPLINES`/`DISCIPLINE_CATEGORIES`/`DISCIPLINE_LABEL`/`disciplinesInCategory` from `@/lib/roles`, `allTimezones`/`languages` from `@/lib/timezones`, `sectionLabel` from `@/lib/packs/types`.
- Produces: `GET /api/onboarding` consumer; no new APIs.

- [ ] **Step 1: Write the server page**

```tsx
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { readOnboardingView } from "@/lib/onboarding/read"
import { OnboardingWizard } from "./onboarding-wizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const session = await getCurrentUser()
  if (!session) redirect("/login")

  const view = await readOnboardingView(session)
  const params = await searchParams
  const invite = typeof params.invite === "string" && params.invite.length <= 200 ? params.invite : null

  return (
    <OnboardingWizard
      initial={view}
      inviteToken={invite}
      account={{ name: session.name, email: session.email, avatar: session.avatar }}
    />
  )
}
```

- [ ] **Step 2: Write the client wizard**

`"use client"`. State: `step` (starts at `initial.status === "completed" ? 0 : initial.step`), `data` (`initial.data`), `profile` (name/jobTitle/department/location/timezone/language from `initial.data.profile`, defaulting name/timezone/language from the account and `Intl.DateTimeFormat().resolvedOptions().timeZone`), `workspaceKind`, `teamName`, `industry`, `disciplines` (defaults to `initial.data.role.disciplines`, and if empty the "all" sentinel `WORK_DISCIPLINES`), `disciplinesTouched`, `projectMode`, `projectForm`, `inviteToken` (prop or empty), `requestNote`, `saving`, `error`, `notice`.

Shared handlers (actual code):

```tsx
async function saveOnboarding(patch: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...extra, onboarding: patch }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) throw new Error(json?.message ?? "Could not save this step")
  return json
}

async function saveProfile() {
  const res = await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: profile.name,
      jobTitle: profile.jobTitle || null,
      department: profile.department || null,
      location: profile.location || null,
      timezone: profile.timezone || null,
      language: profile.language || null,
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.error) throw new Error(json?.error ?? "Could not save your profile")
}

async function advance() {
  const key = ONBOARDING_STEPS[step].key
  const problem = stepProblem(key, { ...initial.data, profile: { ...initial.data.profile, ...profile } })
  if (problem) { setError(problem); return }
  setSaving(true); setError(""); setNotice("")
  try {
    if (key === "welcome") {
      await saveOnboarding({ status: "in_progress", step: 1 })
      setStep(1); return
    }
    if (key === "profile") {
      await saveProfile()
      await saveOnboarding({ step: 2, data: { profile } })
      setStep(2); return
    }
    if (key === "workspace") {
      if (workspaceKind === "joined" && inviteToken.trim()) {
        const res = await fetch("/api/onboarding/invitation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: inviteToken.trim() }) })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error ?? "That invitation could not be accepted.")
        setNotice(`You joined the workspace as ${json?.data?.role ?? "a member"}.`)
      }
      if (workspaceKind === "requested") {
        const res = await fetch("/api/onboarding/request-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: requestNote }) })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error ?? "Could not send the request.")
        setNotice("Your request was sent to the workspace admins.")
      }
      if (workspaceKind === "team" && initial.canRenameTeam) {
        const res = await fetch("/api/team/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamName }) })
        const json = await res.json().catch(() => null)
        if (!res.ok || json?.success === false) throw new Error(json?.error ?? "Could not rename the workspace.")
      }
      await saveOnboarding({ step: 3, data: { workspace: { kind: workspaceKind, teamName: teamName || null } } })
      setStep(3); return
    }
    if (key === "industry") {
      await saveOnboarding({ step: 4, data: { industry } })
      setStep(4); return
    }
    if (key === "role") {
      await saveOnboarding(
        { step: 5, data: { role: { jobTitle: profile.jobTitle, department: profile.department, disciplines: disciplinesTouched ? disciplines : WORK_DISCIPLINES } } },
        disciplinesTouched ? { workDisciplines: disciplines } : {},
      )
      setStep(5); return
    }
    if (key === "preferences") {
      await saveOnboarding(
        { step: 6, data: { preferences: { sprintView, notifyEmail, notifyRealtime, notifyPush } } },
        { sprintView, notifyEmail, notifyRealtime, notifyPush },
      )
      setStep(6); return
    }
    if (key === "project") {
      let planId: number | null = null
      if (projectMode === "created" || projectMode === "sample") {
        const res = await fetch("/api/onboarding/project", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projectMode === "sample" ? { sample: true } : projectForm) })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(json?.error ?? "Could not create the project.")
        planId = json.data.planId as number
        setNotice(json.data.created ? "Draft project created in the planner." : "That project already exists.")
      }
      if (projectMode === "import") {
        const file = importFile
        if (!file) throw new Error("Choose a text or PDF scope document first.")
        const body = file.type === "application/pdf"
          ? { pdf: { mimeType: file.type, data: await toBase64(file) }, sourceName: file.name }
          : { text: await file.text(), sourceName: file.name }
        const res = await fetch("/api/planner/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(json?.message ?? "Could not import that document.")
        planId = json.plan?.id ?? null
        setNotice("A draft plan was extracted — review it in the planner.")
      }
      await saveOnboarding({ step: 7, data: { project: { mode: projectMode === "import" ? "imported" : projectMode, planId, title: projectMode === "created" ? projectForm.title : projectMode === "sample" ? "Sample project — one week of IT support" : null } } })
      setStep(7); return
    }
    setStep(7)
  } catch (err) {
    setError((err as Error).message)
  } finally {
    setSaving(false)
  }
}
```

`skip()` advances by saving `{ step: nextIndex }` with no data (welcome/review have no Skip). `finishLater()` saves the current step (best effort, swallowing the error but telling the member) and pushes `/dashboard`.

`finish()` — the one ordering the owner's checks pin. Define it **above** `finishLater()`, because checks 7 and 15 locate `router.push("/dashboard")` with a file-wide `indexOf` and would otherwise find `finishLater()`'s push before the completion save:

```tsx
async function finish() {
  setSaving(true); setError("")
  try {
    // The account already knows the name the member skipped past; save it before asking
    // the completion rule to judge it, so skipping the profile step is not a trap.
    if (!initial.data.profile.name && identity.name) {
      await saveOnboarding({ data: { profile: identity } })
    }
    await saveOnboarding({ status: "completed", step: 7 })
    router.push("/dashboard")
    router.refresh()
  } catch (err) {
    setError((err as Error).message)
    setSaving(false)
  }
}
```

Layout: a two-column grid on `lg` (step rail + form card; single column below), `<h1 tabIndex={-1} ref={headingRef}>` focused on step change, `aria-current="step"` in the rail, an `aria-live="polite"` line "Step N of 8", `<Label htmlFor>` on every control, errors in `<Alert variant="destructive">` with `role="alert"`, buttons disabled while `saving`, Back keeps state (single `data` object), Skip on steps 3–7, "Finish later" always.

Step contents: Welcome (what setup covers, "Finish later"); Profile (name, job title, department, location, timezone `<Select>` over `allTimezones`, language `<Select>` over `languages`, email read-only); Workspace (radio group personal/team/accept invitation/request access; team name input only when `initial.canRenameTeam`, otherwise read-only text naming the current team and "only a workspace admin can rename it"; invite token input pre-filled from the prop; note textarea for access requests); Industry (primary `<Input list="industry-suggestions">` with a short suggestion datalist, secondary chips, "Not sure yet" checkbox that clears both); Role and disciplines (job title, department, category group tabs + checkboxes over `disciplinesInCategory`, "Select all"/"Clear", helper "This is a display filter, not a permission. Leave it untouched to see everything."); Project management (sprint view `<Select>` board/list/grid, three notification `<Checkbox>`es); First project (three option cards Create/Import/Sample plus Skip; create fields name/description/start/target; import `<input type="file" accept=".txt,.md,.pdf,text/plain,application/pdf">`; sample card labelled `<Badge>Sample</Badge>` and says it creates a labelled draft, never tasks); Review (summary list with an Edit button per section jumping to that step, then Go to My Dashboard).

- [ ] **Step 3: Wire the routing**

`app/(auth)/signup/page.tsx:42` → `router.push("/onboarding")`.
`proxy.ts`: `const isProtectedRoute = (path.startsWith("/dashboard") || path.startsWith("/onboarding")) && !(isDevelopment && isTeamPage)` and `matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login", "/signup", "/forgot-password", "/reset-password"]`. `/onboarding` is **not** an auth route, so no authenticated user is redirected away from it.

- [ ] **Step 4: The dashboard door**

In `app/dashboard/page.tsx`, add `onboarding` to the existing `Promise.all` (fifth fetch, `.catch(() => null)`), store `OnboardingView | null`. Above the analytics stack render:

```tsx
{onboarding && onboarding.status === "in_progress" ? (
  <Card className="border-dashed">
    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">Finish setting up your workspace</p>
        <p className="text-xs text-muted-foreground">
          You are on step {Math.min(onboarding.step + 1, ONBOARDING_STEP_COUNT)} of {ONBOARDING_STEP_COUNT}. Your saved answers are waiting.
        </p>
      </div>
      <Button size="sm" asChild>
        <Link href="/onboarding">Resume setup <ArrowRight className="ml-1 h-4 w-4" /></Link>
      </Button>
    </CardContent>
  </Card>
) : null}
```

and, when `onboarding?.pack` exists, a compact ordered strip before the Today strip: the pack title, then `pack.sections` filtered to `DASHBOARD_SECTIONS` keys mapped through `sectionLabel` with the hrefs `today → /dashboard`, `registers → /dashboard/registers`, `tasks → /dashboard`, `worklog → /dashboard/worklog`, `reports → /dashboard/reports-work`, `career → /dashboard/career`. This is the pack-driven ordering the spec asks for; it does not restructure the page.

- [ ] **Step 5: Re-entry points**

`app/dashboard/settings/page.tsx`: in the profile section's card grid add a `SectionCard title="Setup wizard"` with the status line ("Not started", "In progress — step N of 8", "Complete") and a `Link` to `/onboarding` labelled "Open setup wizard". The page already fetches `/api/onboarding`? It does not — add it to its `Promise.all` and a small `onboarding` state.

`app/dashboard/team/page.tsx`: next to "Add Member", a `Button variant="outline"` "Invite by link" opening a `Dialog` with email `<Input>`, role `<Select>` (user/admin), a submit that POSTs `/api/team/invitations`, then shows the returned `inviteUrl` in a read-only `<Input>` plus a Copy button and the expiry date. Errors (409 already has an account, 403 not an admin) show in the dialog.

- [ ] **Step 6: Typecheck and build**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npx tsc --noEmit` then `npm run build`.
Expected: 0 type errors; the build lists `/onboarding` and the five new API routes.

- [ ] **Step 7: Commit**

```bash
git add app/onboarding "app/(auth)/signup/page.tsx" proxy.ts app/dashboard/page.tsx app/dashboard/settings/page.tsx app/dashboard/team/page.tsx
git commit -m "feat(onboarding): the eight-step wizard, the dashboard door and the invite dialog"
```

---

### Task 5: The owner's seventeen checks, guards, docs, gates and push

**Files:**
- Create: `tests/unit/onboarding-checks.test.ts`
- Modify: `tests/unit/worklog-reports.test.ts` (an onboarding guard block)
- Modify: `FEATURES.md` (§22, deliberately-absent list, counts)
- Modify: `README.md` (scripts, page/route counts, an "Onboarding" section)
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` (phase 17 shipped line; §12.7 correction where it describes a single-select picker)
- Test: the six onboarding test files (state, settings-patch, invitation, schema, routes, checks)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write `tests/unit/onboarding-checks.test.ts` with exactly the owner's 17 checks**

Each `it` asserts the mechanism that makes the check true, and says in its name which check it is. Pure assertions call the modules; the rest use `codeOnly(src(...))` as the repo's source-assertion grammar. Check 17 is a source guard for layout/keyboard because unit tests cannot drive a browser — the test title says so.

```ts
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
```

- [ ] **Step 2: Add the cross-cutting guards to `tests/unit/worklog-reports.test.ts`**

```ts
describe("onboarding does not become a second schema", () => {
  it("keeps onboarding out of the users table", () => {
    // Slice the raw source: the end marker is a comment, and codeOnly() would erase it.
    const raw = src("drizzle/schema.ts")
    const usersBlock = codeOnly(
      raw.slice(raw.indexOf('export const users = pgTable("users"'), raw.indexOf("// Chat tables")),
    )
    expect(usersBlock).not.toMatch(/onboarding/i)
  })

  it("never gates the dashboard behind a redirect", () => {
    expect(codeOnly(src("app/dashboard/page.tsx"))).not.toMatch(/redirect\("\/onboarding"\)/)
  })

  it("sends the session, never a client flag, to decide the step", () => {
    const page = codeOnly(src("app/onboarding/page.tsx"))
    expect(page).toMatch(/getCurrentUser\(\)/)
    expect(page).toMatch(/redirect\("\/login"\)/)
  })

  it("does not read the invitation token from a header or log it", () => {
    const route = codeOnly(src("app/api/team/invitations/route.ts"))
    expect(route).not.toMatch(/x-invite/i)
    expect(route).not.toMatch(/console\.(log|error)\([^)]*invite\.token/)
  })
})
```

- [ ] **Step 3: Sync the docs**

`FEATURES.md`: new §22 "Onboarding (phase 17, 2026-10-27)" covering the eight steps, the state shape and the jsonb merge, the grandfather rule, the loop-safe routing, the invitation mechanism (hash, single use, 7 days, email-bound, user/admin only), the first-project write (draft `agent_plans`, never `tasks`), the dashboard banner and pack strip, the deliberately-absent list (no phone column, no organization table, no team name for non-admins, no auto-created sample, no password collection), and the file/test counts. Remove onboarding from any "deliberately absent" line that still lists it.

`README.md`: scripts table gains `db:invitations` / `db:invitations:rollback`; page count +1 (`/onboarding`), route count +5; lib list gains `onboarding/`; a "## Onboarding" section naming the eight steps, the state location, the grandfather rule and the invite link.

Spec: phase 17 line marked shipped with what the phase added (the pure modules, the settings exception for the one namespaced object, `workspace_invitations`, the first-project write, the pack strip) and the suite count. In §12.7, correct the step-5 sentence: the Phase-2 `DisciplinePicker` is a single-select filter, so the wizard renders a multi-select over the same `WORK_DISCIPLINES` grouped by `DISCIPLINE_CATEGORIES` and validates through `isWorkDiscipline` — same vocabulary, different control. Also correct step 5's landing key to `preferences.settings.workDisciplines`, which is where `/api/settings` actually writes and where `defaultDisciplineOf` now reads.

- [ ] **Step 4: Run every gate**

Run, in order:
1. `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npx vitest run` — expected all files pass.
2. `npx tsc --noEmit` — 0 errors.
3. `npm run lint` — expected only the known `components/planner/gantt.tsx:43` error and the 73-warning baseline.
4. `npm run build` — succeeds, lists `/onboarding` and the five routes.

- [ ] **Step 5: Commit and push**

```bash
git add tests/unit/onboarding-checks.test.ts tests/unit/worklog-reports.test.ts FEATURES.md README.md docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md
git commit -m "docs(onboarding): record phase 17 and pin the owner's seventeen checks"
git push origin main
```

---

### Task 6: The live Neon checkpoint

**Files:**
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` (migration result)
- Modify: `FEATURES.md` (migration result)
- Modify: `docs/superpowers/plans/2026-10-27-onboarding-phase17.md` (`## Result`)

**Interfaces:**
- Consumes: the approved `scripts/create-invitations-table.mjs`.

- [ ] **Step 1: Ask for the per-action approval**

Report exactly what runs: one `CREATE TABLE IF NOT EXISTS workspace_invitations` (9 columns), one index `workspace_invitations_email_idx`, and the unique constraint on `token_hash`; no rows seeded, nothing dropped or rewritten; rollback gated behind `INVITATIONS_ROLLBACK=yes`. Mask the host and offer one recommended option.

- [ ] **Step 2: Run the migration after approval**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npm run db:invitations`
Expected: `table: workspace_invitations`, `invitation rows: 0`. If the raw-TCP client times out (phase 16 saw `read ETIMEDOUT` from this machine), apply the script's own `CREATE` statements over `@neondatabase/serverless` and record the deviation, exactly as phase 16 did.

- [ ] **Step 3: Verify read-only**

Query `information_schema.columns` for the table, `pg_indexes` for the two indexes and the unique constraint, and `count(*)` (expected 0). Confirm `users` has no new column and `tasks`/`work_log_entries` counts are unchanged.

- [ ] **Step 4: Record the result and push**

Append `## Result` to this plan with the commits, gates, migration output and any deviation; update the spec and FEATURES with the verified counts; commit and push.

```bash
git add docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md FEATURES.md docs/superpowers/plans/2026-10-27-onboarding-phase17.md
git commit -m "docs(onboarding): record the invitations migration against production"
git push origin main
```

---

## Self-review notes

- **Spec coverage:** §12.7 steps 1-8 → Task 4; state shape, jsonb merge, grandfather, loop-safety, skip, vocabulary → Tasks 1 and 4; invitations → Tasks 2 and 3; secrets refusal → Task 1; first project → Task 3; pack-driven ordering → Task 4; the owner's 17 checks → Task 5; migration → Task 6.
- **Deliberate deviations from the spec text, to be corrected in the spec at Task 5:** (a) the Phase-2 `DisciplinePicker` is a single-select filter, so step 5 uses a multi-select over the same vocabulary; (b) `preferences.settings.workDisciplines` is where settings writes, and `defaultDisciplineOf` now reads it there; (c) the generic `/api/settings` sanitiser deliberately dropped nested objects, so `onboarding` is the one whitelisted, further-validated namespace.
- **No placeholders:** every task names files, functions, signatures and the exact assertions. The wizard's per-step handler code is given in full where behaviour is load-bearing (save, advance, skip, finish); layout is specified field by field.
- **Type consistency:** `OnboardingState`, `OnboardingData`, `OnboardingView`, `ProjectInput`, `InvitationRole` and the route payload keys are used with the same names in every task. `readInvitationByToken` takes a hash; `acceptInvitation` takes the raw token and hashes it.