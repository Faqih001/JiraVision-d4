import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatParticipants } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import {
  getParticipantRow,
  normalizeSettings,
} from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

/**
 * PATCH - mute/un-mute for the current viewer only. Previously this wrote
 * chats.is_muted which leaks one user's preference to the whole team; the
 * per-participant settings jsonb is the source of truth now.
 */
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
    if (body.isMuted === undefined) {
      return NextResponse.json({ error: "isMuted is required" }, { status: 400 });
    }

    const settings = {
      ...normalizeSettings(participant.settings),
      isMuted: Boolean(body.isMuted),
    };
    await db
      .update(chatParticipants)
      .set({ settings })
      .where(
        and(
          eq(chatParticipants.chatId, chatId),
          eq(chatParticipants.userId, userId),
        ),
      );

    return NextResponse.json({ success: true, isMuted: settings.isMuted });
  } catch (error) {
    console.error("Error updating mute status:", error);
    return NextResponse.json(
      { error: "Failed to update mute status" },
      { status: 500 },
    );
  }
}
