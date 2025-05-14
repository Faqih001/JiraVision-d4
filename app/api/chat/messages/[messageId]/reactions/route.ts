import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reactions, messages } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { messageId } = params;
    const body = await req.json();
    const { emoji } = body;
    
    // Validate required fields
    if (!emoji) {
      return NextResponse.json(
        { error: "Emoji is required" },
        { status: 400 }
      );
    }
    
    // In a real app, you would get the userId from the session
    const userId = 1; // Hardcoded for demo purposes
    
    // Check if message exists
    const message = await db.query.messages.findFirst({
      where: (messages, { eq }) => eq(messages.id, messageId),
    });
    
    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }
    
    // Check if user already reacted with this emoji
    const existingReaction = await db.query.reactions.findFirst({
      where: (reactions, { eq, and }) => and(
        eq(reactions.messageId, messageId),
        eq(reactions.userId, userId),
        eq(reactions.emoji, emoji)
      ),
    });
    
    if (existingReaction) {
      // Remove the reaction if it exists
      await db.delete(reactions)
        .where(
          and(
            eq(reactions.messageId, messageId),
            eq(reactions.userId, userId),
            eq(reactions.emoji, emoji)
          )
        );
      
      return NextResponse.json({ removed: true });
    } else {
      // Add the reaction
      const [newReaction] = await db.insert(reactions)
        .values({
          id: randomUUID(),
          messageId,
          userId,
          emoji,
        })
        .returning();
      
      return NextResponse.json(newReaction);
    }
  } catch (error) {
    console.error("Error handling reaction:", error);
    return NextResponse.json(
      { error: "Failed to process reaction" },
      { status: 500 }
    );
  }
} 