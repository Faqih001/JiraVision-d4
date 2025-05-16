'use client'

import React, { useState, useEffect } from 'react'
import { Search, X, Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useChat } from '@/app/context/chat/ChatContext'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { TeamMember } from '@/types/team'

interface NewChatModalProps {
  onClose: () => void
}

export function NewChatModal({ onClose }: NewChatModalProps) {
  const { chats, createGroup, setActiveChat } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [selectedIndividualMember, setSelectedIndividualMember] = useState<TeamMember | null>(null)
  const [groupChatName, setGroupChatName] = useState('')
  const [modalActiveTab, setModalActiveTab] = useState<'individual' | 'group'>('individual')
  const { toast } = useToast()

  // Fetch team members when component mounts
  useEffect(() => {
    const loadTeamMembers = async () => {
      // Mock team members for demo
      const members: TeamMember[] = [
        { id: 1, name: 'Current User', role: 'Admin', avatar: '' },
        { id: 2, name: 'John Doe', role: 'Developer', avatar: '' },
        { id: 3, name: 'Jane Smith', role: 'Designer', avatar: '' },
        { id: 4, name: 'Mike Johnson', role: 'Project Manager', avatar: '' }
      ]
      setTeamMembers(members.filter(member => member.id !== 1)) // Exclude current user
    }
    loadTeamMembers()
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
    // Get all selectable team members (excluding current user)
    const selectableMembers = teamMembers
      .filter(member => 
        searchQuery ? 
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          member.role.toLowerCase().includes(searchQuery.toLowerCase()) : 
          true
      )
      .map(member => member.id)
    
    if (selectedMembers.length === selectableMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(selectableMembers)
    }
  }

  // Generate avatar for group chat
  const generateGroupAvatar = () => {
    return "/placeholder-group-avatar.jpg"
  }

  // Create new group chat
  const handleCreateGroupChat = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one member for the group chat.",
        variant: "destructive",
      })
      return
    }

    if (!groupChatName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the group chat.",
        variant: "destructive",
      })
      return
    }

    try {
      const newChat = await createGroup(
        groupChatName,
        selectedMembers,
        generateGroupAvatar()
      )
      
      toast({
        title: "Group chat created",
        description: `You've created "${groupChatName}" with ${selectedMembers.length} members.`
      })
      
      onClose()
    } catch (error) {
      console.error("Error creating group chat:", error)
      toast({
        title: "Error creating chat",
        description: "There was a problem creating the group chat. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Create new individual chat or open existing
  const handleCreateIndividualChat = async (member: TeamMember) => {
    if (!member || !member.id) {
      toast({
        title: "Error",
        description: "Invalid team member selected",
        variant: "destructive",
      })
      return
    }

    // Check if a chat with this user already exists
    const existingChat = chats.find(c => 
      c.type === 'individual' && 
      c.participants.includes(member.id)
    )

    if (existingChat) {
      setActiveChat(existingChat)
      onClose()
      return
    }

    try {
      const newChat = await createGroup(
        member.name,
        [member.id],
        member.avatar
      )
      
      toast({
        title: "Success",
        description: `Chat with ${member.name} created`,
        variant: "default",
      })
      
      onClose()
    } catch (error) {
      console.error("Error creating individual chat:", error)
      toast({
        title: "Error creating chat",
        description: "There was a problem creating the chat. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Chat</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
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
          value={modalActiveTab}
          className="mb-4"
          onValueChange={(value) => {
            setModalActiveTab(value as 'individual' | 'group')
            // Reset selection when switching tabs
            if (value === 'individual') {
              setSelectedIndividualMember(null)
            } else {
              setSelectedMembers([])
            }
          }}
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
                    </div>
                  </div>
                ))
              }
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
              <div className="max-h-[40vh] overflow-y-auto border rounded-md p-2">
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
                      className="flex items-center p-2 hover:bg-muted/30 rounded-md cursor-pointer"
                      onClick={() => toggleMemberSelection(member.id)}
                    >
                      <input
                        type="checkbox"
                        id={`select-member-${member.id}`}
                        className="mr-3 h-4 w-4 rounded border-muted-foreground"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
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
                  ))
                }
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">
                  Selected: <span className="font-medium">{selectedMembers.length}</span> members
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={handleSelectAll}
                >
                  {selectedMembers.length === teamMembers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (modalActiveTab === 'group') {
                handleCreateGroupChat()
              } else if (modalActiveTab === 'individual' && selectedIndividualMember) {
                handleCreateIndividualChat(selectedIndividualMember)
              }
            }}
            disabled={(modalActiveTab === 'group' && (selectedMembers.length === 0 || !groupChatName.trim())) ||
                     (modalActiveTab === 'individual' && !selectedIndividualMember)}
          >
            Create Chat
          </Button>
        </div>
      </div>
    </div>
  )
}
