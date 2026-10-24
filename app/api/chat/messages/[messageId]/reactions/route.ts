import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { normalizeReactions, type ReactionMap } from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

/**
 * Toggle the caller's reaction on a message. The map { emoji: userIds[] }
 * lives in messages.reactions (jsonb) — the old code inserted into the legacy
 * `reactions` table with a non-existent `id` column (TS2769).
 * PUT is the canonical verb; POST is kept for the legacy lib/api-chat client.
 */
async function toggle(req: NextRequest, messageId: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const body = await req.json().catch(() => ({}));
    const emoji = typeof body.emoji === "string" ? body.emoji : "";
    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    const [message] = await db
      .select({ id: messages.id, reactions: messages.reactions })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const map: ReactionMap = normalizeReactions(message.reactions);
    const current = map[emoji] ?? [];
    const removed = current.includes(userId);
    const next = removed ? current.filter((id) => id !== userId) : [...current, userId];

    if (next.length === 0) {
      delete map[emoji];
    } else {
      map[emoji] = next;
    }

    await db
      .update(messages)
      .set({ reactions: map })
      .where(eq(messages.id, messageId));

    // Consumers of the old endpoint checked `removed`; keep that field plus
    // the fresh map so the UI can re-render chips without a refetch.
    return NextResponse.json({ removed, reactions: map });
  } catch (error) {
    console.error("Error handling reaction:", error);
    return NextResponse.json({ error: "Failed to process reaction" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  return toggle(req, messageId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  return toggle(req, messageId);
}
