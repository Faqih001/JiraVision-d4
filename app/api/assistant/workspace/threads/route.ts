// /api/assistant/workspace/threads — list user's assistant threads (design §7)
// GET → returns user's threads with message counts

import { NextRequest, NextResponse } from "next/server"
import { eq, desc, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { assistantThreads, assistantMessages } from "@/drizzle/schema"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const threads = await db
      .select({
        id: assistantThreads.id,
        title: assistantThreads.title,
        scope: assistantThreads.scope,
        createdAt: assistantThreads.createdAt,
        updatedAt: assistantThreads.updatedAt,
        messageCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${assistantMessages} 
          WHERE ${assistantMessages.threadId} = ${assistantThreads.id}
        )`,
      })
      .from(assistantThreads)
      .where(eq(assistantThreads.userId, session.id))
      .orderBy(desc(assistantThreads.updatedAt))
      .limit(100)

    return NextResponse.json({
      success: true,
      data: { threads },
    })
  } catch (error) {
    console.error("List threads error:", error)
    return NextResponse.json(
      { error: "Failed to list threads" },
      { status: 500 }
    )
  }
}
