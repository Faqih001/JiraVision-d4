import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { messageId } = params;
    const body = await req.json();
    const { content } = body;
    
    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }
    
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
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }
    
    // Update the message
    const [updatedMessage] = await db.update(messages)
      .set({
        content,
        // Add metadata to indicate the message was edited
        // In a real app, you might want to track edit history
      })
      .where(eq(messages.id, messageId))
      .returning();
    
    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    );
  }
}

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
    
    // Check if the user is the sender
    if (message.senderId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }
    
    // Soft delete - in most chat apps, messages are not physically deleted
    // but rather marked as deleted
    const [updatedMessage] = await db.update(messages)
      .set({
        content: "This message was deleted",
        deleted: true,
      })
      .where(eq(messages.id, messageId))
      .returning();
    
    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
} 