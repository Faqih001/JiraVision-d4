import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

// POST - restore a soft-deleted message from messages.original_content
// (the column the old code referenced before it existed).
export async function POST(
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
        { error: "You can only restore your own messages" },
        { status: 403 },
      );
    }
    if (!message.deleted) {
      return NextResponse.json({ error: "Message is not deleted" }, { status: 400 });
    }

    const [restored] = await db
      .update(messages)
      .set({
        deleted: false,
        content: message.originalContent || message.content,
        originalContent: null,
      })
      .where(eq(messages.id, messageId))
      .returning();

    return NextResponse.json(restored);
  } catch (error) {
    console.error("Error restoring message:", error);
    return NextResponse.json({ error: "Failed to restore message" }, { status: 500 });
  }
}
