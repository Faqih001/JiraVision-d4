import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params;
    const body = await req.json();
    const { isMuted } = body;
    
    // Validate required fields
    if (isMuted === undefined) {
      return NextResponse.json(
        { error: "isMuted is required" },
        { status: 400 }
      );
    }
    
    // Update the chat
    const [updatedChat] = await db.update(chats)
      .set({ isMuted })
      .where(eq(chats.id, chatId))
      .returning();
    
    if (!updatedChat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Error updating mute status:", error);
    return NextResponse.json(
      { error: "Failed to update mute status" },
      { status: 500 }
    );
  }
} 