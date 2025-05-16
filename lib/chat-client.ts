import { Socket } from 'socket.io-client';
import * as socketClient from './socket-client';
import * as chatApi from './api-chat';
import { Message, Chat, MessageType, ReplyInfo } from '@/types/chat';

export class ChatClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private messageQueue: { 
    data: any; 
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void; 
  }[] = [];
  
  async connect() {
    try {
      this.socket = socketClient.initSocket();
      
      this.socket?.on('connect', () => {
        this.isConnected = true;
        this.processMessageQueue();
      });

      this.socket?.on('disconnect', () => {
        this.isConnected = false;
      });

      this.socket?.on('error', (error) => {
        console.error('Socket error:', error);
      });

      return true;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }

  disconnect() {
    socketClient.closeSocket();
    this.socket = null;
    this.isConnected = false;
  }

  async authenticate(userId: number, token: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.socket?.emit('auth', { userId, token });
      
      this.socket?.once('auth_success', () => {
        resolve(true);
      });
      
      this.socket?.once('auth_error', () => {
        resolve(false);
      });
    });
  }

  async sendMessage(data: {
    chatId: string;
    content: string;
    type: string;
    replyToId?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.socket) {
        // Queue message if not connected
        this.messageQueue.push({ data, resolve, reject });
        return;
      }
      
      this.socket.emit('message', data);
      resolve(true);
    });
  }

  private async processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const item = this.messageQueue.shift();
      if (item) {
        try {
          if (this.isConnected && this.socket) {
            this.socket.emit('message', item.data);
            item.resolve(true);
          } else {
            // Fall back to HTTP API
            await chatApi.sendMessage(item.data);
            item.resolve(true);
          }
        } catch (error) {
          item.reject(error);
        }
      }
    }
  }
}
