import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

async function getCurrentUser() {
  try {
    console.log('Fetching current user with credentials...');
    const response = await fetch('/api/user/current', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch current user:', response.status, response.statusText, errorText);
      return null;
    }
    
    const data = await response.json();
    if (!data.success || !data.user) {
      console.error('Invalid user data returned:', data);
      return null;
    }
    
    console.log('Current user fetched successfully:', data.user.id, data.user.name);
    return data.user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function initSocket(): Promise<Socket> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Socket initialization starting...');
      
      // Get current user with retry
      let user = null;
      let retryCount = 0;
      
      while (!user && retryCount < 3) {
        try {
          user = await getCurrentUser();
          if (user) {
            console.log('Socket initialization: User authenticated:', user.id, user.name);
          } else {
            console.warn(`Socket initialization: User authentication failed (attempt ${retryCount + 1})`);
            retryCount++;
            if (retryCount < 3) {
              // Wait before retrying
              await new Promise(r => setTimeout(r, 1000 * retryCount));
            }
          }
        } catch (authError) {
          console.error('Socket initialization: Authentication error:', authError);
          retryCount++;
          if (retryCount < 3) {
            // Wait before retrying
            await new Promise(r => setTimeout(r, 1000 * retryCount));
          }
        }
      }
      
      if (!user) {
        console.error('Socket initialization failed: No authenticated user found after multiple attempts');
        reject(new Error('No authenticated user found'));
        return;
      }
      
      console.log('Socket initializing with user:', user.id, user.name);

      if (socket) {
        // If socket exists but is disconnected, reconnect
        if (!socket.connected) {
          console.log('Reconnecting existing socket...');
          socket.connect();
        }
        resolve(socket);
        return;
      }

      // Create new socket connection
      let socketUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!socketUrl) {
        // Fallback to window.location as a last resort
        socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      }
      
      console.log('Creating new socket connection to:', socketUrl);
      
      socket = io(socketUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000, // Increased timeout to 20 seconds
        transports: ['websocket', 'polling'],
        withCredentials: true // This is important for cookies
      });

      // Handle connection events
      socket.on('connect', () => {
        console.log('Socket connected successfully, ID:', socket?.id);
        
        // Authenticate after connection
        socket?.emit('auth', { 
          userId: user.id, 
          userName: user.name,
          token: 'session-token' 
        });
      });

      socket.on('auth_success', (data) => {
        console.log('Socket authenticated successfully:', data);
        resolve(socket as Socket);
      });

      socket.on('auth_error', (error) => {
        console.error('Socket authentication error:', error);
        reject(error);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        reject(error);
      });
      
      // Set a timeout in case the connection takes too long
      setTimeout(() => {
        if (!socket?.connected) {
          console.error('Socket connection timeout');
          reject(new Error('Socket connection timeout'));
        }
      }, 20000); // Match the timeout setting above
    } catch (error) {
      console.error('Error initializing socket:', error);
      reject(error);
    }
  });
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Chat-specific socket events
export function sendMessage(data: {
  chatId: string;
  content: string;
  type: string;
  replyToId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected. Cannot send message.');
    return false;
  }

  socket.emit('message', data);
  return true;
}

export function startTyping(chatId: string) {
  if (!socket || !socket.connected) return;
  socket.emit('typing_start', { chatId });
}

export function stopTyping(chatId: string) {
  if (!socket || !socket.connected) return;
  socket.emit('typing_stop', { chatId });
}

export function markAsRead(chatId: string) {
  if (!socket || !socket.connected) return;
  socket.emit('mark_read', { chatId });
}

// Functions to subscribe to events
export function onNewMessage(callback: (message: any) => void) {
  if (!socket) return () => {};
  
  socket.on('message', callback);
  return () => {
    socket?.off('message', callback);
  };
}

export function onTypingStart(callback: (data: { chatId: string, userId: number }) => void) {
  if (!socket) return () => {};
  
  socket.on('typing_start', callback);
  return () => {
    socket?.off('typing_start', callback);
  };
}

export function onTypingStop(callback: (data: { chatId: string, userId: number }) => void) {
  if (!socket) return () => {};
  
  socket.on('typing_stop', callback);
  return () => {
    socket?.off('typing_stop', callback);
  };
}

export function onMessageRead(callback: (data: { chatId: string, userId: number, timestamp: Date }) => void) {
  if (!socket) return () => {};
  
  socket.on('message_read', callback);
  return () => {
    socket?.off('message_read', callback);
  };
}

export function onUserStatus(callback: (data: { userId: number, status: string }) => void) {
  if (!socket) return () => {};
  
  socket.on('user_status', callback);
  return () => {
    socket?.off('user_status', callback);
  };
}

export function onNewChat(callback: (chat: any) => void) {
  if (!socket) return () => {};
  
  socket.on('chat_new', callback);
  return () => {
    socket?.off('chat_new', callback);
  };
} 