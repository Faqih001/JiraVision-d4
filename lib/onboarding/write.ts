// Writes for onboarding. The invite acceptance claims the token with one conditional
// UPDATE, then changes the session user's own role inside the same transaction; the
// project step writes a draft agent_plans row and never a task.

import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { agentPlans, planItems, users, workspaceInvitations } from "@/drizzle/schema"
import { createNotification, notifyMany } from "@/lib/notifications"
import { isInvitationRole, invitationProblem, invitationTokenHash, type InvitationRole } from "./invitation"
import { listWorkspaceAdmins, readInvitationByToken } from "./read"

export type AcceptResult = { ok: true; role: InvitationRole } | { ok: false; status: number; error: string }

export async function acceptInvitation(args: { userId: number; email: string; token: string }): Promise<AcceptResult> {
  const { userId, email, token } = args
  const row = await readInvitationByToken(invitationTokenHash(token))
  if (!row) return { ok: false, status: 404, error: "That invitation is not valid." }

  const problem = invitationProblem(row, new Date().toISOString(), email)
  if (problem) return { ok: false, status: 410, error: problem }
  if (!isInvitationRole(row.role)) return { ok: false, status: 410, error: "That invitation grants an unknown role." }
  const role: InvitationRole = row.role

  const claimed = await db.transaction(async (tx) => {
    const [claimedRow] = await tx
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date(), acceptedBy: userId })
      .where(and(eq(workspaceInvitations.id, row.id), isNull(workspaceInvitations.acceptedAt)))
      .returning({ id: workspaceInvitations.id })
    if (!claimedRow) return false
    await tx.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId))
    return true
  })
  if (!claimed) return { ok: false, status: 409, error: "That invitation has already been used." }

  if (row.invitedBy) {
    await createNotification({
      userId: row.invitedBy,
      type: "system",
      title: "Invitation accepted",
      body: `${email} joined the workspace as ${role}.`,
      link: "/dashboard/team",
      metadata: { invitationId: row.id, joinedUserId: userId, role },
    }).catch(() => undefined)
  }
  return { ok: true, role }
}

export async function requestAccess(args: { userId: number; name: string; note: string | null }) {
  const ids = await listWorkspaceAdmins(args.userId)
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
  { title: "Log today's work", description: "Open the work log and record what you did." },
  { title: "Check one register item", description: "Verify a device you are responsible for." },
  { title: "Write a short handover note", description: "One paragraph a colleague could act on." },
]

export async function createOnboardingProject(args: { userId: number; input: ProjectInput }) {
  const { userId, input } = args
  const sourceName = input.sample ? "sample" : "onboarding"
  const [existing] = await db
    .select({ id: agentPlans.id })
    .from(agentPlans)
    .where(and(
      eq(agentPlans.createdBy, userId),
      eq(agentPlans.sourceName, sourceName),
      eq(agentPlans.title, input.title),
    ))
    .limit(1)
  if (existing) return { planId: existing.id, created: false }

  const plan = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(agentPlans)
      .values({
        title: input.title,
        summary: input.description,
        sourceKind: "text",
        sourceName,
        horizonStart: input.startDate,
        horizonEnd: input.targetDate,
        status: "draft",
        createdBy: userId,
      })
      .returning({ id: agentPlans.id })
    if (input.sample) {
      await tx.insert(planItems).values(
        SAMPLE_ITEMS.map((item, index) => ({
          planId: created.id,
          title: item.title,
          description: item.description,
          discipline: "technician",
          estimatePoints: 2,
          sortOrder: index,
        })),
      )
    }
    return created
  })
  return { planId: plan.id, created: true }
}