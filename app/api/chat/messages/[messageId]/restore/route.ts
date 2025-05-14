import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

// POST - Restore a soft-deleted message
export async function POST(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { messageId } = params;
    
    // In a real app, you would get the userId from the session
    const userId = 1; // Hardcoded for demo purposes
    
    // Find the message
    const message = await db.query.messages.findFirst({
      where: (messages, { eq }) => eq(messages.id, messageId),
    });
    
    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }
    
    // Check if the user is the sender
    if (message.senderId !== userId) {
      return NextResponse.json(
        { error: "You can only restore your own messages" },
        { status: 403 }
      );
    }
    
    // Check if the message is actually deleted
    if (!message.deleted) {
      return NextResponse.json(
        { error: "Message is not deleted" },
        { status: 400 }
      );
    }
    
    // Restore the message
    const [restoredMessage] = await db.update(messages)
      .set({
        deleted: false,
        content: message.originalContent || message.content, // Use original content if available
      })
      .where(eq(messages.id, messageId))
      .returning();
    
    return NextResponse.json(restoredMessage);
  } catch (error) {
    console.error("Error restoring message:", error);
    return NextResponse.json(
      { error: "Failed to restore message" },
      { status: 500 }
    );
  }
} 