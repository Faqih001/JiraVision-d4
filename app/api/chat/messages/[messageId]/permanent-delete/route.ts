import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

// DELETE - permanently remove one of the caller's own messages.
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
      .select({ senderId: messages.senderId })
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

    await db.delete(messages).where(eq(messages.id, messageId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error permanently deleting message:", error);
    return NextResponse.json(
      { error: "Failed to permanently delete message" },
      { status: 500 },
    );
  }
}
