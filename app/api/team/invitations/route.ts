import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, workspaceInvitations } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { isSuperAdmin } from "@/lib/roles"
import { createInvitation, readInvitationInput } from "@/lib/onboarding/invitation"
import { listPendingInvitations } from "@/lib/onboarding/read"

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

  const invitation = createInvitation(new Date())
  await db.insert(workspaceInvitations).values({
    email: parsed.value.email,
    tokenHash: invitation.tokenHash,
    role: parsed.value.role,
    invitedBy: session.id,
    expiresAt: invitation.expiresAt,
  })
  return NextResponse.json({
    success: true,
    data: {
      token: invitation.token,
      inviteUrl: `/onboarding?invite=${invitation.token}`,
      expiresAt: invitation.expiresAt.toISOString(),
      role: parsed.value.role,
      email: parsed.value.email,
    },
  })
}