"use client"

import { useTheme } from "@/components/ui/use-theme"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/components/ui/use-toast"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckSquare, Filter, Plus, MoreHorizontal, AlertCircle } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Task = {
  id: number
  title: string
  description: string
  status: string
  priority: string
  assignee?: string
  avatarUrl?: string
  createdAt: string
  due?: string
  tags: string[]
  hasAiRecommendation?: boolean
}

export default function TasksPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("all")
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch tasks
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true)
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock data
        const mockTasks: Task[] = [
          {
            id: 1001,
            title: "Implement AI-powered task recommendations",
            description: "Add a feature that suggests task assignments based on team member skills and availability.",
            status: "in-progress",
            priority: "high",
            assignee: "John Doe",
            avatarUrl: "/avatars/01.png",
            createdAt: "2023-05-04",
            due: "2023-05-15",
            tags: ["feature", "ai"],
            hasAiRecommendation: true,
          },
          {
            id: 1002,
            title: "Create ethical metrics dashboard",
            description: "Design and implement a dashboard to track team wellbeing and work-life balance metrics.",
            status: "todo",
            priority: "medium",
            assignee: "Alice Smith",
            avatarUrl: "/avatars/02.png",
            createdAt: "2023-05-05",
            due: "2023-05-20",
            tags: ["feature", "dashboard"],
          },
          {
            id: 1003,
            title: "Fix animation performance in dashboard charts",
            description: "The dashboard charts are causing performance issues on lower-end devices.",
            status: "todo",
            priority: "high",
            createdAt: "2023-05-06",
            tags: ["bug", "performance"],
          },
          {
            id: 1004,
            title: "Update API documentation",
            description: "The API documentation needs to be updated with the new endpoints.",
            status: "done",
            priority: "low",
            assignee: "Robert Johnson",
            avatarUrl: "/avatars/03.png",
            createdAt: "2023-05-01",
            due: "2023-05-10",
            tags: ["documentation"],
          },
          {
            id: 1005,
            title: "Implement dark mode for all pages",
            description: "Add dark mode support for all dashboard pages and components.",
            status: "in-progress",
            priority: "medium",
            assignee: "Emily Wilson",
            avatarUrl: "/avatars/04.png",
            createdAt: "2023-05-03",
            due: "2023-05-18",
            tags: ["feature", "ui"],
            hasAiRecommendation: true,
          },
        ]
        
        setTasks(mockTasks)
      } catch (error) {
        console.error("Failed to fetch tasks:", error)
        toast({
          title: "Error",
          description: "Failed to load tasks. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchTasks()
  }, [toast])

  // Handle button actions
  const handleNewTask = () => {
    toast({
      title: "New Task",
      description: "Opening task creation form...",
    });
  };

  const handleBulkActions = () => {
    toast({
      title: "Bulk Actions",
      description: "Opening bulk actions menu...",
    });
  };

  const handleFilter = () => {
    toast({
      title: "Filter Tasks",
      description: "Opening task filter options...",
    });
  };

  const handleViewTask = (taskId: number) => {
    toast({
      title: "View Task",
      description: `Opening details for task #${taskId}...`,
    });
  };

  const handleAssignTask = (taskId: number, currentAssignee?: string) => {
    toast({
      title: "Assign Task",
      description: `Opening assignment dialog for task #${taskId}...`,
    });
  };

  const handleChangeStatus = (taskId: number, newStatus: string) => {
    toast({
      title: "Status Changed",
      description: `Task #${taskId} status updated to ${newStatus}`,
    });

    // Update the task status in the local state
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  const handlePrioritize = (taskId: number) => {
    toast({
      title: "Task Prioritized",
      description: `Task #${taskId} has been prioritized`,
    });

    // Update the task priority in the local state
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, priority: 'high' } : task
      )
    );
  };

  const handleAcceptRecommendation = (taskId: number) => {
    toast({
      title: "Recommendation Accepted",
      description: `AI recommendation applied to task #${taskId}`,
    });
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter(task => {
    if (activeTab === "all") return true;
    if (activeTab === "todo") return task.status === "todo";
    if (activeTab === "in-progress") return task.status === "in-progress";
    if (activeTab === "done") return task.status === "done";
    if (activeTab === "unassigned") return !task.assignee;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage and track your team's tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleFilter}>
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleBulkActions}>
            <CheckSquare className="h-4 w-4" />
            <span>Bulk Actions</span>
          </Button>
          <Button size="sm" className="gap-1" onClick={handleNewTask}>
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="todo">To Do</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
        </TabsList>

        <Card>
          {loading ? (
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground">Loading tasks...</p>
            </CardContent>
          ) : filteredTasks.length === 0 ? (
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground">No tasks found</p>
              <Button className="mt-4" size="sm" onClick={handleNewTask}>
                <Plus className="h-4 w-4 mr-1" /> Create New Task
              </Button>
            </CardContent>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="py-3 pl-4 w-10">
                      <Checkbox />
                    </th>
                    <th className="py-3">Task</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Priority</th>
                    <th className="py-3">Assignee</th>
                    <th className="py-3">Due Date</th>
                    <th className="py-3 pr-4 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 pl-4">
                        <Checkbox />
                      </td>
                      <td className="py-3">
                        <div className="font-medium cursor-pointer hover:underline" onClick={() => handleViewTask(task.id)}>
                          {task.title}
                        </div>
                        <div className="text-sm text-muted-foreground">#{task.id} opened on {task.createdAt}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                          {task.hasAiRecommendation && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>AI Recommendation</span>
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Select
                          defaultValue={task.status}
                          onValueChange={(value) => handleChangeStatus(task.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue>
                              <span className="flex items-center gap-2">
                                <Badge
                                  className={
                                    task.status === "done"
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : task.status === "in-progress"
                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                        : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                  }
                                >
                                  {task.status === "todo" ? "To Do" : 
                                   task.status === "in-progress" ? "In Progress" : 
                                   "Done"}
                                </Badge>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                To Do
                              </Badge>
                            </SelectItem>
                            <SelectItem value="in-progress">
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                In Progress
                              </Badge>
                            </SelectItem>
                            <SelectItem value="done">
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Done
                              </Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            task.priority === "high"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : task.priority === "medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-green-50 text-green-700 border-green-200"
                          }
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1"
                              onClick={() => handleAssignTask(task.id, task.assignee)}
                            >
                              <AvatarImage src={task.avatarUrl} />
                              <AvatarFallback>{task.assignee[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assignee}</span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleAssignTask(task.id)}
                          >
                            Assign
                          </Button>
                        )}
                      </td>
                      <td className="py-3">
                        {task.due ? (
                          <span className={
                            new Date(task.due) < new Date() ? "text-red-600 font-medium" : ""
                          }>
                            {task.due}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No due date</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTask(task.id)}>View details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssignTask(task.id, task.assignee)}>Assign to</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrioritize(task.id)}>Prioritize</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {task.hasAiRecommendation && (
                              <DropdownMenuItem onClick={() => handleAcceptRecommendation(task.id)}>
                                Accept AI recommendation
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Tabs>
    </div>
  );
} 