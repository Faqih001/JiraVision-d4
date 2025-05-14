import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

// DELETE - Permanently delete a message
export async function DELETE(
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
    
    // Check if the user is the sender or has admin rights
    // In a real app, you would check for admin rights here
    if (message.senderId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }
    
    // Permanently delete the message
    await db.delete(messages)
      .where(eq(messages.id, messageId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error permanently deleting message:", error);
    return NextResponse.json(
      { error: "Failed to permanently delete message" },
      { status: 500 }
    );
  }
} 