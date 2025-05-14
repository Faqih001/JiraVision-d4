import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function initSocket(userId: number, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (socket) {
      // If socket exists but is disconnected, reconnect
      if (!socket.connected) {
        socket.connect();
      }
      resolve(socket);
      return;
    }

    // Create new socket connection
    socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      autoConnect: true,
      reconnection: true,
      timeout: 10000,
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
      
      // Authenticate after connection
      socket?.emit('auth', { userId, token });
    });

    socket.on('auth_success', (data) => {
      console.log('Socket authenticated:', data);
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