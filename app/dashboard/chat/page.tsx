"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { Shield, Info, Lock, Bell, Phone, Video, Search, MoreVertical, ArrowLeft, Send, Paperclip, Mic, Image as ImageIcon, FileIcon, X, Plus, Check, Reply, Edit2, Trash2, Download, MessageSquare, Archive, Forward, Copy, Save, ThumbsUp, AlertTriangle, Loader, File, CheckCheck, FileMusic, Film } from "lucide-react"
import { ChatProvider, useChat, type Chat, type Message as ChatMessage } from "@/app/context/chat/ChatContext"
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
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { TeamMember } from "@/types/team"
import { socketUtil } from "@/utils/socketUtil"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

// Add missing properties to Chat type
interface EnhancedChat extends Chat {
  preview?: string
  lastMessageTime?: string
  online?: boolean
  id: string // Ensure id is string type
}

// Updated interfaces
interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  senderId: number;
  senderName: string;
  avatar?: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: Message;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
}

// Function to fetch team members from API
const fetchTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const response = await fetch('/api/team/members')
    if (!response.ok) {
      throw new Error('Failed to fetch team members')
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch team members')
    }

    return data.teamMembers
  } catch (error) {
    console.error('Error fetching team members:', error)
    // Return an empty array on error
    return []
  }
}

// Function to check search query against member
const memberMatchesSearch = (member: TeamMember, searchQuery: string): boolean => {
  if (!searchQuery) return true;
  
  const query = searchQuery.toLowerCase();
  return (
    member.name.toLowerCase().includes(query) ||
    member.role?.toLowerCase().includes(query) ||
    member.email.toLowerCase().includes(query) ||
    member.department?.toLowerCase().includes(query) ||
    member.skills?.some(skill => skill.toLowerCase().includes(query)) ||
    false
  );
};

// Filter team members based on search query and department
const filterTeamMembers = (members: TeamMember[], query: string): TeamMember[] => {
  if (!query) return members;
  
  return members.filter(member => memberMatchesSearch(member, query));
};

// Mock profile data until we have a real profile context
const useProfile = () => {
  const [profile, setProfile] = useState({
    avatar: "",
    name: "Loading...",
    email: ""
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/current');
        if (!response.ok) {
          console.error("Failed to fetch user profile:", response.statusText);
          return;
        }
        
        const data = await response.json();
        if (data.success && data.user) {
          setProfile({
            avatar: data.user.avatar || "https://randomuser.me/api/portraits/men/32.jpg",
            name: data.user.name || "Current User",
            email: data.user.email || ""
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    
    fetchUserProfile();
  }, []);

  return profile;
};

export default function Page() {
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDeletedChatsModal, setShowDeletedChatsModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    all: true,
    messages: true,
    mentions: true,
    groups: true,
    sound: true
  });
  const [deletedChats, setDeletedChats] = useState<Chat[]>([]);
  const { toast } = useToast();
  
  return (
    <div className="flex h-screen flex-col">
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <h1 className="text-2xl font-bold">Chat</h1>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowSecurityModal(true)}>
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
                <Button variant="outline" size="icon" onClick={() => setShowNotificationModal(true)}>
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
                <Button variant="outline" size="icon" onClick={() => setShowDeletedChatsModal(true)}>
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
      
      <main className="flex-1 flex w-full overflow-hidden">
        <div className={cn(
          "h-full md:w-80 w-full flex-shrink-0 border-r bg-background",
          mobileView === "list" ? "flex flex-col" : "hidden md:flex md:flex-col"
        )}>
          <CustomChatList 
            mobileView={mobileView}
            setMobileView={setMobileView}
            deletedChats={deletedChats} 
            setDeletedChats={setDeletedChats} 
          />
        </div>
        
        <div className={cn(
          "flex-1 flex-col h-full md:flex bg-background",
          mobileView === "chat" ? "flex" : "hidden md:flex"
        )}>
          <ChatWindow 
            mobileView={mobileView} 
            setMobileView={setMobileView} 
          />
        </div>
      </main>
      
      {/* Notification Settings Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Settings
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNotificationModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <h3 className="font-medium">All Notifications</h3>
                  <p className="text-sm text-muted-foreground">Enable or disable all chat notifications</p>
                </div>
                <Switch id="all-notifications" checked={notificationSettings.all} onCheckedChange={(checked) => {
                  setNotificationSettings(prev => ({...prev, all: checked}));
                }} />
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <h3 className="font-medium">Message Notifications</h3>
                  <p className="text-sm text-muted-foreground">Get notified when you receive new messages</p>
                </div>
                <Switch id="message-notifications" 
                  checked={notificationSettings.messages}
                  disabled={!notificationSettings.all}
                  onCheckedChange={(checked) => {
                    setNotificationSettings(prev => ({...prev, messages: checked}));
                  }} />
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <h3 className="font-medium">Mentions</h3>
                  <p className="text-sm text-muted-foreground">Get notified when someone mentions you</p>
                </div>
                <Switch id="mention-notifications" 
                  checked={notificationSettings.mentions}
                  disabled={!notificationSettings.all}
                  onCheckedChange={(checked) => {
                    setNotificationSettings(prev => ({...prev, mentions: checked}));
                  }} />
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <h3 className="font-medium">Group Chats</h3>
                  <p className="text-sm text-muted-foreground">Get notified about new messages in group chats</p>
                </div>
                <Switch id="group-notifications" 
                  checked={notificationSettings.groups}
                  disabled={!notificationSettings.all}
                  onCheckedChange={(checked) => {
                    setNotificationSettings(prev => ({...prev, groups: checked}));
                  }} />
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div>
                  <h3 className="font-medium">Sound</h3>
                  <p className="text-sm text-muted-foreground">Play sound for new messages</p>
                </div>
                <Switch id="sound-notifications" 
                  checked={notificationSettings.sound}
                  disabled={!notificationSettings.all}
                  onCheckedChange={(checked) => {
                    setNotificationSettings(prev => ({...prev, sound: checked}));
                  }} />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNotificationModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Settings saved",
                  description: "Your notification preferences have been updated."
                });
                setShowNotificationModal(false);
              }}>
                Save Changes
              </Button>
            </div>
          </div>
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
    </div>
  );
}

interface ChatListProps {
  mobileView: 'list' | 'chat';
  setMobileView: (view: 'list' | 'chat') => void;
  deletedChats: Chat[];
  setDeletedChats: React.Dispatch<React.SetStateAction<Chat[]>>;
}

function CustomChatList({ mobileView, setMobileView, deletedChats, setDeletedChats }: ChatListProps) {
  const { 
    chats, 
    activeChat, 
    setActiveChat, 
    connectionStatus,
    markAsRead, 
    archiveChat, 
    unarchiveChat, 
    muteChat, 
    unmuteChat, 
    clearChat, 
    createGroup, 
    setChats 
  } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [activeTab, setActiveTab] = useState<'recent' | 'contacts'>('recent')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]) // Track selected members for group chat
  const [selectedIndividualMember, setSelectedIndividualMember] = useState<TeamMember | null>(null) // Track selected member for individual chat
  const [groupChatName, setGroupChatName] = useState('')
  const [modalActiveTab, setModalActiveTab] = useState<'individual' | 'group'>('individual')
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    chatId: string | null;
    position: 'up' | 'down';
  } | null>(null)
  const profileData = useProfile();
  const { toast } = useToast();
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Add reconnect function
  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      
      console.log("Manual reconnection initiated by user");
      
      // First, verify session
      const sessionResponse = await fetch('/api/auth/session');
      if (!sessionResponse.ok) {
        console.error("Session invalid, redirecting to login");
        window.location.href = '/login';
        return;
      }
      
      // Then test API connection
      const response = await fetch('/api/chat');
      if (response.ok) {
        console.log("API is reachable, reinitializing chat");
        
        // Clear existing socket connection
        socketUtil.closeSocket();
        
        // Reinitialize socket
        const socket = await socketUtil.initSocket();
        if (socket) {
          console.log("Socket connection reestablished");
          // Refresh the page to reset all states
          window.location.reload();
        } else {
          console.error("Failed to reinitialize socket");
        }
      } else {
        console.error("API is not reachable:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error details:", errorText);
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };
  
  // Reset modal state when opening/closing
  useEffect(() => {
    if (!showNewChatModal) {
      setSelectedMembers([])
      setSelectedIndividualMember(null)
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
    // Get all selectable team members (excluding current user with ID 1)
    const selectableMembers = teamMembers
      .filter(member => member.id !== 1)
      .filter(member => 
        searchQuery ? 
          memberMatchesSearch(member, searchQuery) : 
          true
      )
      .map(member => member.id);
    
    if (selectedMembers.length === selectableMembers.length) {
      // If all visible members are selected, deselect all
      setSelectedMembers([]);
    } else {
      // Otherwise select all visible members
      setSelectedMembers(selectableMembers);
    }
  }
  
  // Generate avatar for group chat
  const generateGroupAvatar = () => {
    // Placeholder implementation - in real app would create an avatar with overlapping images
    return "/placeholder-group-avatar.jpg"
  }
  
  // Create new group chat
  const handleCreateGroupChat = () => {
    console.log("Starting group chat creation process...");
    
    if (selectedMembers.length === 0) {
      console.log("Error: No members selected");
    toast({
        title: "No members selected",
        description: "Please select at least one team member for the group chat.",
        variant: "destructive"
      })
      return
    }
    
    if (!groupChatName.trim()) {
      console.log("Error: Missing group name");
      toast({
        title: "Missing group name",
        description: "Please enter a name for the group chat.",
        variant: "destructive"
      })
      return
    }
    
    console.log(`Creating group '${groupChatName}' with ${selectedMembers.length} members:`, selectedMembers);
    
    try {
      // Create a unique ID for the new group
      const groupId = `group-${Date.now()}`;
      
      // Create the group chat directly
      const newGroupChat: Chat = {
        id: groupId,
        name: groupChatName,
        type: 'group',
        participants: [...selectedMembers, 1], // Include current user
        avatar: generateGroupAvatar(),
        description: `Group chat with ${selectedMembers.length} members`,
        unreadCount: 0,
        isMuted: false,
        isArchived: false,
        isGroupAdmin: true, // Current user is admin
        createdAt: new Date()
      };
      
      console.log("New group chat object created:", newGroupChat);
      
      // Add to chats list
      setChats(prev => {
        console.log("Previous chats count:", prev.length);
        const updatedChats = [newGroupChat, ...prev];
        console.log("Updated chats list count:", updatedChats.length);
        return updatedChats;
      });
      
      // Set as active chat - with slight delay to ensure state is updated
      setTimeout(() => {
        console.log("Setting active chat to new group ID:", groupId);
        setActiveChat(newGroupChat);
      }, 100);
      
      console.log(`Group chat created successfully: ${groupChatName}`);
      
      // Close modal
      setShowNewChatModal(false)
      
      // Ensure chat view is shown (for mobile)
      setMobileView('chat')
      
      toast({
        title: "Group chat created",
        description: `You've created "${groupChatName}" with ${selectedMembers.length} members.`
      })
    } catch (error) {
      console.error("Error creating group chat:", error);
      toast({
        title: "Error creating chat",
        description: "There was a problem creating the group chat. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Create new individual chat or open existing
  const handleCreateIndividualChat = (member: TeamMember) => {
    console.log("Creating individual chat with:", member);
    
    if (!member || !member.id) {
      console.error("Invalid member selected for individual chat");
      toast({
        title: "Error",
        description: "Invalid team member selected",
        variant: "destructive",
      });
      return;
    }
    
    // Check if a chat with this user already exists
    const existingChat = chats.find(c => 
      c.type === 'individual' && 
      c.participants.includes(member.id)
    );
    
    if (existingChat) {
      console.log("Chat already exists, setting as active:", existingChat);
      setActiveChat(existingChat);
      
      // Handle mobile view
      setMobileView('chat');
      
      setShowNewChatModal(false);
      return;
    }
    
    console.log("No existing chat found, creating new chat with:", member.name);
    
    createGroup(
      member.name, // Use member name as chat name for individual chats
      [member.id],
      member.avatar,
    );
    
    toast({
      title: "Success",
      description: `Chat with ${member.name} created`,
      variant: "default",
    });
    
    setShowNewChatModal(false);
    setSelectedMembers([]);
  };
  
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
  const displayChats = React.useMemo(() => {
    console.log("Calculating display chats:", { 
      total: chats.length, 
      archived: chats.filter(chat => chat.isArchived).length,
      nonArchived: chats.filter(chat => !chat.isArchived).length,
      activeTab
    });
    
    // Filter chats based on active tab and search query
    return chats
      .filter(chat => {
        // Filter based on active tab
        const matchesTab = activeTab === 'recent' ? !chat.isArchived : chat.isArchived;
        
        // No search query? Just return tab filter result
        if (!searchQuery) return matchesTab;
        
        // With search query, match against chat name
        const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Return chats that match both conditions
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => {
        // Sort pinned chats first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // Then sort by last message time or creation date
        const aTime = a.lastMessage?.timestamp || a.createdAt;
        const bTime = b.lastMessage?.timestamp || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
  }, [chats, activeTab, searchQuery]);

  // Also add a useEffect to log when chats change
  useEffect(() => {
    console.log("Chat list updated:", chats.length, "total chats");
  }, [chats]);

  // Add debug message in the render section
  // Inside the displayChats.length === 0 check, add this:
  {displayChats.length === 0 && chats.length > 0 && (
    <div className="p-6 text-center text-muted-foreground">
      <MessageSquare className="h-8 w-8 mb-2 text-muted-foreground/50 mx-auto" />
      <p>You have {chats.length} chats, but none match your current filter</p>
      {activeTab === 'contacts' && (
        <p className="text-xs mt-2">No archived chats found</p>
      )}
      {searchQuery && (
        <p className="text-xs mt-2">No results for "{searchQuery}"</p>
      )}
    </div>
  )}

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

  // Render the New Chat Modal with fixed functionality
  const renderNewChatModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">New Chat</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowNewChatModal(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Tabs 
            defaultValue={modalActiveTab} 
            value={modalActiveTab}
            onValueChange={(value) => {
              setModalActiveTab(value as 'individual' | 'group');
              if (value === 'individual') {
                setSelectedIndividualMember(null);
              } else {
                setSelectedMembers([]);
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="group">New Group</TabsTrigger>
            </TabsList>
            
            <TabsContent value="individual" className="mt-0">
              <div className="max-h-[50vh] overflow-y-auto">
                {teamMembers
                  .filter(member => 
                    searchQuery ? 
                      memberMatchesSearch(member, searchQuery) : 
                      true
                  )
                  .map(member => (
                  <div 
                    key={member.id}
                    className={`flex items-center p-3 hover:bg-muted/30 rounded-md cursor-pointer ${
                      selectedIndividualMember?.id === member.id ? 'bg-blue-100 dark:bg-blue-900' : ''
                    }`}
                    onClick={() => setSelectedIndividualMember(member)}
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
                      {selectedIndividualMember?.id === member.id && (
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {(member as any).online && (
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500 border border-white"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="group" className="mt-0">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Group Name</label>
                  <Input 
                    placeholder="Enter group name" 
                    value={groupChatName}
                    onChange={(e) => setGroupChatName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Members</label>
                  <div className="max-h-[35vh] overflow-y-auto border rounded-md divide-y">
                    {teamMembers
                      .filter(member => 
                        searchQuery ? 
                          memberMatchesSearch(member, searchQuery) : 
                          true
                      )
                      .map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center p-3 hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleMemberSelection(member.id)}
                      >
                        <input
                          type="checkbox"
                          className="mr-3 h-4 w-4 rounded border-muted-foreground"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleMemberSelection(member.id)}
                          onClick={(e) => e.stopPropagation()}
                          title={`Select ${member.name} for group chat`}
                        />
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{member.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="p-4 border-t mt-auto bg-background">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewChatModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (modalActiveTab === 'group') {
                  handleCreateGroupChat();
                } else if (modalActiveTab === 'individual' && selectedIndividualMember) {
                  handleCreateIndividualChat(selectedIndividualMember);
                }
              }}
              disabled={
                (modalActiveTab === 'group' && (selectedMembers.length === 0 || !groupChatName.trim())) ||
                (modalActiveTab === 'individual' && !selectedIndividualMember)
              }
            >
              Create Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Search and new chat */}
      <div className="p-4 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3 mb-4">
          {/* Only show back button on mobile when viewing a chat */}
          {mobileView === "chat" && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileView("list")}
              aria-label="Back to chat list"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
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
            <Avatar className="h-7 w-7 mr-1">
              <AvatarImage src={profileData?.avatar || teamMembers.find(m => m.id === 1)?.avatar} />
              <AvatarFallback>Me</AvatarFallback>
            </Avatar>
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
          
          {/* Add reconnect button when disconnected */}
          {connectionStatus === 'disconnected' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 px-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              onClick={handleReconnect}
              disabled={isReconnecting}
            >
              {isReconnecting ? (
                <>
                  <Loader className="h-3 w-3 mr-1 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <span className="mr-1">⟳</span>
                  Reconnect
                </>
              )}
            </Button>
          )}
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
          className={`context-menu ${contextMenu.position === 'up' ? 'context-menu-up' : 'context-menu-down'}`}
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
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
      
      {/* Use the fixed New Chat Modal */}
      {showNewChatModal && renderNewChatModal()}
    </div>
  )
}

// MessageDisplay component
interface MessageDisplayProps {
  message: ChatMessage;
  isLastInGroup?: boolean;
}

function MessageDisplay({ message, isLastInGroup }: MessageDisplayProps) {
  const isCurrentUser = message.senderId === 1;

  // Get user details from participants list
  const sender = message.senderId === 1 ? "You" : message.senderName || "User";
  
  return (
    <div
      className={cn(
        "flex gap-2",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarFallback>{sender.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "rounded-lg px-3 py-2 max-w-[85%]",
        isCurrentUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>        
        <div className="break-words">
          {message.type === 'text' && (
            <p>{message.content}</p>
          )}
          {message.type === 'image' && (
            <img 
              src={message.content} 
              alt="Shared image" 
              className="max-w-full rounded" 
            />
          )}
          {message.type === 'audio' && (
            <div className="flex items-center gap-2">
              <FileMusic className="h-4 w-4" />
              <span>Voice message</span>
            </div>
          )}
          {message.type === 'video' && (
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              <span>Video message</span>
            </div>
          )}
        </div>

        {isLastInGroup && (
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            {isCurrentUser && (
              <span className="text-[10px] text-muted-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatWindowProps {
  mobileView: 'list' | 'chat';
  setMobileView: (view: 'list' | 'chat') => void;
}

function ChatWindow({ mobileView, setMobileView }: ChatWindowProps) {
  const { 
    activeChat,
    messages,
    sendMessage,
    startTyping,
    stopTyping,
    connectionStatus 
  } = useChat();
  
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !activeChat) return;

    try {
      setIsLoading(true);
      
      if (connectionStatus !== 'connected') {
        toast({
          title: "Not connected",
          description: "Waiting for connection...",
          duration: 2000,
        });
        return;
      }

      // Send message
      await sendMessage(messageInput.trim());
      setMessageInput('');
      
      // Scroll to bottom after sending
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send",
        description: "Please try again",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [messageInput, activeChat, connectionStatus, sendMessage, toast]);

  // Auto-scroll on new messages
  useEffect(() => {
    const shouldScroll = messages[messages.length - 1]?.senderId === 1; // Current user's messages
    if (shouldScroll) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle typing indicators
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    
    const handleTyping = () => {
      startTyping();
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        stopTyping();
      }, 1000);
    };

    return () => {
      clearTimeout(typingTimeout);
      stopTyping();
    };
  }, [startTyping, stopTyping]);

  // If no active chat, show welcome screen
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-muted/30 rounded-full p-6 mx-auto mb-6 w-24 h-24 flex items-center justify-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Welcome to Chat</h2>
          <p className="text-muted-foreground mb-6">
            Select a chat or start a new conversation
          </p>
          <Button onClick={() => setShowNewChatModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <header className="flex items-center px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Back button - mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileView("list")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Avatar className="h-8 w-8">
            <AvatarImage src={activeChat.avatar} alt={activeChat.name} />
            <AvatarFallback>{activeChat.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <h3 className="font-semibold text-sm">{activeChat.name}</h3>
            <p className="text-xs text-muted-foreground">
              {activeChat.type === 'group' 
                ? `${activeChat.participants.length} members`
                : activeChat.online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search messages</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>More options</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <MessageDisplay
              key={message.id}
              message={message}
              isLastInGroup={
                index === messages.length - 1 ||
                messages[index + 1]?.senderId !== message.senderId
              }
            />
          ))}
          <div ref={messageEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <footer className="border-t px-4 py-3 bg-background">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  aria-label="Add attachment"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add attachment</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex-1">
            <Textarea
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] resize-none"
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                if (e.target.value) startTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              aria-label="Message input"
            />
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isLoading}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </footer>
    </div>
  );
}