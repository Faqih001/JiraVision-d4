// Session-scoped reads for the register workspace. Visibility is applied in SQL so an
// unreadable row never leaves the database, and the DTO is the shape every screen renders.

import { and, asc, desc, eq, inArray, or, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { registerItems, rolePacks, users } from "@/drizzle/schema"
import { normalisePack } from "@/lib/packs/pack"
import type { RolePack } from "@/lib/packs/types"
import { isSuperAdmin } from "@/lib/roles"
import type { SessionUser } from "@/lib/registers/session"
import {
  isRegisterCustody,
  isRegisterStatus,
  type RegisterCustody,
  type RegisterStatus,
} from "./rules"
import { stalenessOf, type Staleness } from "./staleness"

export type RegisterDto = {
  id: number
  packKey: string
  kind: string
  title: string
  fields: Record<string, string>
  status: RegisterStatus
  ownerId: number | null
  ownerName: string | null
  custody: RegisterCustody
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  parentId: number | null
  source: string
  updatedAt: string
}

export type RegisterWithState = RegisterDto & { staleness: Staleness }

export type ViewerView = { id: number; admin: boolean }

export function viewerOf(session: SessionUser): ViewerView {
  return { id: session.id, admin: isSuperAdmin(session) }
}

type RegisterRow = {
  id: number
  packKey: string
  kind: string
  title: string
  fields: unknown
  status: string
  ownerId: number | null
  ownerName: string | null
  custody: string
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  parentId: number | null
  source: string
  updatedAt: Date
}

const fieldsOf = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry
  }
  return out
}

export function mapRegister(row: RegisterRow): RegisterDto {
  return {
    id: row.id,
    packKey: row.packKey,
    kind: row.kind,
    title: row.title,
    fields: fieldsOf(row.fields),
    status: isRegisterStatus(row.status) ? row.status : "in_service",
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    custody: isRegisterCustody(row.custody) ? row.custody : "member",
    lastVerifiedAt: row.lastVerifiedAt,
    verifyIntervalDays: row.verifyIntervalDays,
    parentId: row.parentId,
    source: row.source,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

export function withState(rows: readonly RegisterDto[], todayIso: string): RegisterWithState[] {
  return rows.map((row) => ({ ...row, staleness: stalenessOf(row, todayIso) }))
}

const columns = {
  id: registerItems.id,
  packKey: registerItems.packKey,
  kind: registerItems.kind,
  title: registerItems.title,
  fields: registerItems.fields,
  status: registerItems.status,
  ownerId: registerItems.ownerId,
  ownerName: users.name,
  custody: registerItems.custody,
  lastVerifiedAt: registerItems.lastVerifiedAt,
  verifyIntervalDays: registerItems.verifyIntervalDays,
  parentId: registerItems.parentId,
  source: registerItems.source,
  updatedAt: registerItems.updatedAt,
}

export async function loadPacks(includeInactive = false): Promise<RolePack[]> {
  const rows = await db
    .select()
    .from(rolePacks)
    .where(includeInactive ? undefined : eq(rolePacks.isActive, true))
    .orderBy(asc(rolePacks.title))

  return rows.map((row) =>
    normalisePack({
      packKey: row.packKey,
      title: row.title,
      disciplines: row.disciplines,
      registerKinds: row.registerKinds,
      sections: row.sections,
      reportTemplate: row.reportTemplate,
      ladderDiscipline: row.ladderDiscipline,
      onboarding: row.onboarding,
      method: row.method,
      isActive: row.isActive,
    }),
  )
}

function visibleFilter(viewer: ViewerView): SQL | undefined {
  if (viewer.admin) return undefined
  return or(
    inArray(registerItems.custody, ["team", "org"]),
    and(eq(registerItems.custody, "member"), eq(registerItems.ownerId, viewer.id)),
  )
}

export async function loadVisibleRegisters(viewer: ViewerView): Promise<RegisterDto[]> {
  const rows = await db
    .select(columns)
    .from(registerItems)
    .leftJoin(users, eq(users.id, registerItems.ownerId))
    .where(visibleFilter(viewer))
    .orderBy(desc(registerItems.updatedAt), desc(registerItems.id))
    .limit(1000)

  return rows.map(mapRegister)
}

export async function loadRegisterRow(id: number) {
  const [row] = await db
    .select(columns)
    .from(registerItems)
    .leftJoin(users, eq(users.id, registerItems.ownerId))
    .where(eq(registerItems.id, id))
    .limit(1)
  return row ? mapRegister(row) : null
}

export async function loadRegistersByIds(ids: readonly number[]): Promise<RegisterDto[]> {
  if (ids.length === 0) return []
  const rows = await db
    .select(columns)
    .from(registerItems)
    .leftJoin(users, eq(users.id, registerItems.ownerId))
    .where(inArray(registerItems.id, [...ids]))
    .limit(1000)
  return rows.map(mapRegister)
}

/** The discipline a member's onboarding saved, used only to pick their default pack. */
export function defaultDisciplineOf(session: SessionUser): string | null {
  const preferences = session.preferences
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return null
  const list = (preferences as Record<string, unknown>).workDisciplines
  if (!Array.isArray(list)) return null
  const first = list.find((entry): entry is string => typeof entry === "string")
  return first ?? null
}
