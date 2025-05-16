'use client'

import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Check, 
  Edit2, 
  Trash2, 
  Reply, 
  MoreVertical, 
  Copy, 
  Forward, 
  Star, 
  FileText,
  Image as ImageIcon,
  Film,
  Mic,
  File,
  Download
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Message, useChat } from '@/app/context/chat/ChatContext'

interface MessageBubbleProps {
  message: Message
  showAvatar?: boolean
  isGroupChat?: boolean
  isSequential?: boolean
  isLast?: boolean
  teamMemberAvatar?: string
}

export function MessageBubble({
  message,
  showAvatar = true,
  isGroupChat = false,
  isSequential = false,
  isLast = false,
  teamMemberAvatar
}: MessageBubbleProps) {
  const { 
    editMessage, 
    deleteMessage, 
    replyToMessage, 
    reactToMessage, 
    starMessage, 
    forwardMessage 
  } = useChat()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
  
  const isCurrentUser = message.senderId === 1 // Replace with actual current user ID
  
  // Format message timestamp
  const formatMessageTime = (date: Date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffHours = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 24) {
      return format(messageDate, 'HH:mm')
    } else if (diffHours < 48) {
      return 'Yesterday'
    } else {
      return format(messageDate, 'MMM d')
    }
  }

  // Handle message edit
  const handleEditSave = () => {
    if (editText.trim() && editText !== message.content) {
      editMessage(message.id, editText)
    }
    setIsEditing(false)
  }

  // Handle edit cancel with Escape key
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditText(message.content)
    }
  }

  // Render message status indicators
  const renderStatus = () => {
    if (!isCurrentUser || !message.status) return null
    
    switch (message.status) {
      case 'sent':
        return <Check className="h-3.5 w-3.5 text-muted-foreground/70" />
      case 'delivered':
        return (
          <div className="flex">
            <Check className="h-3.5 w-3.5 text-muted-foreground/70" />
            <Check className="h-3.5 w-3.5 -ml-1.5 text-muted-foreground/70" />
          </div>
        )
      case 'read':
        return (
          <div className="flex">
            <Check className="h-3.5 w-3.5 text-blue-500" />
            <Check className="h-3.5 w-3.5 -ml-1.5 text-blue-500" />
          </div>
        )
      default:
        return null
    }
  }

  // Render message content based on type
  const renderContent = () => {
    if (message.deleted) {
      return (
        <div className="italic text-muted-foreground">
          Message was deleted
        </div>
      )
    }

    if (isEditing) {
      return (
        <div className="flex flex-col gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            className="min-w-[200px]"
          />
          <div className="flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setIsEditing(false)
                setEditText(message.content)
              }}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleEditSave}
            >
              Save
            </Button>
          </div>
        </div>
      )
    }

    switch (message.type) {
      case 'image':
        return (
          <div className="space-y-2">
            <Dialog>
              <DialogTrigger asChild>
                <div className="cursor-pointer">
                  <img 
                    src={message.mediaUrl}
                    alt="Shared image"
                    className="rounded-lg max-h-60 object-cover"
                  />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <img 
                  src={message.mediaUrl}
                  alt="Full size image"
                  className="w-full h-full object-contain"
                />
              </DialogContent>
            </Dialog>
            {message.content && message.content !== 'Sent an image' && (
              <p>{message.content}</p>
            )}
          </div>
        )
        
      case 'video':
        return (
          <div className="space-y-2">
            <video 
              src={message.mediaUrl}
              className="rounded-lg max-h-60 w-full"
              controls
            />
            {message.content && message.content !== 'Sent a video' && (
              <p>{message.content}</p>
            )}
          </div>
        )
        
      case 'audio':
      case 'voice':
        return (
          <div className="space-y-2">
            <div className="bg-muted/50 rounded-full p-2">
              <audio 
                src={message.mediaUrl}
                controls 
                className="w-[200px]"
              />
            </div>
            {message.content && !message.content.startsWith('Voice message') && (
              <p>{message.content}</p>
            )}
          </div>
        )
        
      case 'document':
        return (
          <div className="space-y-2">
            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-3">
              <FileText className="h-8 w-8 flex-shrink-0 text-primary/70" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {message.fileName || 'Document'}
                </p>
                {message.fileSize && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(message.fileSize / 1024)} KB
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(message.mediaUrl, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            {message.content && message.content !== 'Sent a document' && (
              <p>{message.content}</p>
            )}
          </div>
        )
        
      default:
        return <p>{message.content}</p>
    }
  }

  return (
    <div 
      className={cn(
        'flex gap-2 px-4',
        isSequential ? 'mt-1' : 'mt-6',
        isCurrentUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Sender Avatar */}
      {!isCurrentUser && showAvatar && !isSequential ? (
        <Avatar className="h-8 w-8 flex-shrink-0">
          {teamMemberAvatar ? (
            <AvatarImage src={teamMemberAvatar} alt={message.senderName} />
          ) : (
            <AvatarFallback>
              {message.senderName.substring(0, 2)}
            </AvatarFallback>
          )}
        </Avatar>
      ) : !isCurrentUser && !showAvatar ? null : !isCurrentUser ? (
        <div className="w-8" />
      ) : null}

      {/* Message Content */}
      <div className={cn(
        'group relative max-w-[70%]',
        isCurrentUser ? 'items-end' : 'items-start'
      )}>
        {/* Sender Name - Only in Group Chats */}
        {isGroupChat && !isCurrentUser && !isSequential && (
          <p className="text-xs font-medium ml-1 mb-1 text-primary">
            {message.senderName}
          </p>
        )}

        {/* Message Bubble */}
        <div className={cn(
          'px-3 py-2 rounded-2xl',
          isCurrentUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted',
          message.replyTo && 'mt-2'
        )}>
          {/* Reply Reference */}
          {message.replyTo && (
            <div className="mb-1 pb-1 border-b border-primary/20">
              <p className="text-xs font-medium opacity-80">
                Replying to {message.replyTo.sender}
              </p>
              <p className="text-sm line-clamp-1 opacity-70">
                {message.replyTo.content}
              </p>
            </div>
          )}

          {/* Message Content */}
          {renderContent()}

          {/* Message Metadata */}
          <div className={cn(
            "flex items-center gap-1 text-xs mt-1",
            isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {message.edited && (
              <span className="opacity-70">(edited)</span>
            )}
            <span>{formatMessageTime(message.timestamp)}</span>
            {renderStatus()}
          </div>
        </div>

        {/* Message Actions */}
        <div className={cn(
          "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5",
          isCurrentUser ? '-left-20' : '-right-20',
          message.replyTo ? 'mt-2' : '0'
        )}>
          {/* Quick Reactions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <span className="text-lg">😊</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align={isCurrentUser ? 'end' : 'start'} 
              className="p-1"
            >
              <div className="grid grid-cols-6 gap-1">
                {['👍', '❤️', '😂', '😮', '😢', '👏'].map(emoji => (
                  <DropdownMenuItem
                    key={emoji}
                    className="cursor-pointer h-8 w-8 p-0 flex items-center justify-center"
                    onClick={() => reactToMessage(message.id, emoji)}
                  >
                    {emoji}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reply Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full"
                  onClick={() => replyToMessage(message.id)}
                >
                  <Reply className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isCurrentUser ? 'left' : 'right'}>
                Reply
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align={isCurrentUser ? 'end' : 'start'}
              className="w-48"
            >
              {isCurrentUser && !message.deleted && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Message
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => deleteMessage(message.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Message
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {!message.deleted && (
                <>
                  <DropdownMenuItem 
                    onClick={() => navigator.clipboard.writeText(message.content)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => replyToMessage(message.id)}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => forwardMessage(message.id, ['dummy-chat-id'])}
                  >
                    <Forward className="h-4 w-4 mr-2" />
                    Forward
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => starMessage(message.id)}>
                    <Star className="h-4 w-4 mr-2" />
                    Star Message
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Message Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn(
            "flex mt-1",
            isCurrentUser ? 'justify-end' : 'justify-start'
          )}>
            <div className="bg-background/95 backdrop-blur-sm border rounded-full px-1.5 py-0.5 flex gap-0.5">
              {message.reactions.map((reaction, index) => (
                <span key={index} className="text-sm">{reaction.emoji}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Current User Avatar */}
      {isCurrentUser && showAvatar && !isSequential ? (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback>ME</AvatarFallback>
        </Avatar>
      ) : isCurrentUser && !showAvatar ? null : isCurrentUser ? (
        <div className="w-8" />
      ) : null}
    </div>
  )
}