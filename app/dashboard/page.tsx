"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Brain, Clock, Heart, MoreHorizontal, Plus, Users, Scale, SlidersHorizontal, Check, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

// Define types for our data
type Sprint = {
  id: number
  name: string
  description: string
  startDate: string
  endDate: string
  status: string
  capacity: number
  completed: number
}

type Task = {
  id: number
  title: string
  description: string
  status: string
  priority: string
  storyPoints: number
  assigneeId: number
  sprintId: number
  dueDate: string
  tags: string[]
}

type AIInsight = {
  id: number
  type: string
  title: string
  description: string
  status: string
}

type WellbeingMetrics = {
  teamHappiness: number
  teamMembers: {
    id: number
    name: string
    avatar: string
    mood: string
  }[]
}

type EthicalMetrics = {
  workloadBalance: number
  deiTaskDistribution: number
  payEquityCompliance: number
}

type GamificationProgress = {
  skillTrees: {
    name: string
    level: number
    progress: number
    tasksToNextLevel: number
  }[]
  nextReward: string
}

export default function Dashboard() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { toast } = useToast()

  // State for data
  const [loading, setLoading] = useState(true)
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [aiInsight, setAIInsight] = useState<AIInsight | null>(null)
  const [wellbeing, setWellbeing] = useState<WellbeingMetrics | null>(null)
  const [ethicalMetrics, setEthicalMetrics] = useState<EthicalMetrics | null>(null)
  const [gamification, setGamification] = useState<GamificationProgress | null>(null)

  // Fetch data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)

        // In a real implementation, these would be actual API calls
        // For now, we'll simulate the data

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Set active sprint
        setActiveSprint({
          id: 1,
          name: "Sprint 23.05",
          description: "AI-Powered Project Management Platform",
          startDate: "2023-05-01",
          endDate: "2023-05-14",
          status: "active",
          capacity: 40,
          completed: 18,
        })

        // Set tasks
        setTasks([
          {
            id: 103,
            title: "Implement AI Scrum Master Dashboard",
            description: "Create the main dashboard view for the AI Scrum Master feature",
            status: "in_progress",
            priority: "high",
            storyPoints: 8,
            assigneeId: user?.id || 0,
            sprintId: 1,
            dueDate: "2023-05-10",
            tags: ["Frontend", "UI/UX", "High Priority"],
          },
          {
            id: 105,
            title: "Design Gamification Elements",
            description: "Create visual assets for the gamified experience",
            status: "todo",
            priority: "medium",
            storyPoints: 5,
            assigneeId: user?.id || 0,
            sprintId: 1,
            dueDate: "2023-05-13",
            tags: ["Design", "Medium Priority"],
          },
        ])

        // Set AI insight
        setAIInsight({
          id: 1,
          type: "sprint_planning",
          title: "Sprint Planning Recommendation",
          description:
            "Based on your team's velocity and current capacity, I recommend reducing the sprint commitment by 15% this week. Three team members have PTO scheduled, and there's a company all-hands meeting.",
          status: "active",
        })

        // Set wellbeing metrics
        setWellbeing({
          teamHappiness: 85,
          teamMembers: [
            {
              id: 1,
              name: "John Doe",
              avatar: "",
              mood: "Energized",
            },
            {
              id: 2,
              name: "Alice Smith",
              avatar: "",
              mood: "Stressed",
            },
          ],
        })

        // Set ethical metrics
        setEthicalMetrics({
          workloadBalance: 92,
          deiTaskDistribution: 88,
          payEquityCompliance: 100,
        })

        // Set gamification progress
        setGamification({
          skillTrees: [
            {
              name: "Frontend Master",
              level: 3,
              progress: 65,
              tasksToNextLevel: 7,
            },
            {
              name: "Team Player",
              level: 4,
              progress: 80,
              tasksToNextLevel: 3,
            },
            {
              name: "Problem Solver",
              level: 2,
              progress: 40,
              tasksToNextLevel: 12,
            },
          ],
          nextReward: "Complete 5 more high-priority tasks to unlock a half-day PTO bonus!",
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user, toast])

  // Handle button actions
  const handleApplyRecommendation = () => {
    toast({
      title: "Recommendation Applied",
      description: "Sprint capacity has been adjusted by 15%.",
    })
  }

  const handleIgnoreRecommendation = () => {
    toast({
      title: "Recommendation Ignored",
      description: "The recommendation has been dismissed.",
    })
  }

  const handleAddTask = () => {
    toast({
      title: "Add Task",
      description: "Opening task creation form...",
    })
  }

  const handleTaskAction = (action: string, taskId: number) => {
    toast({
      title: `Task Action: ${action}`,
      description: `Performing ${action} on task #${taskId}`,
    })
  }

  return (
    <DashboardLayout>
      {/* Dashboard content */}
      <div className="flex-1 space-y-6">
        {/* AI Scrum Master Insights */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">AI Scrum Master Insights</h2>
            <Badge variant="outline" className="gap-1 px-3 py-1 rounded-full border-primary/40 backdrop-blur-sm">
              <Brain className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="font-medium">Powered by IBM Granite</span>
            </Badge>
          </div>

          {loading ? (
            <Card className="overflow-hidden border-primary/20">
              <CardHeader className="pb-2 border-b border-primary/10 bg-primary/5 backdrop-blur-sm">
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent className="bg-gradient-to-br from-primary/5 to-transparent p-6">
                <Skeleton className="h-20 w-full" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t bg-muted/20 backdrop-blur-sm">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-40" />
              </CardFooter>
            </Card>
          ) : aiInsight ? (
            <Card className="overflow-hidden transform transition-all hover:shadow-md">
              <CardHeader className="pb-2 border-b border-primary/10 bg-primary/5 backdrop-blur-sm">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  {aiInsight.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-gradient-to-br from-primary/5 to-transparent p-6">
                <p className="text-muted-foreground">{aiInsight.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Capacity Alert</Badge>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors">Schedule Conflict</Badge>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors">Velocity Trend</Badge>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t bg-muted/20 backdrop-blur-sm">
                <Button variant="outline" size="sm" onClick={handleIgnoreRecommendation} className="hover:bg-destructive/10 transition-colors">
                  Ignore
                </Button>
                <Button size="sm" onClick={handleApplyRecommendation} className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-primary-foreground transition-all duration-200">
                  Apply Recommendation
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-dashed border-primary/20">
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                <p className="text-muted-foreground">No AI insights available at the moment.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Sprint Overview */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-2xl font-bold">Current Sprint</h2>
            <div className="text-sm text-muted-foreground">May 1 - May 14, 2025</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <>
                <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
                <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30 md:col-span-2 lg:col-span-1">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-4 w-40 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-2 border-b bg-muted/30">
                    <CardTitle className="text-lg">Sprint Progress</CardTitle>
                    <CardDescription>
                      {activeSprint
                        ? `${new Date(activeSprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(activeSprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "No active sprint"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {activeSprint ? (
                      <>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
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
                        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg border bg-card p-2 shadow-sm">
                            <div className="text-2xl font-semibold">{activeSprint.capacity}</div>
                            <div className="text-xs text-muted-foreground mt-1">Story Points</div>
                          </div>
                          <div className="rounded-lg border bg-card p-2 shadow-sm">
                            <div className="text-2xl font-semibold">{activeSprint.completed}</div>
                            <div className="text-xs text-muted-foreground mt-1">Completed</div>
                          </div>
                          <div className="rounded-lg border bg-card p-2 shadow-sm">
                            <div className="text-2xl font-semibold">{tasks.filter((t) => t.status === "in_progress").length}</div>
                            <div className="text-xs text-muted-foreground mt-1">In Progress</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full py-6">
                        <p className="text-muted-foreground">No active sprint found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-2 border-b bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-500" />
                      Team Mood
                    </CardTitle>
                    <CardDescription>Emotional Intelligence Insights</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {wellbeing ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-rose-500/20 text-rose-500 p-1.5 rounded-full">
                              <Heart className="h-5 w-5" />
                            </div>
                            <span className="font-medium">Positive Overall</span>
                          </div>
                          <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-700 text-white border-none">
                            {wellbeing.teamHappiness}% Happiness
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {wellbeing.teamMembers.map((member) => (
                            <div key={member.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border-2 border-background">
                                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{member.name}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "transition-colors",
                                  member.mood === "Energized"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30"
                                    : member.mood === "Stressed"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30"
                                      : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30"
                                )}
                              >
                                {member.mood}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full py-6">
                        <p className="text-muted-foreground">No wellbeing data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden hover:shadow-md transition-all duration-200 md:col-span-2 lg:col-span-1">
                  <CardHeader className="pb-2 border-b bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="h-4 w-4 text-blue-500" />
                      Ethical Metrics
                    </CardTitle>
                    <CardDescription>Governance Dashboard</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {ethicalMetrics ? (
                      <div className="space-y-5">
                        <div>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="font-medium text-sm">Workload Balance</span>
                            </div>
                            <span className={cn(
                              "font-medium",
                              ethicalMetrics.workloadBalance >= 90 
                                ? "text-emerald-500" 
                                : ethicalMetrics.workloadBalance >= 75 
                                  ? "text-amber-500" 
                                  : "text-rose-500"
                            )}>
                              {ethicalMetrics.workloadBalance}%
                            </span>
                          </div>
                          <Progress 
                            value={ethicalMetrics.workloadBalance} 
                            className="h-2 bg-muted"
                            indicatorClassName="bg-blue-500" 
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                              <span className="font-medium text-sm">DEI Task Distribution</span>
                            </div>
                            <span className={cn(
                              "font-medium",
                              ethicalMetrics.deiTaskDistribution >= 90 
                                ? "text-emerald-500" 
                                : ethicalMetrics.deiTaskDistribution >= 75 
                                  ? "text-amber-500" 
                                  : "text-rose-500"
                            )}>
                              {ethicalMetrics.deiTaskDistribution}%
                            </span>
                          </div>
                          <Progress 
                            value={ethicalMetrics.deiTaskDistribution} 
                            className="h-2 bg-muted" 
                            indicatorClassName="bg-violet-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                              <span className="font-medium text-sm">Pay Equity Compliance</span>
                            </div>
                            <span className={cn(
                              "font-medium",
                              ethicalMetrics.payEquityCompliance >= 90 
                                ? "text-emerald-500" 
                                : ethicalMetrics.payEquityCompliance >= 75 
                                  ? "text-amber-500" 
                                  : "text-rose-500"
                            )}>
                              {ethicalMetrics.payEquityCompliance}%
                            </span>
                          </div>
                          <Progress 
                            value={ethicalMetrics.payEquityCompliance} 
                            className="h-2 bg-muted" 
                            indicatorClassName="bg-emerald-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full py-6">
                        <p className="text-muted-foreground">No ethical metrics available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </section>

        {/* Tasks Section */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-2xl font-bold">My Tasks</h2>
            <Button onClick={handleAddTask} className="bg-gradient-to-r from-primary to-purple-600 hover:shadow-md transition-all duration-200">
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4 w-full sm:w-auto bg-muted/50 p-1 gap-1">
              <TabsTrigger value="active" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Active</TabsTrigger>
              <TabsTrigger value="backlog" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Backlog</TabsTrigger>
              <TabsTrigger value="completed" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {loading ? (
                <>
                  <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30">
                    <CardHeader className="pb-2 border-b">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-3/4 mt-2" />
                      <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-28" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      <Skeleton className="h-4 w-full" />
                    </CardFooter>
                  </Card>
                  <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30">
                    <CardHeader className="pb-2 border-b">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-3/4 mt-2" />
                      <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      <Skeleton className="h-4 w-full" />
                    </CardFooter>
                  </Card>
                </>
              ) : tasks.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {tasks.map((task) => (
                    <Card key={task.id} className="overflow-hidden hover:shadow-md transition-all duration-200 group">
                      <CardHeader className="pb-2 border-b bg-muted/30">
                        <div className="flex justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={cn(
                              task.status === "in_progress" 
                                ? "bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 dark:text-amber-400 border-amber-500/30" 
                                : "bg-blue-500/20 text-blue-700 hover:bg-blue-500/30 dark:text-blue-400 border-blue-500/30"
                            )}>
                              {task.status === "in_progress" ? "In Progress" : "To Do"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">JV-{task.id}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleTaskAction("edit", task.id)}>
                                <SlidersHorizontal className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleTaskAction("complete", task.id)}>
                                <Check className="h-4 w-4 mr-2" /> Mark Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleTaskAction("assign", task.id)}>
                                <Users className="h-4 w-4 mr-2" /> Assign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardTitle className="text-lg mt-2">{task.title}</CardTitle>
                        <CardDescription>{task.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {task.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className={cn(
                                "transition-colors",
                                tag.includes("Frontend")
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30"
                                  : tag.includes("Design")
                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30"
                                    : tag.includes("High")
                                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30"
                                      : tag.includes("Medium")
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30"
                                        : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/30"
                              )}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm gap-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <div className="bg-amber-500/20 p-1 rounded-full">
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                            </div>
                            <div className="flex gap-1">
                              <span>Due in</span>
                              <span className="font-medium text-foreground">
                                {Math.ceil(
                                  (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                                )}
                              </span>
                              <span>days</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground">Assigned to you</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t bg-muted/20 py-3">
                        <div className="w-full">
                          <div className="flex justify-between text-sm mb-1.5">
                            <span>Progress</span>
                            <span className={cn(
                              "font-medium",
                              task.status === "in_progress" ? "text-amber-500" : "text-blue-500"
                            )}>
                              {task.status === "in_progress" ? "60%" : "0%"}
                            </span>
                          </div>
                          <Progress 
                            value={task.status === "in_progress" ? 60 : 0} 
                            className="h-1.5 bg-muted"
                            indicatorClassName={task.status === "in_progress" ? "bg-amber-500" : "bg-blue-500"} 
                          />
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Clipboard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No active tasks found</p>
                    <Button className="mt-4" size="sm" onClick={handleAddTask}>
                      <Plus className="h-4 w-4 mr-1" /> Add Your First Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="backlog" className="space-y-4">
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Archive className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No backlog tasks found</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No completed tasks found</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Gamification Section */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-2xl font-bold">Your Progress</h2>
            <Badge variant="outline" className="gap-1 px-3 py-1 rounded-full border-primary/40 backdrop-blur-sm">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium">Gamification</span>
            </Badge>
          </div>

          {loading ? (
            <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-24 w-full mt-6" />
              </CardContent>
            </Card>
          ) : gamification ? (
            <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Skill Tree Progress
                </CardTitle>
                <CardDescription>Level up your skills and unlock rewards</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {gamification.skillTrees.map((skill, index) => (
                    <div key={index} className="space-y-3 p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{skill.name}</div>
                        <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20">Level {skill.level}</Badge>
                      </div>
                      <Progress value={skill.progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{skill.progress}% to next level</span>
                        <span className="font-medium">{skill.tasksToNextLevel} tasks left</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-lg border p-4 bg-gradient-to-r from-amber-50 to-amber-100/40 dark:from-amber-950/20 dark:to-amber-900/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-full">
                      <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-medium">Next Reward</h3>
                  </div>
                  <p className="text-sm">{gamification.nextReward}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Trophy className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No gamification data available</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}

// Icon components with proper TypeScript types
function Clipboard(props: React.SVGProps<SVGSVGElement>) {
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
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  )
}

function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
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

function Archive(props: React.SVGProps<SVGSVGElement>) {
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
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  )
}

function Gift(props: React.SVGProps<SVGSVGElement>) {
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
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect width="20" height="5" x="2" y="7" />
      <line x1="12" x2="12" y1="22" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

function Send(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
