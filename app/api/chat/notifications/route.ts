import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// GET - Fetch notifications
export async function GET(req: NextRequest) {
  try {
    // In a real app, you would get the userId from the session
    const userId = 1; // Hardcoded for demo purposes
    
    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "20");
    const offset = Number(searchParams.get("offset") || "0");
    
    // Fetch notifications for this user
    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset,
    });
    
    return NextResponse.json(userNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST - Mark notifications as read
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationIds } = body;
    
    // Validate required fields
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "notificationIds array is required" },
        { status: 400 }
      );
    }
    
    // In a real app, you would get the userId from the session
    const userId = 1; // Hardcoded for demo purposes
    
    // Update notifications
    await db.update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          // Check if the notification ID is in the provided array
          notifications.id.in(notificationIds)
        )
      );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}

// DELETE - Delete notifications
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationIds } = body;
    
    // Validate required fields
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "notificationIds array is required" },
        { status: 400 }
      );
    }
    
    // In a real app, you would get the userId from the session
    const userId = 1; // Hardcoded for demo purposes
    
    // Delete notifications
    await db.delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          // Check if the notification ID is in the provided array
          notifications.id.in(notificationIds)
        )
      );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
} 