// Session-scoped reads for the playbook workspace. A published SOP is company knowledge;
// a draft or archived one is the author's until they publish it. Visibility is applied in
// SQL for the list and on the mapped row for the detail, so both answer "not found" the
// same way whether the row is missing or outside the reader's circle.

import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { playbooks, users } from "@/drizzle/schema"
import { normaliseMethod, normaliseSteps, type PlaybookStep } from "./method"
import {
  canReadPlaybook,
  isPlaybookStatus,
  type PlaybookStatus,
  type PlaybookViewer,
} from "./rules"

export type PlaybookDto = {
  id: number
  packKey: string
  discipline: string | null
  title: string
  summary: string | null
  scopeKind: string | null
  method: string[]
  steps: PlaybookStep[]
  precautions: string[]
  recommendations: string[]
  tags: string[]
  status: PlaybookStatus
  version: number
  authorId: number | null
  authorName: string | null
  source: string
  aiMarked: boolean
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  updatedAt: string
}

type PlaybookRow = {
  id: number
  packKey: string
  discipline: string | null
  title: string
  summary: string | null
  scopeKind: string | null
  method: unknown
  steps: unknown
  precautions: unknown
  recommendations: unknown
  tags: unknown
  status: string
  version: number
  authorId: number | null
  authorName: string | null
  source: string
  aiMarked: boolean
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  updatedAt: Date
}

const stringsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") continue
    const text = entry.trim()
    if (text) out.push(text)
  }
  return out
}

/** jsonb is whatever was written; every field is normalised here so no screen guesses. */
export function mapPlaybook(row: PlaybookRow): PlaybookDto {
  const method = normaliseMethod(row.method)
  return {
    id: row.id,
    packKey: row.packKey,
    discipline: row.discipline,
    title: row.title,
    summary: row.summary,
    scopeKind: row.scopeKind,
    method,
    steps: normaliseSteps(row.steps, method),
    precautions: stringsOf(row.precautions),
    recommendations: stringsOf(row.recommendations),
    tags: stringsOf(row.tags),
    status: isPlaybookStatus(row.status) ? row.status : "draft",
    version: row.version,
    authorId: row.authorId,
    authorName: row.authorName,
    source: row.source,
    aiMarked: row.aiMarked,
    lastVerifiedAt: row.lastVerifiedAt,
    verifyIntervalDays: row.verifyIntervalDays,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

const columns = {
  id: playbooks.id,
  packKey: playbooks.packKey,
  discipline: playbooks.discipline,
  title: playbooks.title,
  summary: playbooks.summary,
  scopeKind: playbooks.scopeKind,
  method: playbooks.method,
  steps: playbooks.steps,
  precautions: playbooks.precautions,
  recommendations: playbooks.recommendations,
  tags: playbooks.tags,
  status: playbooks.status,
  version: playbooks.version,
  authorId: playbooks.authorId,
  authorName: users.name,
  source: playbooks.source,
  aiMarked: playbooks.aiMarked,
  lastVerifiedAt: playbooks.lastVerifiedAt,
  verifyIntervalDays: playbooks.verifyIntervalDays,
  updatedAt: playbooks.updatedAt,
}

export type PlaybookFilters = {
  q?: string | null
  status?: string | null
  packKey?: string | null
  discipline?: string | null
}

function visibleFilter(viewer: PlaybookViewer): SQL | undefined {
  if (viewer.admin) return undefined
  return or(eq(playbooks.status, "published"), eq(playbooks.authorId, viewer.id))
}

export async function loadVisiblePlaybooks(
  viewer: PlaybookViewer,
  filters: PlaybookFilters = {},
): Promise<PlaybookDto[]> {
  const conditions: SQL[] = []
  const visible = visibleFilter(viewer)
  if (visible) conditions.push(visible)

  const q = filters.q?.trim()
  if (q) {
    const like = `%${q}%`
    const match = or(ilike(playbooks.title, like), ilike(playbooks.summary, like))
    if (match) conditions.push(match)
  }
  if (isPlaybookStatus(filters.status)) conditions.push(eq(playbooks.status, filters.status))
  if (filters.packKey) conditions.push(eq(playbooks.packKey, filters.packKey))
  if (filters.discipline) conditions.push(eq(playbooks.discipline, filters.discipline))

  const rows = await db
    .select(columns)
    .from(playbooks)
    .leftJoin(users, eq(users.id, playbooks.authorId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(playbooks.updatedAt), desc(playbooks.id))
    .limit(500)

  return rows.map(mapPlaybook)
}

/** Without a viewer this is the raw row; with one, an unreadable row reads as missing. */
export async function loadPlaybook(
  id: number,
  viewer?: PlaybookViewer,
): Promise<PlaybookDto | null> {
  const [row] = await db
    .select(columns)
    .from(playbooks)
    .leftJoin(users, eq(users.id, playbooks.authorId))
    .where(eq(playbooks.id, id))
    .limit(1)
  if (!row) return null

  const playbook = mapPlaybook(row)
  if (viewer && !canReadPlaybook(playbook, viewer)) return null
  return playbook
}
