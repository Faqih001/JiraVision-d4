// The database side of onboarding: one view for the wizard and the dashboard, the
// grandfather check that needs two row counts, and the invitation reads. The rules live in
// ./state.ts and ./invitation.ts, so this module contains no decisions.

import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { userOnboarding, users, workspaceInvitations } from "@/drizzle/schema"
import type { SessionUser } from "@/lib/session"
import { isSuperAdmin } from "@/lib/roles"
import { loadPacks, defaultDisciplineOf } from "@/lib/registers/read"
import { resolvePack } from "@/lib/packs/pack"
import { readTeamSettings } from "@/lib/team-settings"
import {
  decideOnboardingGate,
  readOnboardingRow,
  readOnboardingState,
  type OnboardingData,
  type OnboardingGateDecision,
  type OnboardingRow,
  type OnboardingState,
  type OnboardingStatus,
} from "./state"

export type OnboardingView = {
  status: OnboardingStatus
  step: number
  completedAt: string | null
  skippedAt: string | null
  /** Which rule decided the status: the row, the legacy preference, the grandfather rule or nothing. */
  origin: OnboardingGateDecision["origin"]
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

function storedOnboarding(user: SessionUser): unknown {
  const preferences = user.preferences
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return null
  const settings = (preferences as Record<string, unknown>).settings
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null
  return (settings as Record<string, unknown>).onboarding
}

export async function readOnboardingView(user: SessionUser, gate?: OnboardingGateDecision): Promise<OnboardingView> {
  const state: OnboardingState = readOnboardingState(storedOnboarding(user))
  const decision = gate ?? (await readOnboardingGate(user))
  const packs = await loadPacks(false)
  const pack = resolvePack(packs, defaultDisciplineOf(user))
  const team = await readTeamSettings()

  return {
    status: decision.status,
    step: decision.step,
    completedAt: decision.completedAt ?? state.completedAt,
    skippedAt: decision.skippedAt,
    origin: decision.origin,
    data: state.data,
    grandfathered: decision.grandfathered,
    canRenameTeam: isSuperAdmin(user),
    teamName: team.teamName,
    pack: pack ? { packKey: pack.packKey, title: pack.title, sections: pack.sections } : null,
  }
}

/** The user_onboarding row, or null when the account has never been recorded. */
export async function readGateRow(userId: number): Promise<OnboardingRow | null> {
  const [row] = await db
    .select({
      status: userOnboarding.status,
      step: userOnboarding.step,
      version: userOnboarding.version,
      source: userOnboarding.source,
      completedAt: userOnboarding.completedAt,
      skippedAt: userOnboarding.skippedAt,
    })
    .from(userOnboarding)
    .where(eq(userOnboarding.userId, userId))
    .limit(1)
  if (!row) return null
  return readOnboardingRow({
    status: row.status,
    step: row.step,
    version: row.version,
    source: row.source,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    skippedAt: row.skippedAt ? row.skippedAt.toISOString() : null,
  })
}

/**
 * The one question the dashboard asks: does this account still owe setup? The row answers
 * when it exists; otherwise the legacy preference and the grandfather rule decide, so an
 * account created before the wizard is never dragged back through it. The activity count
 * costs two lookups, so it is only paid when there is no row to answer first.
 */
export async function readOnboardingGate(user: SessionUser): Promise<OnboardingGateDecision> {
  const legacy = readOnboardingState(storedOnboarding(user))
  const createdAtIso = user.createdAt ? new Date(user.createdAt).toISOString() : null

  const row = await readGateRow(user.id)
  if (row) return decideOnboardingGate({ row, legacy, user: { createdAtIso, hasActivity: false } })

  const hasWork = await hasActivity(user.id)
  return decideOnboardingGate({ row: null, legacy, user: { createdAtIso, hasActivity: hasWork } })
}

export type InvitationRecord = {
  id: number
  email: string
  role: string
  invitedBy: number | null
  acceptedAt: string | null
  expiresAt: string
}

export async function readInvitationByToken(tokenHash: string): Promise<InvitationRecord | null> {
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
    .where(eq(workspaceInvitations.tokenHash, tokenHash))
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

/** The admins who should hear about an access request. The requester is excluded. */
export async function listWorkspaceAdmins(excludeUserId: number): Promise<number[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.role}) IN ('admin', 'superadmin')`)
  return rows.map((row) => row.id).filter((id) => id !== excludeUserId)
}