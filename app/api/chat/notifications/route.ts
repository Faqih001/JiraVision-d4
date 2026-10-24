import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

// Session-scoped bulk endpoints kept for the chat/notification surfaces.
// Single-row CRUD lives under /api/notifications.

// GET - Fetch the signed-in user's notifications
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);
    const offset = Number(searchParams.get("offset") || "0");

    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, user.id),
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
