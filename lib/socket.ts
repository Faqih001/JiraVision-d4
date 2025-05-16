import { Socket as ClientSocket } from 'socket.io-client';
import io from 'socket.io-client';

interface AuthSuccessData {
  userId: number;
  chats: string[];
}

interface AuthErrorData {
  message?: string;
}

let socket: typeof ClientSocket | null = null;

export function getSocket(): typeof ClientSocket | null {
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

export async function initSocket(): Promise<typeof ClientSocket> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Socket initialization starting...');
      
      if (socket) {
        console.log('Cleaning up existing socket connection:', socket.id);
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }
      
      let user = null;
      let retryCount = 0;
      const maxRetries = 5;
      
      while (!user && retryCount < maxRetries) {
        try {
          user = await getCurrentUser();
          if (user) {
            console.log('Socket initialization: User authenticated:', user.id, user.name);
          } else {
            console.warn(`Socket initialization: User authentication failed (attempt ${retryCount + 1}/${maxRetries})`);
            retryCount++;
            if (retryCount < maxRetries) {
              const retryDelay = Math.min(2000 * Math.pow(1.5, retryCount), 10000);
              console.log(`Waiting ${retryDelay}ms before retry...`);
              await new Promise(r => setTimeout(r, retryDelay));
            }
          }
        } catch (authError) {
          console.error('Socket initialization: Authentication error:', authError);
          retryCount++;
          if (retryCount < maxRetries) {
            const retryDelay = Math.min(2000 * Math.pow(1.5, retryCount), 10000);
            console.log(`Waiting ${retryDelay}ms before retry...`);
            await new Promise(r => setTimeout(r, retryDelay));
          }
        }
      }
      
      if (!user) {
        const error = new Error('No authenticated user found after multiple attempts');
        console.error('Socket initialization failed:', error.message);
        reject(error);
        return;
      }

      let socketUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!socketUrl) {
        socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      }

      console.log('Creating new socket connection to:', socketUrl);
      
      socket = io(socketUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 30000,
        transports: ['polling', 'websocket'],
        auth: {
          userId: user.id,
          userName: user.name
        }
      });

      // Handle connection events
      socket.on('connect', () => {
        console.log('Socket connected successfully, ID:', socket?.id);
        socket?.emit('auth', { 
          userId: user.id, 
          userName: user.name,
          token: 'session-token' 
        });
      });

      socket.on('reconnect', (attemptNumber: number) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        socket?.emit('auth', { 
          userId: user.id, 
          userName: user.name,
          token: 'session-token' 
        });
      });

      socket.on('reconnect_error', (error: Error) => {
        console.error('Socket reconnection error:', error.message);
      });

      socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after all attempts');
        reject(new Error('Socket reconnection failed. Please refresh the page.'));
      });

      socket.on('auth_success', (data: AuthSuccessData) => {
        console.log('Socket authenticated successfully:', data);
        clearTimeout(connectionTimeout);
        if (socket) {
          resolve(socket);
        } else {
          reject(new Error('Socket was unexpectedly null after successful authentication'));
        }
      });

      socket.on('auth_error', (error: AuthErrorData) => {
        console.error('Socket authentication error:', error);
        reject(new Error(`Authentication failed: ${error.message || 'Unknown error'}`));
      });

      socket.on('disconnect', (reason: string) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          console.log('Server initiated disconnect, attempting to reconnect...');
          socket?.connect();
        }
      });

      socket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error.message);
      });

      socket.on('error', (error: Error) => {
        console.error('Socket error:', error.message);
      });
      
      const connectionTimeout = setTimeout(() => {
        if (!socket?.connected) {
          const error = new Error('Socket connection timeout. Please check your network connection.');
          console.error(error.message);
          reject(error);
          socket?.disconnect();
        }
      }, 30000);

      socket.on('connect', () => {
        clearTimeout(connectionTimeout);
      });

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