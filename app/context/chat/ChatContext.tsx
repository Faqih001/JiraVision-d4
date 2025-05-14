'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { TeamMember } from '@/types/team'
import * as chatApi from '@/lib/api-chat'
import * as socketUtil from '@/lib/socket'
import { Socket } from 'socket.io-client'

// Message status types
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'sending' | 'failed'

// Message types
export type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'voice'

// Reaction type
export type Reaction = {
  emoji: string
  userId: number
}

// Reply to message
export type ReplyInfo = {
  messageId: string
  content: string
  sender: string
}

// Message structure
export type Message = {
  id: string
  chatId: string
  senderId: number
  senderName: string
  content: string
  timestamp: Date
  status: MessageStatus
  type: MessageType
  reactions?: Reaction[]
  replyTo?: ReplyInfo
  edited: boolean
  mediaUrl?: string
  fileName?: string
  fileSize?: number
  deleted: boolean
}

// Chat type (individual or group)
export type ChatType = 'individual' | 'group'

// Chat structure
export type Chat = {
  id: string
  name: string
  type: ChatType
  participants: number[]
  avatar?: string
  lastMessage?: Message
  unreadCount: number
  isMuted: boolean
  isArchived: boolean
  isBlocked?: boolean
  isGroupAdmin?: boolean
  description?: string
  createdAt: Date
  typing?: { userId: number; name: string }
  lastMessageTime?: string
  preview?: string
  online?: boolean
  isPinned?: boolean
}

// Context type
export type ChatContextType = {
  chats: Chat[]
  activeChat: Chat | null
  messages: Message[]
  setActiveChat: (chat: Chat | null) => void
  sendMessage: (content: string, type?: MessageType, replyTo?: ReplyInfo, mediaUrl?: string, fileName?: string, fileSize?: number) => void
  editMessage: (messageId: string, newContent: string) => void
  deleteMessage: (messageId: string) => void
  replyToMessage: (messageId: string) => void
  reactToMessage: (messageId: string, emoji: string) => void
  markAsRead: (chatId: string) => void
  searchChats: (query: string) => Chat[]
  searchMessages: (query: string) => Message[]
  startTyping: () => void
  stopTyping: () => void
  createGroup: (name: string, participants: number[], avatar?: string, description?: string) => void
  updateGroup: (chatId: string, name?: string, avatar?: string, description?: string) => void
  addParticipants: (chatId: string, userIds: number[]) => void
  removeParticipant: (chatId: string, userId: number) => void
  muteChat: (chatId: string) => void
  unmuteChat: (chatId: string) => void
  archiveChat: (chatId: string) => void
  unarchiveChat: (chatId: string) => void
  blockChat: (chatId: string) => void
  unblockChat: (chatId: string) => void
  clearChat: (chatId: string) => void
  forwardMessage: (messageId: string, chatIds: string[]) => void
  downloadChat: (chatId: string) => void
  starMessage: (messageId: string) => void
  unstarMessage: (messageId: string) => void
  loadMoreMessages: () => void
  getParticipants: (chatId: string) => TeamMember[]
  activeReply: ReplyInfo | null
  setActiveReply: (reply: ReplyInfo | null) => void
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>
}

// Create context with default values
const ChatContext = createContext<ChatContextType>({
  chats: [],
  activeChat: null,
  messages: [],
  setActiveChat: () => {},
  sendMessage: () => {},
  editMessage: () => {},
  deleteMessage: () => {},
  replyToMessage: () => {},
  reactToMessage: () => {},
  markAsRead: () => {},
  searchChats: () => [],
  searchMessages: () => [],
  startTyping: () => {},
  stopTyping: () => {},
  createGroup: () => {},
  updateGroup: () => {},
  addParticipants: () => {},
  removeParticipant: () => {},
  muteChat: () => {},
  unmuteChat: () => {},
  archiveChat: () => {},
  unarchiveChat: () => {},
  blockChat: () => {},
  unblockChat: () => {},
  clearChat: () => {},
  forwardMessage: () => {},
  downloadChat: () => {},
  starMessage: () => {},
  unstarMessage: () => {},
  loadMoreMessages: () => {},
  getParticipants: () => [],
  activeReply: null,
  setActiveReply: () => {},
  connectionStatus: 'disconnected',
  setChats: () => {}
})

// Custom hook to use the chat context
export const useChat = () => useContext(ChatContext)

// Generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Add function to fetch chats from API
const fetchChats = async (): Promise<Chat[]> => {
  try {
    const response = await fetch('/api/chat');
    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
};

// Add function to fetch messages for a chat
const fetchMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const response = await fetch(`/api/chat/messages?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

// Add function to send a message
const sendMessageToApi = async (
  chatId: string,
  content: string,
  type: MessageType,
  replyToId?: string,
  fileUrl?: string,
  fileName?: string,
  fileSize?: number
): Promise<Message | null> => {
  try {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        content,
        type,
        replyToId,
        fileUrl,
        fileName,
        fileSize,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

// Provider component
export const ChatProvider = ({ children, teamMembers }: { children: React.ReactNode, teamMembers: TeamMember[] }) => {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeReply, setActiveReply] = useState<ReplyInfo | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize the chat with API data and WebSocket connection
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setConnectionStatus('connecting')
        
        // First, fetch chats from API
        const chatData = await chatApi.fetchChats()
        setChats(chatData)
        
        // Then, establish WebSocket connection
        // In a real app, you would get the userId and token from authentication
        const userId = 1 // Hardcoded for demo purposes
        const token = 'demo-token' // Hardcoded for demo purposes
        
        const socketInstance = await socketUtil.initSocket(userId, token)
        setSocket(socketInstance)
        setConnectionStatus('connected')
        
        // Set up event listeners
        const unsubscribeNewMessage = socketUtil.onNewMessage((message) => {
          setMessages(prev => [...prev, message])
          
          // Update last message in chat
          setChats(prevChats => 
            prevChats.map(chat => 
              chat.id === message.chatId 
                ? { 
                    ...chat, 
                    lastMessage: message,
                    unreadCount: chat.id === activeChat?.id ? 0 : chat.unreadCount + 1
                  } 
                : chat
            )
          )
        })
        
        const unsubscribeTypingStart = socketUtil.onTypingStart(({ chatId, userId }) => {
          const user = teamMembers.find(m => m.id === userId)
          if (!user) return
          
          setChats(prevChats => 
            prevChats.map(chat => 
              chat.id === chatId 
                ? { ...chat, typing: { userId, name: user.name } } 
                : chat
            )
          )
        })
        
        const unsubscribeTypingStop = socketUtil.onTypingStop(({ chatId }) => {
          setChats(prevChats => 
            prevChats.map(chat => 
              chat.id === chatId 
                ? { ...chat, typing: undefined } 
                : chat
            )
          )
        })
        
        const unsubscribeUserStatus = socketUtil.onUserStatus(({ userId, status }) => {
          // Update online status for individual chats with this user
          setChats(prevChats => 
            prevChats.map(chat => {
              if (chat.type === 'individual' && chat.participants.includes(userId) && userId !== 1) {
                return { ...chat, online: status === 'online' }
              }
              return chat
            })
          )
        })
        
        const unsubscribeNewChat = socketUtil.onNewChat((chat) => {
          setChats(prev => [chat, ...prev])
        })
        
        setIsInitialized(true)
        
        // Cleanup function to remove event listeners
        return () => {
          unsubscribeNewMessage()
          unsubscribeTypingStart()
          unsubscribeTypingStop()
          unsubscribeUserStatus()
          unsubscribeNewChat()
          socketUtil.closeSocket()
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error)
        setConnectionStatus('disconnected')
      }
    }
    
    initializeChat()
  }, [teamMembers])
  
  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([])
      return
    }
    
    const loadMessages = async () => {
      try {
        const messageData = await chatApi.fetchMessages(activeChat.id)
        setMessages(messageData)
        
        // Mark chat as read
        if (activeChat.unreadCount > 0) {
          await chatApi.markChatAsRead(activeChat.id)
          socketUtil.markAsRead(activeChat.id)
          
          // Update local state
          setChats(prevChats => 
            prevChats.map(chat => 
              chat.id === activeChat.id ? { ...chat, unreadCount: 0 } : chat
            )
          )
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      }
    }
    
    loadMessages()
  }, [activeChat])
  
  // Send a message
  const sendMessage = async (
    content: string,
    type: MessageType = 'text', 
    replyTo?: ReplyInfo,
    mediaUrl?: string,
    fileName?: string,
    fileSize?: number
  ) => {
    if (!activeChat) return
    
    const messageData = {
      chatId: activeChat.id,
      content,
      type,
      replyToId: replyTo?.messageId,
      fileUrl: mediaUrl,
      fileName,
      fileSize,
    }
    
    // Create a temporary message to show immediately
    const tempId = `temp-${Date.now()}`
    const tempMessage: Message = {
      id: tempId,
      chatId: activeChat.id,
      senderId: 1, // Current user
      senderName: 'You',
      content,
      timestamp: new Date(),
      status: 'sending',
      type,
      replyTo,
      mediaUrl,
      fileName,
      fileSize,
      edited: false,
      deleted: false
    }
    
    // Add to UI immediately
    setMessages(prev => [...prev, tempMessage])
    setActiveReply(null)
    
    try {
      // Try to send via WebSocket first
      const sent = socketUtil.sendMessage(messageData)
      
      if (!sent) {
        // Fall back to HTTP if WebSocket fails
        const response = await chatApi.sendMessage(messageData)
        
        // Replace the temp message with the real one
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId ? { ...response, status: 'sent' } : msg
          )
        )
        
        // Update last message in chat
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === activeChat.id 
              ? { ...chat, lastMessage: response } 
              : chat
          )
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Mark the message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )
      )
    }
  }
  
  // Edit a message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return
    
    try {
      // Optimistic update
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: newContent, edited: true } 
            : msg
        )
      )
      
      // Send to API
      await chatApi.editMessage(messageId, newContent)
    } catch (error) {
      console.error('Error editing message:', error)
      // Revert if error
      // You'd need to fetch the original message again
    }
  }
  
  // Delete a message
  const deleteMessage = async (messageId: string) => {
    try {
      // Optimistic update
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, deleted: true, content: 'This message was deleted' } : msg
        )
      )
      
      // Send to API
      await chatApi.deleteMessage(messageId)
    } catch (error) {
      console.error('Error deleting message:', error)
      // Revert if error
      // You'd need to fetch the original message again
    }
  }
  
  // React to a message
  const reactToMessage = async (messageId: string, emoji: string) => {
    try {
      // Optimistic update
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === messageId) {
            // Check if user already reacted with this emoji
            const existingReaction = msg.reactions?.find(r => r.userId === 1 && r.emoji === emoji)
            
            if (existingReaction) {
              // Remove reaction if it exists
              return {
                ...msg,
                reactions: msg.reactions?.filter(r => !(r.userId === 1 && r.emoji === emoji))
              }
            } else {
              // Add or update reaction
              const newReactions = [...(msg.reactions || [])]
              
              // Remove any existing reaction from this user
              const userReactionIndex = newReactions.findIndex(r => r.userId === 1)
              if (userReactionIndex !== -1) {
                newReactions.splice(userReactionIndex, 1)
              }
              
              // Add new reaction
              newReactions.push({ userId: 1, emoji })
              
              return {
                ...msg,
                reactions: newReactions
              }
            }
          }
          return msg
        })
      )
      
      // Send to API
      await chatApi.reactToMessage(messageId, emoji)
    } catch (error) {
      console.error('Error reacting to message:', error)
      // Revert if error
      // You'd need to fetch the original reactions again
    }
  }
  
  // Mark chat as read
  const markAsRead = async (chatId: string) => {
    try {
      // Optimistic update
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
        )
      )
      
      // Send to API
      await chatApi.markChatAsRead(chatId)
      socketUtil.markAsRead(chatId)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }
  
  // Create a new group chat
  const createGroup = async (name: string, participants: number[], avatar?: string, description?: string) => {
    try {
      // Send to API
      const newChat = await chatApi.createChat({
        type: 'group',
        name,
        participants,
        avatar,
        message: `${name} group created`
      })
      
      // Update local state
      setChats(prev => [newChat, ...prev])
      setActiveChat(newChat)
      
      return newChat
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  }
  
  // Mute a chat
  const muteChat = async (chatId: string) => {
    try {
      // Optimistic update
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isMuted: true } : chat
        )
      )
      
      // Send to API
      await chatApi.toggleMuteChat(chatId, true)
    } catch (error) {
      console.error('Error muting chat:', error)
      // Revert if error
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isMuted: false } : chat
        )
      )
    }
  }
  
  // Unmute a chat
  const unmuteChat = async (chatId: string) => {
    try {
      // Optimistic update
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isMuted: false } : chat
        )
      )
      
      // Send to API
      await chatApi.toggleMuteChat(chatId, false)
    } catch (error) {
      console.error('Error unmuting chat:', error)
      // Revert if error
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isMuted: true } : chat
        )
      )
    }
  }
  
  // Archive a chat
  const archiveChat = async (chatId: string) => {
    try {
      // Optimistic update
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isArchived: true } : chat
        )
      )
      
      // Send to API
      await chatApi.toggleArchiveChat(chatId, true)
    } catch (error) {
      console.error('Error archiving chat:', error)
      // Revert if error
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isArchived: false } : chat
        )
      )
    }
  }
  
  // Unarchive a chat
  const unarchiveChat = async (chatId: string) => {
    try {
      // Optimistic update
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isArchived: false } : chat
        )
      )
      
      // Send to API
      await chatApi.toggleArchiveChat(chatId, false)
    } catch (error) {
      console.error('Error unarchiving chat:', error)
      // Revert if error
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isArchived: true } : chat
        )
      )
    }
  }
  
  // Start typing indication
  const startTyping = () => {
    if (!activeChat) return
    socketUtil.startTyping(activeChat.id)
  }
  
  // Stop typing indication
  const stopTyping = () => {
    if (!activeChat) return
    socketUtil.stopTyping(activeChat.id)
  }
  
  // Get participants from a chat (convert from IDs to TeamMember objects)
  const getParticipants = (chatId: string): TeamMember[] => {
    const chat = chats.find(c => c.id === chatId)
    if (!chat) return []
    
    return chat.participants
      .map(id => teamMembers.find(m => m.id === id))
      .filter((m): m is TeamMember => m !== undefined)
  }
  
  // Download chat history (placeholder)
  const downloadChat = (chatId: string) => {
    console.log(`Downloading chat history for ${chatId}`)
    // In a real implementation, this would generate a file and prompt a download
  }

  // Reply to message
  const replyToMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    setActiveReply({
      messageId,
      content: message.content,
      sender: message.senderName
    });
  };
  
  // Search chats
  const searchChats = (query: string): Chat[] => {
    if (!query.trim()) return chats;
    
    const lowerQuery = query.toLowerCase();
    return chats.filter(chat => 
      chat.name.toLowerCase().includes(lowerQuery) ||
      chat.lastMessage?.content.toLowerCase().includes(lowerQuery)
    );
  };
  
  // Search messages
  const searchMessages = (query: string): Message[] => {
    if (!query.trim()) return messages;
    
    const lowerQuery = query.toLowerCase();
    return messages.filter(message =>
      message.content.toLowerCase().includes(lowerQuery)
    );
  };
  
  // Update group
  const updateGroup = async (chatId: string, name?: string, avatar?: string, description?: string) => {
    console.log('Updating group:', { chatId, name, avatar, description });
    // In a real implementation, this would call an API
    // For now, just update the local state
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              name: name || chat.name,
              avatar: avatar || chat.avatar,
              description: description || chat.description
            } 
          : chat
      )
    );
  };
  
  // Add participants
  const addParticipants = async (chatId: string, userIds: number[]) => {
    console.log('Adding participants:', { chatId, userIds });
    // In a real implementation, this would call an API
    // For now, just update the local state
    setChats(prev => 
      prev.map(chat => {
        if (chat.id === chatId) {
          const newParticipants = [...new Set([...chat.participants, ...userIds])];
          return { ...chat, participants: newParticipants };
        }
        return chat;
      })
    );
  };
  
  // Remove participant
  const removeParticipant = async (chatId: string, userId: number) => {
    console.log('Removing participant:', { chatId, userId });
    // In a real implementation, this would call an API
    // For now, just update the local state
    setChats(prev => 
      prev.map(chat => {
        if (chat.id === chatId) {
          const newParticipants = chat.participants.filter(id => id !== userId);
          return { ...chat, participants: newParticipants };
        }
        return chat;
      })
    );
  };
  
  // Block chat
  const blockChat = async (chatId: string) => {
    console.log('Blocking chat:', chatId);
    // In a real implementation, this would call an API
    // For now, just update the local state
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, isBlocked: true } : chat
      )
    );
  };
  
  // Unblock chat
  const unblockChat = async (chatId: string) => {
    console.log('Unblocking chat:', chatId);
    // In a real implementation, this would call an API
    // For now, just update the local state
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, isBlocked: false } : chat
      )
    );
  };
  
  // Clear chat history
  const clearChat = async (chatId: string) => {
    console.log('Clearing chat history:', chatId);
    // In a real implementation, this would call an API
    // For now, just clear the messages if it's the active chat
    if (activeChat?.id === chatId) {
      setMessages([]);
    }
  };
  
  // Forward message
  const forwardMessage = async (messageId: string, chatIds: string[]) => {
    console.log('Forwarding message:', { messageId, chatIds });
    const messageToForward = messages.find(m => m.id === messageId);
    if (!messageToForward) return;
    
    // In a real implementation, this would call an API for each chat
    // For now, just log the action
    chatIds.forEach(chatId => {
      console.log(`Forwarded message to chat ${chatId}: ${messageToForward.content.substring(0, 20)}...`);
    });
  };
  
  // Star message
  const starMessage = async (messageId: string) => {
    console.log('Starring message:', messageId);
    // In a real implementation, this would call an API
    // For now, just log the action
  };
  
  // Unstar message
  const unstarMessage = async (messageId: string) => {
    console.log('Unstarring message:', messageId);
    // In a real implementation, this would call an API
    // For now, just log the action
  };
  
  // Load more messages
  const loadMoreMessages = async () => {
    console.log('Loading more messages');
    // In a real implementation, this would fetch older messages
    // For now, just log the action
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        setActiveChat,
        sendMessage,
        editMessage,
        deleteMessage,
        replyToMessage,
        reactToMessage,
        markAsRead,
        searchChats,
        searchMessages,
        startTyping,
        stopTyping,
        createGroup,
        updateGroup,
        addParticipants,
        removeParticipant,
        muteChat,
        unmuteChat,
        archiveChat,
        unarchiveChat,
        blockChat,
        unblockChat,
        clearChat,
        forwardMessage,
        downloadChat,
        starMessage,
        unstarMessage,
        loadMoreMessages,
        getParticipants,
        activeReply,
        setActiveReply,
        connectionStatus,
        setChats
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}