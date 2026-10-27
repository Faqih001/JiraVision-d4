// GET /api/planner — list the current user's plans (draft and promoted).

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { agentPlans } from "@/drizzle/schema"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const plans = await db
    .select()
    .from(agentPlans)
    .where(eq(agentPlans.createdBy, session.id))
    .orderBy(desc(agentPlans.createdAt))

  return NextResponse.json({ success: true, plans })
}
