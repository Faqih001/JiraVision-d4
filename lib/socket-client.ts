import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3000', {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }

  return socket;
}

export function getSocket() {
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

// Socket event emitters
export function sendMessage(data: {
  chatId: string;
  content: string;
  type: string;
  replyToId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}) {
  if (!socket) return false;
  socket.emit('message', data);
  return true;
}

export function startTyping(chatId: string) {
  if (!socket) return;
  socket.emit('typing_start', { chatId });
}

export function stopTyping(chatId: string) {
  if (!socket) return;
  socket.emit('typing_stop', { chatId });
}

export function markAsRead(chatId: string) {
  if (!socket) return;
  socket.emit('mark_read', { chatId });
}

// Socket event listeners
export function onNewMessage(callback: (message: any) => void) {
  if (!socket) return () => {};
  socket.on('message', callback);
  return () => socket.off('message', callback);
}

export function onTypingStart(callback: (data: { chatId: string, userId: number }) => void) {
  if (!socket) return () => {};
  socket.on('typing_start', callback);
  return () => socket.off('typing_start', callback);
}

export function onTypingStop(callback: (data: { chatId: string, userId: number }) => void) {
  if (!socket) return () => {};
  socket.on('typing_stop', callback);
  return () => socket.off('typing_stop', callback);
}

export function onMessageRead(callback: (data: { chatId: string, userId: number, timestamp: Date }) => void) {
  if (!socket) return () => {};
  socket.on('message_read', callback);
  return () => socket.off('message_read', callback);
}

export function onUserStatus(callback: (data: { userId: number, status: string }) => void) {
  if (!socket) return () => {};
  socket.on('user_status', callback);
  return () => socket.off('user_status', callback);
}

export function onNewChat(callback: (chat: any) => void) {
  if (!socket) return () => {};
  socket.on('chat_new', callback);
  return () => socket.off('chat_new', callback);
}

export function authenticate(userId: number, token: string) {
  if (!socket) return;
  socket.emit('auth', { userId, token });
}
