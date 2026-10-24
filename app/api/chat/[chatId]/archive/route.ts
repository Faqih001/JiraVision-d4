import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { getParticipantRow } from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

// PATCH - archive / un-archive a chat (chat-level flag, visible to everyone).
export async function PATCH(
  req: NextRequest,
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

    const body = await req.json();
    const { isArchived } = body;
    if (isArchived === undefined) {
      return NextResponse.json({ error: "isArchived is required" }, { status: 400 });
    }

    const [updatedChat] = await db
      .update(chats)
      .set({ isArchived: Boolean(isArchived), updatedAt: new Date() })
      .where(eq(chats.id, chatId))
      .returning();

    if (!updatedChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Error updating archive status:", error);
    return NextResponse.json(
      { error: "Failed to update archive status" },
      { status: 500 },
    );
  }
}
