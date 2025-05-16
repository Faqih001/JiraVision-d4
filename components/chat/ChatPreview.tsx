'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreVertical, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Chat } from '@/app/context/chat/ChatContext'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

interface ChatPreviewProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
}

export default function ChatPreview({ chat, isActive, onClick }: ChatPreviewProps) {
  const formatLastMessageTime = (date: Date | undefined) => {
    if (!date) return ''
    
    const messageDate = new Date(date)
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

  const renderPreview = () => {
    if (chat.typing) {
      return <span className="italic text-primary">typing...</span>
    }
    
    if (!chat.lastMessage) return 'Start a conversation'
    
    if (chat.lastMessage.deleted) {
      return <span className="italic">Message was deleted</span>
    }
    
    return chat.lastMessage.content
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 hover:bg-muted/50 relative",
        isActive && "bg-muted",
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
        {chat.online && chat.type === 'individual' && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="font-semibold truncate">{chat.name}</h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatLastMessageTime(chat.lastMessage?.timestamp)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate pr-2">
            {renderPreview()}
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
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem>
            {chat.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
          </DropdownMenuItem>
          <DropdownMenuItem>
            {chat.isArchived ? 'Unarchive Chat' : 'Archive Chat'}
          </DropdownMenuItem>
          <DropdownMenuItem>
            Clear Messages
          </DropdownMenuItem>
          {chat.type === 'individual' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                {chat.isBlocked ? `Unblock ${chat.name}` : `Block ${chat.name}`}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  )
}
