import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats, messages, chatParticipants, users } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth-actions";

export async function GET(req: NextRequest) {
  try {
    console.log("API: Fetching chats for user...");
    
    // Get the current user from the session
    const session = await getSession();
    
    console.log("API: Session check result:", {
      hasSession: !!session,
      hasId: session ? !!session.id : false,
      userId: session?.id
    });
    
    if (!session || !session.id) {
      console.error("API: Unauthorized - No valid session found");
      return NextResponse.json(
        { error: "Unauthorized", details: "No valid session found" },
        { status: 401 }
      );
    }
    
    const userId = session.id;
    console.log(`API: Fetching chats for user ${userId} (${session.name || 'Unknown'})`);
    
    // Fetch chats where the current user is a participant
    const result = await db.query.chats.findMany({
      where: (chats, { eq }) => eq(
        chats.id,
        db.select({ chatId: chatParticipants.chatId })
          .from(chatParticipants)
          .where(eq(chatParticipants.userId, userId))
      ),
      with: {
        participants: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
        messages: {
          limit: 1,
          orderBy: (messages, { desc }) => [desc(messages.timestamp)],
          with: {
            sender: {
              columns: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: (chats, { desc }) => [desc(chats.createdAt)],
    });
    
    console.log(`API: Found ${result.length} chats for user ${userId}`);
    
    // Transform the data to match the Chat type used in the frontend
    const transformedChats = result.map(chat => {
      const participants = chat.participants.map(p => p.userId);
      const lastMessage = chat.messages[0] || null;
      
      // Find the other participant(s) for individual chats to get the name/avatar
      let chatName = chat.name;
      let chatAvatar = chat.avatar;
      
      // For individual chats, use the other participant's name and avatar
      if (chat.type === 'individual') {
        const otherParticipant = chat.participants.find(p => p.userId !== userId)?.user;
        if (otherParticipant) {
          chatName = otherParticipant.name;
          chatAvatar = otherParticipant.avatar;
        }
      }
      
      return {
        id: chat.id,
        type: chat.type,
        name: chatName,
        avatar: chatAvatar || "",
        participants: participants,
        createdAt: chat.createdAt,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          timestamp: lastMessage.timestamp,
          senderId: lastMessage.senderId,
          type: lastMessage.type,
          fileUrl: lastMessage.fileUrl || undefined,
          fileName: lastMessage.fileName || undefined,
          fileSize: lastMessage.fileSize || undefined,
          deleted: lastMessage.deleted,
        } : undefined,
        unreadCount: 0, // Would need a separate query to calculate this
        isPinned: chat.isPinned,
        isMuted: chat.isMuted,
        isArchived: chat.isArchived,
        isGroupAdmin: chat.isGroupAdmin,
        online: chat.type === 'individual' ? 
          chat.participants.find(p => p.userId !== userId)?.user.status === 'online' : 
          false,
        lastMessageTime: lastMessage ? 
          lastMessage.timestamp.toISOString() : 
          undefined,
        preview: lastMessage ? 
          (lastMessage.deleted ? 'This message was deleted' : 
            lastMessage.type === 'text' ? lastMessage.content : 
            lastMessage.type === 'image' ? '📷 Photo' : 
            lastMessage.type === 'video' ? '📹 Video' : 
            lastMessage.type === 'document' ? '📄 Document' : 
            lastMessage.type === 'audio' ? '🎵 Audio' : 
            lastMessage.type === 'voice' ? '🎤 Voice message' : 
            'Message'
          ) : 
          'Start a conversation',
      };
    });

    console.log(`API: Returning ${transformedChats.length} transformed chats`);
    return NextResponse.json(transformedChats);
  } catch (error) {
    console.error("API Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name, participants, message } = body;
    
    // Validate required fields
    if (!type || !name || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Get the current user from the session
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.id;
    console.log(`Creating ${type} chat for user ${userId} (${session.name}) with ${participants.length} participants`);
    
    // Create a new chat
    const chatId = randomUUID();
    const [newChat] = await db.insert(chats)
      .values({
        id: chatId,
        type,
        name,
        avatar: body.avatar || null
      })
      .returning();
    
    // Add participants
    await Promise.all([
      // Add current user
      db.insert(chatParticipants)
        .values({
          id: randomUUID(),
          chatId,
          userId,
          joinedAt: new Date()
        }),
      
      // Add other participants
      ...participants.map((participantId: number) => 
        db.insert(chatParticipants)
          .values({
            id: randomUUID(),
            chatId,
            userId: participantId,
            joinedAt: new Date()
          })
      )
    ]);
    
    // If initial message is provided, create it
    if (message) {
      await db.insert(messages)
        .values({
          id: randomUUID(),
          content: message,
          type: 'text',
          chatId,
          senderId: userId,
          timestamp: new Date()
        });
    }
    
    console.log(`Successfully created chat with ID: ${chatId}`);
    
    return NextResponse.json({
      id: newChat.id,
      type: newChat.type,
      name: newChat.name,
      avatar: newChat.avatar || "",
      participants: [...participants, userId],
      createdAt: newChat.createdAt,
      unreadCount: 0,
      isPinned: newChat.isPinned,
      isMuted: newChat.isMuted,
      isArchived: newChat.isArchived,
      isGroupAdmin: newChat.isGroupAdmin,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
} 