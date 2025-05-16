import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const socketUtil = {
  /**
   * Initialize socket connection
   */
  initSocket: async (): Promise<Socket | null> => {
    try {
      if (socket) {
        return socket;
      }

      // Create new socket connection
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        reconnectionDelayMax: 10000,
        withCredentials: true,
      });

      return socket;
    } catch (error) {
      console.error('Socket initialization error:', error);
      return null;
    }
  },

  /**
   * Close socket connection
   */
  closeSocket: () => {
    if (socket) {
      socket.close();
      socket = null;
    }
  },

  /**
   * Get current socket instance
   */
  getSocket: (): Socket | null => {
    return socket;
  },
};

export default socketUtil;
