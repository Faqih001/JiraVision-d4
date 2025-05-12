"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type Task = {
  id?: number
  title: string
  description: string
  status: string
  priority: string
  storyPoints: number
  assigneeId?: number
  sprintId?: number
  dueDate?: string
  tags: string[]
}

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
      const formattedTask = {
        ...task,
        tags: Array.isArray(task.tags) ? task.tags : task.tags ? task.tags.split(',').map(tag => tag.trim()) : []
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Create a new task for your sprint.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={task.title}
                onChange={handleChange}
                placeholder="Enter task title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={task.description}
                onChange={handleChange}
                placeholder="Enter task description"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={task.priority}
                  onValueChange={(value) => handleSelectChange("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={task.status}
                  onValueChange={(value) => handleSelectChange("status", value)}
                >
                  <SelectTrigger>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="storyPoints">Story Points</Label>
                <Input
                  id="storyPoints"
                  name="storyPoints"
                  type="number"
                  value={task.storyPoints}
                  onChange={handleNumberChange}
                  min={1}
                  max={21}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={task.dueDate}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                name="tags"
                value={task.tags.join(", ")}
                onChange={handleTagsChange}
                placeholder="Frontend, Bug, High Priority"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
