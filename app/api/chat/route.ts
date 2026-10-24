import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, chatParticipants, messages, users } from "@/drizzle/schema";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  previewFor,
} from "@/app/api/chat/api-helpers";

/** The neon http driver hands raw-SQL timestamps back as UTC-naive strings;
 *  normalize to a real Date so the ISO wire format matches drizzle selects. */
function toUtcDate(v: Date | string): Date {
  if (v instanceof Date) return v;
  const s = v.includes("T") ? v : v.replace(" ", "T");
  return new Date(s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`);
}

export const dynamic = "force-dynamic";

/**
 * GET /api/chat — every chat the signed-in user belongs to.
 * unreadCount is real (messages after this participant's lastRead), pin/mute
 * flags are per-viewer and live in chat_participants.settings (jsonb).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const myParts = await db
      .select({
        chatId: chatParticipants.chatId,
        settings: chatParticipants.settings,
        lastRead: chatParticipants.lastRead,
      })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    if (myParts.length === 0) {
      return NextResponse.json([]);
    }
    const chatIds = myParts.map((p) => p.chatId);

    interface LastMessageRow {
      id: string;
      chat_id: string;
      content: string;
      type: string;
      /** the neon http driver may hand back a string here */
      timestamp: Date | string;
      sender_id: number;
      file_url: string | null;
      file_name: string | null;
      file_size: number | null;
      deleted: boolean;
    }
    const lastMessageRows = (await db.execute(sql`
        select distinct on (m.chat_id) m.id, m.chat_id, m.content, m.type, m.timestamp,
               m.sender_id, m.file_url, m.file_name, m.file_size, m.deleted
        from messages m
        where m.chat_id in (${sql.join(
          chatIds.map((id) => sql`${id}`),
          sql`, `,
        )})
        order by m.chat_id, m.timestamp desc`)) as unknown as LastMessageRow[];

    const [chatRows, participantRows, unreadRows] = await Promise.all([
      db
        .select()
        .from(chats)
        .where(inArray(chats.id, chatIds)),
      listParticipantsForMany(chatIds),
      // Unread = non-deleted messages from other people newer than lastRead.
      db
        .select({
          chatId: chatParticipants.chatId,
          count: sql<number>`count(*)::int`,
        })
        .from(chatParticipants)
        .innerJoin(
          messages,
          and(
            eq(messages.chatId, chatParticipants.chatId),
            eq(messages.deleted, false),
            sql`${messages.senderId} <> ${chatParticipants.userId}`,
            or(
              isNull(chatParticipants.lastRead),
              sql`${messages.timestamp} > ${chatParticipants.lastRead}`,
            ),
          ),
        )
        .where(eq(chatParticipants.userId, userId))
        .groupBy(chatParticipants.chatId),
    ]);

    const lastMessageMap = new Map<string, LastMessageRow>();
    for (const row of lastMessageRows) {
      lastMessageMap.set(row.chat_id, row);
    }

    const unreadMap = new Map<string, number>();
    for (const row of unreadRows) {
      unreadMap.set(row.chatId, Number(row.count ?? 0));
    }

    const participantsByChat = new Map<
      string,
      { userId: number; name: string; avatar: string | null; isAdmin: boolean }[]
    >();
    for (const p of participantRows) {
      const list = participantsByChat.get(p.chatId) ?? [];
      list.push({
        userId: p.userId,
        name: p.name,
        avatar: p.avatar,
        isAdmin: normalizeSettings(p.settings).isAdmin,
      });
      participantsByChat.set(p.chatId, list);
    }

    const settingsByChat = new Map(myParts.map((p) => [p.chatId, p]));

    const transformed = chatRows.map((chat) => {
      const participants = participantsByChat.get(chat.id) ?? [];
      const myPart = settingsByChat.get(chat.id);
      const settings = normalizeSettings(myPart?.settings);
      const lastMessage = lastMessageMap.get(chat.id);

      let chatName = chat.name;
      let chatAvatar = chat.avatar;
      let otherUserId: number | undefined;
      if (chat.type === "individual") {
        const other = participants.find((p) => p.userId !== userId);
        if (other) {
          chatName = other.name;
          chatAvatar = other.avatar;
          otherUserId = other.userId;
        }
      }

      return {
        id: chat.id,
        type: chat.type,
        name: chatName,
        description: chat.description,
        avatar: chatAvatar || "",
        participants: participants.map((p) => p.userId),
        participantsDetail: participants.map((p) => ({
          userId: p.userId,
          user: { id: p.userId, name: p.name, avatar: p.avatar || "" },
          isAdmin: p.isAdmin,
        })),
        settings: { ...DEFAULT_SETTINGS, ...settings },
        createdAt: chat.createdAt,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.deleted ? "" : lastMessage.content,
              timestamp: lastMessage.timestamp,
              senderId: lastMessage.sender_id,
              type: lastMessage.type,
              fileUrl: lastMessage.file_url || undefined,
              fileName: lastMessage.file_name || undefined,
              fileSize: lastMessage.file_size || undefined,
              deleted: lastMessage.deleted,
            }
          : undefined,
        unreadCount: unreadMap.get(chat.id) ?? 0,
        // Per-viewer flags win; the legacy chat-level columns are kept for
        // older consumers but should never override participant settings.
        isPinned: settings.isPinned,
        isMuted: settings.isMuted,
        isArchived: chat.isArchived === true,
        isGroupAdmin: settings.isAdmin,
        online: false,
        lastMessageTime: lastMessage ? toUtcDate(lastMessage.timestamp).toISOString() : undefined,
        preview: lastMessage ? previewFor(lastMessage) : "Start a conversation",
        otherUserId,
        lastRead: myPart?.lastRead ? myPart.lastRead.toISOString() : undefined,
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("API Error fetching chats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch chats",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/** Participants + user info for many chats in one query. */
async function listParticipantsForMany(chatIds: string[]) {
  if (chatIds.length === 0) return [];
  return db
    .select({
      chatId: chatParticipants.chatId,
      userId: chatParticipants.userId,
      settings: chatParticipants.settings,
      name: users.name,
      avatar: users.avatar,
    })
    .from(chatParticipants)
    .innerJoin(users, eq(users.id, chatParticipants.userId))
    .where(inArray(chatParticipants.chatId, chatIds));
}

/**
 * POST /api/chat — create a group or individual chat.
 * Body: { type, name, participants: number[], avatar?, description?, message? }
 * Kept for the existing lib/api-chat + ChatContext consumers.
 * The creator is marked isAdmin inside chat_participants.settings.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const body = await req.json();
    const { type, name, participants, message, description } = body;

    if (!type || !name || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (type !== "group" && type !== "individual") {
      return NextResponse.json({ error: "type must be 'group' or 'individual'" }, { status: 400 });
    }
    const otherIds = [...new Set<number>(participants.map(Number))].filter(
      (id) => Number.isInteger(id) && id > 0 && id !== userId,
    );

    const [newChat] = await db
      .insert(chats)
      .values({
        type,
        name: String(name),
        description: description ? String(description) : null,
        avatar: body.avatar ? String(body.avatar) : null,
      })
      .returning();

    // Composite primary key — never pass an `id` here.
    await db.insert(chatParticipants).values([
      {
        chatId: newChat.id,
        userId,
        joinedAt: new Date(),
        settings: { ...DEFAULT_SETTINGS, isAdmin: type === "group" },
      },
      ...otherIds.map((participantId) => ({
        chatId: newChat.id,
        userId: participantId,
        joinedAt: new Date(),
        settings: { ...DEFAULT_SETTINGS },
      })),
    ]);

    if (message) {
      await db.insert(messages).values({
        content: String(message),
        type: "text",
        chatId: newChat.id,
        senderId: userId,
        timestamp: new Date(),
      });
    }

    return NextResponse.json({
      id: newChat.id,
      type: newChat.type,
      name: newChat.name,
      description: newChat.description,
      avatar: newChat.avatar || "",
      participants: [userId, ...otherIds],
      createdAt: newChat.createdAt,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isArchived: false,
      isGroupAdmin: type === "group",
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
