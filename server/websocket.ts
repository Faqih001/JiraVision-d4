import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { db } from '@/lib/db';
import { messages, chatParticipants } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';

export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;
  type: string;
  timestamp: Date;
  senderId: number;
  senderName: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
}

export interface ChatEvent {
  type: 'message_new' | 'message_edit' | 'message_delete' | 'chat_new' | 'typing_start' | 'typing_stop' | 'user_status' | 'chat_read';
  payload: any;
}

let io: Server | null = null;

export function setupWebSocketServer(server: HTTPServer) {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URLS?.split(',') || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Store connected users by userId
  const connectedUsers = new Map<number, string[]>(); // userId -> socketIds[]

  io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);
    let currentUserId: number | null = null;

    // Client authentication and joining
    socket.on('auth', async (data: { userId: number, token: string }) => {
      try {
        // In a real implementation, verify the token
        const { userId } = data;
        currentUserId = userId;

        // Add socket to user's connections
        if (!connectedUsers.has(userId)) {
          connectedUsers.set(userId, []);
        }
        connectedUsers.get(userId)?.push(socket.id);
        
        // Join rooms for all user's chats
        const userChats = await db.query.chatParticipants.findMany({
          where: eq(chatParticipants.userId, userId),
          columns: {
            chatId: true
          }
        });
        
        userChats.forEach(chat => {
          socket.join(`chat:${chat.chatId}`);
        });
        
        // Broadcast user's online status
        io?.emit('user_status', {
          userId,
          status: 'online'
        });
        
        console.log(`User ${userId} authenticated and joined ${userChats.length} chat rooms`);
        
        // Send confirmation to client
        socket.emit('auth_success', {
          userId,
          chats: userChats.map(c => c.chatId)
        });
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('auth_error', { error: 'Authentication failed' });
      }
    });

    // Handle new messages
    socket.on('message', async (data: {
      chatId: string,
      content: string,
      type: string,
      replyToId?: string,
      fileUrl?: string,
      fileName?: string,
      fileSize?: number
    }) => {
      try {
        if (!currentUserId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }
        
        const { chatId, content, type, replyToId, fileUrl, fileName, fileSize } = data;
        
        // Validate permissions (check if user is in the chat)
        const participant = await db.query.chatParticipants.findFirst({
          where: and(
            eq(chatParticipants.chatId, chatId),
            eq(chatParticipants.userId, currentUserId)
          )
        });
        
        if (!participant) {
          socket.emit('error', { error: 'Not a member of this chat' });
          return;
        }
        
        // Create message in database
        const messageId = randomUUID();
        const [newMessage] = await db.insert(messages)
          .values({
            id: messageId,
            content,
            type,
            chatId,
            senderId: currentUserId,
            replyToId: replyToId || null,
            fileUrl,
            fileName,
            fileSize,
            timestamp: new Date(),
          })
          .returning();
        
        // Get sender info
        const sender = await db.query.users.findFirst({
          where: eq(db.users.id, currentUserId),
          columns: {
            id: true,
            name: true,
            avatar: true,
          },
        });
        
        // Create message object
        const message = {
          id: newMessage.id,
          chatId: newMessage.chatId,
          content: newMessage.content,
          type: newMessage.type,
          timestamp: newMessage.timestamp,
          senderId: newMessage.senderId,
          senderName: sender?.name || 'Unknown User',
          senderAvatar: sender?.avatar,
          fileUrl: newMessage.fileUrl || undefined,
          fileName: newMessage.fileName || undefined,
          fileSize: newMessage.fileSize || undefined,
          replyToId: newMessage.replyToId || undefined,
          status: 'sent',
          deleted: false
        };
        
        // Broadcast to all users in the chat
        io?.to(`chat:${chatId}`).emit('message', message);
        
        console.log(`Message sent to chat ${chatId} by user ${currentUserId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { chatId: string }) => {
      if (!currentUserId) return;
      
      // Broadcast to others in the chat
      socket.to(`chat:${data.chatId}`).emit('typing_start', {
        chatId: data.chatId,
        userId: currentUserId
      });
    });
    
    socket.on('typing_stop', (data: { chatId: string }) => {
      if (!currentUserId) return;
      
      // Broadcast to others in the chat
      socket.to(`chat:${data.chatId}`).emit('typing_stop', {
        chatId: data.chatId,
        userId: currentUserId
      });
    });

    // Handle read receipts
    socket.on('mark_read', async (data: { chatId: string }) => {
      try {
        if (!currentUserId) return;
        
        const { chatId } = data;
        
        // Update last read timestamp
        await db.update(chatParticipants)
          .set({ lastRead: new Date() })
          .where(
            and(
              eq(chatParticipants.chatId, chatId),
              eq(chatParticipants.userId, currentUserId)
            )
          );
        
        // Broadcast to others in the chat
        socket.to(`chat:${chatId}`).emit('message_read', {
          chatId,
          userId: currentUserId,
          timestamp: new Date()
        });
        
        console.log(`Chat ${chatId} marked as read by user ${currentUserId}`);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      if (currentUserId) {
        // Remove socket from user's connections
        const userSockets = connectedUsers.get(currentUserId) || [];
        const updatedSockets = userSockets.filter(id => id !== socket.id);
        
        if (updatedSockets.length === 0) {
          // User is completely offline
          connectedUsers.delete(currentUserId);
          
          // Broadcast user's offline status
          io?.emit('user_status', {
            userId: currentUserId,
            status: 'offline'
          });
          
          console.log(`User ${currentUserId} is now offline`);
        } else {
          // User still has other connections
          connectedUsers.set(currentUserId, updatedSockets);
        }
      }
    });
  });

  console.log('WebSocket server initialized');
  return io;
}

export function getIO() {
  return io;
}

// Function to emit events from other parts of the application
export function emitChatEvent(event: ChatEvent) {
  if (!io) {
    console.warn('WebSocket server not initialized. Event not emitted:', event);
    return;
  }
  
  switch (event.type) {
    case 'chat_new':
      // Notify all participants of a new chat
      const { chat } = event.payload;
      chat.participants.forEach((userId: number) => {
        // Get all socket connections for this user
        const socketIds = connectedUsers.get(userId) || [];
        socketIds.forEach(socketId => {
          const socket = io?.sockets.sockets.get(socketId);
          if (socket) {
            // Make the socket join the new chat room
            socket.join(`chat:${chat.id}`);
            // Notify the user
            socket.emit('chat_new', chat);
          }
        });
      });
      break;
      
    // Add other event types as needed
    
    default:
      console.warn(`Unknown event type: ${event.type}`);
  }
} 