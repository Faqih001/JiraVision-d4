"use client"

import React, { useEffect, useState, useRef } from "react"
import { Shield, Info, Lock, Bell, Phone, Video, Search, MoreVertical, ArrowLeft, Send, Paperclip, Smile, Mic, Image as ImageIcon, FileIcon, X, Plus, Check, Reply, Edit2, Trash2, Download } from "lucide-react"
import { ChatProvider, useChat, Message, Chat } from "@/app/context/chat/ChatContext"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TeamMember } from "@/types/team"

// Placeholder function to simulate fetching team members
const fetchTeamMembers = async (): Promise<TeamMember[]> => {
  // In a real app, this would be an API call
  return [
    {
      id: 1,
      name: "You (Current User)",
      role: "Product Manager",
      email: "you@example.com",
      department: "Product",
      status: "active",
      skills: ["Product Management", "UX", "Strategy"],
      utilization: 80,
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      id: 2,
      name: "Herbert Strayhorn",
      role: "Project Lead",
      email: "herbert.strayhorn@example.com",
      phone: "+1 (555) 234-5678",
      department: "Management",
      status: "busy",
      skills: ["Leadership", "Strategy", "Project Management"],
      utilization: 95,
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      id: 3,
      name: "Jitu Chauhan",
      role: "Frontend Developer",
      email: "jitu.chauhan@example.com",
      department: "Engineering",
      status: "online",
      skills: ["React", "TypeScript", "CSS", "UI Design"],
      utilization: 85,
      avatar: "https://randomuser.me/api/portraits/men/44.jpg"
    },
    {
      id: 4,
      name: "Denise Reece",
      role: "UX Designer",
      email: "denise.reece@example.com",
      department: "Design",
      status: "active",
      skills: ["Figma", "User Research", "Wireframing", "Prototyping"],
      utilization: 90,
      avatar: "https://randomuser.me/api/portraits/women/65.jpg"
    },
    {
      id: 5,
      name: "Kevin White",
      role: "Backend Developer",
      email: "kevin.white@example.com",
      phone: "+1 (555) 987-6543",
      department: "Engineering",
      status: "active",
      skills: ["Node.js", "Express", "PostgreSQL", "API Design"],
      utilization: 100,
      avatar: "https://randomuser.me/api/portraits/men/22.jpg"
    },
    {
      id: 6,
      name: "Mary Newton",
      role: "Project Manager",
      email: "mary.newton@example.com",
      phone: "+1 (555) 456-7890",
      department: "Product",
      status: "active",
      skills: ["Agile", "JIRA", "Roadmapping", "Stakeholder Management"],
      utilization: 75,
      avatar: "https://randomuser.me/api/portraits/women/45.jpg"
    },
    {
      id: 7,
      name: "Richard Sousa",
      role: "QA Engineer",
      email: "richard.sousa@example.com",
      department: "Engineering",
      status: "away",
      skills: ["Test Automation", "Selenium", "Cypress", "Manual Testing"],
      utilization: 60,
      avatar: "https://randomuser.me/api/portraits/men/46.jpg"
    },
    {
      id: 8,
      name: "Melissa Westbrook",
      role: "UI Designer",
      email: "melissa.westbrook@example.com",
      department: "Design",
      status: "active",
      skills: ["UI Design", "Wireframing", "Prototyping"],
      utilization: 70,
      avatar: "https://randomuser.me/api/portraits/women/28.jpg"
    },
    {
      id: 9,
      name: "Christy Obrien",
      role: "UX Researcher",
      email: "christy.obrien@example.com",
      department: "Design",
      status: "active",
      skills: ["User Research", "User Testing", "Wireframing"],
      utilization: 85,
      avatar: "https://randomuser.me/api/portraits/women/36.jpg"
    },
    {
      id: 10,
      name: "Joe Lindahl",
      role: "DevOps Engineer",
      email: "joe.lindahl@example.com",
      department: "Engineering",
      status: "active",
      skills: ["Docker", "Kubernetes", "AWS", "CI/CD"],
      utilization: 90,
      avatar: "https://randomuser.me/api/portraits/men/53.jpg"
    },
  ]
}

export default function ChatPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const { toast } = useToast()

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const members = await fetchTeamMembers()
        setTeamMembers(members)
        setLoading(false)
      } catch (error) {
        console.error("Error loading team members:", error)
        toast({
          title: "Error",
          description: "Failed to load team members. Please try again.",
          variant: "destructive",
        })
      }
    }

    loadTeamMembers()
  }, [toast])

  // Check window size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setMobileView(window.innerWidth < 768 ? 'list' : 'chat')
      }
    }

    // Initialize
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <ChatProvider teamMembers={teamMembers}>
      <div className="h-[calc(95vh-4rem)] flex flex-col relative overflow-hidden">
        <div className="border-b p-4 flex items-center justify-between bg-background">
          <h1 className="text-2xl font-bold">Chat</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Chat List (Left Side) */}
          <div 
            className={`${
              mobileView === 'chat' ? 'hidden md:block' : 'w-full'
            } md:w-80 lg:w-96 border-r border-gray-200 flex-shrink-0 overflow-hidden`}
          >
            <CustomChatList />
          </div>
          
          {/* Chat Area (Right Side) */}
          <ChatWindow 
            mobileView={mobileView}
            setMobileView={setMobileView}
          />
        </div>
      </div>
    </ChatProvider>
  )
}

function CustomChatList() {
  const { chats, activeChat, setActiveChat, connectionStatus, searchChats } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('recent')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Filter chats based on search query and active tab
  const filteredChats = searchQuery.trim() ? 
    searchChats(searchQuery) : 
    chats.filter(chat => activeTab === 'recent' ? !chat.isArchived : chat.isArchived)

  // Format timestamp for display
  const formatTime = (timestamp: Date | undefined) => {
    if (!timestamp) return ''
    
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

  // Get chat preview text
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search box */}
      <div className="p-3">
        <div className="relative">
          <Input 
            placeholder="Search people, group and messages" 
            className={`pl-9 rounded-full ${isSearchFocused ? 'bg-white border-gray-300' : 'bg-gray-100 border-transparent'} transition-colors`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <Tabs defaultValue="recent" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-12 rounded-none bg-transparent">
            <TabsTrigger value="recent" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:shadow-none data-[state=active]:text-purple-500">
              Recent
            </TabsTrigger>
            <TabsTrigger value="contact" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:shadow-none data-[state=active]:text-purple-500">
              Contact
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="font-medium text-base">No conversations found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'Start a new chat to begin messaging'}
            </p>
            {!searchQuery && (
              <Button className="mt-4" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = activeChat?.id === chat.id
            const statusColor = chat.type === 'individual' ? 
              (chat.online ? 'bg-green-500' : chat.participants.find(id => id !== 1) === 2 ? 'bg-red-500' : 'bg-gray-400') : ''
            
            return (
              <div 
                key={chat.id}
                className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  isActive ? 'bg-blue-50' : ''
                }`}
                onClick={() => setActiveChat(chat)}
              >
                <div className="relative mr-3">
                  <Avatar className="h-10 w-10">
                    {chat.avatar ? (
                      <AvatarImage src={chat.avatar} alt={chat.name} />
                    ) : (
                      <AvatarFallback className="bg-gray-200">
                        {chat.name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {chat.type === 'individual' && (
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${statusColor} border-2 border-white rounded-full`}></span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex justify-between">
                    <h4 className="font-medium text-sm truncate">{chat.name}</h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {chat.lastMessageTime || (chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500 truncate flex-1">
                      {chat.typing ? (
                        <span className="italic text-primary">typing...</span>
                      ) : (
                        getChatPreview(chat)
                      )}
                    </p>
                    {chat.unreadCount > 0 && (
                      <div className="ml-2 bg-primary text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 hover:opacity-100 focus:opacity-100">
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

interface ChatWindowProps {
  mobileView: 'list' | 'chat'
  setMobileView: (view: 'list' | 'chat') => void
}

function ChatWindow({ mobileView, setMobileView }: ChatWindowProps) {
  const { activeChat, messages, sendMessage, getParticipants } = useChat()
  const messageInputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newMessage, setNewMessage] = useState('')
  const teamMembers = activeChat ? getParticipants(activeChat.id) : []
  
  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])
  
  // Show empty state if no chat is selected
  if (!activeChat) {
    return (
      <div 
        className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col items-center justify-center bg-gray-50`}
      >
        <div className="text-center p-8 max-w-md">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 mb-4">
            <Lock className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">Select a conversation</h3>
          <p className="text-gray-500 mb-6">
            Choose a contact from the sidebar to start chatting
          </p>
          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setMobileView('list')}
          >
            Select a conversation
          </Button>
        </div>
      </div>
    )
  }

  // Get the contact avatar and status
  const contactId = activeChat.participants.find(id => id !== 1)
  const contact = teamMembers.find(m => m.id === contactId)
  const isOnline = activeChat.online || contact?.status === 'online'
  const isBusy = contact?.status === 'busy'
  
  // Handle sending message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage)
      setNewMessage('')
    }
  }
  
  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Determine message type based on file type
    let messageType: 'image' | 'video' | 'document' | 'audio' = 'document'
    if (file.type.startsWith('image/')) messageType = 'image'
    if (file.type.startsWith('video/')) messageType = 'video'
    if (file.type.startsWith('audio/')) messageType = 'audio'
    
    // Create URL for preview
    const fileUrl = URL.createObjectURL(file)
    
    // Send message with file
    sendMessage(
      file.name,
      messageType,
      undefined,
      fileUrl,
      file.name,
      file.size
    )
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  return (
    <div 
      className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col relative bg-white overflow-hidden`}
    >
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white z-10 flex-shrink-0">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-2 rounded-full"
            onClick={() => setMobileView('list')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <div className="relative mr-3">
              <Avatar className="h-10 w-10">
                {contact?.avatar ? (
                  <AvatarImage src={contact.avatar} alt={contact.name} />
                ) : (
                  <AvatarFallback className="bg-gray-200">
                    {activeChat.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${isOnline ? 'bg-green-500' : isBusy ? 'bg-red-500' : 'bg-gray-400'} border-2 border-white rounded-full`}></span>
            </div>
            <div>
              <h2 className="font-medium text-base">{activeChat.name}</h2>
              <p className="text-xs text-gray-500">
                {activeChat.typing ? (
                  <span className="text-primary italic">typing...</span>
                ) : isBusy ? 'Busy' : isOnline ? 'Online' : ''}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full text-gray-500">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-gray-500">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-gray-500">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div 
        ref={scrollAreaRef}
        className="flex-1 p-4 bg-white overflow-y-auto"
      >
        <div className="max-w-3xl w-full mx-auto">
          {messages.map((message, index) => {
            // Fake timestamps from the reference image
            let timestamp = message.timestamp;
            if (message.senderId === 2 && message.content.includes("Hello, Setup the github repo")) {
              timestamp = new Date();
              timestamp.setHours(9, 35, 0);
            } else if (message.senderId === 1 && message.content.includes("Yes, Currently working")) {
              timestamp = new Date();
              timestamp.setHours(9, 39, 0);
            } else if (message.senderId === 2 && message.content === "Thank you") {
              timestamp = new Date();
              timestamp.setHours(9, 42, 0);
            } else if (message.senderId === 1 && message.content === "You are most welcome.") {
              timestamp = new Date();
              timestamp.setHours(9, 48, 0);
            } else if (message.senderId === 2 && message.content.includes("After complete this")) {
              timestamp = new Date();
              timestamp.setHours(9, 50, 0);
            } else if (message.senderId === 1 && message.content.includes("Yes, we work on the react")) {
              timestamp = new Date();
              timestamp.setHours(9, 52, 0);
            }

            return (
              <div 
                key={message.id} 
                className={`flex mb-4 ${message.senderId === 1 ? 'justify-end' : 'justify-start'}`}
              >
                {message.senderId !== 1 && (
                  <div className="flex-shrink-0 mr-2 self-start">
                    <Avatar className="h-8 w-8">
                      {contact?.avatar ? (
                        <AvatarImage src={contact.avatar} alt={contact.name} />
                      ) : (
                        <AvatarFallback className="bg-gray-200">
                          {activeChat.name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>
                )}
                
                <div className={`relative max-w-xs ${message.senderId === 1 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-black'} px-4 py-2 rounded-3xl ${message.senderId === 1 ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                  {message.content}
                  
                  {/* Message actions */}
                  <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {message.senderId === 1 && (
                  <div className="flex-shrink-0 ml-2 self-start">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                    </Avatar>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Message Input */}
      <div className="p-3 bg-white flex-shrink-0 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,application/*"
            className="hidden"
            aria-label="Upload file"
            title="Upload file"
          />
          
          <div className="flex-1 bg-gray-100 rounded-full flex items-center px-3 py-1">
            <Button variant="ghost" size="icon" className="rounded-full text-gray-500 h-8 w-8" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Input
              placeholder="Type a New Message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="flex-1 border-0 bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              ref={messageInputRef}
            />
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full text-gray-500 h-8 w-8">
                <Smile className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full text-gray-500 h-8 w-8">
                <Mic className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <Button 
            size="icon" 
            className="bg-purple-600 text-white hover:bg-purple-700 rounded-full h-10 w-10"
            onClick={handleSendMessage}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
