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
    const { isArchived } = body;
    
    // Validate required fields
    if (isArchived === undefined) {
      return NextResponse.json(
        { error: "isArchived is required" },
        { status: 400 }
      );
    }
    
    // Update the chat
    const [updatedChat] = await db.update(chats)
      .set({ isArchived })
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
    console.error("Error updating archive status:", error);
    return NextResponse.json(
      { error: "Failed to update archive status" },
      { status: 500 }
    );
  }
} 