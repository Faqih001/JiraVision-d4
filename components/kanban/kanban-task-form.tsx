"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, X, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"

type KanbanTaskFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  columns: any[]
  selectedColumnId: string | null
  onColumnChange: (columnId: string) => void
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

type TeamMember = {
  id: number
  name: string
  avatar: string
}

// Mock team members for demo
const TEAM_MEMBERS: TeamMember[] = [
  { id: 1, name: "John Doe", avatar: "" },
  { id: 2, name: "Alice Smith", avatar: "" },
  { id: 3, name: "Bob Johnson", avatar: "" },
  { id: 4, name: "Carol Williams", avatar: "" },
]

// Mock tags for demo
const AVAILABLE_TAGS = [
  "Frontend", "Backend", "API", "UI/UX", "Design", "Documentation",
  "DevOps", "Testing", "Research", "Marketing", "Security", "Data Visualization"
]

export default function KanbanTaskForm({
  isOpen,
  onClose,
  onSubmit,
  columns,
  selectedColumnId,
  onColumnChange,
}: KanbanTaskFormProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setTitle("")
      setDescription("")
      setPriority("medium")
      setDueDate(undefined)
      setAssigneeId(user?.id)
      setSelectedTags([])
      setTagInput("")
    }
  }, [isOpen, user])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !selectedColumnId) return

    onSubmit({
      title,
      description,
      priority,
      dueDate: dueDate?.toISOString().split('T')[0],
      assigneeId,
      tags: selectedTags,
      columnId: selectedColumnId,
    })
  }

  const addTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      setSelectedTags([...selectedTags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[95%]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task for your kanban board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description"
                rows={3}
              />
            </div>

            {/* Column & Priority */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="column" className="text-sm font-medium">
                  Column <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={selectedColumnId || undefined} 
                  onValueChange={onColumnChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-medium">
                  Priority
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date & Assignee */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="dueDate" className="text-sm font-medium">
                  Due Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label htmlFor="assignee" className="text-sm font-medium">
                  Assignee
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {assigneeId ? 
                        (assigneeId === user?.id ? 
                          user?.name : 
                          TEAM_MEMBERS.find(member => member.id === assigneeId)?.name) : 
                        "Unassigned"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 max-h-[250px] overflow-y-auto" align="start">
                    <div className="p-2">
                      <div
                        className="flex items-center gap-2 rounded-md p-2 cursor-pointer hover:bg-muted"
                        onClick={() => setAssigneeId(undefined)}
                      >
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Unassigned</span>
                      </div>
                      <div
                        className="flex items-center gap-2 rounded-md p-2 cursor-pointer hover:bg-muted"
                        onClick={() => setAssigneeId(user?.id)}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} />
                          <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{user?.name} (Me)</span>
                      </div>
                      {TEAM_MEMBERS.filter(member => member.id !== user?.id).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 rounded-md p-2 cursor-pointer hover:bg-muted"
                          onClick={() => setAssigneeId(member.id)}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.avatar || "/placeholder-user.jpg"} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 pl-3"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 rounded-full hover:bg-muted"
                      aria-label={`Remove ${tag} tag`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto justify-center sm:justify-start"
                    >
                      Select from common tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px]" align="start">
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {AVAILABLE_TAGS.map((tag) => (
                        <div
                          key={tag}
                          className={cn(
                            "rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors",
                            selectedTags.includes(tag) && "bg-muted"
                          )}
                          onClick={() => {
                            if (selectedTags.includes(tag)) {
                              removeTag(tag)
                            } else {
                              setSelectedTags([...selectedTags, tag])
                            }
                          }}
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex gap-2 flex-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Custom tag"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={addTag}
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title || !selectedColumnId}
              className="w-full sm:w-auto"
            >
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
