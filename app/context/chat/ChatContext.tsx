'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { TeamMember } from '@/types/team'
import * as chatApi from '@/lib/api-chat'
import * as socketUtil from '@/lib/socket-client'

// Message status types
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'sending' | 'failed' | 'error'

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

// Provider component
export const ChatProvider = ({ children, teamMembers }: { children: React.ReactNode, teamMembers: TeamMember[] }) => {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeReply, setActiveReply] = useState<ReplyInfo | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [socket, setSocket] = useState<ReturnType<typeof socketUtil.getSocket>>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: number, name: string, avatar: string } | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const retryTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const maxRetries = 3

  // Get current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user/current')
        if (!response.ok) {
          throw new Error('Failed to fetch current user')
        }
        const data = await response.json()
        if (data.success && data.user) {
          setCurrentUser({
            id: data.user.id,
            name: data.user.name,
            avatar: data.user.avatar || ''
          })
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }

    fetchCurrentUser()
  }, [])

  // Initialize chat with error handling and automatic reconnection
  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('Initializing chat...')
        setConnectionStatus('connecting')
        setInitError(null)

        // Direct API test
        try {
          console.log('Testing chat API directly...')
          const apiResponse = await fetch('/api/chat', {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })

          console.log('API Test status:', apiResponse.status, apiResponse.statusText)

          if (!apiResponse.ok) {
            console.error('API Test failed:', apiResponse.status, apiResponse.statusText)
            const errorText = await apiResponse.text()
            console.error('API Error details:', errorText)
          } else {
            const testData = await apiResponse.json()
            console.log('API Test successful, chat count:', testData.length)

            if (testData.length > 0) {
              console.log('Setting chats directly from API test call')
              setChats(testData)
            }
          }
        } catch (apiTestError) {
          console.error('API Test Error:', apiTestError)
        }

        // Fetch chats from API with retry on error
        let chatData = []
        try {
          console.log('Fetching chats from API...')
          chatData = await chatApi.fetchChats()
          console.log('Chats fetched successfully:', chatData.length)
          setChats(chatData)
        } catch (chatError) {
          console.error('Error fetching chats:', chatError)
        }

        // Establish WebSocket connection
        console.log('Initializing socket connection...')
        const socketInstance = await socketUtil.initSocket()
        console.log('Socket connection established successfully')
        setSocket(socketInstance)
        setConnectionStatus('connected')

        // Set up event listeners
        const unsubscribeNewMessage = socketUtil.onNewMessage((message) => {
          console.log('New message received:', message)
          setMessages((prev) => [...prev, message])

          // Update last message in chat
          setChats((prevChats) =>
            prevChats.map((chat) =>
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
          const user = teamMembers.find((m) => m.id === userId)
          if (!user) return

          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === chatId ? { ...chat, typing: { userId, name: user.name } } : chat
            )
          )
        })

        const unsubscribeTypingStop = socketUtil.onTypingStop(({ chatId }) => {
          setChats((prevChats) =>
            prevChats.map((chat) => (chat.id === chatId ? { ...chat, typing: undefined } : chat))
          )
        })

        const unsubscribeUserStatus = socketUtil.onUserStatus(({ userId, status }) => {
          // Update online status for individual chats with this user
          setChats((prevChats) =>
            prevChats.map((chat) => {
              if (
                chat.type === 'individual' &&
                chat.participants.includes(userId) &&
                userId !== currentUser?.id
              ) {
                return { ...chat, online: status === 'online' }
              }
              return chat
            })
          )
        })

        const unsubscribeNewChat = socketUtil.onNewChat((chat) => {
          console.log('New chat received:', chat)
          setChats((prev) => [chat, ...prev])
        })

        setIsInitialized(true)
        setRetryCount(0) // Reset retry counter on successful connection

        // Cleanup function
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
        setInitError(
          error instanceof Error ? error.message : 'Unknown error initializing chat'
        )

        // Set up retry with increasing delay if under max retries
        if (retryCount < maxRetries) {
          const retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 10000) // Exponential backoff with 10s max
          console.log(
            `Scheduling connection retry in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`
          )

          // Clear any existing retry timer
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current)
          }

          // Set new retry timer
          retryTimerRef.current = setTimeout(() => {
            setRetryCount((prev) => prev + 1)
            console.log(`Retrying connection (attempt ${retryCount + 1}/${maxRetries})`)
          }, retryDelay)

          // Return cleanup function
          return () => {
            if (retryTimerRef.current) {
              clearTimeout(retryTimerRef.current)
            }
          }
        } else {
          console.error(
            'Maximum retry attempts reached. Please refresh the page to try again.'
          )
        }
      }
    }

    initializeChat()

    // Cleanup on unmount
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }
    }
  }, [teamMembers, currentUser, retryCount])

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      try {
        console.log(`Loading messages for chat ${activeChat.id}...`)
        const messageData = await chatApi.fetchMessages(activeChat.id)
        console.log(`Loaded ${messageData.length} messages`)
        setMessages(messageData)

        // Mark chat as read
        if (activeChat.unreadCount > 0) {
          await chatApi.markChatAsRead(activeChat.id)
          socketUtil.markAsRead(activeChat.id)

          // Update local state
          setChats((prevChats) =>
            prevChats.map((chat) =>
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

  // Send a message with error handling and retry
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
      fileSize
    }

    // Create a temporary message
    const tempId = `temp-${Date.now()}`
    const tempMessage: Message = {
      id: tempId,
      chatId: activeChat.id,
      senderId: currentUser?.id || 1,
      senderName: currentUser?.name || 'You',
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
    setMessages((prev) => [...prev, tempMessage])
    setActiveReply(null)

    let retryAttempt = 0
    const maxMessageRetries = 3
    const tryToSendMessage = async (): Promise<boolean> => {
      try {
        // Try WebSocket first
        const sent = socketUtil.sendMessage(messageData)

        if (sent) {
          return true
        }

        // Fall back to HTTP if WebSocket fails
        const response = await chatApi.sendMessage(messageData)

        // Update the temp message with the real one
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...response, status: 'sent' } : msg
          )
        )

        // Update last message in chat
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === activeChat.id ? { ...chat, lastMessage: response } : chat
          )
        )

        return true
      } catch (error) {
        console.error(
          `Error sending message (attempt ${retryAttempt + 1}/${maxMessageRetries}):`,
          error
        )

        if (retryAttempt < maxMessageRetries) {
          retryAttempt++
          const retryDelay = Math.min(Math.pow(2, retryAttempt) * 1000, 5000)
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
          return tryToSendMessage()
        }

        return false
      }
    }

    try {
      const success = await tryToSendMessage()
      if (!success) {
        // Mark the message as failed after all retries
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'failed' } : msg
          )
        )
      }
    } catch (error) {
      console.error('Fatal error sending message:', error)
      // Mark the message as error in case of unexpected failures
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'error' } : msg
        )
      )
    }
  }

  // ... rest of the context implementation ...
  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        setActiveChat,
        sendMessage,
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