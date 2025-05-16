'use client'

import { useState } from "react"
import { MessageSquare, Plus, ArrowLeft, MoreVertical, Phone, Video, Shield, Bell } from "lucide-react"
import { ChatProvider, useChat } from "@/app/context/chat/ChatContext"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NewChatModal } from "@/components/chat/NewChatModal"
import { ChatMessageInput } from "@/components/chat/ChatMessageInput"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { ChatList } from "@/components/chat/ChatList"

interface Team {
  id: number
  name: string
  email: string
  role: string
  department: string
  status: string
  skills: string[]
  avatar: string
  utilization: number
}

function ChatWindow({ mobileView, setMobileView }: { 
  mobileView: 'list' | 'chat'
  setMobileView: (view: 'list' | 'chat') => void 
}) {
  const { activeChat, messages } = useChat()
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  
  if (!activeChat) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="max-w-md text-center">
          <div className="bg-primary/10 text-primary rounded-full p-6 mx-auto mb-6 w-24 h-24 flex items-center justify-center">
            <MessageSquare className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No chat selected</h2>
          <p className="text-muted-foreground mb-6">
            Choose a chat from the list or start a new conversation
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full lg:hidden"
            onClick={() => setMobileView('list')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={activeChat.avatar} alt={activeChat.name} />
              <AvatarFallback>
                {activeChat.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{activeChat.name}</h3>
              {activeChat.online && activeChat.type === 'individual' && (
                <p className="text-xs text-muted-foreground">Online</p>
              )}
              {activeChat.type === 'group' && (
                <p className="text-xs text-muted-foreground">
                  {activeChat.participants.length} members
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {activeChat.type === 'individual' && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                      <Phone className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start voice call</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                      <Video className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start video call</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                View profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNotificationSettings(true)}>
                Notifications settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                Search messages
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Block contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map((message, i) => {
            const isSequential = i > 0 && 
              messages[i - 1].senderId === message.senderId && 
              new Date(message.timestamp).getTime() - new Date(messages[i - 1].timestamp).getTime() < 120000

            return (
              <MessageBubble
                key={message.id}
                message={message}
                showAvatar={!isSequential}
                isSequential={isSequential}
                isLast={i === messages.length - 1}
                isGroupChat={activeChat.type === 'group'}
              />
            )
          })}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <ChatMessageInput disabled={activeChat.isBlocked} />

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowNotificationSettings(false)}
              >
                <span className="sr-only">Close</span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {/* Add notification settings */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const defaultTeamMembers: Team[] = [
  { 
    id: 1, 
    name: 'Alice Smith', 
    email: 'alice@example.com',
    role: 'Frontend Developer',
    department: 'Engineering',
    status: 'active',
    skills: ['React', 'TypeScript'],
    avatar: '',
    utilization: 85
  },
  { 
    id: 2, 
    name: 'Bob Wilson', 
    email: 'bob@example.com',
    role: 'Backend Developer',
    department: 'Engineering',
    status: 'active',
    skills: ['Node.js', 'Python'],
    avatar: '',
    utilization: 70
  },
  { 
    id: 3, 
    name: 'Carol Brown', 
    email: 'carol@example.com',
    role: 'UI/UX Designer',
    department: 'Design',
    status: 'active',
    skills: ['Figma', 'UI Design'],
    avatar: '',
    utilization: 75
  },
  { 
    id: 4, 
    name: 'Mike Johnson', 
    email: 'mike@example.com',
    role: 'Project Manager',
    department: 'Management',
    status: 'active',
    skills: ['Project Management', 'Agile'],
    avatar: '',
    utilization: 90
  }
]

export default function ChatPage() {
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  
  return (
    <ChatProvider teamMembers={defaultTeamMembers}>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {/* Chat List Sidebar */}
        <div className={cn(
          "w-full lg:w-96 border-r lg:flex flex-col bg-card",
          mobileView === 'list' ? 'flex' : 'hidden'
        )}>
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Chats</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="rounded-full"
                      onClick={() => setShowNewChatModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New chat</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <ChatList />
        </div>

        {/* Chat Window */}
        <div className={cn(
          "flex-1 lg:flex flex-col",
          mobileView === 'chat' ? 'flex' : 'hidden'
        )}>
          <ChatWindow 
            mobileView={mobileView} 
            setMobileView={setMobileView}
          />
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal onClose={() => setShowNewChatModal(false)} />
      )}
    </ChatProvider>
  )
}
