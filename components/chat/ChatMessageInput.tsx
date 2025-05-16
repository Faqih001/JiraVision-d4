'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Smile, Paperclip, Mic, Send, Image, File, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { useChat, ReplyInfo, MessageType } from '@/app/context/chat/ChatContext'
import { Badge } from '@/components/ui/badge'

interface ChatMessageInputProps {
  disabled?: boolean
}

interface FilePreview {
  file: File
  url: string
  type: MessageType
}

export function ChatMessageInput({ disabled = false }: ChatMessageInputProps) {
  const { 
    sendMessage, 
    activeChat, 
    replyToMessage, 
    activeReply, 
    setActiveReply, 
    startTyping, 
    stopTyping 
  } = useChat()

  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null)
  const [previewFile, setPreviewFile] = useState<FilePreview | null>(null)
  const [showAttachOptions, setShowAttachOptions] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Focus input on mount and active chat change
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [activeChat, disabled])
  
  // Handle typing indicators
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout | null = null
    
    if (message.length > 0) {
      startTyping()
      
      // Reset typing indicator after 3 seconds of inactivity
      if (typingTimeout) clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => {
        stopTyping()
      }, 3000)
    } else {
      stopTyping()
    }
    
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout)
    }
  }, [message, startTyping, stopTyping])

  // Format recording duration
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Determine message type
    let messageType: MessageType = 'document'
    if (file.type.startsWith('image/')) messageType = 'image'
    if (file.type.startsWith('video/')) messageType = 'video'
    if (file.type.startsWith('audio/')) messageType = 'audio'
    
    // Create preview
    const fileUrl = URL.createObjectURL(file)
    setPreviewFile({
      file,
      url: fileUrl,
      type: messageType
    })
    
    // Focus input for optional caption
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }
  
  // Start voice recording
  const startRecording = () => {
    setIsRecording(true)
    setRecordingTime(0)
    
    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)
    
    setRecordingInterval(interval)
  }
  
  // Stop voice recording
  const stopRecording = (send: boolean = true) => {
    setIsRecording(false)
    
    if (recordingInterval) {
      clearInterval(recordingInterval)
      setRecordingInterval(null)
    }
    
    if (send && recordingTime > 0) {
      sendMessage(
        `Voice message (${formatRecordingTime(recordingTime)})`, 
        'voice',
        activeReply || undefined
      )
    }
    
    setRecordingTime(0)
  }
  
  // Send message
  const handleSend = () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage && !previewFile) return
    
    if (previewFile) {
      // Send file with optional caption
      sendMessage(
        trimmedMessage || `Sent a ${previewFile.type}`,
        previewFile.type,
        activeReply || undefined,
        previewFile.url,
        previewFile.file.name,
        previewFile.file.size
      )
      setPreviewFile(null)
    } else {
      // Send text message
      sendMessage(trimmedMessage, 'text', activeReply || undefined)
    }
    
    setMessage('')
    stopTyping()
  }
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      if (activeReply) {
        e.preventDefault()
        setActiveReply(null)
      }
    }
  }

  return (
    <div className="p-4 border-t bg-background">
      {/* Reply Preview */}
      {activeReply && (
        <div className="flex items-center bg-muted/40 rounded-lg p-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Replying to <span className="font-medium">{activeReply.sender}</span>
            </p>
            <p className="text-sm truncate">{activeReply.content}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-muted" 
            onClick={() => setActiveReply(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File Preview */}
      {previewFile && (
        <div className="flex items-center bg-muted/40 rounded-lg p-2 mb-2">
          {previewFile.type === 'image' && (
            <div className="relative h-16 w-16 rounded overflow-hidden mr-2">
              <img 
                src={previewFile.url} 
                alt="Preview" 
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="mb-1">
              {previewFile.type.charAt(0).toUpperCase() + previewFile.type.slice(1)}
            </Badge>
            <p className="text-sm truncate">{previewFile.file.name}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted" 
            onClick={() => setPreviewFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {/* Emoji Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10"
              disabled={disabled || isRecording}
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2">
            <div className="grid grid-cols-8 gap-1">
              {['😀', '😂', '😍', '🥰', '😎', '😊', '🙄', '😢', 
                '😡', '🤔', '👍', '👎', '❤️', '🔥', '🎉', '🙏',
                '👋', '💯', '🤝', '👏', '🤦‍♂️', '🤷‍♀️', '🙈', '💪'].map(emoji => (
                <Button 
                  key={emoji}
                  variant="ghost" 
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setMessage(prev => prev + emoji)
                    if (inputRef.current) inputRef.current.focus()
                  }}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Attachment Options */}
        <Popover open={showAttachOptions} onOpenChange={setShowAttachOptions}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full h-10 w-10"
              disabled={disabled || isRecording}
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="grid gap-1">
              <Button 
                variant="ghost"
                className="justify-start h-9" 
                onClick={() => {
                  setShowAttachOptions(false)
                  fileInputRef.current?.click()
                }}
              >
                <Image className="h-4 w-4 mr-2" />
                Photo or Video
              </Button>
              <Button 
                variant="ghost"
                className="justify-start h-9"
                onClick={() => {
                  setShowAttachOptions(false)
                  fileInputRef.current?.click()
                }}
              >
                <File className="h-4 w-4 mr-2" />
                Document
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          title="Upload file"
          aria-label="Upload file"
        />

        {/* Message Input or Recording UI */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-muted/40 rounded-full px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm">Recording... {formatRecordingTime(recordingTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full hover:bg-muted" 
                      onClick={() => stopRecording(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full hover:bg-muted text-primary"
                      onClick={() => stopRecording(true)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ) : (
          <Input
            ref={inputRef}
            placeholder={disabled ? "You can't send messages in this chat" : "Type a message"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1 h-10 focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/40"
          />
        )}

        {/* Send or Record Button */}
        {message.trim() || previewFile ? (
          <Button 
            size="icon"
            className="rounded-full h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSend}
            disabled={disabled}
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full h-10 w-10"
            onClick={startRecording}
            disabled={disabled}
          >
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  )
}