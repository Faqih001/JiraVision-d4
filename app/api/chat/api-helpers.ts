// Shared helpers for the /api/chat/** routes.
// Not a route file — Next only treats route.ts entries as endpoints.

import { db } from "@/lib/db";
import { chatParticipants, chats, messages, users } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

/* ---------------------------------------------------------------- settings */

export interface ParticipantSettings {
  isMuted: boolean;
  isPinned: boolean;
  isBlocked: boolean;
  isAdmin: boolean;
  notificationLevel: "all" | "mentions" | "none";
  theme: string;
}

export const DEFAULT_SETTINGS: ParticipantSettings = {
  isMuted: false,
  isPinned: false,
  isBlocked: false,
  isAdmin: false,
  notificationLevel: "all",
  theme: "default",
};

/** Chat participants used to fake per-user flags with columns that never
 *  existed; everything now lives in one settings jsonb blob per participant. */
export function normalizeSettings(raw: unknown): ParticipantSettings {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const level = obj.notificationLevel;
  return {
    isMuted: obj.isMuted === true,
    isPinned: obj.isPinned === true,
    isBlocked: obj.isBlocked === true,
    isAdmin: obj.isAdmin === true,
    notificationLevel:
      level === "mentions" || level === "none" ? level : "all",
    theme: typeof obj.theme === "string" ? obj.theme : "default",
  };
}

/* ------------------------------------------------------------- participants */

export interface ParticipantRow {
  chatId: string;
  userId: number;
  joinedAt: Date | null;
  lastRead: Date | null;
  settings: unknown;
  name: string;
  avatar: string | null;
}

/** All participants of a chat joined with their user rows (explicit select —
 *  the relational config in this repo has no chatParticipants.users relation). */
export async function listParticipants(chatId: string): Promise<ParticipantRow[]> {
  return db
    .select({
      chatId: chatParticipants.chatId,
      userId: chatParticipants.userId,
      joinedAt: chatParticipants.joinedAt,
      lastRead: chatParticipants.lastRead,
      settings: chatParticipants.settings,
      name: users.name,
      avatar: users.avatar,
    })
    .from(chatParticipants)
    .innerJoin(users, eq(users.id, chatParticipants.userId))
    .where(eq(chatParticipants.chatId, chatId))
    .orderBy(sql`${chatParticipants.joinedAt} asc`)
    .execute() as unknown as ParticipantRow[];
}

export async function getParticipantRow(
  chatId: string,
  userId: number,
): Promise<{ userId: number; chatId: string; lastRead: Date | null; settings: unknown } | undefined> {
  const [row] = await db
    .select({
      userId: chatParticipants.userId,
      chatId: chatParticipants.chatId,
      lastRead: chatParticipants.lastRead,
      settings: chatParticipants.settings,
    })
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId),
      ),
    )
    .limit(1);
  return row;
}

/* ------------------------------------------------------------------ react */

export type ReactionMap = Record<string, number[]>;

export function normalizeReactions(raw: unknown): ReactionMap {
  const out: ReactionMap = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [emoji, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(val)) continue;
    const ids = val.filter((v): v is number => typeof v === "number");
    if (ids.length > 0) out[emoji] = ids;
  }
  return out;
}

/* -------------------------------------------------------------- messages */

export interface MessageDto {
  id: string;
  content: string;
  type: string;
  timestamp: Date | string | null;
  senderId: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  deleted: boolean | null;
  editedAt?: string | null;
  replyToId?: string | null;
  sender: { id: number; name: string; avatar: string };
  replyTo?: { id: string; content: string; senderId: number; type: string } | null;
  reactions: ReactionMap;
}

interface MessageRowExtras {
  senderName: string | null;
  senderAvatar: string | null;
  replyContent: string | null;
  replySenderId: number | null;
  replyType: string | null;
}

/** Explicit join instead of the broken `with: { sender, reactions }` config —
 *  messages has no relational sender/reactions fields in this schema. */
export async function fetchMessagesForChat(chatId: string): Promise<MessageDto[]> {
  const rows = await db
    .select({
      m: messages,
      senderName: users.name,
      senderAvatar: users.avatar,
      replyContent: sql<string | null>`(select rm.content from messages rm where rm.id = ${messages.replyToId})`,
      replySenderId: sql<number | null>`(select rm.sender_id from messages rm where rm.id = ${messages.replyToId})`,
      replyType: sql<string | null>`(select rm.type from messages rm where rm.id = ${messages.replyToId})`,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.chatId, chatId))
    .orderBy(sql`${messages.timestamp} asc`)
    .execute();

  return rows.map((row) => {
    const base = row.m;
    const extras = row as unknown as MessageRowExtras;
    return {
      id: base.id,
      // Never leak the pre-delete content; the restore route reads it server-side.
      content: base.deleted ? "" : base.content,
      type: base.type,
      timestamp: base.timestamp,
      senderId: base.senderId,
      fileUrl: base.fileUrl ?? undefined,
      fileName: base.fileName ?? undefined,
      fileSize: base.fileSize ?? undefined,
      deleted: base.deleted,
      editedAt: base.editedAt ? base.editedAt.toISOString() : null,
      replyToId: base.replyToId,
      sender: {
        id: base.senderId,
        name: extras.senderName ?? "Unknown",
        avatar: extras.senderAvatar ?? "",
      },
      replyTo: base.replyToId
        ? {
            id: base.replyToId,
            content: extras.replyContent ?? "",
            senderId: extras.replySenderId ?? 0,
            type: extras.replyType ?? "text",
          }
        : undefined,
      reactions: normalizeReactions(base.reactions),
    };
  });
}

/* ------------------------------------------------------------- mentions */

/**
 * Extract @-mentions from a message body against the chat roster.
 * Matches "@First Last", "@First" and "@firstname" (case-insensitive) tokens.
 * Returns the mentioned user ids (never the author), once per user.
 */
export function parseMentions(
  content: string,
  roster: { userId: number; name: string }[],
  authorId: number,
): number[] {
  const hits = new Set<number>();
  for (const person of roster) {
    if (person.userId === authorId) continue;
    const parts = person.name.trim().split(/\s+/).filter(Boolean);
    const candidates = [parts.join(" "), parts[0]].filter(Boolean);
    for (const cand of candidates) {
      const escaped = cand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`@${escaped}(?![\\p{L}\\d])`, "iu");
      if (re.test(content)) {
        hits.add(person.userId);
        break;
      }
    }
  }
  return [...hits];
}

/** Fire a "mention" notification for each @-mentioned participant (not the
 *  author, not blocked DM partners, respecting notificationLevel). */
export async function notifyMentions(params: {
  chatId: string;
  chatName: string;
  messageId: string;
  content: string;
  authorId: number;
  authorName: string;
  roster: { userId: number; name: string; settings: unknown }[];
}) {
  const { chatId, chatName, messageId, content, authorId, authorName, roster } = params;
  const byId = new Map(roster.map((p) => [p.userId, p]));
  const mentionedIds = parseMentions(
    content,
    roster.map((p) => ({ userId: p.userId, name: p.name })),
    authorId,
  );
  for (const userId of mentionedIds) {
    const settings = normalizeSettings(byId.get(userId)?.settings);
    if (settings.notificationLevel === "none") continue;
    // Muting is a promise to stay quiet, so it suppresses the bell too. The
    // unread badge still counts on the chat row — mute hides noise, not messages.
    if (settings.isMuted) continue;
    if (settings.isBlocked) continue;
    try {
      await createNotification({
        userId,
        type: "mention",
        title: `${authorName} mentioned you in ${chatName}`,
        body: content.slice(0, 140),
        link: "/dashboard/chat",
        metadata: { chatId, messageId },
      });
    } catch (err) {
      // Notification fan-out must never break message delivery.
      console.error("Failed to create mention notification:", err);
    }
  }
}

/* ------------------------------------------------------------- chat dto */

export interface ChatListItemDto {
  id: string;
  type: string;
  name: string;
  description: string | null;
  avatar: string;
  participants: number[];
  participantsDetail: {
    userId: number;
    user: { id: number; name: string; avatar: string };
    isAdmin: boolean;
  }[];
  settings: ParticipantSettings;
  createdAt: Date | null;
  lastMessage?: Record<string, unknown>;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  isGroupAdmin: boolean;
  online: boolean;
  lastMessageTime?: string;
  preview: string;
  otherUserId?: number;
  lastRead?: string;
}

export function previewFor(msg: {
  deleted: boolean | null;
  type: string;
  content: string;
}): string {
  if (msg.deleted) return "This message was deleted";
  switch (msg.type) {
    case "image":
      return "📷 Photo";
    case "video":
      return "📹 Video";
    case "document":
      return "📄 Document";
    case "audio":
      return "🎵 Audio";
    case "voice":
      return "🎤 Voice message";
    default:
      return msg.content;
  }
}

export async function getChatRow(chatId: string) {
  const [row] = await db
    .select({
      id: chats.id,
      type: chats.type,
      name: chats.name,
      description: chats.description,
      avatar: chats.avatar,
      isPinned: chats.isPinned,
      isMuted: chats.isMuted,
      isArchived: chats.isArchived,
      isGroupAdmin: chats.isGroupAdmin,
      createdAt: chats.createdAt,
    })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);
  return row;
}
