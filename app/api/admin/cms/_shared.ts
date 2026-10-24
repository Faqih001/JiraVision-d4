// Shared helpers for /api/admin/cms — super-admin gating, override
// serialization, audit trail and admin fan-out notifications.

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getCurrentUser, isSuperAdmin, parseAdminEmails, type SessionUser } from "@/lib/session"
import { notifyMany } from "@/lib/notifications"

export type CmsGate = { user: SessionUser } | { error: NextResponse }

export function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json(
    { success: false, message: "Super-admin access required" },
    { status: 403 },
  )
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, message }, { status: 400 })
}

export function serverError(error: unknown, label: string) {
  console.error(`CMS API error (${label}):`, error)
  return NextResponse.json(
    { success: false, message: "Internal server error" },
    { status: 500 },
  )
}

export async function requireSuperAdmin(): Promise<CmsGate> {
  const user = await getCurrentUser()
  if (!user) return { error: unauthorized() }
  if (!isSuperAdmin(user)) return { error: forbidden() }
  return { user }
}

export interface CmsOverrideDto {
  id: number
  pageId: string
  sectionId: string
  fields: Record<string, string | number | boolean>
  isPublished: boolean
  updatedBy: number | null
  updatedByName: string
  updatedAt: string
}

function parseFields(raw: unknown): Record<string, string | number | boolean> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown
      return parsed && typeof parsed === "object" ? (parsed as Record<string, string | number | boolean>) : {}
    } catch {
      return {}
    }
  }
  return raw && typeof raw === "object" ? (raw as Record<string, string | number | boolean>) : {}
}

const OVERRIDE_PROJECTION = sql`
  o.id, o.page_id, o.section_id, o.fields, o.is_published, o.updated_by,
  to_char(o.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
  COALESCE((SELECT u.name FROM users u WHERE u.id = o.updated_by), 'Unknown') AS updated_by_name
`

type OverrideRow = {
  id: number
  page_id: string
  section_id: string
  fields: unknown
  is_published: boolean
  updated_by: number | null
  updated_at: string
  updated_by_name: string
}

function serializeOverride(row: OverrideRow): CmsOverrideDto {
  return {
    id: row.id,
    pageId: row.page_id,
    sectionId: row.section_id,
    fields: parseFields(row.fields),
    isPublished: row.is_published,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by_name,
    updatedAt: row.updated_at,
  }
}

export async function fetchOverrides(pageId?: string): Promise<CmsOverrideDto[]> {
  const rows = pageId
    ? ((await db.execute(sql`
        SELECT ${OVERRIDE_PROJECTION} FROM cms_content_overrides o
        WHERE o.page_id = ${pageId} ORDER BY o.updated_at DESC
      `)) as unknown as OverrideRow[])
    : ((await db.execute(sql`
        SELECT ${OVERRIDE_PROJECTION} FROM cms_content_overrides o
        ORDER BY o.updated_at DESC
      `)) as unknown as OverrideRow[])
  return (rows ?? []).map(serializeOverride)
}

export async function fetchOverride(pageId: string, sectionId: string): Promise<CmsOverrideDto | null> {
  const rows = (await db.execute(sql`
    SELECT ${OVERRIDE_PROJECTION} FROM cms_content_overrides o
    WHERE o.page_id = ${pageId} AND o.section_id = ${sectionId} LIMIT 1
  `)) as unknown as OverrideRow[]
  return rows?.[0] ? serializeOverride(rows[0]) : null
}

export async function writeAudit(
  pageId: string,
  sectionId: string,
  action: string,
  userId: number | null,
  detail: Record<string, unknown>,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO cms_audit_log (page_id, section_id, action, user_id, detail, created_at)
    VALUES (${pageId}, ${sectionId}, ${action}, ${userId}, ${JSON.stringify(detail)}::jsonb, now())
  `)
}

export interface CmsAuditDto {
  id: number
  pageId: string
  sectionId: string
  action: string
  userId: number | null
  actorName: string
  detail: Record<string, unknown>
  createdAt: string
}

export async function fetchAudit(pageId?: string, limit = 50): Promise<CmsAuditDto[]> {
  const rows = (pageId
    ? ((await db.execute(sql`
        SELECT a.id, a.page_id, a.section_id, a.action, a.user_id, a.detail,
               to_char(a.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
               COALESCE(u.name, 'System') AS actor_name
        FROM cms_audit_log a LEFT JOIN users u ON u.id = a.user_id
        WHERE a.page_id = ${pageId}
        ORDER BY a.created_at DESC LIMIT ${limit}
      `)) as unknown as AuditRow[])
    : ((await db.execute(sql`
        SELECT a.id, a.page_id, a.section_id, a.action, a.user_id, a.detail,
               to_char(a.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
               COALESCE(u.name, 'System') AS actor_name
        FROM cms_audit_log a LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC LIMIT ${limit}
      `)) as unknown as AuditRow[])) ?? []
  return rows.map((row) => ({
    id: row.id,
    pageId: row.page_id,
    sectionId: row.section_id,
    action: row.action,
    userId: row.user_id,
    actorName: row.actor_name,
    detail: parseFields(row.detail) as Record<string, unknown>,
    createdAt: row.created_at,
  }))
}

type AuditRow = {
  id: number
  page_id: string
  section_id: string
  action: string
  user_id: number | null
  detail: unknown
  created_at: string
  actor_name: string
}

/** Notify every OTHER super-admin (role-based or ADMIN_EMAILS) about a CMS mutation. */
export async function notifyOtherAdmins(
  actor: SessionUser,
  input: { title: string; body: string },
): Promise<void> {
  try {
    const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS)
    const emailClause = adminEmails.length
      ? sql.join(
          adminEmails.map((email) => sql`lower(u.email) = ${email}`),
          sql` OR `,
        )
      : sql`FALSE`
    const rows = (await db.execute(sql`
      SELECT u.id FROM users u
      WHERE u.id <> ${actor.id} AND (u.role IN ('admin', 'superadmin') OR ${emailClause})
    `)) as unknown as { id: number }[]
    const ids = (rows ?? []).map((r) => r.id)
    if (ids.length === 0) return
    await notifyMany(ids, {
      type: "cms",
      title: input.title,
      body: input.body,
      link: "/admin/cms",
      metadata: { actorId: actor.id, actorName: actor.name },
    })
  } catch (error) {
    console.error("CMS admin notification fan-out failed:", error)
  }
}
