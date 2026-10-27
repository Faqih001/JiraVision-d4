// /api/assistant/workspace/threads/[id] — get thread messages (design §7)
// GET → returns thread details and all messages
// DELETE → deletes thread and its messages

import { NextRequest, NextResponse } from "next/server"
import { eq, and, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { assistantThreads, assistantMessages } from "@/drizzle/schema"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify thread belongs to user
    const [thread] = await db
      .select()
      .from(assistantThreads)
      .where(
        and(
          eq(assistantThreads.id, id),
          eq(assistantThreads.userId, session.id)
        )
      )
      .limit(1)

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    // Get all messages
    const messages = await db
      .select()
      .from(assistantMessages)
      .where(eq(assistantMessages.threadId, id))
      .orderBy(asc(assistantMessages.createdAt))

    return NextResponse.json({
      success: true,
      data: { thread, messages },
    })
  } catch (error) {
    console.error("Get thread error:", error)
    return NextResponse.json(
      { error: "Failed to get thread" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify thread belongs to user
    const [thread] = await db
      .select()
      .from(assistantThreads)
      .where(
        and(
          eq(assistantThreads.id, id),
          eq(assistantThreads.userId, session.id)
        )
      )
      .limit(1)

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    // Delete thread (messages cascade)
    await db.delete(assistantThreads).where(eq(assistantThreads.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete thread error:", error)
    return NextResponse.json(
      { error: "Failed to delete thread" },
      { status: 500 }
    )
  }
}
