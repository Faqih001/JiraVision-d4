'use client'

import React, { useState } from 'react'
import { Bell, Search, Plus, Archive, Settings, MoreVertical, MessageSquare, Film, Mic, File, Image as ImageIcon } from 'lucide-react'
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
import { cn } from '@/lib/utils'
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
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats')
  
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
      if (a.unreadCount && !b.unreadCount) return -1
      if (!a.unreadCount && b.unreadCount) return 1
      
      // Sort by last message time
      return new Date(b.lastMessage?.timestamp || 0).getTime() - 
        new Date(a.lastMessage?.timestamp || 0).getTime()
    })

  const getChatPreview = (chat: Chat) => {
    if (chat.typing) {
      return <span className="italic text-primary">typing...</span>
    }
    
    if (!chat.lastMessage) return 'Start a conversation'
    
    if (chat.lastMessage.deleted) {
      return <span className="italic">Message was deleted</span>
    }
    
    // Show media type or message content
    switch (chat.lastMessage.type) {
      case 'image':
        return <span className="flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5"/>Photo
        </span>
      case 'video':
        return <span className="flex items-center gap-1">
          <Film className="h-3.5 w-3.5"/>Video
        </span>
      case 'audio':
        return <span className="flex items-center gap-1">
          <Mic className="h-3.5 w-3.5"/>Audio
        </span>
      case 'voice':
        return <span className="flex items-center gap-1">
          <Mic className="h-3.5 w-3.5"/>Voice message
        </span>
      case 'document':
        return <span className="flex items-center gap-1">
          <File className="h-3.5 w-3.5"/>Document
        </span>
      default:
        return chat.lastMessage.content
    }
  }

  // Get time display for last message
  const formatLastMessageTime = (chat: Chat) => {
    if (!chat.lastMessage) return ''
    
    const messageDate = new Date(chat.lastMessage.timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' })
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Search and Action Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search or start new chat" 
              className="pl-9 bg-muted/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="ghost" 
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className={cn("h-5 w-5", showArchived && "text-primary")} />
          </Button>
        </div>

        {/* Chat/Contacts Tabs */}
        <Tabs 
          defaultValue={activeTab} 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'chats' | 'contacts')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chats">Chats</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={cn(
                "w-full flex items-start gap-3 p-4 hover:bg-muted/50 relative",
                activeChat?.id === chat.id && "bg-muted",
                "group"
              )}
            >
              {/* Chat Avatar */}
              <div className="relative">
                <Avatar className="h-12 w-12">
                  {chat.avatar ? (
                    <AvatarImage src={chat.avatar} alt={chat.name} />
                  ) : (
                    <AvatarFallback>
                      {chat.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                {chat.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold truncate">{chat.name}</h3>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatLastMessageTime(chat)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate pr-2">
                    {getChatPreview(chat)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {chat.isMuted && (
                      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {chat.unreadCount > 0 && (
                      <Badge 
                        variant="default"
                        className="rounded-full h-5 min-w-[20px] flex items-center justify-center text-xs px-1.5"
                      >
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <MoreVertical className="h-4 w-4" />
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
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => unblockChat(chat.id)}
                        >
                          Unblock {chat.name}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => blockChat(chat.id)}
                        >
                          Block {chat.name}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </button>
          ))}

          {/* Empty States */}
          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground">
              {searchQuery ? (
                <>
                  <p className="mb-2">No chats found for "{searchQuery}"</p>
                  <p className="text-sm">Try a different search term</p>
                </>
              ) : showArchived ? (
                <>
                  <Archive className="h-12 w-12 mb-4 opacity-50" />
                  <p className="mb-2">No archived chats</p>
                  <p className="text-sm">Archived chats will appear here</p>
                </>
              ) : (
                <>
                  <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                  <p className="mb-2">No conversations yet</p>
                  <p className="text-sm mb-4">Start chatting with your team</p>
                  <Button onClick={() => {}}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start a New Chat
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}