'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Smile, Paperclip, Mic, X, Image, File, Play, Pause, Stop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger
} from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useChat, ReplyInfo, MessageType } from '@/app/context/chat/ChatContext'

interface ChatMessageInputProps {
  disabled?: boolean
}

export function ChatMessageInput({ disabled = false }: ChatMessageInputProps) {
  const { sendMessage, activeChat, replyToMessage, activeReply, setActiveReply, startTyping, stopTyping } = useChat()
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showAttachOptions, setShowAttachOptions] = useState(false)
  const [previewFile, setPreviewFile] = useState<{
    file: File,
    url: string,
    type: MessageType
  } | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeChat])
  
  // Set up typing indicators
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout | null = null
    
    if (message.length > 0) {
      startTyping()
      
      // Reset typing indicator after 5 seconds of inactivity
      if (typingTimeout) clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => {
        stopTyping()
      }, 5000)
    } else {
      stopTyping()
    }
    
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout)
    }
  }, [message, startTyping, stopTyping])
  
  const handleSendMessage = () => {
    if (!message.trim() && !previewFile) return
    
    if (previewFile) {
      // Send file message
      sendMessage(
        message || `Sent a ${previewFile.type}`, 
        previewFile.type, 
        activeReply || undefined, 
        previewFile.url,
        previewFile.file.name,
        previewFile.file.size
      )
      setPreviewFile(null)
    } else {
      // Send text message
      sendMessage(message, 'text', activeReply || undefined)
    }
    
    setMessage('')
    stopTyping()
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    
    // Handle Escape key to clear reply
    if (e.key === 'Escape') {
      if (activeReply) {
        e.preventDefault()
        setActiveReply(null)
      }
    }
  }
  
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Determine file type for message
    let messageType: MessageType = 'document'
    if (file.type.startsWith('image/')) messageType = 'image'
    if (file.type.startsWith('video/')) messageType = 'video'
    if (file.type.startsWith('audio/')) messageType = 'audio'
    
    // Create file preview
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
  
  const startRecording = () => {
    setIsRecording(true)
    setRecordingTime(0)
    
    // Start timer
    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)
    
    setRecordingInterval(interval)
    
    // In a real app, we would start the actual recording here
    console.log('Started recording voice message')
  }
  
  const stopRecording = (send: boolean = true) => {
    setIsRecording(false)
    
    // Clear timer
    if (recordingInterval) {
      clearInterval(recordingInterval)
      setRecordingInterval(null)
    }
    
    if (send) {
      // In a real app, we would send the actual voice recording
      // For the demo, we'll just send a placeholder message
      sendMessage(`Voice message (${formatRecordingTime(recordingTime)})`, 'voice')
    }
    
    setRecordingTime(0)
  }
  
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="border-t bg-background p-2 md:p-3">
      {/* Reply Preview */}
      {activeReply && (
        <div className="flex items-center bg-muted/40 mb-2 p-2 rounded-md">
          <div className="flex-1 overflow-hidden">
            <p className="text-xs text-muted-foreground">
              Replying to <span className="font-medium">{activeReply.sender}</span>
            </p>
            <p className="text-sm truncate">{activeReply.content}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => setActiveReply(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* File Preview */}
      {previewFile && (
        <div className="flex items-center bg-muted/40 mb-2 p-2 rounded-md">
          <div className="flex-1 overflow-hidden">
            {previewFile.type === 'image' && (
              <div className="relative h-20 w-20 rounded overflow-hidden mr-2">
                <img 
                  src={previewFile.url} 
                  alt="Preview" 
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {previewFile.type.charAt(0).toUpperCase() + previewFile.type.slice(1)}
            </p>
            <p className="text-sm truncate">{previewFile.file.name}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => setPreviewFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Message Input */}
      <div className="flex items-center gap-1.5">
        {/* Emoji Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9 hover:bg-muted flex-shrink-0" 
              disabled={disabled}
            >
              <Smile className="h-5 w-5" />
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
                  onClick={() => handleEmojiSelect(emoji)}
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
              className="rounded-full h-9 w-9 hover:bg-muted flex-shrink-0" 
              disabled={disabled}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
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
                <span>Photo or Video</span>
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
                <span>Document</span>
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
      
        {/* Text Input or Voice Recording UI */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-muted/40 rounded-md px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm">Recording... {formatRecordingTime(recordingTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full" 
                      onClick={() => stopRecording(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cancel</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-primary" 
                      onClick={() => stopRecording(true)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ) : (
          <Input
            ref={inputRef}
            className="flex-1 h-10 focus-visible:ring-0 focus-visible:ring-offset-0 border-0 bg-muted/40 rounded-md"
            placeholder={disabled ? "You can't send messages to this chat" : "Type a message"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        )}
      
        {/* Send Button or Record Button */}
        {message.trim() || previewFile ? (
          <Button 
            className="rounded-full h-9 w-9 p-0 bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0" 
            onClick={handleSendMessage}
            disabled={disabled}
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-9 w-9 hover:bg-muted flex-shrink-0" 
            onClick={startRecording}
            disabled={disabled}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
} 