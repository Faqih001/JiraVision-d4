import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, chatParticipants, users } from "@/drizzle/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { DEFAULT_SETTINGS } from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/dm { otherUserId } — open-or-create the individual chat with
 * a teammate. Idempotent: repeated calls return the same chat, which is what
 * the "join/create DM flow" in the workspace relies on.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const body = await req.json();
    const otherUserId = Number(body.otherUserId);
    if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
      return NextResponse.json({ error: "otherUserId is required" }, { status: 400 });
    }
    if (otherUserId === userId) {
      return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
    }

    const [other] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);
    if (!other) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Existing DM?
    const myChatRows = await db
      .select({ chatId: chatParticipants.chatId })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));
    const myChatIds = myChatRows.map((r) => r.chatId);

    let dmChatId: string | null = null;
    if (myChatIds.length > 0) {
      const shared = await db
        .select({ chatId: chatParticipants.chatId })
        .from(chatParticipants)
        .where(
          and(
            eq(chatParticipants.userId, otherUserId),
            inArray(chatParticipants.chatId, myChatIds),
          ),
        );
      if (shared.length > 0) {
        const individualChats = await db
          .select({ id: chats.id, createdAt: chats.createdAt })
          .from(chats)
          .where(
            and(
              eq(chats.type, "individual"),
              inArray(chats.id, shared.map((s) => s.chatId)),
            ),
          )
          .orderBy(desc(chats.createdAt));
        dmChatId = individualChats[0]?.id ?? null;
      }
    }

    if (!dmChatId) {
      const [newChat] = await db
        .insert(chats)
        .values({ type: "individual", name: other.name })
        .returning();
      await db.insert(chatParticipants).values([
        { chatId: newChat.id, userId, joinedAt: new Date(), settings: { ...DEFAULT_SETTINGS } },
        {
          chatId: newChat.id,
          userId: otherUserId,
          joinedAt: new Date(),
          settings: { ...DEFAULT_SETTINGS },
        },
      ]);
      dmChatId = newChat.id;
    }

    return NextResponse.json({ chatId: dmChatId, created: true });
  } catch (error) {
    console.error("Error opening DM:", error);
    return NextResponse.json({ error: "Failed to open DM" }, { status: 500 });
  }
}
