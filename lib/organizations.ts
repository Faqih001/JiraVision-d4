// Organization membership — the visibility boundary (Slack workspace / Notion
// membership model). A member sees teammates who share their organization id; a
// member with no organization sees only themselves, and every team surface renders
// its empty state. Nothing crosses organizations.

import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { organizations, users } from "@/drizzle/schema"

export type Organization = { id: number; name: string; ownerId: number | null; createdAt: Date }

export type MemberSummary = {
  id: number
  name: string
  email: string
  role: string
  avatar: string | null
  jobTitle: string | null
  department: string | null
  status: string | null
}

export const MAX_ORG_NAME = 120

/** Name rule shared by the API and the create form. Returns the trimmed name or an error. */
export function validateOrgName(input: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = typeof input === "string" ? input.trim() : ""
  if (!name) return { ok: false, error: "An organization name is required." }
  if (name.length > MAX_ORG_NAME) return { ok: false, error: `Keep the organization name under ${MAX_ORG_NAME} characters.` }
  return { ok: true, name }
}

/**
 * The ids whose rows a viewer may see. Same-organization members when the viewer has
 * one; only the viewer otherwise. Empty organizations still contain the viewer — a
 * stale id on their row must not hide their own data.
 */
export function visibleIdsFor(orgId: number | null, viewerId: number, memberIds: number[]): number[] {
  if (orgId === null) return [viewerId]
  return memberIds.length > 0 ? memberIds : [viewerId]
}

/** The viewer's organization id, or null for a personal account. */
export async function loadUserOrgId(userId: number): Promise<number | null> {
  const [row] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row?.organizationId ?? null
}

/** The organization id plus every visible member id — one roundtrip for scoped reads. */
export async function loadVisibleMemberIds(userId: number): Promise<number[]> {
  const orgId = await loadUserOrgId(userId)
  if (orgId === null) return [userId]
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.organizationId, orgId))
  return visibleIdsFor(orgId, userId, rows.map((r) => r.id))
}

export async function loadOrganizationFor(userId: number): Promise<{
  organization: Organization | null
  members: MemberSummary[]
}> {
  const orgId = await loadUserOrgId(userId)
  if (orgId === null) return { organization: null, members: [] }

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!organization) return { organization: null, members: [] }

  const memberRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatar: users.avatar,
      jobTitle: users.jobTitle,
      department: users.department,
      status: users.status,
    })
    .from(users)
    .where(eq(users.organizationId, organization.id))
    .orderBy(asc(users.name))

  return { organization, members: memberRows }
}

/**
 * Create an organization and place the creator inside it as owner. A member who
 * already belongs to one gets an error instead of a second membership.
 */
export async function createOrganization(args: { userId: number; name: string }): Promise<
  { ok: true; organization: Organization } | { ok: false; error: string }
> {
  const existing = await loadUserOrgId(args.userId)
  if (existing !== null) return { ok: false, error: "You already belong to an organization." }

  const [created] = await db
    .insert(organizations)
    .values({ name: args.name, ownerId: args.userId })
    .returning()
  await db.update(users).set({ organizationId: created.id, updatedAt: new Date() }).where(eq(users.id, args.userId))
  return { ok: true, organization: created }
}
