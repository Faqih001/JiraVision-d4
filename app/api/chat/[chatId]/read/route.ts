import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatParticipants } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params;
    
    // In a real app, you would get the userId from the session
    const userId = 1; // Hardcoded for demo purposes
    
    // Update the lastRead timestamp
    await db.update(chatParticipants)
      .set({ lastRead: new Date() })
      .where(
        and(
          eq(chatParticipants.chatId, chatId),
          eq(chatParticipants.userId, userId)
        )
      );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking chat as read:", error);
    return NextResponse.json(
      { error: "Failed to mark chat as read" },
      { status: 500 }
    );
  }
} 