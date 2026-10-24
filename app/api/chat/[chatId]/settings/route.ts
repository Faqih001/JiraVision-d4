import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, chatParticipants } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import {
  DEFAULT_SETTINGS,
  getChatRow,
  getParticipantRow,
  listParticipants,
  normalizeSettings,
} from "@/app/api/chat/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/[chatId]/settings — chat meta + the caller's per-participant
 * settings. The old route read isMuted/isBlocked/isAdmin/notificationLevel/
 * theme straight off chat_participants rows; those columns never existed and
 * now live inside the settings jsonb blob.
 */
export async function GET(
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

    const [chat, roster] = await Promise.all([
      getChatRow(chatId),
      listParticipants(chatId),
    ]);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...chat,
      participants: roster.map((p) => ({
        userId: p.userId,
        name: p.name,
        avatar: p.avatar,
        isAdmin: normalizeSettings(p.settings).isAdmin,
        joinedAt: p.joinedAt,
        lastRead: p.lastRead,
      })),
      isMuted: normalizeSettings(participant.settings).isMuted,
      isAdmin: normalizeSettings(participant.settings).isAdmin,
      isBlocked: normalizeSettings(participant.settings).isBlocked,
      isPinned: normalizeSettings(participant.settings).isPinned,
      notificationLevel: normalizeSettings(participant.settings).notificationLevel,
      theme: normalizeSettings(participant.settings).theme,
      lastRead: participant.lastRead,
    });
  } catch (error) {
    console.error("Error fetching chat settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat settings" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/chat/[chatId]/settings
 * User-specific toggles (isMuted / isPinned / isBlocked / notificationLevel /
 * theme) merge into chat_participants.settings. Chat-wide fields (name /
 * avatar / description) require participant settings.isAdmin.
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

    const body = await req.json();
    const participant = await getParticipantRow(chatId, userId);
    if (!participant) {
      return NextResponse.json(
        { error: "Chat not found or you don't have access" },
        { status: 404 },
      );
    }

    const current = normalizeSettings(participant.settings);
    const {
      isMuted,
      isPinned,
      isBlocked,
      notificationLevel,
      theme,
      isAdmin,
      // Chat-wide fields — admin only.
      name,
      avatar,
      description,
    } = body;

    const wantsUserSettings =
      isMuted !== undefined ||
      isPinned !== undefined ||
      isBlocked !== undefined ||
      notificationLevel !== undefined ||
      theme !== undefined ||
      isAdmin !== undefined;

    const wantsChatSettings =
      name !== undefined || avatar !== undefined || description !== undefined;

    if (wantsChatSettings && !current.isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to update chat settings" },
        { status: 403 },
      );
    }

    if (wantsUserSettings) {
      const next = {
        ...current,
        ...(isMuted !== undefined ? { isMuted: Boolean(isMuted) } : {}),
        ...(isPinned !== undefined ? { isPinned: Boolean(isPinned) } : {}),
        ...(isBlocked !== undefined ? { isBlocked: Boolean(isBlocked) } : {}),
        ...(isAdmin !== undefined && current.isAdmin
          ? { isAdmin: Boolean(isAdmin) }
          : {}),
        ...(notificationLevel !== undefined
          ? {
              notificationLevel:
                notificationLevel === "mentions" || notificationLevel === "none"
                  ? notificationLevel
                  : DEFAULT_SETTINGS.notificationLevel,
            }
          : {}),
        ...(theme !== undefined ? { theme: String(theme) } : {}),
      };
      await db
        .update(chatParticipants)
        .set({ settings: next })
        .where(
          and(
            eq(chatParticipants.chatId, chatId),
            eq(chatParticipants.userId, userId),
          ),
        );
    }

    if (wantsChatSettings) {
      await db
        .update(chats)
        .set({
          ...(name !== undefined ? { name: String(name) } : {}),
          ...(avatar !== undefined ? { avatar: String(avatar) } : {}),
          ...(description !== undefined
            ? { description: description === null ? null : String(description) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(chats.id, chatId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating chat settings:", error);
    return NextResponse.json(
      { error: "Failed to update chat settings" },
      { status: 500 },
    );
  }
}
