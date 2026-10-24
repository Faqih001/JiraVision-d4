import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatParticipants, messages, users } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import {
  fetchMessagesForChat,
  getChatRow,
  getParticipantRow,
  listParticipants,
  notifyMentions,
} from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/messages?chatId=…&after=<ISO timestamp>
 * Full stream (default) or a polling delta (`after`). Marks the chat read for
 * the caller. Sender info comes from an explicit join — the relational
 * `with: { sender }` config referenced columns that do not exist.
 */
export async function GET(req: NextRequest) {
  try {
    const chatId = req.nextUrl.searchParams.get("chatId");
    const after = req.nextUrl.searchParams.get("after");
    if (!chatId) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
    }

    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const participant = await getParticipantRow(chatId, userId);
    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this chat" },
        { status: 403 },
      );
    }

    let dtos = await fetchMessagesForChat(chatId);
    if (after) {
      const afterDate = new Date(after);
      if (!Number.isNaN(afterDate.getTime())) {
        dtos = dtos.filter((m) => {
          const ts = m.timestamp ? new Date(m.timestamp).getTime() : 0;
          return ts > afterDate.getTime();
        });
      }
    }

    // Mark the whole chat read at stream time (delta polls keep lastRead as-is
    // until the next full load so background polling never hides unread dots).
    if (!after) {
      await db
        .update(chatParticipants)
        .set({ lastRead: new Date() })
        .where(
          and(
            eq(chatParticipants.chatId, chatId),
            eq(chatParticipants.userId, userId),
          ),
        );
    }

    return NextResponse.json(dtos);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chat/messages
 * Body: { chatId, content, type?, replyToId?, fileUrl?, fileName?, fileSize? }
 * @-mentions are parsed server-side against the chat roster; each mentioned
 * participant (≠ author) gets one "mention" notification per message.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, content, replyToId, fileUrl, fileName, fileSize } = body;
    const type = body.type ?? "text";

    if (!chatId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const participant = await getParticipantRow(chatId, userId);
    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this chat" },
        { status: 403 },
      );
    }

    const chat = await getChatRow(chatId);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const timestamp = new Date();
    const [newMessage] = await db
      .insert(messages)
      .values({
        content: String(content),
        type,
        chatId,
        senderId: userId,
        replyToId: replyToId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize ? Number(fileSize) : null,
        timestamp,
      })
      .returning();

    // Roster for mention parsing + a stable sender record for the response.
    const [roster, senderRows] = await Promise.all([
      listParticipants(chatId),
      db
        .select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    ]);

    await notifyMentions({
      chatId,
      chatName: chat.name,
      messageId: newMessage.id,
      content: String(content),
      authorId: userId,
      authorName: senderRows[0]?.name ?? String(session.name ?? "Someone"),
      roster,
    });

    return NextResponse.json({
      id: newMessage.id,
      content: newMessage.content,
      type: newMessage.type,
      timestamp: newMessage.timestamp,
      senderId: newMessage.senderId,
      fileUrl: newMessage.fileUrl || undefined,
      fileName: newMessage.fileName || undefined,
      fileSize: newMessage.fileSize || undefined,
      deleted: newMessage.deleted,
      editedAt: null,
      replyToId: newMessage.replyToId,
      sender: senderRows[0]
        ? {
            id: Number(senderRows[0].id),
            name: senderRows[0].name,
            avatar: senderRows[0].avatar || "",
          }
        : { id: userId, name: String(session.name ?? "Unknown"), avatar: "" },
      replyTo: undefined,
      reactions: {},
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
