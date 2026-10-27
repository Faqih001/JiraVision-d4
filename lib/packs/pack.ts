// Pack resolution and authoring validation, pure so the "all roles" proof runs without a
// database. A pack is what a role is the keeper of; resolution never branches on a pack key
// except to find the seeded `general` fallback, which is what makes an admin-authored pack
// behave exactly like the seeded one.

import { DISCIPLINE_HINT, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import type { RegisterKind, RolePack } from "./types"

export type RolePackRow = {
  packKey: string
  title: string
  disciplines?: unknown
  registerKinds?: unknown
  sections?: unknown
  reportTemplate?: unknown
  ladderDiscipline?: unknown
  onboarding?: unknown
  method?: unknown
  isActive?: unknown
}

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .map((entry) => entry.trim())
    : []

const unique = <T>(values: T[]): T[] => [...new Set(values)]

function kinds(value: unknown): RegisterKind[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: RegisterKind[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue
    const record = entry as Record<string, unknown>
    const key = typeof record.key === "string" ? record.key.trim() : ""
    const label = typeof record.label === "string" ? record.label.trim() : ""
    if (!key || !label || seen.has(key)) continue
    seen.add(key)
    out.push({ key, label })
  }
  return out
}

/** Rows arrive as jsonb; a malformed field is dropped, never thrown, so one bad pack cannot break the page. */
export function normalisePack(row: RolePackRow): RolePack {
  return {
    packKey: row.packKey,
    title: row.title,
    disciplines: unique(strings(row.disciplines).filter(isWorkDiscipline)),
    registerKinds: kinds(row.registerKinds),
    sections: unique(strings(row.sections)),
    reportTemplate: typeof row.reportTemplate === "string" && row.reportTemplate.trim() ? row.reportTemplate.trim() : null,
    ladderDiscipline: isWorkDiscipline(row.ladderDiscipline) ? row.ladderDiscipline : null,
    onboarding: strings(row.onboarding),
    method: strings(row.method),
    isActive: row.isActive !== false,
  }
}

export function activePacks(packs: readonly RolePack[]): RolePack[] {
  return packs.filter((pack) => pack.isActive)
}

export function packByKey(packs: readonly RolePack[], key: string | null | undefined): RolePack | null {
  if (!key) return null
  return packs.find((pack) => pack.packKey === key) ?? null
}

/**
 * The pack that claims this discipline. Unknown strings are not guessed at here; `resolvePack`
 * owns the fallback so a caller can tell "no pack claims this" from "the general pack does".
 */
export function packForDiscipline(
  packs: readonly RolePack[],
  discipline: unknown,
): RolePack | null {
  if (!isWorkDiscipline(discipline)) return null
  return packs.find((pack) => pack.isActive && pack.disciplines.includes(discipline)) ?? null
}

/** The pack a member sees: the one that claims their discipline, or the seeded general pack. */
export function resolvePack(packs: readonly RolePack[], discipline: unknown): RolePack | null {
  return packForDiscipline(packs, discipline) ?? packByKey(packs, "general")
}

/**
 * The five facets a screen reads. Both the seeded packs and an admin-authored row go through
 * this one function, which is the claim phase 15's fixture test checks.
 */
export function packView(pack: RolePack) {
  return {
    packKey: pack.packKey,
    title: pack.title,
    registerKinds: pack.registerKinds,
    sections: pack.sections,
    reportTemplate: pack.reportTemplate,
    ladderDiscipline: pack.ladderDiscipline,
    method: pack.method,
    onboarding: pack.onboarding,
  }
}

const PACK_KEY = /^[a-z0-9][a-z0-9-]{1,58}$/
const KIND_KEY = /^[a-z0-9][a-z0-9_]{0,39}$/
const MAX_TITLE = 120
const MAX_QUESTION = 240
const CREDENTIAL_REQUEST =
  /\b(enter|paste|provide|send|share|type|supply)\b[^?]{0,60}\b(password|passwd|secret|token|api[ _-]?key|private[ _-]?key|credential)\b/i

export type PackInput = { ok: true; value: RolePack } | { ok: false; error: string }

/**
 * Admin authoring is the point of packs, so it validates at the boundary: a key that can be
 * addressed, a discipline the app already knows, and no question that asks for a credential
 * value. It never requires a code change to add a pack.
 */
export function readPackInput(value: unknown): PackInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Pack must be an object." }
  }
  const raw = value as Record<string, unknown>

  const packKey = typeof raw.packKey === "string" ? raw.packKey.trim() : ""
  if (!PACK_KEY.test(packKey)) {
    return { ok: false, error: "packKey must be 2-59 characters of lowercase letters, digits or hyphens." }
  }

  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  if (!title || title.length > MAX_TITLE) {
    return { ok: false, error: `title must be 1-${MAX_TITLE} characters.` }
  }

  if (!Array.isArray(raw.disciplines)) {
    return { ok: false, error: `disciplines must be an array; ${DISCIPLINE_HINT}.` }
  }
  const disciplines = strings(raw.disciplines)
  if (disciplines.length !== raw.disciplines.length || !disciplines.every(isWorkDiscipline)) {
    return { ok: false, error: `disciplines may contain only known work disciplines; ${DISCIPLINE_HINT}.` }
  }
  const uniqueDisciplines = unique(disciplines) as WorkDiscipline[]

  if (!Array.isArray(raw.registerKinds) || raw.registerKinds.length === 0) {
    return { ok: false, error: "registerKinds must list at least one kind." }
  }
  const registerKinds = kinds(raw.registerKinds)
  if (registerKinds.length !== raw.registerKinds.length) {
    return { ok: false, error: "Every register kind needs a key and a label." }
  }
  for (const kind of registerKinds) {
    if (!KIND_KEY.test(kind.key)) {
      return { ok: false, error: `Register kind "${kind.key}" must be lowercase letters, digits or underscores.` }
    }
  }

  const sections = unique(strings(raw.sections))
  if (!Array.isArray(raw.sections) || sections.length === 0 || sections.length !== raw.sections.length) {
    return { ok: false, error: "sections must be a non-empty array of distinct section ids." }
  }

  const reportTemplate =
    raw.reportTemplate === null || raw.reportTemplate === undefined
      ? null
      : typeof raw.reportTemplate === "string" && raw.reportTemplate.trim()
        ? raw.reportTemplate.trim()
        : null

  const ladderDiscipline =
    raw.ladderDiscipline === null || raw.ladderDiscipline === undefined
      ? null
      : isWorkDiscipline(raw.ladderDiscipline)
        ? raw.ladderDiscipline
        : undefined
  if (ladderDiscipline === undefined) {
    return { ok: false, error: "ladderDiscipline must be null or a known work discipline." }
  }

  const onboarding = strings(raw.onboarding)
  if (!Array.isArray(raw.onboarding) || onboarding.length !== raw.onboarding.length) {
    return { ok: false, error: "onboarding must be an array of questions." }
  }
  for (const question of onboarding) {
    if (question.length > MAX_QUESTION) {
      return { ok: false, error: `Each onboarding question must be at most ${MAX_QUESTION} characters.` }
    }
    if (CREDENTIAL_REQUEST.test(question)) {
      return {
        ok: false,
        error: `"${question}" asks for a credential value. Ask where it is kept and who can authorise it instead.`,
      }
    }
  }

  const method = strings(raw.method)
  if (!Array.isArray(raw.method) || method.length === 0 || method.length !== raw.method.length) {
    return { ok: false, error: "method must list at least one phase." }
  }

  return {
    ok: true,
    value: {
      packKey,
      title,
      disciplines: uniqueDisciplines,
      registerKinds,
      sections,
      reportTemplate,
      ladderDiscipline,
      onboarding,
      method,
      isActive: raw.isActive !== false,
    },
  }
}
