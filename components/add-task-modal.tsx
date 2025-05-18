"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Task } from "@/types/task"
import { AlertCircle, ArrowRight, CalendarIcon, Clock, Hash, ListTodo, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

type AddTaskModalProps = {
  isOpen: boolean
  onClose: () => void
  onAddTask: (task: Task) => void
  sprintId?: number
}

export default function AddTaskModal({ isOpen, onClose, onAddTask, sprintId }: AddTaskModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<Task>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    storyPoints: 1,
    sprintId: sprintId,
    tags: [],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTask({
      ...task,
      [e.target.name]: e.target.value,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setTask({
      ...task,
      [name]: value,
    })
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTask({
      ...task,
      [e.target.name]: parseInt(e.target.value),
    })
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTask({
      ...task,
      tags: e.target.value.split(",").map((tag) => tag.trim()),
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!task.title) {
        throw new Error("Task title is required")
      }

      // Format tags properly if needed
      const tagsList = Array.isArray(task.tags) 
        ? task.tags 
        : [];
        
      const formattedTask: Task = {
        ...task,
        tags: tagsList
      }

      // Call the API to create a new task
      const response = await fetch("/api/dashboard/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedTask),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create task")
      }

      const data = await response.json()
      onAddTask(data.task)
      toast({
        title: "Task created",
        description: "Task has been created successfully.",
      })
      onClose()
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[550px] md:max-w-[600px] w-[95%] max-h-[90vh] overflow-y-auto p-0" 
        aria-describedby="task-modal-description"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="px-6 pt-6 pb-2 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="bg-primary/10 p-1.5 rounded-md">
                <ListTodo className="h-5 w-5 text-primary" />
              </span>
              Create New Task
            </DialogTitle>
            <DialogDescription id="task-modal-description" className="text-sm text-muted-foreground pt-1">
              Create a new task to track work in your sprint.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-2 space-y-6">
            {/* Title field with visual emphasis */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium flex items-center gap-1.5">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={task.title}
                onChange={handleChange}
                placeholder="Enter a descriptive task title"
                required
                className="h-11 text-base"
              />
            </div>
            
            {/* Description field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium flex items-center gap-1.5">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={task.description}
                onChange={handleChange}
                placeholder="Provide details about what needs to be accomplished"
                rows={4}
                className="resize-none text-base"
              />
            </div>
            
            {/* Task details section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Task Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority selector with colored indicators */}
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium flex items-center gap-1.5">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    Priority
                  </Label>
                  <Select
                    value={task.priority}
                    onValueChange={(value) => handleSelectChange("priority", value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Low
                      </SelectItem>
                      <SelectItem value="medium" className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Medium
                      </SelectItem>
                      <SelectItem value="high" className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        High
                      </SelectItem>
                      <SelectItem value="urgent" className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Urgent
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Status selector */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Status
                  </Label>
                  <Select
                    value={task.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Story Points */}
                <div className="space-y-2">
                  <Label htmlFor="storyPoints" className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Story Points
                  </Label>
                  <Input
                    id="storyPoints"
                    name="storyPoints"
                    type="number"
                    value={task.storyPoints}
                    onChange={handleNumberChange}
                    min={1}
                    max={21}
                    className="h-10"
                  />
                </div>
                
                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Due Date
                  </Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={task.dueDate}
                    onChange={handleChange}
                    className="h-10"
                  />
                </div>
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Tags
                </Label>
                <Input
                  id="tags"
                  name="tags"
                  value={task.tags.join(", ")}
                  onChange={handleTagsChange}
                  placeholder="Frontend, Bug, High Priority"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">Separate tags with commas</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-background z-10 flex flex-col sm:flex-row items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading} 
              className="w-full sm:w-auto h-10"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className={cn(
                "w-full sm:w-auto h-10 transition-all",
                loading ? "bg-primary/80" : ""
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
