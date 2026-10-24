import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { normalizeReactions } from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

function toDto(row: typeof messages.$inferSelect) {
  return {
    id: row.id,
    content: row.deleted ? "" : row.content,
    type: row.type,
    timestamp: row.timestamp,
    senderId: row.senderId,
    fileUrl: row.fileUrl || undefined,
    fileName: row.fileName || undefined,
    fileSize: row.fileSize || undefined,
    deleted: row.deleted,
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    replyToId: row.replyToId,
    reactions: normalizeReactions(row.reactions),
  };
}

// PATCH - edit the caller's own message (marks it as edited).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const body = await req.json();
    const { content } = body;
    if (typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.senderId !== userId) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 },
      );
    }

    const [updated] = await db
      .update(messages)
      .set({ content: content.trim(), editedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();

    return NextResponse.json(toDto(updated));
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
  }
}

// DELETE - soft delete: the old content moves to original_content so the
// restore route can put it back verbatim.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.senderId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 },
      );
    }

    const [updated] = await db
      .update(messages)
      .set({
        deleted: true,
        content: "This message was deleted",
        originalContent: message.deleted ? message.originalContent : message.content,
      })
      .where(eq(messages.id, messageId))
      .returning();

    return NextResponse.json(toDto(updated));
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
