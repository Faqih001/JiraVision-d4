import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { db } from '@/lib/db';
import { messages, chats, chatParticipants, users } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export class WebSocketManager {
  private io: SocketServer | null = null;
  private connectedUsers = new Map<number, string[]>(); // userId -> socketIds[]

  constructor(server: HTTPServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io?.on('connection', (socket) => {
      let currentUserId: number | null = null;

      // Handle authentication
      socket.on('auth', async (data: { userId: number, token: string }) => {
        try {
          const { userId } = data;
          currentUserId = userId;

          // Track user's socket connection
          if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, []);
          }
          this.connectedUsers.get(userId)?.push(socket.id);

          // Get user's chats
          const userChats = await db.query.chatParticipants.findMany({
            where: eq(chatParticipants.userId, userId),
            columns: {
              chatId: true
            }
          });

          // Join chat rooms
          userChats.forEach(({ chatId }) => {
            socket.join(`chat:${chatId}`);
          });

          // Notify others that user is online
          this.io?.emit('user_status', { 
            userId, 
            status: 'online' 
          });

          socket.emit('auth_success', {
            userId,
            chats: userChats.map(c => c.chatId)
          });

        } catch (error) {
          console.error('Auth error:', error);
          socket.emit('auth_error', { 
            error: 'Authentication failed' 
          });
        }
      });

      // Handle new messages
      socket.on('message', async (data: {
        chatId: string;
        content: string;
        type: string;
        replyToId?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
      }) => {
        try {
          if (!currentUserId) {
            socket.emit('error', { error: 'Not authenticated' });
            return;
          }

          const { chatId, content, type, replyToId, fileUrl, fileName, fileSize } = data;

          // Verify chat membership
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

          // Create message
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
              timestamp: new Date()
            })
            .returning();

          // Get sender info
          const sender = await db.query.users.findFirst({
            where: eq(users.id, currentUserId),
            columns: {
              id: true,
              name: true,
              avatar: true
            }
          });

          // Broadcast message
          const messageData = {
            id: messageId,
            chatId,
            content,
            type,
            timestamp: newMessage.timestamp,
            senderId: currentUserId,
            senderName: sender?.name || 'Unknown',
            senderAvatar: sender?.avatar,
            fileUrl,
            fileName,
            fileSize,
            replyToId,
            status: 'sent',
            deleted: false
          };

          this.io?.to(`chat:${chatId}`).emit('message', messageData);

        } catch (error) {
          console.error('Message error:', error);
          socket.emit('error', { error: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { chatId: string }) => {
        if (!currentUserId) return;
        socket.to(`chat:${data.chatId}`).emit('typing_start', {
          chatId: data.chatId,
          userId: currentUserId
        });
      });

      socket.on('typing_stop', (data: { chatId: string }) => {
        if (!currentUserId) return;
        socket.to(`chat:${data.chatId}`).emit('typing_stop', {
          chatId: data.chatId,
          userId: currentUserId
        });
      });

      // Handle read receipts
      socket.on('mark_read', async (data: { chatId: string }) => {
        if (!currentUserId) return;
        
        try {
          // Update last read timestamp
          await db.update(chatParticipants)
            .set({ lastRead: new Date() })
            .where(and(
              eq(chatParticipants.chatId, data.chatId),
              eq(chatParticipants.userId, currentUserId)
            ));

          // Notify others
          socket.to(`chat:${data.chatId}`).emit('message_read', {
            chatId: data.chatId,
            userId: currentUserId,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Mark read error:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        if (!currentUserId) return;

        // Remove socket from tracking
        const userSockets = this.connectedUsers.get(currentUserId) || [];
        const remainingSockets = userSockets.filter(id => id !== socket.id);
        
        if (remainingSockets.length === 0) {
          // User has no more active connections
          this.connectedUsers.delete(currentUserId);
          
          // Update user status
          this.io?.emit('user_status', {
            userId: currentUserId,
            status: 'offline'
          });

          try {
            await db.update(users)
              .set({ status: 'offline' })
              .where(eq(users.id, currentUserId));
          } catch (error) {
            console.error('Error updating user status:', error);
          }
        } else {
          this.connectedUsers.set(currentUserId, remainingSockets);
        }
      });
    });
  }

  // Method to broadcast events from outside
  broadcastEvent(event: string, data: any, room?: string) {
    if (room) {
      this.io?.to(room).emit(event, data);
    } else {
      this.io?.emit(event, data);
    }
  }
}

let wsManager: WebSocketManager | null = null;

export function setupWebSocketServer(server: HTTPServer) {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
  }
  return wsManager;
}

export function getWSManager() {
  return wsManager;
}
