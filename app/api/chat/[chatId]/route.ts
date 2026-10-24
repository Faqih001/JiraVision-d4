import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, chatParticipants } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import {
  getParticipantRow,
  normalizeSettings,
} from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/chat/[chatId] — remove a chat.
 * Groups: only a participant with settings.isAdmin may delete (rows cascade
 * to participants + messages). DMs: either side may leave-and-delete.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const participant = await getParticipantRow(chatId, userId);
    if (!participant) {
      return NextResponse.json(
        { error: "Chat not found or you don't have access" },
        { status: 404 },
      );
    }

    const [chat] = await db
      .select({ id: chats.id, type: chats.type })
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.type === "group" && !normalizeSettings(participant.settings).isAdmin) {
      return NextResponse.json(
        { error: "Only a group admin can delete the group" },
        { status: 403 },
      );
    }

    await db.delete(chats).where(eq(chats.id, chatId));
    // Safety net in case cascade is not enforced on an older DB.
    await db
      .delete(chatParticipants)
      .where(eq(chatParticipants.chatId, chatId))
      .catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}
