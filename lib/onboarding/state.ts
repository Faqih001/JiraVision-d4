// Onboarding is a small state machine with no database in it: the wizard, the settings
// route and the tests all read the same answers. State lives in
// preferences.settings.onboarding, so the only migration this phase needs is the
// invitations table.

import { isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
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

export const ONBOARDING_STATUSES = ["not_started", "in_progress", "completed", "skipped"] as const
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number]

/** How a user_onboarding row came to exist. */
export const ONBOARDING_SOURCES = ["gate", "wizard", "signup", "backfill"] as const
export type OnboardingSource = (typeof ONBOARDING_SOURCES)[number]

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

/** Restarting is the one way a completed member may move backwards, and only from their own row. */
export type OnboardingPatchOptions = { allowRestart?: boolean }

const PATCH_FIELDS = ["status", "step", "data"] as const

/**
 * Validates one wizard step against the stored state. The wizard cannot jump to
 * `completed` without the one required field, cannot downgrade a completed member, and
 * cannot store a key the state does not declare.
 */
export function readOnboardingPatch(
  value: unknown,
  current: OnboardingState,
  nowIso: string,
  options: OnboardingPatchOptions = {},
): OnboardingPatch {
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
  if (status === "in_progress" && current.status === "completed" && !options.allowRestart) {
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
      completedAt:
        status === "completed"
          ? current.completedAt ?? nowIso
          : status === "in_progress" && current.status === "completed"
            ? null // a restart clears the old finish; finishing again stamps a new one
            : current.completedAt,
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

// ---------------------------------------------------------------------------------------
// The gate: one row per account says whether setup was dealt with, and only two statuses
// let a member into the workspace. Answers stay in preferences; this is the memory.
// ---------------------------------------------------------------------------------------

export type OnboardingRow = {
  status: OnboardingStatus
  step: number
  version: number
  source: OnboardingSource
  completedAt: string | null
  skippedAt: string | null
}

/** A row that cannot be trusted reads as `null`, which makes the gate fall back to the old rules. */
export function readOnboardingRow(value: unknown): OnboardingRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  return {
    status: oneOf(row.status, ONBOARDING_STATUSES, "not_started"),
    step: clampStep(row.step),
    version: int(row.version) ?? ONBOARDING_VERSION,
    source: oneOf(row.source, ONBOARDING_SOURCES, "gate"),
    completedAt: iso(row.completedAt),
    skippedAt: iso(row.skippedAt),
  }
}

/** Only these let a member into the workspace; the gate sends every other status to /onboarding. */
export function isOnboardingSettled(status: OnboardingStatus): boolean {
  return status === "completed" || status === "skipped"
}

export type OnboardingGateDecision = {
  status: OnboardingStatus
  step: number
  completedAt: string | null
  skippedAt: string | null
  redirect: boolean
  grandfathered: boolean
  /** Which rule produced this answer — useful in the settings card and in tests. */
  origin: "row" | "legacy" | "grandfather" | "new"
  row: OnboardingRow | null
}

export type OnboardingGateInput = {
  row: OnboardingRow | null
  /** preferences.settings.onboarding, which predates the table and still holds the answers. */
  legacy: OnboardingState
  user: { createdAtIso: string | null; hasActivity: boolean }
}

const LAST_STEP = ONBOARDING_STEP_COUNT - 1

/**
 * The row wins whenever it exists, including `skipped` and `in_progress` after a restart —
 * otherwise "set up later" would be re-asked on every page load. With no row the legacy
 * status and the grandfather rule decide, so an account that predates the wizard is never
 * dragged back through it.
 */
export function decideOnboardingGate({ row, legacy, user }: OnboardingGateInput): OnboardingGateDecision {
  if (row) {
    return {
      status: row.status,
      step: row.status === "in_progress" ? row.step : row.status === "completed" ? LAST_STEP : 0,
      completedAt: row.completedAt,
      skippedAt: row.skippedAt,
      redirect: !isOnboardingSettled(row.status),
      grandfathered: false,
      origin: "row",
      row,
    }
  }

  const status = effectiveStatus(legacy, user)
  const grandfathered = status === "completed" && legacy.status === "not_started"
  return {
    status,
    step: status === "in_progress" ? resumeStep(legacy) : status === "completed" ? LAST_STEP : 0,
    completedAt: status === "completed" ? legacy.completedAt : null,
    skippedAt: null,
    redirect: !isOnboardingSettled(status),
    grandfathered,
    origin: grandfathered ? "grandfather" : status !== "not_started" ? "legacy" : "new",
    row: null,
  }
}