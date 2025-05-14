'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { TeamMember } from '@/types/team'

// Message status types
export type MessageStatus = 'sent' | 'delivered' | 'read'

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
  connectionStatus: 'disconnected'
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
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [activeReply, setActiveReply] = useState<ReplyInfo | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [typing, setTyping] = useState<Record<string, boolean>>({})
  
  // WebSocket connection ref
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch chats when component mounts
  useEffect(() => {
    const loadChats = async () => {
      setConnectionStatus("connecting")
      try {
        const fetchedChats = await fetchChats()
        setChats(fetchedChats)
        setConnectionStatus("connected")
      } catch (error) {
        console.error("Error loading chats:", error)
        setConnectionStatus("disconnected")
      }
    }
    
    loadChats()
    
    // For real-time communications, here you would initialize a WebSocket connection
    
    return () => {
      // Clean up WebSocket connection if needed
    }
  }, [])
  
  // Fetch messages when activeChat changes
  useEffect(() => {
    if (activeChat) {
      const loadMessages = async () => {
        try {
          const fetchedMessages = await fetchMessages(activeChat.id)
          setMessages(prev => ({
            ...prev,
            [activeChat.id]: fetchedMessages,
          }))
        } catch (error) {
          console.error("Error loading messages:", error)
        }
      }
      
      loadMessages()
    }
  }, [activeChat])

  // Send a message function
  const sendMessage = async (
    content: string,
    type: MessageType = "text",
    replyTo?: ReplyInfo,
    fileUrl?: string,
    fileName?: string,
    fileSize?: number
  ) => {
    if (!activeChat) return
    
    try {
      const message = await sendMessageToApi(
        activeChat.id,
        content,
        type,
        replyTo?.messageId,
        fileUrl,
        fileName,
        fileSize
      )
      
      if (message) {
        // Update messages state
        setMessages(prev => ({
          ...prev,
          [activeChat.id]: [...(prev[activeChat.id] || []), message],
        }))
        
        // Update lastMessage in chat
        setChats(prev => {
          return prev.map(chat => {
            if (chat.id === activeChat.id) {
              return {
                ...chat,
                lastMessage: message,
                preview: type === 'text' ? content : (
                  type === 'image' ? '📷 Photo' :
                  type === 'video' ? '📹 Video' :
                  type === 'document' ? '📄 Document' :
                  type === 'audio' ? '🎵 Audio' :
                  type === 'voice' ? '🎤 Voice message' : 'Message'
                ),
                unreadCount: 0, // Reset unread count for active chat
              }
            }
            return chat
          })
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Edit a message
  const editMessage = (messageId: string, newContent: string) => {
    if (!newContent.trim()) return

    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent, edited: true } 
          : msg
      )
    )
  }

  // Delete a message
  const deleteMessage = (messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, deleted: true, content: 'This message was deleted' } : msg
      )
    )
  }

  // Reply to a message
  const replyToMessage = (messageId: string) => {
    const messageToReply = messages.find(msg => msg.id === messageId)
    if (!messageToReply) return

    setActiveReply({
      messageId,
      content: messageToReply.content,
      sender: messageToReply.senderName
    })
  }

  // React to a message with emoji
  const reactToMessage = (messageId: string, emoji: string) => {
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
  }

  // Mark chat as read
  const markAsRead = (chatId: string) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    )
  }

  // Search chats
  const searchChats = (query: string): Chat[] => {
    if (!query.trim()) return chats
    const lowerQuery = query.toLowerCase()
    
    return chats.filter(chat => 
      chat.name.toLowerCase().includes(lowerQuery) || 
      chat.lastMessage?.content.toLowerCase().includes(lowerQuery)
    )
  }

  // Search messages in current chat
  const searchMessages = (query: string): Message[] => {
    if (!query.trim() || !activeChat) return []
    const lowerQuery = query.toLowerCase()
    
    if (teamMembers && teamMembers.length > 0) {
      const initialChats: Chat[] = teamMembers
        .filter(member => member.id !== 1) // Exclude the current user
        .map(member => {
        // Create a chat for each team member
        return {
          id: `chat-${member.id}`,
          name: member.name,
          type: 'individual',
          participants: [1, member.id], // 1 is the current user (hardcoded for demo)
          avatar: member.avatar || undefined,
          unreadCount: Math.floor(Math.random() * 3), // Random unread count for demo
          isMuted: false,
          isArchived: false,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
          online: member.status === 'online'
        }
      })

      // Sort chats by most recent
      initialChats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      // Add some sample messages and last message previews
      initialChats.forEach(chat => {
        // Add a last message to Herbert Strayhorn's chat
        if (chat.name === "Herbert Strayhorn") {
          chat.lastMessage = {
            id: generateId(),
            chatId: chat.id,
            senderId: chat.participants.find(id => id !== 1) || chat.participants[0],
            senderName: chat.name,
            content: "Hello, Setup the github repo for bootstrap admin dashboard.",
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            status: 'read',
            type: 'text',
            edited: false,
            deleted: false
          }
          chat.lastMessageTime = "09:35"
        }

        // Add last messages to other chats
        if (chat.name === "Jitu Chauhan") {
          chat.lastMessage = undefined
          chat.preview = "I m for unread message components..."
          chat.lastMessageTime = "8:48AM"
        }

        if (chat.name === "Kevin White") {
          chat.lastMessage = undefined
          chat.preview = "Currently chat with user components..."
          chat.lastMessageTime = "8:48AM"
        }

        if (chat.name === "Mary Newton") {
          chat.lastMessage = undefined
          chat.preview = ""
          chat.lastMessageTime = "8:48AM"
        }
      })

      // Create a group chat for demo
      initialChats.push({
        id: 'group-1',
        name: 'Team Engineering',
        type: 'group',
        participants: teamMembers.filter(m => m.department === 'Engineering').map(m => m.id).concat([1]),
        description: 'Engineering team discussions',
        unreadCount: 5,
        isMuted: false,
        isArchived: false,
        isGroupAdmin: true,
        createdAt: new Date(Date.now() - 86400000)
      })

      // Add a "Figma to HTML5" chat entry
      initialChats.push({
        id: 'chat-figma',
        name: 'Figma to HTML5',
        type: 'individual',
        participants: [1, 99], // Placeholder participant ID
        preview: "Convert Figma to HTML5 template...",
        unreadCount: 0,
        isMuted: false,
        isArchived: false,
        createdAt: new Date(Date.now() - 30 * 86400000),
        lastMessageTime: "3/11/2023"
      })

      setChats(initialChats)
    }
  }, [teamMembers])

  // Set up WebSocket connection
  useEffect(() => {
    // In a real application, you would connect to a real WebSocket server
    // For demo purposes, we'll simulate the connection
    const setupWebsocket = () => {
      setConnectionStatus('connecting')
      
      // Simulate connecting after a delay
      setTimeout(() => {
        setConnectionStatus('connected')
        console.log("WebSocket connected (simulated)")
      }, 1000)
    }
    
    setupWebsocket()
    
    // Clean up on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [])

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      // Generate dummy messages for the selected chat
      const dummyMessages: Message[] = []
      
      // Special case for Herbert Strayhorn
      if (activeChat.name === "Herbert Strayhorn") {
        // First message - from Herbert
        dummyMessages.push({
          id: generateId(),
          chatId: activeChat.id,
          senderId: 2, // Herbert's ID
          senderName: "Herbert Strayhorn",
          content: "Hello, Setup the github repo for bootstrap admin dashboard.",
          timestamp: new Date(Date.now() - 3 * 3600000), // 3 hours ago
          status: 'read',
          type: 'text',
          edited: false,
          deleted: false
        })
        
        // Reply from current user
        dummyMessages.push({
          id: generateId(),
          chatId: activeChat.id,
          senderId: 1, // Current user
          senderName: "You",
          content: "Yes, Currently working on the today evening i will up the admin dashboard template.",
          timestamp: new Date(Date.now() - 2.9 * 3600000), // 2.9 hours ago
          status: 'read',
          type: 'text',
          edited: false,
          deleted: false
        })
        
        // Thank you from Herbert
        dummyMessages.push({
          id: generateId(),
          chatId: activeChat.id,
          senderId: 2, // Herbert's ID
          senderName: "Herbert Strayhorn",
          content: "Thank you",
          timestamp: new Date(Date.now() - 2.8 * 3600000), // 2.8 hours ago
          status: 'read',
          type: 'text',
          edited: false,
          deleted: false
        })
        
        // Response from current user
        dummyMessages.push({
          id: generateId(),
          chatId: activeChat.id,
          senderId: 1, // Current user
          senderName: "You",
          content: "You are most welcome.",
          timestamp: new Date(Date.now() - 2.7 * 3600000), // 2.7 hours ago
          status: 'read',
          type: 'text',
          edited: false,
          deleted: false
        })
        
        // New message from Herbert about React/Next.js
        dummyMessages.push({
          id: generateId(),
          chatId: activeChat.id,
          senderId: 2, // Herbert's ID
          senderName: "Herbert Strayhorn",
          content: "After complete this we working on React/Next.js based admin dashboard template.",
          timestamp: new Date(Date.now() - 2.5 * 3600000), // 2.5 hours ago
          status: 'read',
          type: 'text',
          edited: false,
          deleted: false
        })
        
        // Agreement from current user
        dummyMessages.push({
          id: generateId(),
          chatId: activeChat.id,
          senderId: 1, // Current user
          senderName: "You",
          content: "Yes, we work on the react and next.js",
          timestamp: new Date(Date.now() - 2.4 * 3600000), // 2.4 hours ago
          status: 'read',
          type: 'text',
          edited: false,
          deleted: false
        })
      } else {
        // For other chats, generate generic messages
        const messageCount = 5 + Math.floor(Math.random() * 10)
        
        for (let i = 0; i < messageCount; i++) {
          const isCurrentUser = Math.random() > 0.5
          const senderId = isCurrentUser ? 1 : activeChat.participants.find(id => id !== 1) || activeChat.participants[0]
          const senderName = isCurrentUser ? 'You' : 
            teamMembers.find(m => m.id === senderId)?.name || 'Unknown User'

          dummyMessages.push({
            id: generateId(),
            chatId: activeChat.id,
            senderId,
            senderName,
            content: isCurrentUser 
              ? ['Hello!', 'How is the project going?', 'Let me know if you need help.', 'What are your thoughts on this?'][Math.floor(Math.random() * 4)]
              : ['Hi there!', 'The project is on track.', 'I\'ll update you soon.', 'I need your help with something.', 'Can we meet later?'][Math.floor(Math.random() * 5)],
            timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
            status: isCurrentUser ? ['sent', 'delivered', 'read'][Math.floor(Math.random() * 3)] as MessageStatus : 'read',
            type: 'text',
            edited: false,
            deleted: false
          })
        }
      }

      // Sort messages by timestamp
      dummyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      setMessages(dummyMessages)

      // Mark chat as read
      if (activeChat.unreadCount > 0) {
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === activeChat.id ? { ...chat, unreadCount: 0 } : chat
          )
        )
      }
    } else {
      setMessages([])
    }
  }, [activeChat, teamMembers])

  // Send a new message
  const sendMessage = (
    content: string, 
    type: MessageType = 'text', 
    replyTo?: ReplyInfo,
    mediaUrl?: string,
    fileName?: string,
    fileSize?: number
  ) => {
    if (!activeChat) return
    
    // Create a new message
    const newMessage: Message = {
      id: generateId(),
      chatId: activeChat.id,
      senderId: 1, // Current user
      senderName: 'You',
      content,
      timestamp: new Date(),
      status: 'sent',
      type,
      replyTo,
      mediaUrl,
      fileName,
      fileSize,
      edited: false,
      deleted: false
    }
    
    // Add message to state
    setMessages(prev => [...prev, newMessage])
    setActiveReply(null)
    
    // Update chat with last message
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === activeChat.id 
          ? { 
              ...chat, 
              lastMessage: newMessage,
              unreadCount: 0 // Reset unread for current user
            } 
          : chat
      )
    )
    
    // Simulate sending to WebSocket
    console.log("Message sent via WebSocket (simulated):", newMessage)
    
    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id
            ? { ...msg, status: 'delivered' }
            : msg
        )
      )
    }, 500)
    
    // Simulate message read
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id
            ? { ...msg, status: 'read' }
            : msg
        )
      )
    }, 1500)
    
    // For demo: if this is Herbert's chat, simulate a reply
    if (activeChat.name === "Herbert Strayhorn") {
      setTimeout(() => {
        const replyMessage: Message = {
          id: generateId(),
          chatId: activeChat.id,
          senderId: 2, // Herbert's ID
          senderName: "Herbert Strayhorn",
          content: ["Great!", "Thanks for the update!", "Looking forward to it!"][Math.floor(Math.random() * 3)],
          timestamp: new Date(),
          status: 'sent',
          type: 'text',
          edited: false,
          deleted: false
        }
        
        setMessages(prev => [...prev, replyMessage])
        
        // Update chat with last message
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === activeChat.id 
              ? { 
                  ...chat, 
                  lastMessage: replyMessage,
                } 
              : chat
          )
        )
      }, 3000)
    }
  }

  // Edit a message
  const editMessage = (messageId: string, newContent: string) => {
    if (!newContent.trim()) return

    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent, edited: true } 
          : msg
      )
    )
  }

  // Delete a message
  const deleteMessage = (messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, deleted: true, content: 'This message was deleted' } : msg
      )
    )
  }

  // Reply to a message
  const replyToMessage = (messageId: string) => {
    const messageToReply = messages.find(msg => msg.id === messageId)
    if (!messageToReply) return

    setActiveReply({
      messageId,
      content: messageToReply.content,
      sender: messageToReply.senderName
    })
  }

  // React to a message with emoji
  const reactToMessage = (messageId: string, emoji: string) => {
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
            const newReactions = [...(msg.reactions || [])];
            
            // Remove any existing reaction from this user
            const userReactionIndex = newReactions.findIndex(r => r.userId === 1);
            if (userReactionIndex !== -1) {
              newReactions.splice(userReactionIndex, 1);
            }
            
            // Add new reaction
            newReactions.push({ userId: 1, emoji });
            
            return {
              ...msg,
              reactions: newReactions
            }
          }
        }
        return msg
      })
    )
  }

  // Mark chat as read
  const markAsRead = (chatId: string) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    )
  }

  // Search chats
  const searchChats = (query: string): Chat[] => {
    if (!query.trim()) return chats
    const lowerQuery = query.toLowerCase()
    
    return chats.filter(chat => 
      chat.name.toLowerCase().includes(lowerQuery) || 
      chat.lastMessage?.content.toLowerCase().includes(lowerQuery)
    )
  }

  // Search messages in current chat
  const searchMessages = (query: string): Message[] => {
    if (!query.trim() || !activeChat) return []
    const lowerQuery = query.toLowerCase()
    
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(lowerQuery)
    )
  }

  // Indicate user is typing
  const startTyping = () => {
    if (!activeChat) return

    // Update typing status in chat
    setChats(prev => 
      prev.map(chat => 
        chat.id === activeChat.id 
          ? { ...chat, typing: { userId: 1, name: 'You' } } 
          : chat
      )
    )
  }

  // Stop typing indication
  const stopTyping = () => {
    if (!activeChat) return

    // Remove typing status
    setChats(prev => 
      prev.map(chat => 
        chat.id === activeChat.id 
          ? { ...chat, typing: undefined } 
          : chat
      )
    )
  }

  // Create a new group chat
  const createGroup = (name: string, participants: number[], avatar?: string, description?: string) => {
    if (!name.trim() || participants.length < 1) return

    const newGroupId = `group-${generateId()}`
    
    const newGroup: Chat = {
      id: newGroupId,
      name,
      type: 'group',
      participants: [...participants, 1], // Include current user
      avatar,
      description,
      unreadCount: 0,
      isMuted: false,
      isArchived: false,
      isGroupAdmin: true, // Current user is admin
      createdAt: new Date()
    }

    setChats(prev => [newGroup, ...prev])
    setActiveChat(newGroup)
  }

  // Update group details
  const updateGroup = (chatId: string, name?: string, avatar?: string, description?: string) => {
    setChats(prev => 
      prev.map(chat => {
        if (chat.id === chatId && chat.type === 'group') {
          return {
            ...chat,
            name: name || chat.name,
            avatar: avatar !== undefined ? avatar : chat.avatar,
            description: description !== undefined ? description : chat.description
          }
        }
        return chat
      })
    )

    // Update active chat if it's the one being modified
    if (activeChat?.id === chatId) {
      setActiveChat(prev => {
        if (!prev) return null
        return {
          ...prev,
          name: name || prev.name,
          avatar: avatar !== undefined ? avatar : prev.avatar,
          description: description !== undefined ? description : prev.description
        }
      })
    }
  }

  // Add participants to a group
  const addParticipants = (chatId: string, userIds: number[]) => {
    setChats(prev => 
      prev.map(chat => {
        if (chat.id === chatId && chat.type === 'group') {
          const newParticipants = [...new Set([...chat.participants, ...userIds])]
          return {
            ...chat,
            participants: newParticipants
          }
        }
        return chat
      })
    )

    // Update active chat if it's the one being modified
    if (activeChat?.id === chatId) {
      setActiveChat(prev => {
        if (!prev || prev.type !== 'group') return prev
        const newParticipants = [...new Set([...prev.participants, ...userIds])]
        return {
          ...prev,
          participants: newParticipants
        }
      })
    }
  }

  // Remove a participant from a group
  const removeParticipant = (chatId: string, userId: number) => {
    setChats(prev => 
      prev.map(chat => {
        if (chat.id === chatId && chat.type === 'group') {
          return {
            ...chat,
            participants: chat.participants.filter(id => id !== userId)
          }
        }
        return chat
      })
    )

    // Update active chat if it's the one being modified
    if (activeChat?.id === chatId) {
      setActiveChat(prev => {
        if (!prev || prev.type !== 'group') return prev
        return {
          ...prev,
          participants: prev.participants.filter(id => id !== userId)
        }
      })
    }
  }

  // Mute a chat
  const muteChat = (chatId: string) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, isMuted: true } : chat
      )
    )
  }

  // Unmute a chat
  const unmuteChat = (chatId: string) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, isMuted: false } : chat
      )
    )
  }

  // Archive a chat
  const archiveChat = (chatId: string) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, isArchived: true } : chat
      )
    )
  }

  // Unarchive a chat
  const unarchiveChat = (chatId: string) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, isArchived: false } : chat
      )
    )
  }

  // Block a chat (for individual chats)
  const blockChat = (chatId: string) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId && chat.type === 'individual' 
          ? { ...chat, isBlocked: true } 
          : chat
      )
    )
  }

  // Unblock a chat
  const unblockChat = (chatId: string) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, isBlocked: false } : chat
      )
    )
  }

  // Clear chat history
  const clearChat = (chatId: string) => {
    setMessages(prev => prev.filter(msg => msg.chatId !== chatId))
    
    // Update last message in chat
    setChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, lastMessage: undefined } : chat
      )
    )
  }

  // Forward message to other chats
  const forwardMessage = (messageId: string, chatIds: string[]) => {
    const messageToForward = messages.find(msg => msg.id === messageId)
    if (!messageToForward || !chatIds.length) return

    // Create a new message in each target chat
    chatIds.forEach(chatId => {
      const newMessage: Message = {
        id: generateId(),
        chatId,
        senderId: 1, // Current user
        senderName: 'You',
        content: messageToForward.content,
        timestamp: new Date(),
        status: 'sent',
        type: messageToForward.type,
        mediaUrl: messageToForward.mediaUrl,
        fileName: messageToForward.fileName,
        fileSize: messageToForward.fileSize,
        edited: false,
        deleted: false
      }

      // Only update messages if it's the active chat
      if (activeChat?.id === chatId) {
        setMessages(prev => [...prev, newMessage])
      }

      // Update last message in chat list
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, lastMessage: newMessage } 
            : chat
        )
      )
    })
  }

  // Download chat history (placeholder)
  const downloadChat = (chatId: string) => {
    console.log(`Downloading chat history for ${chatId}`)
    // In a real implementation, this would generate a file and prompt a download
  }

  // Star a message (placeholder)
  const starMessage = (messageId: string) => {
    console.log(`Starring message ${messageId}`)
    // In a real implementation, this would mark a message as starred
  }

  // Unstar a message (placeholder)
  const unstarMessage = (messageId: string) => {
    console.log(`Unstarring message ${messageId}`)
    // In a real implementation, this would remove star status
  }

  // Load more messages (pagination placeholder)
  const loadMoreMessages = () => {
    console.log('Loading more messages')
    // In a real implementation, this would fetch older messages
  }

  // Get participants details
  const getParticipants = (chatId: string): TeamMember[] => {
    const chat = chats.find(c => c.id === chatId)
    if (!chat) return []

    return chat.participants
      .map(id => teamMembers.find(m => m.id === id))
      .filter((member): member is TeamMember => member !== undefined) as TeamMember[]
  }

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
        connectionStatus
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}