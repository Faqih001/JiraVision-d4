import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, chatParticipants, users, reactions } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth-actions";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const chatId = searchParams.get("chatId");
    
    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
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
    console.log(`Fetching messages for chat ${chatId} by user ${userId} (${session.name})`);
    
    // Check if the user is a participant in the chat
    const isParticipant = await db.query.chatParticipants.findFirst({
      where: (cp, { and, eq }) => and(
        eq(cp.chatId, chatId),
        eq(cp.userId, userId)
      )
    });
    
    if (!isParticipant) {
      return NextResponse.json(
        { error: "You are not a participant in this chat" },
        { status: 403 }
      );
    }
    
    // Fetch messages for the specified chat
    const messageResults = await db.query.messages.findMany({
      where: (messages, { eq }) => eq(messages.chatId, chatId),
      with: {
        sender: {
          columns: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        // We need to explicitly include reactions
        reactions: {
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
      orderBy: (messages, { asc }) => [asc(messages.timestamp)],
    });
    
    console.log(`Found ${messageResults.length} messages for chat ${chatId}`);
    
    // For reply messages, we need to fetch them separately since we can't do a circular relationship
    // in the query above
    const messageIds = messageResults.map(msg => msg.id);
    const replyDetails = await db.query.messages.findMany({
      where: (messages, { inArray }) => inArray(messages.id, messageIds),
      columns: {
        id: true,
        content: true,
        senderId: true,
        type: true,
      },
    });

    // Create a map for quick lookup
    const replyMap = new Map();
    replyDetails.forEach(reply => {
      replyMap.set(reply.id, reply);
    });
    
    // Mark all messages as read for the current user
    await db.update(chatParticipants)
      .set({ lastRead: new Date() })
      .where(
        and(
          eq(chatParticipants.chatId, chatId),
          eq(chatParticipants.userId, userId)
        )
      );
    
    console.log(`Marked chat ${chatId} as read for user ${userId}`);
    
    // Transform the data to match the Message type used in the frontend
    const transformedMessages = messageResults.map(message => {
      const replyTo = message.replyToId ? replyMap.get(message.replyToId) : null;
      
      return {
        id: message.id,
        content: message.content,
        type: message.type,
        timestamp: message.timestamp,
        senderId: message.senderId,
        fileUrl: message.fileUrl || undefined,
        fileName: message.fileName || undefined,
        fileSize: message.fileSize || undefined,
        deleted: message.deleted,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          avatar: message.sender.avatar || "",
        },
        replyTo: replyTo ? {
          id: replyTo.id,
          content: replyTo.content,
          senderId: replyTo.senderId,
          type: replyTo.type,
        } : undefined,
        reactions: message.reactions.map(reaction => ({
          id: reaction.id,
          emoji: reaction.emoji,
          userId: reaction.userId,
          user: {
            id: reaction.user.id,
            name: reaction.user.name,
            avatar: reaction.user.avatar || "",
          },
        })),
      };
    });

    return NextResponse.json(transformedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, content, type, replyToId, fileUrl, fileName, fileSize } = body;
    
    // Validate required fields
    if (!chatId || !content || !type) {
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
    console.log(`Sending message to chat ${chatId} by user ${userId} (${session.name})`);
    
    // Verify that the user is a participant in the chat
    const participant = await db.query.chatParticipants.findFirst({
      where: (chatParticipants, { eq, and }) => and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId)
      ),
    });
    
    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this chat" },
        { status: 403 }
      );
    }
    
    // Create a new message
    const messageId = randomUUID();
    const [newMessage] = await db.insert(messages)
      .values({
        id: messageId,
        content,
        type,
        chatId,
        senderId: userId,
        replyToId: replyToId || null,
        fileUrl,
        fileName,
        fileSize,
        timestamp: new Date(),
      })
      .returning();
    
    console.log(`Created message ${messageId} in chat ${chatId}`);
    
    // Get sender info
    const sender = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        avatar: true,
      },
    });
    
    // Get reply info if applicable
    let replyTo = null;
    if (replyToId) {
      replyTo = await db.query.messages.findFirst({
        where: (messages, { eq }) => eq(messages.id, replyToId),
        columns: {
          id: true,
          content: true,
          senderId: true,
          type: true,
        },
      });
    }
    
    // Return the transformed message
    return NextResponse.json({
      id: newMessage.id,
      content: newMessage.content,
      type: newMessage.type,
      timestamp: newMessage.timestamp,
      senderId: newMessage.senderId,
      fileUrl: newMessage.fileUrl || undefined,
      fileName: newMessage.fileName || undefined,
      fileSize: newMessage.fileSize || undefined,
      deleted: newMessage.deleted,
      sender: sender ? {
        id: sender.id,
        name: sender.name,
        avatar: sender.avatar || "",
      } : undefined,
      replyTo: replyTo ? {
        id: replyTo.id,
        content: replyTo.content,
        senderId: replyTo.senderId,
        type: replyTo.type,
      } : undefined,
      reactions: [],
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
} 