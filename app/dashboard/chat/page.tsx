"use client"

import React, { useEffect, useState, useRef } from "react"
import { Shield, Info, Lock, Bell, Phone, Video, Search, MoreVertical, ArrowLeft, Send } from "lucide-react"
import { ChatProvider, useChat, Message, Chat } from "@/app/context/chat/ChatContext"
import { ChatList } from "@/components/chat/ChatList"
import { ChatMessageInput } from "@/components/chat/ChatMessageInput"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { TeamMember } from "@/types/team"
import { ScrollArea } from "@/components/ui/scroll-area"
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
      utilization: 80
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
      <div className="h-[calc(100vh-4rem)] flex flex-col relative">
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
            } md:w-80 lg:w-96 border-r border-gray-200`}
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
  const { chats, activeChat, setActiveChat, connectionStatus } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('recent')

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.lastMessage && chat.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Format timestamp for display
  const formatTime = (timestamp: Date | undefined) => {
    if (!timestamp) return ''
    
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search box */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Input 
            placeholder="Search people, group and messages" 
            className="pl-9 bg-gray-100 border-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        </div>
        
        {/* Connection status indicator */}
        <div className="flex items-center mt-2 text-xs">
          <div className={`w-2 h-2 rounded-full mr-1 ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-gray-500">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <Tabs defaultValue="recent" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-12 rounded-none bg-transparent">
            <TabsTrigger value="recent" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
              Recent
            </TabsTrigger>
            <TabsTrigger value="contact" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
              Contact
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Contact list */}
      <ScrollArea className="flex-1">
        {filteredChats.map((chat) => {
          const isActive = activeChat?.id === chat.id
          const statusColor = chat.type === 'individual' ? 
            (chat.online ? 'bg-green-500' : chat.participants.find(id => id !== 1) === 2 ? 'bg-red-500' : 'bg-gray-400') : ''
            
          return (
            <div 
              key={chat.id}
              className={`flex items-center p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
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
                  <span className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor} border-2 border-white rounded-full`}></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h4 className="font-medium text-sm truncate">{chat.name}</h4>
                  <span className="text-xs text-gray-500">
                    {chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {chat.lastMessage ? chat.lastMessage.content : chat.description || ''}
                </p>
              </div>
            </div>
          )
        })}
      </ScrollArea>
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
  const [newMessage, setNewMessage] = useState('')
  const teamMembers = activeChat ? getParticipants(activeChat.id) : []
  
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
  const isOnline = contact?.status === 'online'
  const isBusy = contact?.status === 'busy'
  
  // Handle sending message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage)
      setNewMessage('')
    }
  }
  
  return (
    <div 
      className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col relative bg-white`}
    >
      {/* Chat Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white z-10">
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
              <span className={`absolute bottom-0 right-0 w-3 h-3 ${isOnline ? 'bg-green-500' : isBusy ? 'bg-red-500' : 'bg-gray-400'} border-2 border-white rounded-full`}></span>
            </div>
            <div>
              <h2 className="font-medium text-base">{activeChat.name}</h2>
              <p className="text-xs text-gray-500">
                {isOnline ? 'Online' : isBusy ? 'Busy' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4 bg-gray-50">
        <div className="flex flex-col space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null
            const isSameSenderAsPrev = prevMessage && prevMessage.senderId === message.senderId
            const isSameSenderAsNext = nextMessage && nextMessage.senderId === message.senderId
            
            // Group messages from the same sender
            const isFirstInGroup = !isSameSenderAsPrev
            const isLastInGroup = !isSameSenderAsNext
            
            return (
              <div key={message.id} className={message.senderId === 1 ? 'self-end' : 'self-start'}>
                <MessageBubbleCustom 
                  message={message}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  teamMember={teamMembers?.find(m => m.id === message.senderId)}
                />
              </div>
            )
          })}
        </div>
      </ScrollArea>
      
      {/* Message Input */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            className="flex-1 bg-gray-100 border-0"
            ref={messageInputRef}
          />
          <Button
            size="icon"
            className="bg-purple-600 text-white hover:bg-purple-700 rounded-full h-10 w-10 flex-shrink-0"
            onClick={handleSendMessage}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface MessageBubbleCustomProps {
  message: Message
  isFirstInGroup: boolean
  isLastInGroup: boolean
  teamMember?: TeamMember
}

function MessageBubbleCustom({ message, isFirstInGroup, isLastInGroup, teamMember }: MessageBubbleCustomProps) {
  const isCurrentUser = message.senderId === 1
  
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1`}>
      {!isCurrentUser && isFirstInGroup && (
        <div className="flex-shrink-0 mr-2 self-end">
          <Avatar className="h-8 w-8">
            {teamMember?.avatar ? (
              <AvatarImage src={teamMember.avatar} alt={teamMember.name} />
            ) : (
              <AvatarFallback className="bg-gray-200">
                {message.senderName.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      )}
      
      <div
        className={`
          px-3 py-2 rounded-lg max-w-[75%] break-words
          ${isCurrentUser ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-900'}
          ${!isCurrentUser && !isFirstInGroup ? 'ml-10' : ''}
          ${!isFirstInGroup && !isLastInGroup ? 'my-1' : ''}
          ${isFirstInGroup ? (isCurrentUser ? 'rounded-tr-none' : 'rounded-tl-none') : ''}
          ${isLastInGroup ? (isCurrentUser ? 'rounded-br-none' : 'rounded-bl-none') : ''}
        `}
      >
        {message.content}
        <div className={`text-xs mt-1 ${isCurrentUser ? 'text-purple-200' : 'text-gray-500'} text-right`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
