import { io, Socket } from 'socket.io-client';

// Add debug flag
const DEBUG = true;

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
      const maxRetries = 5;  // Increased from 3 to 5
      
      while (!user && retryCount < maxRetries) {
        try {
          user = await getCurrentUser();
          if (user) {
            console.log('Socket initialization: User authenticated:', user.id, user.name);
          } else {
            console.warn(`Socket initialization: User authentication failed (attempt ${retryCount + 1}/${maxRetries})`);
            retryCount++;
            if (retryCount < maxRetries) {
              // Wait before retrying with longer delays
              const retryDelay = Math.min(2000 * Math.pow(1.5, retryCount), 10000);
              console.log(`Waiting ${retryDelay}ms before retry...`);
              await new Promise(r => setTimeout(r, retryDelay));
            }
          }
        } catch (authError) {
          console.error('Socket initialization: Authentication error:', authError);
          retryCount++;
          if (retryCount < maxRetries) {
            // Wait before retrying with longer delays
            const retryDelay = Math.min(2000 * Math.pow(1.5, retryCount), 10000);
            console.log(`Waiting ${retryDelay}ms before retry...`);
            await new Promise(r => setTimeout(r, retryDelay));
          }
        }
      }
      
      if (!user) {
        console.error('Socket initialization failed: No authenticated user found after multiple attempts');
        reject(new Error('No authenticated user found. Please refresh the page and try again.'));
        return;
      }
      
      console.log('Socket initializing with user:', user.id, user.name);

      // If socket exists but is disconnected, close it and create a new one
      if (socket) {
        console.log('Cleaning up existing socket connection:', socket.id);
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }

      // Create new socket connection
      let socketUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!socketUrl) {
        // Fallback to window.location as a last resort
        socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      }
      
      console.log('Creating new socket connection to:', socketUrl);
      
      // Temporarily try a more direct connection to debug
      socket = io(socketUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,     // Increased from 5 to 10
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,   // Added max delay
        timeout: 30000,               // Increased timeout to 30 seconds
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        withCredentials: true,        // This is important for cookies
        auth: {                       // Add auth data directly in connection
          userId: user.id,
          userName: user.name
        },
        debug: DEBUG                  // Enable debugging
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

      // Add event to handle reconnection
      socket.on('reconnect', (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        
        // Re-authenticate after reconnection
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
        // If the server initiated the disconnect, try to reconnect manually
        if (reason === 'io server disconnect') {
          console.log('Server initiated disconnect, attempting to reconnect...');
          socket?.connect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error details:', error.message, error);
      });
      
      // Set a timeout in case the connection takes too long
      const connectionTimeout = setTimeout(() => {
        if (!socket?.connected) {
          console.error('Socket connection timeout after 30 seconds');
          reject(new Error('Socket connection timeout. Please check your network connection.'));
        }
      }, 30000); // Match the timeout setting above

      // Clear the timeout if we connect successfully
      socket.on('connect', () => {
        clearTimeout(connectionTimeout);
      });

      // Set a listener to resolve the promise when authenticated
      const authSuccessListener = (data: any) => {
        console.log('Auth success received, resolving promise');
        clearTimeout(connectionTimeout);
        resolve(socket as Socket);
      };
      
      socket.on('auth_success', authSuccessListener);
      
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