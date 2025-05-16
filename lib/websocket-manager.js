const { Server: SocketServer } = require('socket.io');
const { db } = require('./db.js');
const { messages, chats, chatParticipants, users } = require('../drizzle/schema.js');
const { eq, and } = require('drizzle-orm');
const { randomUUID } = require('crypto');

class WebSocketManager {
  constructor(server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.connectedUsers = new Map(); // userId -> socketIds[]
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('authenticate', async (userId) => {
        if (!userId) return;
        
        // Store socket id for this user
        const userSockets = this.connectedUsers.get(userId) || [];
        this.connectedUsers.set(userId, [...userSockets, socket.id]);
        
        socket.userId = userId;
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (socket.userId) {
          const userSockets = this.connectedUsers.get(socket.userId) || [];
          this.connectedUsers.set(
            socket.userId,
            userSockets.filter(id => id !== socket.id)
          );
        }
      });

      // Handle messages
      socket.on('message', async (data) => {
        try {
          const { chatId, content } = data;
          const userId = socket.userId;

          if (!userId || !chatId || !content) {
            console.error('Missing required message data');
            return;
          }

          // Insert message into database
          const [newMessage] = await db.insert(messages).values({
            id: randomUUID(),
            content,
            chatId,
            userId,
            createdAt: new Date()
          }).returning();

          // Get chat participants
          const participants = await db.select()
            .from(chatParticipants)
            .where(eq(chatParticipants.chatId, chatId));

          // Emit message to all participants
          participants.forEach(participant => {
            const recipientSockets = this.connectedUsers.get(participant.userId);
            if (recipientSockets) {
              recipientSockets.forEach(socketId => {
                this.io.to(socketId).emit('message', newMessage);
              });
            }
          });

        } catch (error) {
          console.error('Error handling message:', error);
        }
      });
    });
  }
}

function setupWebSocketServer(server) {
  return new WebSocketManager(server);
}

module.exports = { setupWebSocketServer };
