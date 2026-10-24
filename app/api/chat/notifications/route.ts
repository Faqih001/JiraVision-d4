import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications";

// Session-scoped bulk endpoints kept for the chat/notification surfaces.
// Single-row CRUD lives under /api/notifications.

export const dynamic = "force-dynamic";

// GET - Fetch the signed-in user's notifications
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);
    const offset = Number(searchParams.get("offset") || "0");

    // Filtering has to happen here, not in the caller: limit applies before any
    // client-side narrowing, so a chat surface asking for "mentions" would be
    // starved by the user's newest task/sprint/system rows.
    const requested = (searchParams.get("type") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const types = requested.filter((t): t is NotificationType =>
      (NOTIFICATION_TYPES as readonly string[]).includes(t),
    );

    const conditions = [eq(notifications.userId, user.id)];
    if (types.length > 0) conditions.push(inArray(notifications.type, types));

    const userNotifications = await db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json(userNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// POST - Mark notifications as read
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "notificationIds array is required" },
        { status: 400 },
      );
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, user.id), inArray(notifications.id, notificationIds)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 },
    );
  }
}

// DELETE - Delete notifications
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "notificationIds array is required" },
        { status: 400 },
      );
    }

    await db
      .delete(notifications)
      .where(and(eq(notifications.userId, user.id), inArray(notifications.id, notificationIds)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
}
