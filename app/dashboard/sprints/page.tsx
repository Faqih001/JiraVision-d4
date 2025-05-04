"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  BarChart,
  Brain,
  Calendar,
  ChevronDown,
  Clock,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Sprout,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { format, addDays } from "date-fns"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Define types for our data
type Sprint = {
  id: number
  name: string
  goal: string
  startDate: string
  endDate: string
  status: string
  capacity: number
  completed: number
  storyPoints: number
  pendingTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  team: TeamMember[]
  velocity: number
  previousVelocity: number
  aiRecommendations?: string
}

type TeamMember = {
  id: number
  name: string
  avatar?: string
  role: string
  assignedTasks: number
  completedTasks: number
}

type TaskDistribution = {
  category: string
  count: number
  color: string
}

export default function SprintsPage() {
  const { theme } = useTheme()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setSprints([
          {
            id: 1,
            name: "Sprint 23.05",
            goal: "Complete API integration and finalize dashboard redesign",
            startDate: "2025-05-01",
            endDate: "2025-05-14",
            status: "active",
            capacity: 80,
            completed: 48,
            storyPoints: 58,
            pendingTasks: 12,
            completedTasks: 35,
            inProgressTasks: 8,
            blockedTasks: 4,
            team: [
              {
                id: 1,
                name: "John Doe",
                role: "Frontend Developer",
                assignedTasks: 8,
                completedTasks: 5,
              },
              {
                id: 2,
                name: "Jane Smith",
                role: "Backend Developer",
                assignedTasks: 10,
                completedTasks: 7,
              },
              {
                id: 3,
                name: "Alice Johnson",
                role: "UX Designer",
                assignedTasks: 6,
                completedTasks: 6,
              },
            ],
            velocity: 42,
            previousVelocity: 38,
            aiRecommendations: "This sprint is progressing well, but there might be a risk with the blocked tasks. Consider reallocating resources from completed tasks to address the blockers.",
          },
          {
            id: 2,
            name: "Sprint 23.06",
            goal: "Implement authentication flow improvements and performance optimizations",
            startDate: "2025-05-15",
            endDate: "2025-05-28",
            status: "planned",
            capacity: 85,
            completed: 0,
            storyPoints: 62,
            pendingTasks: 42,
            completedTasks: 0,
            inProgressTasks: 0,
            blockedTasks: 0,
            team: [
              {
                id: 1,
                name: "John Doe",
                role: "Frontend Developer",
                assignedTasks: 7,
                completedTasks: 0,
              },
              {
                id: 2,
                name: "Jane Smith",
                role: "Backend Developer",
                assignedTasks: 9,
                completedTasks: 0,
              },
              {
                id: 4,
                name: "Robert Johnson",
                role: "DevOps Engineer",
                assignedTasks: 5,
                completedTasks: 0,
              },
            ],
            velocity: 45, // Estimated velocity
            previousVelocity: 42,
          },
          {
            id: 3,
            name: "Sprint 23.04",
            goal: "Deliver initial prototype with core functionality",
            startDate: "2025-04-17",
            endDate: "2025-04-30",
            status: "completed",
            capacity: 75,
            completed: 71,
            storyPoints: 52,
            pendingTasks: 0,
            completedTasks: 38,
            inProgressTasks: 0,
            blockedTasks: 0,
            team: [
              {
                id: 1,
                name: "John Doe",
                role: "Frontend Developer",
                assignedTasks: 9,
                completedTasks: 8,
              },
              {
                id: 2,
                name: "Jane Smith",
                role: "Backend Developer",
                assignedTasks: 8,
                completedTasks: 8,
              },
              {
                id: 3,
                name: "Alice Johnson",
                role: "UX Designer",
                assignedTasks: 7,
                completedTasks: 6,
              },
            ],
            velocity: 38,
            previousVelocity: 32,
          },
        ])
      } catch (error) {
        console.error("Error loading sprint data:", error)
        toast({
          title: "Error",
          description: "Failed to load sprint data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleCreateSprint = () => {
    setShowCreateSprintModal(true)
  }

  const handleViewDetails = (sprintId: number) => {
    toast({
      title: "Sprint Details",
      description: `Viewing details for sprint #${sprintId}`,
    })
  }

  const handleEditSprint = (sprintId: number) => {
    toast({
      title: "Edit Sprint",
      description: `Opening edit form for sprint #${sprintId}`,
    })
  }

  const handleManageTasks = (sprintId: number) => {
    toast({
      title: "Manage Tasks",
      description: `Opening task management for sprint #${sprintId}`,
    })
  }

  const handleGenerateReport = (sprintId: number) => {
    toast({
      title: "Generate Report",
      description: `Generating report for sprint #${sprintId}`,
    })
  }

  const activeSprint = sprints.find((sprint) => sprint.status === "active")
  const completedSprints = sprints.filter((sprint) => sprint.status === "completed")
  const plannedSprints = sprints.filter((sprint) => sprint.status === "planned")

  const filteredSprints = searchQuery
    ? sprints.filter(
        (sprint) =>
          sprint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sprint.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sprint.status.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sprints

  // Task distribution data for the active sprint
  const taskDistribution: TaskDistribution[] = activeSprint
    ? [
        {
          category: "Completed",
          count: activeSprint.completedTasks,
          color: "emerald",
        },
        {
          category: "In Progress",
          count: activeSprint.inProgressTasks,
          color: "amber",
        },
        {
          category: "Blocked",
          count: activeSprint.blockedTasks,
          color: "rose",
        },
        {
          category: "Pending",
          count: activeSprint.pendingTasks,
          color: "blue",
        },
      ]
    : []

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sprints</h1>
            <p className="text-muted-foreground">
              Manage your sprints and track progress
            </p>
          </div>
          <div className="flex gap-2 self-stretch sm:self-auto">
            <div className="relative flex-1 sm:flex-none sm:min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9"
              />
            </div>
            <Button onClick={handleCreateSprint} className="bg-gradient-to-r from-primary to-purple-600 hover:shadow-md transition-all duration-200">
              <Plus className="h-4 w-4 mr-1.5" />
              <span>New Sprint</span>
            </Button>
          </div>
        </div>

        {/* Active Sprint */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Active Sprint
            </h2>
          </div>

          {loading ? (
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-5 w-64 mt-2" />
                  </div>
                  <Skeleton className="h-9 w-28" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </div>
                  <Skeleton className="h-48 w-full" />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ) : activeSprint ? (
            <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{activeSprint.name}</CardTitle>
                      <Badge className="bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 dark:text-emerald-400 border-emerald-500/30">
                        Active
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">{activeSprint.goal}</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{format(new Date(activeSprint.startDate), "MMM d")} - {format(new Date(activeSprint.endDate), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span>Velocity: {activeSprint.velocity}</span>
                      {activeSprint.velocity > activeSprint.previousVelocity ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Sprint Progress</span>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "font-medium",
                            Math.round((activeSprint.completed / activeSprint.capacity) * 100) >= 70
                              ? "text-emerald-500"
                              : Math.round((activeSprint.completed / activeSprint.capacity) * 100) >= 40
                                ? "text-amber-500"
                                : "text-rose-500"
                          )}>
                            {Math.round((activeSprint.completed / activeSprint.capacity) * 100)}%
                          </span>
                          <span className="text-xs text-muted-foreground">completed</span>
                        </div>
                      </div>
                      <Progress
                        value={(activeSprint.completed / activeSprint.capacity) * 100}
                        className="h-2 bg-muted"
                        indicatorClassName={cn(
                          Math.round((activeSprint.completed / activeSprint.capacity) * 100) >= 70
                            ? "bg-emerald-500"
                            : Math.round((activeSprint.completed / activeSprint.capacity) * 100) >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <BarChart className="h-4 w-4 text-primary" />
                            Story Points
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-3 text-center gap-2 mt-2">
                            <div className="p-2 rounded-lg bg-muted/50">
                              <div className="text-xl font-semibold">{activeSprint.storyPoints}</div>
                              <div className="text-xs text-muted-foreground mt-1">Total</div>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50">
                              <div className="text-xl font-semibold">{Math.round(activeSprint.storyPoints * (activeSprint.completed / activeSprint.capacity))}</div>
                              <div className="text-xs text-muted-foreground mt-1">Completed</div>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50">
                              <div className="text-xl font-semibold">{activeSprint.storyPoints - Math.round(activeSprint.storyPoints * (activeSprint.completed / activeSprint.capacity))}</div>
                              <div className="text-xs text-muted-foreground mt-1">Remaining</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Team Members
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex -space-x-2">
                              {activeSprint.team.map((member, i) => (
                                <Avatar key={i} className="border-2 border-background h-8 w-8">
                                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-purple-600/80 text-primary-foreground text-xs">
                                    {member.name.split(" ").map(n => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <Button variant="outline" size="sm" className="text-xs">
                              View Team
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Card className="h-fit">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          AI Recommendations
                        </CardTitle>
                        <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          Insights
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {activeSprint.aiRecommendations || "No AI recommendations available for this sprint."}
                      </p>
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="text-sm flex items-center gap-2">
                          <div className="size-3 rounded-full bg-emerald-500" />
                          <span>Completed: {activeSprint.completedTasks} tasks</span>
                        </div>
                        <div className="text-sm flex items-center gap-2">
                          <div className="size-3 rounded-full bg-amber-500" />
                          <span>In Progress: {activeSprint.inProgressTasks} tasks</span>
                        </div>
                        <div className="text-sm flex items-center gap-2">
                          <div className="size-3 rounded-full bg-rose-500" />
                          <span>Blocked: {activeSprint.blockedTasks} tasks</span>
                        </div>
                        <div className="text-sm flex items-center gap-2">
                          <div className="size-3 rounded-full bg-blue-500" />
                          <span>Pending: {activeSprint.pendingTasks} tasks</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 border-t py-3 bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => handleViewDetails(activeSprint.id)}>
                  View Details
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleManageTasks(activeSprint.id)}>
                  Manage Tasks
                </Button>
                <Button size="sm" className="ml-auto" onClick={() => handleGenerateReport(activeSprint.id)}>
                  Generate Report
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Sprout className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No active sprint found</p>
                <Button className="mt-4" size="sm" onClick={handleCreateSprint}>
                  <Plus className="h-4 w-4 mr-1" /> Start a New Sprint
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Other Sprints Tabs */}
        <section>
          <Tabs defaultValue="planned" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="w-full sm:w-auto bg-muted/50 p-1 gap-1">
                <TabsTrigger value="planned" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  Planned ({plannedSprints.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  Completed ({completedSprints.length})
                </TabsTrigger>
              </TabsList>
              
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <TabsContent value="planned" className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-4 w-48 mt-2" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-24" />
                    </CardFooter>
                  </Card>
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-4 w-48 mt-2" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-24" />
                    </CardFooter>
                  </Card>
                </div>
              ) : plannedSprints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plannedSprints.map((sprint) => (
                    <Card key={sprint.id} className="overflow-hidden group hover:shadow-md transition-all duration-200">
                      <CardHeader className="border-b bg-muted/30 pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{sprint.name}</CardTitle>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                                Planned
                              </Badge>
                            </div>
                            <CardDescription className="mt-1">{sprint.goal}</CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(sprint.id)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditSprint(sprint.id)}>
                                Edit Sprint
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageTasks(sprint.id)}>
                                Manage Tasks
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}</span>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Star className="h-3.5 w-3.5 text-amber-500" />
                                <span>Story Points</span>
                              </div>
                              <span className="font-medium">{sprint.storyPoints}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Progress value={0} className="h-1.5 bg-muted flex-1" />
                              <div className="text-xs text-muted-foreground">0%</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-2">
                              {sprint.team.map((member, i) => (
                                <Avatar key={i} className="border-2 border-background h-7 w-7">
                                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-purple-600/80 text-primary-foreground text-xs">
                                    {member.name.split(" ").map(n => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                              {sprint.team.length} Members
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between border-t py-3 bg-muted/20">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sprint.id)}>
                          View Details
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleManageTasks(sprint.id)}>
                          Start Sprint
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No planned sprints</p>
                    <Button className="mt-4" size="sm" onClick={handleCreateSprint}>
                      <Plus className="h-4 w-4 mr-1" /> Plan a Sprint
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-4 w-48 mt-2" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-24" />
                    </CardFooter>
                  </Card>
                </div>
              ) : completedSprints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {completedSprints.map((sprint) => (
                    <Card key={sprint.id} className="overflow-hidden group hover:shadow-md transition-all duration-200">
                      <CardHeader className="border-b bg-muted/30 pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{sprint.name}</CardTitle>
                              <Badge className="bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/30">
                                Completed
                              </Badge>
                            </div>
                            <CardDescription className="mt-1">{sprint.goal}</CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(sprint.id)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateReport(sprint.id)}>
                                Generate Report
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditSprint(sprint.id)}>
                                Edit Sprint
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}</span>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Star className="h-3.5 w-3.5 text-amber-500" />
                                <span>Story Points</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">
                                  {Math.round((sprint.completed / sprint.capacity) * 100)}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({Math.round(sprint.storyPoints * (sprint.completed / sprint.capacity))}/{sprint.storyPoints})
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Progress
                                value={(sprint.completed / sprint.capacity) * 100}
                                className="h-1.5 bg-muted flex-1"
                                indicatorClassName={cn(
                                  Math.round((sprint.completed / sprint.capacity) * 100) >= 90
                                    ? "bg-emerald-500"
                                    : Math.round((sprint.completed / sprint.capacity) * 100) >= 75
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                )}
                              />
                              <div className="text-xs text-muted-foreground">
                                {Math.round((sprint.completed / sprint.capacity) * 100)}%
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Zap className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Velocity: <span className="font-medium">{sprint.velocity}</span></span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sprint.completedTasks} / {sprint.completedTasks + sprint.pendingTasks} tasks
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between border-t py-3 bg-muted/20">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sprint.id)}>
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleGenerateReport(sprint.id)}>
                          Generate Report
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No completed sprints</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </DashboardLayout>
  )
}

function CheckCircle(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24" 
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
