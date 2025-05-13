"use client"

import React, { useEffect, useState, useRef } from "react"
import { Shield, Info, Lock, Bell, Phone, Video, Search, MoreVertical, ArrowLeft, Send, Paperclip, Smile, Mic, Image as ImageIcon, FileIcon, X, Plus, Check, Reply, Edit2, Trash2, Download, MessageSquare } from "lucide-react"
import { ChatProvider, useChat, Message, Chat, ChatContextType } from "@/app/context/chat/ChatContext"
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

// Add missing properties to Chat type
interface EnhancedChat extends Chat {
  preview?: string
  lastMessageTime?: string
  online?: boolean
}

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
            <Button variant="outline" size="icon">
              <Shield className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {(mobileView === 'list' || window.innerWidth >= 768) && (
            <CustomChatList />
          )}
          
          {(mobileView === 'chat' || window.innerWidth >= 768) && (
            <ChatWindow mobileView={mobileView} setMobileView={setMobileView} />
          )}
        </div>
      </div>
    </ChatProvider>
  )
}

function CustomChatList() {
  const { chats, activeChat, setActiveChat, connectionStatus } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  
  useEffect(() => {
    // Fetch team members when component mounts
    const loadTeamMembers = async () => {
      const members = await fetchTeamMembers()
      setTeamMembers(members.filter(member => member.id !== 1)) // Exclude current user
    }
    
    loadTeamMembers()
  }, [])

  // Filter chats based on search query
  const filteredChats = searchQuery
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((chat as EnhancedChat).preview && (chat as EnhancedChat).preview!.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (chat.lastMessage && chat.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats

  // Format time for display
  const formatTime = (timestamp: Date | undefined) => {
    if (!timestamp) return ''
    
    const now = new Date()
    const messageDate = new Date(timestamp)
    
    // If same day, return time
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    // If within a week, return day name
    const dayDiff = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
    if (dayDiff < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' })
    }
    
    // Otherwise return date
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Get chat preview text
  const getChatPreview = (chat: Chat) => {
    const enhancedChat = chat as EnhancedChat
    if (enhancedChat.preview) return enhancedChat.preview
    
    if (chat.lastMessage) {
      if (chat.lastMessage.deleted) return 'This message was deleted'
      if (chat.lastMessage.type === 'text') return chat.lastMessage.content
      if (chat.lastMessage.type === 'image') return '📷 Photo'
      if (chat.lastMessage.type === 'video') return '📹 Video'
      if (chat.lastMessage.type === 'document') return '📄 Document'
      if (chat.lastMessage.type === 'audio') return '🎵 Audio'
      if (chat.lastMessage.type === 'voice') return '🎤 Voice message'
    }
    
    return 'Start a conversation'
  }

  return (
    <div className="w-full md:w-80 lg:w-96 border-r flex flex-col h-full bg-white">
      {/* Search and new chat */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9 bg-muted/40 border rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            size="icon" 
            variant="outline" 
            className="rounded-full"
            onClick={() => setShowNewChatModal(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Connection status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
            }`}></div>
            <p className="text-xs text-muted-foreground">
              {
                connectionStatus === 'connected' ? 'Connected' : 
                connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'
              }
            </p>
          </div>
        </div>
      </div>
      
      {/* Chat tabs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="recent" className="flex-1">Recent</TabsTrigger>
          <TabsTrigger value="contacts" className="flex-1">Contacts</TabsTrigger>
        </TabsList>
        
        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No chats found' : 'No recent chats'}
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                className={`flex items-center p-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                  activeChat?.id === chat.id ? 'bg-muted/40' : ''
                }`}
                onClick={() => setActiveChat(chat)}
              >
                <div className="relative mr-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {(chat as EnhancedChat).online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium truncate">{chat.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {(chat as EnhancedChat).lastMessageTime || formatTime(chat.lastMessage?.timestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground truncate">
                      {getChatPreview(chat)}
                    </p>
                    <div className="flex items-center">
                      {chat.unreadCount > 0 && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-xs text-white">
                          {chat.unreadCount}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Pin</DropdownMenuItem>
                          <DropdownMenuItem>{chat.isMuted ? 'Unmute' : 'Mute'}</DropdownMenuItem>
                          <DropdownMenuItem>{chat.isArchived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Clear chat</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Tabs>
      
      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">New Chat</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewChatModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-9"
              />
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
              {teamMembers.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center p-3 hover:bg-muted/30 rounded-md cursor-pointer"
                  onClick={() => {
                    // Here you would implement logic to start a new chat with this member
                    // For now, just close the modal
                    setShowNewChatModal(false)
                  }}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowNewChatModal(false)}>Cancel</Button>
              <Button>Create Group</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ChatWindowProps {
  mobileView: 'list' | 'chat'
  setMobileView: (view: 'list' | 'chat') => void
}

function ChatWindow({ mobileView, setMobileView }: ChatWindowProps) {
  const { activeChat, sendMessage, messages, getParticipants, startTyping, stopTyping, activeReply, setActiveReply } = useChat()
  const [messageInput, setMessageInput] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const participants = activeChat ? getParticipants(activeChat.id) : []
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Scroll to bottom on new messages
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    // For demo purposes just use the first file
    const file = files[0]
    
    // Determine file type
    let messageType: 'image' | 'video' | 'document' | 'audio' = 'document'
    if (file.type.startsWith('image/')) messageType = 'image'
    else if (file.type.startsWith('video/')) messageType = 'video'
    else if (file.type.startsWith('audio/')) messageType = 'audio'
    
    // Create object URL for preview
    const fileUrl = URL.createObjectURL(file)
    
    // Send message with file attachment
    sendMessage(
      file.name,
      messageType,
      activeReply || undefined,
      fileUrl,
      file.name,
      file.size
    )
    
    // Reset the file input
    if (fileInputRef.current) fileInputRef.current.value = ''
    
    // Close attachment menu
    setAttachmentMenuOpen(false)
    
    // Clear reply if there is one
    if (activeReply) setActiveReply(null)
  }
  
  // Handle recording voice message
  const handleRecordVoice = () => {
    if (isRecording) {
      // Stop recording - in a real app, this would save the audio and send it
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      
      // Send a dummy voice message
      sendMessage(
        'Voice message',
        'voice',
        activeReply || undefined,
        '/dummy-voice.mp3',
        'voice-message.mp3',
        120000
      )
      
      setRecordingTime(0)
    } else {
      // Start recording - in a real app, this would activate the microphone
      setIsRecording(true)
      
      // Simulate recording time
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
  }
  
  // Handle send message
  const handleSendMessage = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput, 'text', activeReply || undefined)
      setMessageInput('')
      
      // Clear reply if there is one
      if (activeReply) setActiveReply(null)
    }
  }
  
  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // If no active chat, show placeholder
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white">
        <div className="text-center p-8">
          <div className="bg-muted/30 rounded-full p-6 mx-auto mb-4 w-24 h-24 flex items-center justify-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No chat selected</h2>
          <p className="text-muted-foreground mb-4">
            Select a chat from the list or start a new conversation
          </p>
          <Button 
            onClick={() => setShowNewChatModal(true)}
            className="mx-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat header */}
      <div className="border-b p-3 flex items-center justify-between">
        {mobileView === 'chat' && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2"
            onClick={() => setMobileView('list')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        
        <div className="flex items-center flex-1">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={activeChat.avatar} />
            <AvatarFallback>{activeChat.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-medium">{activeChat.name}</h3>
              {(activeChat as EnhancedChat).online && (
                <div className="ml-2 flex items-center text-xs text-green-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1"></div>
                  Online
                </div>
              )}
            </div>
            {activeChat.type === 'group' && (
              <p className="text-xs text-muted-foreground">
                {participants.length} members
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Call</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Video call</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Info</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Chat messages */}
      <div 
        ref={messageEndRef}
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
                className={`mb-4 ${message.senderId === 1 ? 'ml-auto' : ''}`}
              >
                <MessageBubbleCustom 
                  message={message} 
                  isOwnMessage={message.senderId === 1}
                  timestamp={timestamp}
                />
              </div>
            )
          })}
          
          {/* End of messages ref for scrolling */}
          <div ref={messageEndRef} />
        </div>
      </div>
      
      {/* Active reply display */}
      {activeReply && (
        <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between">
          <div className="flex items-center">
            <Reply className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Replying to</p>
              <p className="text-sm truncate max-w-[200px]">{activeReply.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setActiveReply(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Chat input */}
      <div className="p-3 border-t">
        {isRecording ? (
          <div className="flex items-center p-2 bg-muted/30 rounded-full">
            <div className="animate-pulse bg-red-500 h-3 w-3 rounded-full mr-2"></div>
            <span className="text-sm">{formatRecordingTime(recordingTime)}</span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => {
                setIsRecording(false)
                if (timerRef.current) clearInterval(timerRef.current)
                setRecordingTime(0)
              }}>
                <X className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleRecordVoice}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                aria-label="Upload files"
                title="Upload files"
              />
              
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Popover open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="start" alignOffset={-40} forceMount>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        className="flex flex-col h-auto py-2"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = "image/*"
                            fileInputRef.current.click()
                          }
                        }}
                      >
                        <ImageIcon className="h-4 w-4 mb-1" />
                        <span className="text-xs">Image</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex flex-col h-auto py-2"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = "video/*"
                            fileInputRef.current.click()
                          }
                        }}
                      >
                        <Video className="h-4 w-4 mb-1" />
                        <span className="text-xs">Video</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex flex-col h-auto py-2"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = "audio/*"
                            fileInputRef.current.click()
                          }
                        }}
                      >
                        <FileIcon className="h-4 w-4 mb-1" />
                        <span className="text-xs">Audio</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex flex-col h-auto py-2"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                            fileInputRef.current.click()
                          }
                        }}
                      >
                        <FileIcon className="h-4 w-4 mb-1" />
                        <span className="text-xs">Document</span>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              <Input
                placeholder="Type a message..."
                className="pl-12 pr-12 rounded-full"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                onFocus={() => startTyping()}
                onBlur={() => stopTyping()}
              />
              
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="end" alignOffset={-40} forceMount>
                    <div className="grid grid-cols-6 gap-2">
                      {["😀", "😂", "😊", "😍", "😎", "🥰", "😇", "🤔", "😐", "😢", "😡", "🥳", "👍", "👎", "❤️", "🔥", "🎉", "🙏", "😴", "😷", "🤮", "🤯", "💩", "👻"].map(emoji => (
                        <Button 
                          key={emoji}
                          variant="ghost" 
                          className="h-8 w-8 p-0" 
                          onClick={() => {
                            setMessageInput(prev => prev + emoji)
                            setEmojiPickerOpen(false)
                          }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {messageInput.trim() ? (
              <Button 
                size="icon" 
                className="rounded-full" 
                onClick={handleSendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                size="icon" 
                className="rounded-full" 
                onClick={handleRecordVoice}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Message bubble component
interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  timestamp: Date
}

function MessageBubbleCustom({ message, isOwnMessage, timestamp }: MessageBubbleProps) {
  const [showOptions, setShowOptions] = useState(false)
  const { editMessage, deleteMessage, replyToMessage, setActiveReply } = useChat()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  
  // Format message time
  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // Handle edit save
  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage(message.id, editContent)
    }
    setIsEditing(false)
  }
  
  // Render message content based on type
  const renderMessageContent = () => {
    if (message.deleted) {
      return (
        <p className="italic text-muted-foreground">This message was deleted</p>
      )
    }
    
    if (isEditing) {
      return (
        <div className="flex flex-col gap-2">
          <Input
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="border-primary"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSaveEdit()
              }
              if (e.key === 'Escape') {
                setIsEditing(false)
                setEditContent(message.content)
              }
            }}
          />
          <div className="flex items-center gap-2 justify-end">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setIsEditing(false)
                setEditContent(message.content)
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit}>
              Save
            </Button>
          </div>
        </div>
      )
    }
    
    switch (message.type) {
      case 'text':
        return <p>{message.content}</p>
        
      case 'image':
        return (
          <div className="relative">
            <img 
              src={message.mediaUrl} 
              alt="Image" 
              className="rounded-md max-w-[240px] max-h-[320px] object-cover"
            />
            <div className="mt-1 text-xs text-muted-foreground">{message.fileName}</div>
          </div>
        )
        
      case 'video':
        return (
          <div>
            <video 
              controls
              className="rounded-md max-w-[240px] max-h-[320px]"
            >
              <source src={message.mediaUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="mt-1 text-xs text-muted-foreground">{message.fileName}</div>
          </div>
        )
        
      case 'audio':
        return (
          <div>
            <audio controls className="max-w-[240px]">
              <source src={message.mediaUrl} type="audio/mpeg" />
              Your browser does not support the audio tag.
            </audio>
            <div className="mt-1 text-xs text-muted-foreground">{message.fileName}</div>
          </div>
        )
        
      case 'voice':
        return (
          <div className="flex items-center gap-2">
            <audio controls className="max-w-[180px] h-[36px]">
              <source src={message.mediaUrl} type="audio/mpeg" />
              Your browser does not support the audio tag.
            </audio>
            <div className="text-xs text-muted-foreground">0:19</div>
          </div>
        )
        
      case 'document':
        return (
          <div className="flex items-center gap-2 p-2 border rounded-md">
            <FileIcon className="h-8 w-8 text-blue-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{message.fileName}</div>
              <div className="text-xs text-muted-foreground">
                {Math.round(message.fileSize! / 1024)} KB
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )
        
      default:
        return <p>{message.content}</p>
    }
  }
  
  return (
    <div 
      className={`flex items-end gap-2 max-w-[75%] group ${isOwnMessage ? 'ml-auto' : ''}`}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
    >
      {!isOwnMessage && (
        <Avatar className="h-8 w-8 mb-1">
          <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      
      <div 
        className={`relative p-3 rounded-xl ${
          isOwnMessage ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
        }`}
      >
        {/* Reply info */}
        {message.replyTo && (
          <div className={`p-2 mb-2 text-sm rounded border-l-2 ${
            isOwnMessage ? 'bg-primary-700 border-primary-foreground/30' : 'bg-background border-muted-foreground/30'
          }`}>
            <p className="text-xs font-medium">
              {message.replyTo.sender === message.senderName 
                ? 'Replying to self' 
                : `Replying to ${message.replyTo.sender}`}
            </p>
            <p className="truncate">{message.replyTo.content}</p>
          </div>
        )}
        
        {/* Message content */}
        <div>{renderMessageContent()}</div>
        
        {/* Message info */}
        <div className={`flex items-center gap-1 mt-1 text-xs ${
          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          <span>{formatMessageTime(timestamp)}</span>
          {isOwnMessage && message.status === 'read' && (
            <Check className="h-3 w-3 ml-1" />
          )}
        </div>
        
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-2 ${
            isOwnMessage ? 'justify-end' : 'justify-start'
          }`}>
            {message.reactions.map((reaction, index) => (
              <div 
                key={`${reaction.emoji}-${index}`}
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  isOwnMessage ? 'bg-primary-700' : 'bg-background'
                }`}
              >
                {reaction.emoji}
              </div>
            ))}
          </div>
        )}
        
        {/* Message options */}
        {showOptions && !message.deleted && (
          <div className={`absolute -top-10 ${isOwnMessage ? 'right-0' : 'left-0'} bg-background shadow-md rounded-md border flex`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      setActiveReply({
                        messageId: message.id,
                        content: message.content,
                        sender: message.senderName
                      })
                    }}
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reply</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {isOwnMessage && message.type === 'text' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        setIsEditing(true)
                        setEditContent(message.content)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {isOwnMessage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => deleteMessage(message.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
                <DropdownMenuItem>Forward</DropdownMenuItem>
                <DropdownMenuItem>Copy</DropdownMenuItem>
                <DropdownMenuItem>Save</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Add reaction</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  )
}
