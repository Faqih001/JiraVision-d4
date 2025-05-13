'use client'

import React, { useState } from 'react'
import { Search, Plus, Archive, Settings } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useChat, Chat } from '@/app/context/chat/ChatContext'

export function ChatList() {
  const { 
    chats, 
    activeChat, 
    setActiveChat, 
    searchChats, 
    archiveChat, 
    unarchiveChat, 
    muteChat,
    unmuteChat,
    clearChat,
    blockChat,
    unblockChat,
    createGroup
  } = useChat()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  
  // Filter chats based on search query and archived status
  const filteredChats = chats
    .filter(chat => {
      // Filter by search query
      const matchesQuery = !searchQuery.trim() || 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()))
      
      // Filter by archived status
      const matchesArchived = (showArchived === chat.isArchived)
      
      return matchesQuery && matchesArchived
    })
    .sort((a, b) => {
      // Pin chats with unread messages at the top
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1
      
      // Sort by last message timestamp (or creation date if no messages)
      const aTime = a.lastMessage?.timestamp || a.createdAt
      const bTime = b.lastMessage?.timestamp || b.createdAt
      
      return bTime.getTime() - aTime.getTime()
    })
  
  // Format the last message time for display
  const formatLastMessageTime = (chat: Chat) => {
    if (!chat.lastMessage && !chat.lastMessageTime) return ''
    
    let timestamp
    if (chat.lastMessage) {
      timestamp = chat.lastMessage.timestamp
    } else if (chat.lastMessageTime) {
      return chat.lastMessageTime
    } else {
      return ''
    }
    
    const now = new Date()
    const messageDate = new Date(timestamp)
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      // Today: Show time
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday'
    } else if (diffDays < 7) {
      // This week: Show day name
      return messageDate.toLocaleDateString([], { weekday: 'short' })
    } else {
      // Older: Show date
      return messageDate.toLocaleDateString([], { month: 'numeric', day: 'numeric' })
    }
  }
  
  // Get preview text for the chat
  const getChatPreview = (chat: Chat) => {
    if (chat.typing) {
      return <span className="italic text-primary">typing...</span>
    }
    
    if (chat.lastMessage) {
      if (chat.lastMessage.deleted) {
        return <span className="italic">This message was deleted</span>
      }
      
      switch (chat.lastMessage.type) {
        case 'image':
          return <span>📷 Photo</span>
        case 'video':
          return <span>🎥 Video</span>
        case 'audio':
          return <span>🎵 Audio</span>
        case 'voice':
          return <span>🎤 Voice message</span>
        case 'document':
          return <span>📄 Document</span>
        default:
          return chat.lastMessage.content
      }
    }
    
    return chat.preview || ''
  }
  
  // Handle creating a new chat or group
  const handleNewChat = () => {
    // For now, we'll just create a sample group
    createGroup(
      'New Group Chat',
      [2, 3, 4], // Sample member IDs
      undefined,
      'A new group chat'
    )
  }
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-3 border-b flex justify-between items-center">
        <h1 className="text-xl font-semibold">Chats</h1>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className={`h-5 w-5 ${showArchived ? 'text-primary' : ''}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleNewChat}>
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewChat}>
                New Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search for people or messages" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/40"
          />
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="chats" className="border-b">
        <TabsList className="w-full grid grid-cols-2 h-12 rounded-none bg-transparent border-b">
          <TabsTrigger 
            value="chats" 
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
          >
            {showArchived ? 'Archived' : 'Chats'}
          </TabsTrigger>
          <TabsTrigger 
            value="status" 
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
          >
            Status
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Chat List */}
      <ScrollArea className="flex-1">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <div key={chat.id} className="relative">
              <button
                className={`w-full flex items-center p-3 hover:bg-muted/50 transition-colors text-left border-b ${
                  activeChat?.id === chat.id ? 'bg-muted/50' : ''
                }`}
                onClick={() => setActiveChat(chat)}
              >
                {/* Avatar with online indicator */}
                <div className="relative">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    {chat.avatar ? (
                      <AvatarImage src={chat.avatar} alt={chat.name} />
                    ) : (
                      <AvatarFallback className={`${
                        chat.type === 'group' ? 'bg-primary/20' : 'bg-primary/10'
                      } text-primary`}>
                        {chat.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  {/* Online status indicator - only for individual chats */}
                  {chat.type === 'individual' && chat.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                  )}
                  
                  {/* Group chat indicator */}
                  {chat.type === 'group' && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary/15 border-2 border-background flex items-center justify-center">
                      <span className="text-[8px] text-primary">
                        {chat.participants.length}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Chat details */}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <div className="font-medium truncate pr-1">{chat.name}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatLastMessageTime(chat)}
                    </div>
                  </div>
                  
                  {/* Chat preview */}
                  <div className="flex justify-between items-center mt-0.5">
                    <div className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {getChatPreview(chat)}
                    </div>
                    
                    <div className="flex items-center">
                      {/* Muted indicator */}
                      {chat.isMuted && (
                        <div className="mr-1.5">
                          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1V8a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0111 2.586v18.828a1 1 0 01-1.707.707L4.586 17H4z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Unread count */}
                      {chat.unreadCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 ml-1.5"
                        >
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Context menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full absolute right-3 top-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                  >
                    <span className="sr-only">Chat options</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {chat.isMuted ? (
                    <DropdownMenuItem onClick={() => unmuteChat(chat.id)}>
                      Unmute Notifications
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => muteChat(chat.id)}>
                      Mute Notifications
                    </DropdownMenuItem>
                  )}
                  
                  {chat.isArchived ? (
                    <DropdownMenuItem onClick={() => unarchiveChat(chat.id)}>
                      Unarchive Chat
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => archiveChat(chat.id)}>
                      Archive Chat
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => clearChat(chat.id)}>
                    Clear Messages
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {chat.type === 'individual' && (
                    <>
                      {chat.isBlocked ? (
                        <DropdownMenuItem onClick={() => unblockChat(chat.id)}>
                          Unblock {chat.name}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => blockChat(chat.id)}>
                          Block {chat.name}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground h-full">
            {searchQuery ? (
              <>
                <p className="mb-2">No results for "{searchQuery}"</p>
                <p className="text-sm">Try a different search term</p>
              </>
            ) : showArchived ? (
              <>
                <Archive className="h-12 w-12 mb-4 text-muted-foreground/50" />
                <p className="mb-2">No archived chats</p>
                <p className="text-sm">Archived chats will appear here</p>
              </>
            ) : (
              <>
                <p className="mb-2">No chats yet</p>
                <Button variant="outline" onClick={handleNewChat}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start a New Chat
                </Button>
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
} 