"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Search, Send, Smile, Paperclip, MoreVertical, Phone, Video, User, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ChatPage() {
  const { theme } = useTheme()
  const [message, setMessage] = useState("")
  const [activeChat, setActiveChat] = useState("sharad")
  const [searchQuery, setSearchQuery] = useState("")

  // Sample data for chats
  const contacts = [
    {
      id: "sharad",
      name: "Sharad Mishra",
      avatar: "/avatars/sharad.png",
      online: true,
      isActive: true,
      unread: 0,
      preview: "Hello, Setup the github repo for bootstrap admin dashboard.",
      lastMessageTime: "09:35",
      messages: [
        {
          id: 1,
          sender: "sharad",
          content: "Hello, Setup the github repo for bootstrap admin dashboard.",
          time: "09:35",
          isRead: true
        },
        {
          id: 2,
          sender: "user",
          content: "Yes, Currently working on the today evening i will up the admin dashboard template.",
          time: "09:39",
          isRead: true
        },
        {
          id: 3,
          sender: "sharad",
          content: "Thank you",
          time: "09:42",
          isRead: true
        },
        {
          id: 4,
          sender: "user",
          content: "You are most welcome.",
          time: "09:48",
          isRead: true
        },
        {
          id: 5,
          sender: "sharad",
          content: "After complete this we working on React/Next.js based admin dasboard template.",
          time: "09:50", 
          isRead: true
        },
        {
          id: 6,
          sender: "user",
          content: "Yes, we work on the react and next.js",
          time: "09:52",
          isRead: true
        }
      ]
    },
    {
      id: "jitu",
      name: "Jitu Chauhan",
      avatar: "/avatars/jitu.png",
      online: true,
      isActive: false,
      unread: 0,
      preview: "Online",
      lastMessageTime: "",
      messages: []
    },
    {
      id: "denise",
      name: "Denise Reece",
      avatar: "/avatars/denise.png",
      online: false,
      isActive: false,
      unread: 1,
      preview: "I m for unread message components...",
      lastMessageTime: "8:48AM",
      messages: []
    },
    {
      id: "kevin",
      name: "Kevin White",
      avatar: "/avatars/kevin.png",
      online: false,
      isActive: false,
      unread: 0,
      preview: "Currently chat with user components...",
      lastMessageTime: "8:48AM",
      messages: []
    },
    {
      id: "mary",
      name: "Mary Newton",
      avatar: "/avatars/mary.png",
      online: false,
      isActive: false,
      unread: 0,
      preview: "",
      lastMessageTime: "8:48AM",
      messages: []
    },
    {
      id: "figma",
      name: "Figma to HTML5",
      avatar: "",
      online: false,
      isActive: false,
      unread: 0,
      preview: "Convert Figma to HTML5 template...",
      lastMessageTime: "3/11/2023",
      messages: []
    },
    {
      id: "richard",
      name: "Richard Sousa",
      avatar: "/avatars/richard.png",
      online: false,
      isActive: false,
      unread: 0,
      preview: "On going description of group...",
      lastMessageTime: "2/10/2023",
      messages: []
    },
    {
      id: "melissa",
      name: "Melissa Westbrook",
      avatar: "/avatars/melissa.png",
      online: false,
      isActive: false,
      unread: 0,
      preview: "On going description of group...",
      lastMessageTime: "2/3/2023",
      messages: []
    },
    {
      id: "christy",
      name: "Christy Obrien",
      avatar: "/avatars/christy.png",
      online: false,
      isActive: false,
      unread: 0,
      preview: "Start design system for UI.",
      lastMessageTime: "1/24/2023",
      messages: []
    },
    {
      id: "herbert",
      name: "Herbert Strayhorn",
      avatar: "/avatars/herbert.png",
      online: false,
      isActive: false,
      unread: 0,
      preview: "Start design system for UI...",
      lastMessageTime: "3/3/2023",
      messages: []
    },
    {
      id: "joe",
      name: "Joe Lindahl",
      avatar: "/avatars/joe.png",
      online: false,
      isActive: false,
      unread: 0,
      preview: "On going description of group...",
      lastMessageTime: "1/5/2023",
      messages: []
    }
  ]

  const currentChat = contacts.find(contact => contact.id === activeChat)

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.preview.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSendMessage = () => {
    if (!message.trim()) return
    
    // In a real app, you would send the message to the backend here
    console.log("Message sent:", message)

    // Clear the message input
    setMessage("")
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Chat List */}
      <div className="w-full md:w-80 lg:w-96 border-r flex flex-col bg-white dark:bg-gray-950">
        {/* Chat Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-semibold">Chat</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-primary">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search people, group and messages" 
              className="pl-9 bg-muted/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="recent" className="border-b">
          <TabsList className="w-full flex h-12 rounded-none bg-transparent border-b">
            <TabsTrigger 
              value="recent" 
              className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              Recent
            </TabsTrigger>
            <TabsTrigger 
              value="contact" 
              className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              Contact
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Chat List */}
        <div className="overflow-y-auto flex-1">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              className={`w-full flex items-center p-4 hover:bg-muted/50 transition-colors text-left relative border-b ${
                contact.isActive ? "bg-muted/30" : ""
              }`}
              onClick={() => setActiveChat(contact.id)}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  {contact.avatar ? (
                    <AvatarImage src={contact.avatar} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {contact.id === "figma" ? "DU" : contact.name.substring(0, 2)}
                    </AvatarFallback>
                  )}
                </Avatar>
                {contact.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
                )}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="font-medium">{contact.name}</div>
                <div className="text-sm text-muted-foreground truncate max-w-[180px]">
                  {contact.preview}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 ml-1 min-w-[55px]">
                <span className="text-xs text-muted-foreground">{contact.lastMessageTime}</span>
                {contact.unread > 0 && (
                  <Badge variant="destructive" className="rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                    {contact.unread}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Content - Chat Area */}
      <div className="hidden md:flex flex-col flex-1 h-full">
        {currentChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white dark:bg-gray-950">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {currentChat.avatar ? (
                    <AvatarImage src={currentChat.avatar} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {currentChat.id === "figma" ? "DU" : currentChat.name.substring(0, 2)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h2 className="font-medium">{currentChat.name}</h2>
                  <p className="text-xs text-muted-foreground">{currentChat.online ? "Online" : "Offline"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {currentChat.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.sender !== "user" && (
                    <Avatar className="h-8 w-8 mr-2 flex-shrink-0 mt-1">
                      {currentChat.avatar ? (
                        <AvatarImage src={currentChat.avatar} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {currentChat.name.substring(0, 2)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    <div className={`px-4 py-2 rounded-md max-w-xs md:max-w-md lg:max-w-lg ${
                      msg.sender === "user" 
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 self-end">
                      {msg.time}
                    </span>
                  </div>
                  {msg.sender === "user" && (
                    <Avatar className="h-8 w-8 ml-2 flex-shrink-0 mt-1">
                      <AvatarFallback>
                        {contacts[0].name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {/* Message input area */}
              <div className="mt-auto sticky bottom-0 pt-4">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-950 rounded-lg border p-2">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="Are you there?"
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button size="icon" className="rounded-full h-8 w-8" onClick={handleSendMessage} disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
            <div className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-6">Choose a contact from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
