'use client'

import React, { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
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
import { Message, useChat } from '@/app/context/chat/ChatContext'

interface MessageBubbleProps {
  message: Message
  showAvatar?: boolean
  isGroupChat?: boolean
  isSequential?: boolean
  teamMemberAvatar?: string
}

export function MessageBubble({
  message,
  showAvatar = true,
  isGroupChat = false,
  isSequential = false,
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  const isCurrentUser = message.senderId === 1 // Current user's ID is hardcoded to 1
  
  // Determine message status icon
  const renderStatus = () => {
    if (!isCurrentUser) return null
    
    switch (message.status) {
      case 'sent':
        return <Check className="h-3.5 w-3.5 text-muted-foreground" />
      case 'delivered':
        return (
          <div className="flex">
            <Check className="h-3.5 w-3.5 text-muted-foreground" />
            <Check className="h-3.5 w-3.5 -ml-1.5 text-muted-foreground" />
          </div>
        )
      case 'read':
        return (
          <div className="flex text-blue-500">
            <Check className="h-3.5 w-3.5" />
            <Check className="h-3.5 w-3.5 -ml-1.5" />
          </div>
        )
      default:
        return null
    }
  }
  
  // Format time display
  const formatTime = (date: Date) => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'HH:mm') // Today: just show time
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday, ' + format(date, 'HH:mm')
    } else {
      return format(date, 'MMM d, HH:mm')
    }
  }
  
  // Handle editing message
  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.content) {
      editMessage(message.id, editText)
    }
    setIsEditing(false)
  }
  
  // Handle emoji reactions
  const handleEmoji = (emoji: string) => {
    reactToMessage(message.id, emoji)
    setShowEmojiPicker(false)
  }
  
  // Render message content based on message type
  const renderMessageContent = () => {
    // For deleted messages
    if (message.deleted) {
      return (
        <div className="italic text-muted-foreground">
          {message.content}
        </div>
      )
    }
    
    // For editing messages
    if (isEditing) {
      return (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="border rounded px-2 py-1 bg-background"
            autoFocus
            title="Edit message"
            aria-label="Edit message"
          />
          <div className="flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveEdit}
            >
              Save
            </Button>
          </div>
        </div>
      )
    }

    // For replies
    if (message.replyTo) {
      return (
        <div className="flex flex-col gap-1">
          <div className="bg-muted/50 rounded p-1.5 text-xs border-l-2 border-primary">
            <div className="font-medium">{message.replyTo.sender}</div>
            <div className="truncate">{message.replyTo.content}</div>
          </div>
          {renderMessageByType()}
        </div>
      )
    }
    
    return renderMessageByType()
  }
  
  // Render based on message type (text, image, document, etc.)
  const renderMessageByType = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="flex flex-col gap-1">
            <Dialog>
              <DialogTrigger asChild>
                <div className="cursor-pointer relative rounded-md overflow-hidden max-w-sm">
                  <img 
                    src={message.mediaUrl || '/placeholder-image.jpg'} 
                    alt="Shared image" 
                    className="rounded-md object-cover max-h-60"
                  />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="sr-only">Image Preview</DialogTitle>
                  <DialogDescription className="sr-only">Enlarged view of the shared image</DialogDescription>
                </DialogHeader>
                <div className="relative rounded overflow-hidden">
                  <img 
                    src={message.mediaUrl || '/placeholder-image.jpg'} 
                    alt="Enlarged image" 
                    className="w-full max-h-[80vh] object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
            {message.content !== `Sent a ${message.type}` && (
              <p className="mt-1">{message.content}</p>
            )}
          </div>
        )
        
      case 'video':
        return (
          <div className="flex flex-col gap-1">
            <video 
              src={message.mediaUrl}
              className="rounded-md max-w-sm max-h-60"
              controls
            />
            {message.content !== `Sent a ${message.type}` && (
              <p className="mt-1">{message.content}</p>
            )}
          </div>
        )
        
      case 'audio':
      case 'voice':
        return (
          <div className="flex flex-col gap-1">
            <div className="bg-muted/50 rounded-full p-2">
              <audio src={message.mediaUrl} controls className="w-full h-10" />
            </div>
            {message.content !== `Sent a ${message.type}` && 
             !message.content.startsWith('Voice message') && (
              <p className="mt-1">{message.content}</p>
            )}
          </div>
        )
        
      case 'document':
        return (
          <div className="flex flex-col gap-1">
            <div className="bg-muted/30 rounded-md p-3 flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary/70" />
              <div className="flex-1 overflow-hidden">
                <p className="font-medium truncate">{message.fileName || 'Document'}</p>
                <p className="text-xs text-muted-foreground">
                  {message.fileSize ? `${Math.round(message.fileSize / 1024)} KB` : ''}
                </p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {message.content !== `Sent a ${message.type}` && (
              <p className="mt-1">{message.content}</p>
            )}
          </div>
        )
        
      case 'text':
      default:
        return <p>{message.content}</p>
    }
  }
  
  // Render file icon based on file type
  const renderFileIcon = () => {
    switch (message.type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'video':
        return <Film className="h-4 w-4" />
      case 'audio':
      case 'voice':
        return <Mic className="h-4 w-4" />
      case 'document':
        return <File className="h-4 w-4" />
      default:
        return null
    }
  }
  
  return (
    <div 
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${
        isSequential ? 'mt-1' : 'mt-3'
      }`}
    >
      {/* Avatar for sender (only shown for first message in a sequence) */}
      {!isCurrentUser && showAvatar && !isSequential ? (
        <Avatar className="h-8 w-8 mr-2 flex-shrink-0 mt-1">
          {teamMemberAvatar ? (
            <AvatarImage src={teamMemberAvatar} alt={message.senderName} />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary">
              {message.senderName.substring(0, 2)}
            </AvatarFallback>
          )}
        </Avatar>
      ) : !isCurrentUser && !showAvatar ? null : !isCurrentUser ? (
        <div className="w-8 mr-2" />
      ) : null}
      
      <div className={`flex flex-col max-w-xs md:max-w-md lg:max-w-lg ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {/* Sender name for group chats */}
        {isGroupChat && !isCurrentUser && !isSequential && (
          <span className="text-xs font-medium ml-2 mb-1 text-primary">
            {message.senderName}
          </span>
        )}
        
        {/* Message bubble */}
        <div className="flex group relative">
          <div 
            className={`px-3 py-2 rounded-lg ${
              isCurrentUser 
                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                : 'bg-muted rounded-tl-none'
            }`}
          >
            {renderMessageContent()}
            
            {/* Message reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className={`flex mt-1 -mb-1 ${isCurrentUser ? 'justify-start' : 'justify-end'}`}>
                <div className="flex bg-background/80 backdrop-blur-sm rounded-full px-1 py-0.5 gap-0.5 border">
                  {message.reactions.map((reaction, index) => (
                    <span key={index} className="text-xs">{reaction.emoji}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Message metadata: edited indicator and timestamp */}
            <div className={`flex items-center text-xs mt-1 space-x-1 ${
              isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {message.edited && <span className="text-xs">(edited)</span>}
              <span>{formatTime(message.timestamp)}</span>
              {renderStatus()}
            </div>
          </div>
          
          {/* Message actions */}
          <div 
            className={`opacity-0 group-hover:opacity-100 transition-opacity absolute ${
              isCurrentUser ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
            } top-0 p-1 flex items-center gap-0.5`}
          >
            {/* Quick emoji reactions */}
            <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                  <span className="text-lg">😊</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isCurrentUser ? 'end' : 'start'} className="p-1">
                <div className="grid grid-cols-6 gap-1">
                  {['👍', '❤️', '😂', '😮', '😢', '👏'].map(emoji => (
                    <DropdownMenuItem
                      key={emoji}
                      className="focus:bg-muted cursor-pointer h-8 w-8 p-0 flex items-center justify-center"
                      onClick={() => handleEmoji(emoji)}
                    >
                      {emoji}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Reply */}
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
                  <p>Reply</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isCurrentUser ? 'end' : 'start'}>
                {isCurrentUser && !message.deleted && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMessage(message.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                  <Copy className="h-4 w-4 mr-2" />
                  <span>Copy</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => replyToMessage(message.id)}>
                  <Reply className="h-4 w-4 mr-2" />
                  <span>Reply</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => forwardMessage(message.id, ['dummy-id'])}>
                  <Forward className="h-4 w-4 mr-2" />
                  <span>Forward</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => starMessage(message.id)}>
                  <Star className="h-4 w-4 mr-2" />
                  <span>Star</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Avatar for current user */}
      {isCurrentUser && showAvatar && !isSequential ? (
        <Avatar className="h-8 w-8 ml-2 flex-shrink-0 mt-1">
          <AvatarFallback className="bg-primary/10 text-primary">
            ME
          </AvatarFallback>
        </Avatar>
      ) : isCurrentUser && !showAvatar ? null : isCurrentUser ? (
        <div className="w-8 ml-2" />
      ) : null}
    </div>
  )
} 