// /api/assistant/workspace — authenticated workspace assistant (design §7)
// POST → ask a question, creates/continues thread, persists messages
// Returns: { answer, references, dataAsOf, threadId }

import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { assistantThreads, assistantMessages } from "@/drizzle/schema"
import { callWorkspaceAssistant } from "@/lib/assistant/workspace"
import { z } from "zod"

export const dynamic = "force-dynamic"

const PostBodySchema = z.object({
  question: z.string().min(1).max(2000),
  threadId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { question, threadId } = PostBodySchema.parse(body)

    let threadUuid: string

    if (threadId) {
      // Verify thread belongs to user
      const thread = await db
        .select()
        .from(assistantThreads)
        .where(
          and(
            eq(assistantThreads.id, threadId),
            eq(assistantThreads.userId, session.id)
          )
        )
        .limit(1)

      if (thread.length === 0) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 })
      }

      threadUuid = threadId
    } else {
      // Create new thread
      const [newThread] = await db
        .insert(assistantThreads)
        .values({
          userId: session.id,
          scope: "workspace",
          title: question.slice(0, 100),
        })
        .returning()

      threadUuid = newThread.id
    }

    // Persist user message
    await db.insert(assistantMessages).values({
      threadId: threadUuid,
      role: "user",
      content: question,
      references: [],
      tokens: 0,
    })

    // Call assistant
    const response = await callWorkspaceAssistant(session.id, question)

    // Persist assistant message
    await db.insert(assistantMessages).values({
      threadId: threadUuid,
      role: "assistant",
      content: response.answer,
      references: response.references,
      tokens: 0, // TODO: track actual token usage
    })

    // Update thread timestamp
    await db
      .update(assistantThreads)
      .set({ updatedAt: new Date() })
      .where(eq(assistantThreads.id, threadUuid))

    return NextResponse.json({
      success: true,
      data: {
        answer: response.answer,
        references: response.references,
        dataAsOf: response.dataAsOf,
        threadId: threadUuid,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Workspace assistant error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
