"use client";

import React, { useEffect, useState, useRef } from "react";
import { Shield, Info, Lock, Bell, Phone, Video, Search, MoreVertical, ArrowLeft, Send, Paperclip, Mic, Image as ImageIcon, FileIcon, X, Plus, Check, Reply, Edit2, Trash2, Download, MessageSquare, Archive, Forward, Copy, Save, ThumbsUp, AlertTriangle, Loader } from "lucide-react";
import { ChatProvider, useChat, Message, Chat } from "@/app/context/chat/ChatContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { NewChatModal } from "@/components/chat/NewChatModal";
import { useProfile } from "@/app/providers/profile";

interface ChatListProps {
  mobileView: 'list' | 'chat';
  setMobileView: (view: 'list' | 'chat') => void;
  deletedChats: Chat[];
  setDeletedChats: React.Dispatch<React.SetStateAction<Chat[]>>;
}

interface EnhancedChat extends Chat {
  preview?: string;
  lastMessageTime?: string;
  online?: boolean;
  id: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  skills: string[];
  avatar: string;
  utilization: number;
}

const defaultTeamMembers: TeamMember[] = [
  { 
    id: 1, 
    name: 'Current User', 
    email: 'user@example.com',
    role: 'Admin', 
    department: 'Management',
    status: 'active',
    skills: ['Management', 'Leadership'],
    avatar: '',
    utilization: 100
  },
  { 
    id: 2, 
    name: 'John Doe', 
    email: 'john@example.com',
    role: 'Developer', 
    department: 'Engineering',
    status: 'active',
    skills: ['React', 'TypeScript'],
    avatar: '',
    utilization: 80
  },
  { 
    id: 3, 
    name: 'Jane Smith', 
    email: 'jane@example.com',
    role: 'Designer', 
    department: 'Design',
    status: 'active',
    skills: ['UI/UX', 'Figma'],
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
];

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
    <ChatProvider teamMembers={defaultTeamMembers}>
      <div className="flex h-screen flex-col">
        <div className="border-b p-4 flex items-center justify-between bg-background">
          <h1 className="text-2xl font-bold">Chat</h1>
          <div className="flex items-center gap-2">
            {/* Header buttons */}
          </div>
        </div>

        <main className="flex-1 flex w-full overflow-hidden">
          <div className={cn(
            "h-full flex-col border-r md:flex md:w-80",
            mobileView === "list" ? "flex" : "hidden"
          )}>
            <CustomChatList 
              mobileView={mobileView} 
              setMobileView={setMobileView}
              deletedChats={deletedChats}
              setDeletedChats={setDeletedChats}
            />
          </div>
          <div className={cn(
            "flex-1 flex-col h-full overflow-hidden md:flex",
            mobileView === "chat" ? "flex" : "hidden"
          )}>
            <ChatWindow 
              mobileView={mobileView} 
              setMobileView={setMobileView} 
            />
          </div>
        </main>

        {/* Modals */}
        {showNotificationModal && (
          <div className="chat-modal-layout">
            {/* Notification modal content */}
          </div>
        )}

        {showSecurityModal && (
          <div className="chat-modal-layout">
            {/* Security modal content */}
          </div>
        )}

        {showDeletedChatsModal && (
          <div className="chat-modal-layout">
            {/* Deleted chats modal content */}
          </div>
        )}
      </div>
    </ChatProvider>
  );
}

function CustomChatList({ mobileView, setMobileView, deletedChats, setDeletedChats }: ChatListProps) {
  const { chats, activeChat, setActiveChat, connectionStatus, markAsRead, archiveChat, unarchiveChat, muteChat, unmuteChat } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'contacts'>('recent');
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number,
    y: number,
    chatId: string | null,
    position: 'up' | 'down'
  } | null>(null);
  const profileData = useProfile();
  const { toast } = useToast();

  const handleContextMenuAction = (action: string, chatId: string) => {
    switch (action) {
      case 'archive':
        archiveChat(chatId);
        break;
      case 'unarchive':
        unarchiveChat(chatId);
        break;
      case 'mute':
        muteChat(chatId);
        break;
      case 'read':
        markAsRead(chatId);
        break;
    }
    setContextMenuPosition(null);
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    const position = e.clientY > window.innerHeight * 0.6 ? 'up' : 'down';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    setContextMenuPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      chatId,
      position
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="chat-search-container">
            <Search className="chat-search-icon" />
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
                  className="rounded-full flex-shrink-0"
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
      </div>

      <div className="chat-list-scroll">
        <Tabs 
          defaultValue="recent" 
          className="flex flex-col h-full"
          onValueChange={(value) => setActiveTab(value as 'recent' | 'contacts')}
        >
          {/* Chat list content */}
        </Tabs>
      </div>

      {contextMenuPosition && (
        <DropdownMenu>
          <DropdownMenuContent
            className="chat-context-menu"
            data-position={contextMenuPosition.position}
            data-state="open"
          >
            <DropdownMenuItem
              onClick={() => contextMenuPosition.chatId && handleContextMenuAction(
                activeTab === 'recent' ? 'archive' : 'unarchive',
                contextMenuPosition.chatId
              )}
            >
              {activeTab === 'recent' ? 'Archive Chat' : 'Unarchive Chat'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => contextMenuPosition.chatId && handleContextMenuAction('read', contextMenuPosition.chatId)}
            >
              Mark as Read
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => contextMenuPosition.chatId && handleContextMenuAction('mute', contextMenuPosition.chatId)}
            >
              Mute Notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showNewChatModal && <NewChatModal onClose={() => setShowNewChatModal(false)} />}
    </div>
  );
}

function ChatWindow({ mobileView, setMobileView }: { mobileView: string, setMobileView: (view: 'list' | 'chat') => void }) {
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { activeChat } = useChat();

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-4 h-full w-full">
        <div className="text-center max-w-md mx-auto">
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

        {showNewChatModal && <NewChatModal onClose={() => setShowNewChatModal(false)} />}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat window content */}
      {showNewChatModal && <NewChatModal onClose={() => setShowNewChatModal(false)} />}
    </div>
  );
}
