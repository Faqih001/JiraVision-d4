"use client"

import React, { useEffect, useState, useRef } from "react"
import { Shield, Info, Lock, Bell, Phone, Video, Search, MoreVertical, ArrowLeft, Send, Paperclip, Smile, Mic, Image as ImageIcon, FileIcon, X, Plus, Check, Reply, Edit2, Trash2, Download, MessageSquare, Archive, Forward, Copy, Save, ThumbsUp } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TeamMember } from "@/types/team"

// Add missing properties to Chat type
interface EnhancedChat extends Chat {
  preview?: string
  lastMessageTime?: string
  online?: boolean
  id: string // Ensure id is string type
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
          {/* Chat list - always show on desktop, conditionally on mobile */}
          <div className={`${mobileView === 'list' ? 'block' : 'hidden'} md:block h-full border-r w-full md:w-80 lg:w-96 flex-shrink-0`}>
            <CustomChatList mobileView={mobileView} setMobileView={setMobileView} />
          </div>
          
          {/* Chat window - always show on desktop, conditionally on mobile */}
          <div className={`${mobileView === 'chat' ? 'block' : 'hidden'} md:block h-full flex-1 flex`}>
            <ChatWindow mobileView={mobileView} setMobileView={setMobileView} />
          </div>
        </div>
      </div>
    </ChatProvider>
  )
}

interface ChatListProps {
  mobileView: 'list' | 'chat';
  setMobileView: (view: 'list' | 'chat') => void;
}

function CustomChatList({ mobileView, setMobileView }: ChatListProps) {
  const { chats, activeChat, setActiveChat, connectionStatus, markAsRead, archiveChat, unarchiveChat, muteChat, unmuteChat, clearChat } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [activeTab, setActiveTab] = useState<'recent' | 'contacts'>('recent')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]) // Track selected members for group chat
  const [groupChatName, setGroupChatName] = useState('')
  const [modalActiveTab, setModalActiveTab] = useState<'individual' | 'group'>('individual')
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    chatId: string | null;
    position: 'up' | 'down';
  } | null>(null)
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [showDeletedChatsModal, setShowDeletedChatsModal] = useState(false)
  const [deletedChats, setDeletedChats] = useState<Chat[]>([])
  const { toast } = useToast()
  
  // Reset modal state when opening/closing
  useEffect(() => {
    if (!showNewChatModal) {
      setSelectedMembers([])
      setGroupChatName('')
      setModalActiveTab('individual')
      setSearchQuery('')
    }
  }, [showNewChatModal])
  
  useEffect(() => {
    // Fetch team members when component mounts
    const loadTeamMembers = async () => {
      const members = await fetchTeamMembers()
      setTeamMembers(members.filter(member => member.id !== 1)) // Exclude current user
    }
    
    loadTeamMembers()
    
    // Close context menu on click outside
    const handleClickOutside = () => setContextMenu(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Handle member selection for group chat
  const toggleMemberSelection = (memberId: number) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId)
      } else {
        return [...prev, memberId]
      }
    })
  }
  
  // Handle select all for group chat
  const handleSelectAll = () => {
    if (selectedMembers.length === teamMembers.length) {
      // If all are selected, deselect all
      setSelectedMembers([])
    } else {
      // Otherwise select all
      setSelectedMembers(teamMembers.map(member => member.id))
    }
  }
  
  // Generate avatar for group chat
  const generateGroupAvatar = () => {
    // Placeholder implementation - in real app would create an avatar with overlapping images
    return "/placeholder-group-avatar.jpg"
  }
  
  // Create new group chat
  const handleCreateGroupChat = () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select at least one team member for the group chat.",
        variant: "destructive"
      })
      return
    }
    
    if (!groupChatName.trim()) {
      toast({
        title: "Missing group name",
        description: "Please enter a name for the group chat.",
        variant: "destructive"
      })
      return
    }
    
    // In a real app, you would call an API to create the group chat
    const newGroupChat: Chat = {
      id: `group-${Date.now()}`,
      type: 'group',
      name: groupChatName,
      avatar: generateGroupAvatar(),
      participants: [...selectedMembers, 1], // Add current user (ID 1)
      createdAt: new Date(),
      unreadCount: 0,
      isGroupAdmin: true, // Current user is admin
      isMuted: false,     // Add missing properties
      isArchived: false   // Add missing properties
    }
    
    // Set as active chat
    setActiveChat(newGroupChat)
    
    // Close modal
    setShowNewChatModal(false)
    
    // Ensure chat view is shown (for mobile)
    setMobileView('chat')
    
    toast({
      title: "Group chat created",
      description: `You've created "${groupChatName}" with ${selectedMembers.length} members.`
    })
  }
  
  // Create new individual chat or open existing
  const handleCreateIndividualChat = (member: TeamMember) => {
    // Check if a chat with this member already exists
    const existingChat = chats.find(chat => 
      chat.type === 'individual' && 
      chat.participants.includes(member.id) && 
      chat.participants.length === 2
    );
    
    if (existingChat) {
      // Open existing chat
      setActiveChat(existingChat);
      setMobileView('chat');
      setShowNewChatModal(false);
    } else {
      // Create new chat
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        type: 'individual',
        name: member.name,
        avatar: member.avatar,
        participants: [member.id, 1], // Member and current user (ID 1)
        createdAt: new Date(),
        unreadCount: 0,
        isMuted: false,     // Add missing properties
        isArchived: false   // Add missing properties
      }
      
      // Set as active chat
      setActiveChat(newChat)
      
      // Close modal
      setShowNewChatModal(false)
      
      // Ensure chat view is shown (for mobile)
      setMobileView('chat')
      
      toast({
        title: "Chat started",
        description: `You've started a conversation with ${member.name}.`
      })
    }
  }

  // Handle archive/unarchive chat
  const handleArchiveChat = (chatId: string) => {
    // Find the chat
    const chat = chats.find(c => c.id === chatId);
    
    if (chat) {
      if (chat.isArchived) {
        unarchiveChat(chatId);
        toast({
          title: "Chat unarchived",
          description: `"${chat.name}" has been moved to Recent chats.`,
        });
      } else {
        archiveChat(chatId);
        toast({
          title: "Chat archived",
          description: `"${chat.name}" has been moved to Archived chats.`,
        });
      }
    }
    
    setContextMenu(null);
  };
  
  // Handle pin/unpin chat - enforce 3 pin limit
  const handlePinChat = (chatId: string) => {
    // Get the chat
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const pinnedChats = chats.filter(c => c.isPinned);
    
    // Check if we're unpinning
    if (chat.isPinned) {
      // Update in chat context
      const chatsCopy = [...chats];
      const chatIndex = chatsCopy.findIndex(c => c.id === chatId);
      
      if (chatIndex !== -1) {
        chatsCopy[chatIndex] = {
          ...chatsCopy[chatIndex],
          isPinned: false
        };
      }
      
      toast({
        title: "Chat unpinned",
        description: `"${chat.name}" has been unpinned.`,
      });
    } 
    // Check if we're pinning and under the limit
    else if (pinnedChats.length < 3) {
      // Update in chat context
      const chatsCopy = [...chats];
      const chatIndex = chatsCopy.findIndex(c => c.id === chatId);
      
      if (chatIndex !== -1) {
        chatsCopy[chatIndex] = {
          ...chatsCopy[chatIndex],
          isPinned: true
        };
      }
      
      toast({
        title: "Chat pinned",
        description: `"${chat.name}" has been pinned to the top.`,
      });
    } 
    // Over the limit
    else {
      toast({
        title: "Pin limit reached",
        description: "You can only pin up to 3 chats. Please unpin one first.",
        variant: "destructive"
      });
    }
    
    setContextMenu(null);
  };
  
  // Handle mute/unmute chat
  const handleMuteChat = (chatId: string) => {
    // Find the chat
    const chat = chats.find(c => c.id === chatId);
    
    if (chat) {
      if (chat.isMuted) {
        unmuteChat(chatId);
        toast({
          title: "Chat unmuted",
          description: `You will now receive notifications from "${chat.name}".`,
        });
      } else {
        muteChat(chatId);
        toast({
          title: "Chat muted",
          description: `You will no longer receive notifications from "${chat.name}".`,
        });
      }
    }
    
    setContextMenu(null);
  };
  
  // Handle mark as read
  const handleMarkAsRead = (chatId: string) => {
    // Find the chat
    const chat = chats.find(c => c.id === chatId);
    
    if (chat && chat.unreadCount > 0) {
      markAsRead(chatId);
      toast({
        title: "Marked as read",
        description: `All messages in "${chat.name}" have been marked as read.`,
      });
    }
    
    setContextMenu(null);
  };
  
  // Handle delete chat
  const handleDeleteChat = (chatId: string) => {
    // Find the chat to delete
    const chatToDelete = chats.find(c => c.id === chatId);
    
    if (chatToDelete) {
      // Add to deleted chats
      setDeletedChats(prev => [...prev, chatToDelete]);
      
      // Call clear chat to remove messages
      clearChat(chatId);
      
      toast({
        title: "Chat deleted",
        description: `"${chatToDelete.name}" has been moved to deleted chats.`,
        variant: "destructive"
      });
      
      // If active chat is being deleted, set activeChat to null
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
    }
    
    setContextMenu(null);
  };
  
  // Handle permanent delete
  const handlePermanentDelete = (chatId: string) => {
    setDeletedChats(prev => prev.filter(chat => chat.id !== chatId));
    
    toast({
      title: "Chat permanently deleted",
      description: "This chat has been permanently deleted and cannot be recovered.",
      variant: "destructive"
    });
  };

  // Handle chat contextmenu event
  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    
    // Determine if the context menu should open upward or downward
    // If the click is in the bottom 40% of the screen, open upward
    const position = e.clientY > window.innerHeight * 0.6 ? 'up' : 'down';
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      chatId,
      position
    });
  };

  // Filter chats based on search query
  const filteredChats = searchQuery
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((chat as EnhancedChat).preview && (chat as EnhancedChat).preview!.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (chat.lastMessage && chat.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats

  // Show only archived chats when on "contacts" tab
  // Sort chats to put pinned ones at the top
  const displayChats = activeTab === 'recent' 
    ? filteredChats.filter(chat => !chat.isArchived).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      })
    : filteredChats.filter(chat => chat.isArchived)

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

  // Render the New Chat Modal
  const renderNewChatModal = () => (
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Tabs 
          defaultValue="individual" 
          className="mb-4"
          onValueChange={(value) => setModalActiveTab(value as 'individual' | 'group')}
        >
          <TabsList className="w-full">
            <TabsTrigger value="individual" className="flex-1">Individual</TabsTrigger>
            <TabsTrigger value="group" className="flex-1">New Group</TabsTrigger>
          </TabsList>
          
          <TabsContent value="individual" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto">
              {teamMembers
                .filter(member => 
                  searchQuery ? 
                    member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    member.role.toLowerCase().includes(searchQuery.toLowerCase()) : 
                    true
                )
                .map(member => (
                <div 
                  key={member.id}
                  className="flex items-center p-3 hover:bg-muted/30 rounded-md cursor-pointer"
                  onClick={() => handleCreateIndividualChat(member)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                  <div className="ml-auto">
                    {(member as any).online && (
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500 border border-white"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="group" className="mt-4">
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Group Name</label>
              <Input 
                placeholder="Enter group name" 
                className="mb-3" 
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
              />
              
              <label className="text-sm font-medium mb-2 block">Select Members</label>
              <div className="max-h-[40vh] overflow-y-auto border rounded-md p-2 mb-3">
                {teamMembers
                  .filter(member => 
                    searchQuery ? 
                      member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      member.role.toLowerCase().includes(searchQuery.toLowerCase()) : 
                      true
                  )
                  .map(member => (
                  <div 
                    key={member.id}
                    className="flex items-center p-2 hover:bg-muted/30 rounded-md cursor-pointer mb-1"
                    onClick={() => toggleMemberSelection(member.id)}
                  >
                    <input
                      type="checkbox"
                      id={`select-member-${member.id}`}
                      className="mr-3 h-4 w-4 rounded border-muted-foreground"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => {}} // Controlled component
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <label htmlFor={`select-member-${member.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.role}</div>
                    </label>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-muted-foreground">Selected: <span className="font-medium">{selectedMembers.length}</span> members</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleSelectAll}>
                  {selectedMembers.length === teamMembers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowNewChatModal(false)}>Cancel</Button>
          <Button 
            onClick={modalActiveTab === 'group' ? handleCreateGroupChat : () => {}}
            disabled={modalActiveTab === 'group' && (selectedMembers.length === 0 || !groupChatName.trim())}
          >
            Create Chat
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Search and new chat */}
      <div className="p-4 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9 bg-muted/40 border rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full flex-shrink-0 hover:bg-primary hover:text-white transition-colors"
                  onClick={() => setShowNewChatModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                <p>Create New Chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>
        
        {/* Top tools section */}
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
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowSecurityModal(true)}>
                    <Shield className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chat Security</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Bell className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notification Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowDeletedChatsModal(true)}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>More Options</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Chat tabs */}
      <div className="flex flex-col h-[calc(100%-98px)]">
        <Tabs 
          defaultValue="recent" 
          className="flex flex-col h-full"
          onValueChange={(value) => setActiveTab(value as 'recent' | 'contacts')}
        >
          <TabsList className="w-full rounded-none border-b grid grid-cols-2">
            <TabsTrigger value="recent" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Recent</TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Archived</TabsTrigger>
          </TabsList>
          
          {/* Chat list - make it scrollable */}
          <div className="flex-1 overflow-y-auto">
            {displayChats.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[200px]">
                {searchQuery ? (
                  <>
                    <Search className="h-8 w-8 mb-2 text-muted-foreground/50" />
                    <p>No chats found for "{searchQuery}"</p>
                  </>
                ) : activeTab === 'recent' ? (
                  <>
                    <MessageSquare className="h-8 w-8 mb-2 text-muted-foreground/50" />
                    <p>No recent chats</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowNewChatModal(true)}
                    >
                      Start a new chat
                    </Button>
                  </>
                ) : (
                  <>
                    <Archive className="h-8 w-8 mb-2 text-muted-foreground/50" />
                    <p>No archived chats</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-y-auto max-h-full">
                {displayChats.map(chat => (
                  <div
                    key={chat.id}
                    className={`flex items-center px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                      activeChat?.id === chat.id ? 'bg-muted/40' : ''
                    } ${chat.isPinned ? 'border-l-4 border-primary' : ''}`}
                    onClick={() => setActiveChat(chat)}
                    onContextMenu={(e) => handleContextMenu(e, chat.id)}
                  >
                    <div className="relative mr-3 flex-shrink-0">
                      <Avatar className="h-12 w-12 border bg-background">
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback className="font-medium">
                          {chat.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {(chat as EnhancedChat).online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium truncate text-sm flex items-center">
                          {chat.isPinned && <span className="mr-1 text-primary">📌</span>}
                          {chat.name}
                        </h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {(chat as EnhancedChat).lastMessageTime || formatTime(chat.lastMessage?.timestamp)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-xs truncate max-w-[calc(100%-40px)] ${chat.isMuted ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                          {chat.isMuted && <span className="mr-1">🔇</span>}
                          {getChatPreview(chat)}
                        </p>
                        <div className="flex items-center gap-1">
                          {chat.unreadCount > 0 && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-xs text-white">
                              {chat.unreadCount}
                            </div>
                          )}
            <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handlePinChat(chat.id);
                              }}>
                                {chat.isPinned ? 'Unpin' : 'Pin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleMuteChat(chat.id);
                              }}>
                                {chat.isMuted ? 'Unmute' : 'Mute'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveChat(chat.id);
                              }}>
                                {chat.isArchived ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(chat.id);
                              }}>
                                Mark as read
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}>
                                Delete chat
                              </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs>
        </div>
        
      {/* Context Menu - positioned up or down based on click position */}
      {contextMenu && (
        <div
          className={`fixed bg-background shadow-lg border rounded-md py-1 z-50 w-48`}
          style={{
            left: `${contextMenu.x}px`,
            top: contextMenu.position === 'up' 
              ? `${contextMenu.y - 180}px` // Position above click point
              : `${contextMenu.y}px`,      // Position below click point
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
            onClick={() => {
              if (contextMenu.chatId) handleArchiveChat(contextMenu.chatId);
            }}
          >
            {activeTab === 'recent' ? 'Archive Chat' : 'Unarchive Chat'}
          </button>
          <button 
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
            onClick={() => {
              if (contextMenu.chatId) handleMarkAsRead(contextMenu.chatId);
            }}
          >
            Mark as Read
          </button>
          <button 
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
            onClick={() => {
              if (contextMenu.chatId) handlePinChat(contextMenu.chatId);
            }}
          >
            Pin Chat
          </button>
          <button 
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
            onClick={() => {
              if (contextMenu.chatId) handleMuteChat(contextMenu.chatId);
            }}
          >
            Mute Notifications
          </button>
          <div className="border-t my-1"></div>
          <button 
            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-muted/50"
            onClick={() => {
              if (contextMenu.chatId) handleDeleteChat(contextMenu.chatId);
            }}
          >
            Delete Chat
          </button>
          </div>
      )}
      
      {/* Security Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Chat Security
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSecurityModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-md">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-green-500" />
                  End-to-End Encryption
                </h3>
                <p className="text-sm text-muted-foreground">
                  All personal conversations are protected with end-to-end encryption. 
                  This means that your messages can only be read by you and the people you're chatting with.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Security Tips</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 flex items-center justify-center text-xs bg-primary text-white rounded-full flex-shrink-0 mt-0.5">1</div>
                    <p>Never share sensitive information like passwords or credit card details in chats.</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 flex items-center justify-center text-xs bg-primary text-white rounded-full flex-shrink-0 mt-0.5">2</div>
                    <p>Be cautious about clicking links or downloading files, even if they appear to come from someone you know.</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 flex items-center justify-center text-xs bg-primary text-white rounded-full flex-shrink-0 mt-0.5">3</div>
                    <p>Regularly review and remove old chats containing sensitive information.</p>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="outline" className="w-full" onClick={() => setShowSecurityModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Deleted Chats Modal */}
      {showDeletedChatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Deleted Chats
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDeletedChatsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {deletedChats.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                    <Trash2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No deleted chats found</p>
                </div>
              ) : (
                deletedChats.map(chat => (
                  <div 
                    key={chat.id} 
                    className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback>
                          {chat.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{chat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Deleted {Math.floor(Math.random() * 7) + 1} days ago
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => handlePermanentDelete(chat.id)}
                    >
                      Delete forever
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setShowDeletedChatsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Use the enhanced New Chat Modal */}
      {showNewChatModal && renderNewChatModal()}
    </div>
  )
}

interface ChatWindowProps {
  mobileView: 'list' | 'chat'
  setMobileView: (view: 'list' | 'chat') => void
}

function ChatWindow({ mobileView, setMobileView }: ChatWindowProps) {
  const { activeChat, sendMessage, messages, getParticipants, startTyping, stopTyping, activeReply, setActiveReply, setActiveChat, chats } = useChat()
  const [messageInput, setMessageInput] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const participants = activeChat ? getParticipants(activeChat.id) : []
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  
  // Handle emoji picker - moved outside the conditional rendering
  const [emojiCategory, setEmojiCategory] = useState<'recent' | 'smileys' | 'people' | 'nature' | 'food' | 'activities' | 'objects' | 'symbols' | 'flags'>('smileys')
  
  // Emoji data by category - moved outside the conditional rendering
  const emojiData = {
    recent: ['😀', '😂', '👍', '❤️', '🔥', '✅', '🙏', '👏'],
    smileys: ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '🥰', '😍', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤔', '🤨', '😐', '😑'],
    people: ['👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳‍♂️', '🧕', '🧔', '👱‍♀️', '👱‍♂️', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦲', '👩‍🦲', '👨‍🦳'],
    nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦍', '🦓', '🦒', '🦘', '🦬'],
    food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶'],
    activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿'],
    objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️'],
    flags: ['🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇳', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼']
  };
  
  // Fetch team members when component mounts
  useEffect(() => {
    const loadTeamMembers = async () => {
      const members = await fetchTeamMembers()
      setTeamMembers(members.filter(member => member.id !== 1)) // Exclude current user
    }
    loadTeamMembers()
  }, [])
  
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
  
  // Render enhanced emoji picker - moved outside conditional rendering
  const renderEmojiPicker = () => (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2 border-b pb-2">
        <div className="text-sm font-medium">Emojis</div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEmojiPickerOpen(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-thin">
        <Button 
          variant={emojiCategory === 'recent' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('recent')}
        >
          <span className="text-xs">🕒</span>
        </Button>
        <Button 
          variant={emojiCategory === 'smileys' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('smileys')}
        >
          <span className="text-xs">😊</span>
        </Button>
        <Button 
          variant={emojiCategory === 'people' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('people')}
        >
          <span className="text-xs">👪</span>
        </Button>
        <Button 
          variant={emojiCategory === 'nature' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('nature')}
        >
          <span className="text-xs">🐶</span>
        </Button>
        <Button 
          variant={emojiCategory === 'food' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('food')}
        >
          <span className="text-xs">🍔</span>
        </Button>
        <Button 
          variant={emojiCategory === 'activities' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('activities')}
        >
          <span className="text-xs">⚽</span>
        </Button>
        <Button 
          variant={emojiCategory === 'objects' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('objects')}
        >
          <span className="text-xs">💻</span>
        </Button>
        <Button 
          variant={emojiCategory === 'symbols' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('symbols')}
        >
          <span className="text-xs">❤️</span>
        </Button>
        <Button 
          variant={emojiCategory === 'flags' ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setEmojiCategory('flags')}
        >
          <span className="text-xs">🏳️</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 max-h-[200px] overflow-y-auto">
        {emojiData[emojiCategory].map((emoji: string, index: number) => (
          <Button 
            key={`${emoji}-${index}`}
            variant="ghost" 
            className="h-8 w-8 p-0" 
            onClick={() => {
              setMessageInput((prev: string) => prev + emoji)
              // Don't close the picker so they can add multiple emojis
            }}
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  );
  
  // If no active chat, show placeholder
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-4 h-full w-full">
        <div className="text-center max-w-md mx-auto flex flex-col items-center justify-center h-full">
          <div className="bg-muted/30 rounded-full p-6 mx-auto mb-6 w-24 h-24 flex items-center justify-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No chat selected</h2>
          <p className="text-muted-foreground mb-6 max-w-xs">
            Select a chat from the list or start a new conversation to connect with your team
          </p>
          <Button
            onClick={() => setShowNewChatModal(true)}
            className="mx-auto"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Tabs defaultValue="individual" className="mb-4">
                <TabsList className="w-full">
                  <TabsTrigger value="individual" className="flex-1">Individual</TabsTrigger>
                  <TabsTrigger value="group" className="flex-1">New Group</TabsTrigger>
                </TabsList>
                
                <TabsContent value="individual" className="mt-4">
                  <div className="max-h-[60vh] overflow-y-auto">
                    {teamMembers
                      .filter(member => 
                        searchQuery ? 
                          member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.role.toLowerCase().includes(searchQuery.toLowerCase()) : 
                          true
                      )
                      .map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center p-3 hover:bg-muted/30 rounded-md cursor-pointer"
                        onClick={() => {
                          // Check if a chat with this member already exists
                          const existingChat = chats.find(chat => 
                            chat.type === 'individual' && 
                            chat.participants.includes(member.id) && 
                            chat.participants.length === 2
                          );
                          
                          if (existingChat) {
                            // Open existing chat
                            setActiveChat(existingChat);
                            setMobileView('chat');
                          } else {
                            // In a real app, you would create a new chat here
                            // For demo, we'll just simulate it with a placeholder alert
                            alert(`Starting new chat with ${member.name}`);
                            
                            // In real implementation, you would:
                            // 1. Call an API to create a new chat
                            // 2. Get the chat data from response
                            // 3. Add it to the chats list
                            // 4. Set it as active chat
                          }
                          
                          setShowNewChatModal(false);
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
                        <div className="ml-auto">
                          {(member as any).online && (
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500 border border-white"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="group" className="mt-4">
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Group Name</label>
                    <Input placeholder="Enter group name" className="mb-3" />
                    
                    <label className="text-sm font-medium mb-2 block">Select Members</label>
                    <div className="max-h-[40vh] overflow-y-auto border rounded-md p-2 mb-3">
                      {teamMembers
                        .filter(member => 
                          searchQuery ? 
                            member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            member.role.toLowerCase().includes(searchQuery.toLowerCase()) : 
                            true
                        )
                        .map(member => (
                        <div 
                          key={member.id}
                          className="flex items-center p-2 hover:bg-muted/30 rounded-md cursor-pointer mb-1"
                        >
                          <input
                            type="checkbox"
                            id={`select-member-${member.id}`}
                            className="mr-3 h-4 w-4 rounded border-muted-foreground"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <label htmlFor={`select-member-${member.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-sm">{member.name}</div>
                            <div className="text-xs text-muted-foreground">{member.role}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-muted-foreground">Selected: <span className="font-medium">0</span> members</span>
                      <Button variant="ghost" size="sm" className="h-7 px-2">Select All</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowNewChatModal(false)}>Cancel</Button>
                <Button>Create Chat</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
}
