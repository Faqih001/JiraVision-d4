import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, chatParticipants } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

// GET - Fetch chat settings
export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params;
    
    // In a real app, you would get the userId from the session
    const userId = 1; // Hardcoded for demo purposes
    
    // Check if user is in the chat
    const participant = await db.query.chatParticipants.findFirst({
      where: and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId)
      ),
    });
    
    if (!participant) {
      return NextResponse.json(
        { error: "Chat not found or you don't have access" },
        { status: 404 }
      );
    }
    
    // Get chat settings
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: {
        participants: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    
    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }
    
    // Get user-specific settings
    const chatSettings = {
      ...chat,
      isMuted: participant.isMuted || false,
      isBlocked: participant.isBlocked || false,
      isAdmin: participant.isAdmin || false,
      notificationLevel: participant.notificationLevel || 'all', // 'all', 'mentions', 'none'
      theme: participant.theme || 'default',
    };
    
    return NextResponse.json(chatSettings);
  } catch (error) {
    console.error("Error fetching chat settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat settings" },
      { status: 500 }
    );
  }
}

// PATCH - Update chat settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params;
    const body = await req.json();
    
    // In a real app, you would get the userId from the session
    const userId = 1; // Hardcoded for demo purposes
    
    // Check if user is in the chat
    const participant = await db.query.chatParticipants.findFirst({
      where: and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId)
      ),
    });
    
    if (!participant) {
      return NextResponse.json(
        { error: "Chat not found or you don't have access" },
        { status: 404 }
      );
    }
    
    // Extract user-specific settings
    const {
      isMuted,
      isBlocked,
      notificationLevel,
      theme,
      // Chat-wide settings that should only be updated by admins
      name,
      avatar,
      description,
    } = body;
    
    // Update user-specific settings
    if (isMuted !== undefined || isBlocked !== undefined || 
        notificationLevel !== undefined || theme !== undefined) {
      await db.update(chatParticipants)
        .set({
          isMuted: isMuted !== undefined ? isMuted : participant.isMuted,
          isBlocked: isBlocked !== undefined ? isBlocked : participant.isBlocked,
          notificationLevel: notificationLevel || participant.notificationLevel,
          theme: theme || participant.theme,
        })
        .where(
          and(
            eq(chatParticipants.chatId, chatId),
            eq(chatParticipants.userId, userId)
          )
        );
    }
    
    // Update chat-wide settings (only for admins)
    if ((name !== undefined || avatar !== undefined || description !== undefined) && 
        participant.isAdmin) {
      await db.update(chats)
        .set({
          name: name || undefined,
          avatar: avatar || undefined,
          description: description || undefined,
        })
        .where(eq(chats.id, chatId));
    } else if ((name !== undefined || avatar !== undefined || description !== undefined) && 
               !participant.isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to update chat settings" },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating chat settings:", error);
    return NextResponse.json(
      { error: "Failed to update chat settings" },
      { status: 500 }
    );
  }
} 