const { createServer } = require('http');
const { Server } = require('socket.io');
const { parse } = require('url');
const next = require('next');
const postgres = require('postgres');

// Load environment variables
require('dotenv').config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

// Store authenticated users
const authenticatedUsers = new Map();

// Get database connection
const getDbClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  return postgres(connectionString, { max: 1 });
};

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Create Socket.IO server
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    // Handle authentication
    socket.on('auth', async (data) => {
      try {
        const { userId, userName, token } = data;
        
        if (!userId) {
          console.error('Socket auth failed: Missing userId');
          socket.emit('auth_error', { message: 'User ID is required' });
          return;
        }
        
        console.log(`Socket ${socket.id} authenticating user: ${userId} (${userName || 'Unknown'})`);
        
        // In a real application, you would validate the token
        // For now, we'll just accept the userId
        
        // Store the authenticated user
        authenticatedUsers.set(socket.id, { 
          userId, 
          userName: userName || 'Unknown User',
          socketId: socket.id 
        });
        
        // Join a room for this user
        socket.join(`user:${userId}`);
        
        // Get user's chats
        const client = getDbClient();
        try {
          console.log(`Fetching chats for user ${userId}...`);
          const userChats = await client`
            SELECT c.id 
            FROM chats c
            JOIN chat_participants cp ON c.id = cp.chat_id
            WHERE cp.user_id = ${userId}
          `;
          
          if (userChats.length === 0) {
            console.log(`User ${userId} has no chats yet.`);
          }
          
          // Join a room for each chat
          userChats.forEach(chat => {
            console.log(`User ${userId} joining chat room: ${chat.id}`);
            socket.join(`chat:${chat.id}`);
          });
          
          console.log(`User ${userId} (${userName || 'Unknown'}) authenticated and joined ${userChats.length} chat rooms`);
          
          // Emit success
          socket.emit('auth_success', { 
            userId,
            userName: userName || 'Unknown User',
            chatsJoined: userChats.length
          });
          
          // Notify others that this user is online
          socket.broadcast.emit('user_status', { userId, status: 'online' });
          
          // Update user status in the database
          try {
            await client`
              UPDATE users
              SET status = 'online'
              WHERE id = ${userId}
            `;
            console.log(`User ${userId} status updated to 'online' in database`);
          } catch (statusError) {
            console.error('Error updating user status:', statusError);
          }
        } catch (dbError) {
          console.error('Database error during authentication:', dbError);
          socket.emit('auth_error', { message: 'Database error during authentication' });
        } finally {
          await client.end();
        }
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('auth_error', { message: 'Authentication failed: ' + error.message });
      }
    });
    
    // Handle new message
    socket.on('message', async (data) => {
      try {
        const { chatId, content, type, replyToId, fileUrl, fileName, fileSize } = data;
        
        // Get user from authenticated users
        const user = authenticatedUsers.get(socket.id);
        if (!user) {
          console.error('Message rejected: User not authenticated');
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }
        
        console.log(`User ${user.userId} (${user.userName}) sending message to chat ${chatId}`);
        
        const client = getDbClient();
        try {
          // Insert message into database
          const [message] = await client`
            INSERT INTO messages (
              chat_id, sender_id, content, type, 
              timestamp, reply_to_id, file_url, 
              file_name, file_size, is_read, deleted
            ) VALUES (
              ${chatId}, ${user.userId}, ${content}, ${type}, 
              now(), ${replyToId || null}, ${fileUrl || null}, 
              ${fileName || null}, ${fileSize || null}, false, false
            ) RETURNING id, chat_id, sender_id, content, type, timestamp
          `;
          
          // Get sender name
          const [sender] = await client`
            SELECT name, avatar FROM users WHERE id = ${user.userId}
          `;
          
          // Prepare message to send
          const messageToSend = {
            ...message,
            senderName: sender.name,
            senderAvatar: sender.avatar
          };
          
          // Emit message to chat room
          io.to(`chat:${chatId}`).emit('message', messageToSend);
          
          // Update last message in chat
          await client`
            UPDATE chats
            SET updated_at = now()
            WHERE id = ${chatId}
          `;
          
          console.log(`Message sent to chat ${chatId}`);
        } catch (dbError) {
          console.error('Database error sending message:', dbError);
          socket.emit('error', { message: 'Database error: ' + dbError.message });
        } finally {
          await client.end();
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message: ' + error.message });
      }
    });
    
    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { chatId } = data;
      const user = authenticatedUsers.get(socket.id);
      if (!user) return;
      
      socket.to(`chat:${chatId}`).emit('typing_start', { 
        chatId, 
        userId: user.userId,
        userName: user.userName
      });
    });
    
    socket.on('typing_stop', (data) => {
      const { chatId } = data;
      const user = authenticatedUsers.get(socket.id);
      if (!user) return;
      
      socket.to(`chat:${chatId}`).emit('typing_stop', { 
        chatId, 
        userId: user.userId 
      });
    });
    
    // Handle mark as read
    socket.on('mark_read', async (data) => {
      try {
        const { chatId } = data;
        const user = authenticatedUsers.get(socket.id);
        if (!user) return;
        
        console.log(`User ${user.userId} marking chat ${chatId} as read`);
        
        const client = getDbClient();
        try {
          // Update last read timestamp
          await client`
            UPDATE chat_participants
            SET last_read = now()
            WHERE chat_id = ${chatId} AND user_id = ${user.userId}
          `;
          
          // Emit read receipt
          socket.to(`chat:${chatId}`).emit('message_read', {
            chatId,
            userId: user.userId,
            userName: user.userName,
            timestamp: new Date()
          });
        } catch (dbError) {
          console.error('Database error marking as read:', dbError);
        } finally {
          await client.end();
        }
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      const user = authenticatedUsers.get(socket.id);
      if (user) {
        console.log(`User ${user.userId} (${user.userName}) disconnected`);
        
        // Notify others that this user is offline
        socket.broadcast.emit('user_status', { 
          userId: user.userId, 
          status: 'offline' 
        });
        
        // Update user status in the database
        try {
          const client = getDbClient();
          try {
            await client`
              UPDATE users
              SET status = 'offline'
              WHERE id = ${user.userId}
            `;
          } finally {
            await client.end();
          }
        } catch (dbError) {
          console.error('Error updating user status on disconnect:', dbError);
        }
        
        // Remove from authenticated users
        authenticatedUsers.delete(socket.id);
      }
      
      console.log('Socket disconnected:', socket.id);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
}); 