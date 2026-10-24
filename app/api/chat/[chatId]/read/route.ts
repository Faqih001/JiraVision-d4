import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatParticipants } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { getParticipantRow } from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

// POST - mark the chat read for the signed-in user (was hardcoded userId=1).
export async function POST(
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

    const lastRead = new Date();
    await db
      .update(chatParticipants)
      .set({ lastRead })
      .where(
        and(
          eq(chatParticipants.chatId, chatId),
          eq(chatParticipants.userId, userId),
        ),
      );

    return NextResponse.json({ success: true, lastRead: lastRead.toISOString() });
  } catch (error) {
    console.error("Error marking chat as read:", error);
    return NextResponse.json(
      { error: "Failed to mark chat as read" },
      { status: 500 },
    );
  }
}
