"use client"

import { useEffect, useState, useMemo } from "react"
import { DragDropContext, Droppable } from "@hello-pangea/dnd"
import { 
  CirclePlus, 
  Filter, 
  Search, 
  Users, 
  MoreHorizontal, 
  Settings, 
  CalendarDays,
  BarChart3,
  Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import KanbanColumn from "@/components/kanban/kanban-column"
import KanbanTaskForm from "@/components/kanban/kanban-task-form"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

// Define types
export type KanbanTask = {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  assignee?: {
    id: string | number
    name: string
    avatar?: string
  }
  tags: string[]
  attachments?: number
  comments?: number
  subtasks?: {
    total: number
    completed: number
  }
}

type KanbanColumn = {
  id: string
  title: string
  color: string
  tasks: KanbanTask[]
}

export default function KanbanPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKanbanData = async () => {
      try {
        setLoading(true)
        // Fetch data from API
        const response = await fetch('/api/dashboard/kanban', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch Kanban data')
        }
        
        const { data } = await response.json()
        setColumns(data.columns || [])
      } catch (error) {
        console.error("Error fetching Kanban data:", error)
        // Fallback data for development
        setColumns([
          {
            id: 'backlog',
            title: 'Backlog',
            color: 'bg-slate-400',
            tasks: [
              {
                id: 'task1',
                title: 'Research competitor pricing',
                description: 'Analyze pricing structures of main competitors',
                priority: 'medium',
                dueDate: '2025-05-20',
                assignee: {
                  id: user?.id || '1',
                  name: user?.name || 'User',
                  avatar: user?.avatar,
                },
                tags: ['Research', 'Marketing'],
                attachments: 2,
                comments: 3,
                subtasks: {
                  total: 4,
                  completed: 1,
                },
              },
              {
                id: 'task2',
                title: 'Update API documentation',
                priority: 'low',
                tags: ['Documentation', 'API'],
                attachments: 1,
                comments: 0,
              },
            ],
          },
          {
            id: 'todo',
            title: 'To Do',
            color: 'bg-blue-500',
            tasks: [
              {
                id: 'task3',
                title: 'Create onboarding flow wireframes',
                priority: 'high',
                dueDate: '2025-05-18',
                assignee: {
                  id: '2',
                  name: 'Alice Smith',
                  avatar: '',
                },
                tags: ['Design', 'UI/UX'],
                attachments: 5,
                comments: 8,
                subtasks: {
                  total: 3,
                  completed: 0,
                },
              },
              {
                id: 'task4',
                title: 'Implement authentication service',
                priority: 'high',
                tags: ['Backend', 'Security'],
                comments: 2,
              },
            ],
          },
          {
            id: 'in-progress',
            title: 'In Progress',
            color: 'bg-amber-500',
            tasks: [
              {
                id: 'task5',
                title: 'Implement dashboard charts',
                priority: 'medium',
                dueDate: '2025-05-15',
                assignee: {
                  id: user?.id || '1',
                  name: user?.name || 'User',
                  avatar: user?.avatar,
                },
                tags: ['Frontend', 'Data Visualization'],
                attachments: 1,
                comments: 4,
                subtasks: {
                  total: 5,
                  completed: 2,
                },
              },
            ],
          },
          {
            id: 'review',
            title: 'Review',
            color: 'bg-purple-500',
            tasks: [
              {
                id: 'task6',
                title: 'Review landing page design',
                priority: 'medium',
                assignee: {
                  id: '3',
                  name: 'Bob Johnson',
                  avatar: '',
                },
                tags: ['Design', 'Marketing'],
                comments: 7,
              },
            ],
          },
          {
            id: 'done',
            title: 'Done',
            color: 'bg-green-500',
            tasks: [
              {
                id: 'task7',
                title: 'Setup CI/CD pipeline',
                priority: 'high',
                assignee: {
                  id: '4',
                  name: 'Carol Williams',
                  avatar: '',
                },
                tags: ['DevOps', 'Infrastructure'],
                attachments: 2,
                subtasks: {
                  total: 3,
                  completed: 3,
                },
              },
              {
                id: 'task8',
                title: 'Create project documentation',
                priority: 'low',
                tags: ['Documentation'],
                comments: 1,
              },
            ],
          },
        ])
        
        toast({
          title: "Using demo data",
          description: "Could not fetch real data from API, showing example tasks.",
          variant: "default",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchKanbanData()
  }, [user, toast])

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    // Dropped outside the list
    if (!destination) {
      return
    }

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    // Find source and destination columns
    const sourceColumn = columns.find(col => col.id === source.droppableId)
    const destColumn = columns.find(col => col.id === destination.droppableId)

    if (!sourceColumn || !destColumn) return

    // Same column reordering
    if (source.droppableId === destination.droppableId) {
      const newTasks = Array.from(sourceColumn.tasks)
      const [movedTask] = newTasks.splice(source.index, 1)
      newTasks.splice(destination.index, 0, movedTask)

      const newColumn = {
        ...sourceColumn,
        tasks: newTasks,
      }

      const newColumns = columns.map(col => 
        col.id === newColumn.id ? newColumn : col
      )

      setColumns(newColumns)

      try {
        // Update task order in the backend
        await fetch('/api/dashboard/kanban/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: draggableId,
            sourceColumnId: source.droppableId,
            destinationColumnId: destination.droppableId,
            sourceIndex: source.index,
            destinationIndex: destination.index,
          }),
        })
      } catch (error) {
        console.error('Error updating task order:', error)
        // Revert the state if the API call fails
      }
    } else {
      // Moving between columns
      const sourceTasks = Array.from(sourceColumn.tasks)
      const [movedTask] = sourceTasks.splice(source.index, 1)
      
      const updatedMovedTask = {
        ...movedTask,
        status: destination.droppableId, // Update the task status
      }
      
      const destTasks = Array.from(destColumn.tasks)
      destTasks.splice(destination.index, 0, updatedMovedTask)

      const newSourceColumn = {
        ...sourceColumn,
        tasks: sourceTasks,
      }

      const newDestColumn = {
        ...destColumn,
        tasks: destTasks,
      }

      const newColumns = columns.map(col => {
        if (col.id === newSourceColumn.id) return newSourceColumn
        if (col.id === newDestColumn.id) return newDestColumn
        return col
      })

      setColumns(newColumns)

      try {
        // Update task status in the backend
        await fetch('/api/dashboard/kanban/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: draggableId,
            newStatus: destination.droppableId,
            sourceColumnId: source.droppableId,
            destinationColumnId: destination.droppableId,
            sourceIndex: source.index,
            destinationIndex: destination.index,
          }),
        })
      } catch (error) {
        console.error('Error updating task status:', error)
        // Revert the state if the API call fails
      }
    }
  }

  const handleAddTask = () => {
    setSelectedColumn(columns[0]?.id || null)
    setShowTaskForm(true)
  }

  const handleTaskFormSubmit = async (taskData: any) => {
    if (!selectedColumn) return
    
    try {
      // Create task in the backend
      const response = await fetch('/api/dashboard/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          columnId: selectedColumn,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create task')
      }
      
      const { task } = await response.json()
      
      // Update local state
      const newColumns = columns.map(col => {
        if (col.id === selectedColumn) {
          return {
            ...col,
            tasks: [...col.tasks, task],
          }
        }
        return col
      })
      
      setColumns(newColumns)
      setShowTaskForm(false)
      
      toast({
        title: "Task created",
        description: "The task has been successfully created.",
      })
    } catch (error) {
      console.error('Error creating task:', error)
      
      // Fallback for development - create task locally
      const newTask: KanbanTask = {
        id: `task${Date.now()}`,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        assignee: taskData.assignee || {
          id: user?.id || '1',
          name: user?.name || 'User',
          avatar: user?.avatar,
        },
        tags: taskData.tags || [],
      }
      
      const newColumns = columns.map(col => {
        if (col.id === selectedColumn) {
          return {
            ...col,
            tasks: [...col.tasks, newTask],
          }
        }
        return col
      })
      
      setColumns(newColumns)
      setShowTaskForm(false)
      
      toast({
        title: "Task created (locally)",
        description: "The task has been created in the local state only.",
      })
    }
  }

  const handleAnalytics = () => {
    toast({
      title: "Kanban Analytics",
      description: "Generating analytics dashboard for your kanban board...",
    });
    
    // This would typically open a modal or navigate to an analytics page
  };

  const handleConfigure = () => {
    toast({
      title: "Configure Kanban Board",
      description: "Opening board configuration options...",
    });
    
    // This would typically open a configuration modal
  };

  const handleCalendarView = () => {
    // Redirect to calendar page with task view
    router.push('/dashboard/calendar?view=tasks');
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    tasks: column.tasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }))

  return (
    <div className="h-full flex flex-col">
      {/* Kanban Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Kanban Board
          </h1>
          <p className="text-muted-foreground">Manage and organize your tasks visually</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleAnalytics}>
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleConfigure}>
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configure</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleCalendarView}>
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </Button>
          </div>
          <Button onClick={handleAddTask} className="gap-1">
            <CirclePlus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Kanban Filters */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-full sm:w-80">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Users className="h-4 w-4" />
                Assignee
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>All</DropdownMenuItem>
              <DropdownMenuItem>Only Mine</DropdownMenuItem>
              <DropdownMenuItem>Unassigned</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Team Members...</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-1 hidden sm:flex">
            <Badge variant="outline" className="text-xs py-0 px-1">
              Status: All
            </Badge>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading kanban board...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div 
            className={cn("flex h-full gap-4 pb-4", {
              "min-w-[640px]": columns.length <= 2,
              "min-w-[960px]": columns.length > 2 && columns.length <= 3,
              "min-w-[1280px]": columns.length > 3 && columns.length <= 4,
              "min-w-[1600px]": columns.length > 4 && columns.length <= 5,
              "min-w-[1920px]": columns.length > 5,
            })}
          >
            <DragDropContext onDragEnd={handleDragEnd}>
              {filteredColumns.map((column) => (
                <KanbanColumn 
                  key={column.id} 
                  column={column} 
                  onAddTask={() => {
                    setSelectedColumn(column.id)
                    setShowTaskForm(true)
                  }}
                />
              ))}
            </DragDropContext>
          </div>
        </div>
      )}
      
      {/* Task Form Modal */}
      <KanbanTaskForm
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSubmit={handleTaskFormSubmit}
        columns={columns}
        selectedColumnId={selectedColumn}
        onColumnChange={setSelectedColumn}
      />
    </div>
  )
}
