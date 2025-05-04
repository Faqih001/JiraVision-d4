"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Brain, Clock, Heart, MoreHorizontal, Plus, Users } from "lucide-react"
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
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* AI Scrum Master Insights */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">AI Scrum Master Insights</h2>
            <Badge variant="outline" className="gap-1">
              <Brain className="h-3 w-3" />
              <span>Powered by IBM Granite</span>
            </Badge>
          </div>

          {loading ? (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-40" />
              </CardFooter>
            </Card>
          ) : aiInsight ? (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  {aiInsight.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{aiInsight.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Capacity Alert</Badge>
                  <Badge variant="secondary">Schedule Conflict</Badge>
                  <Badge variant="secondary">Velocity Trend</Badge>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleIgnoreRecommendation}>
                  Ignore
                </Button>
                <Button size="sm" onClick={handleApplyRecommendation}>
                  Apply Recommendation
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No AI insights available at the moment.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Sprint Overview */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Current Sprint</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading ? (
              <>
                <Card>
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
                <Card>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
                <Card>
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
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Sprint Progress</CardTitle>
                    <CardDescription>
                      {activeSprint
                        ? `${new Date(activeSprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(activeSprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "No active sprint"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activeSprint ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">
                              {Math.round((activeSprint.completed / activeSprint.capacity) * 100)}%
                            </span>
                          </div>
                          <Progress value={(activeSprint.completed / activeSprint.capacity) * 100} className="h-2" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="bg-muted rounded-md p-2">
                            <div className="font-medium">{activeSprint.capacity}</div>
                            <div className="text-muted-foreground">Total</div>
                          </div>
                          <div className="bg-muted rounded-md p-2">
                            <div className="font-medium">{activeSprint.completed}</div>
                            <div className="text-muted-foreground">Done</div>
                          </div>
                          <div className="bg-muted rounded-md p-2">
                            <div className="font-medium">{tasks.filter((t) => t.status === "in_progress").length}</div>
                            <div className="text-muted-foreground">In Progress</div>
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

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Team Mood</CardTitle>
                    <CardDescription>Emotional Intelligence Insights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {wellbeing ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Heart className="h-5 w-5 text-rose-500" />
                            <span className="font-medium">Positive Overall</span>
                          </div>
                          <Badge>{wellbeing.teamHappiness}% Happiness</Badge>
                        </div>
                        <div className="space-y-3">
                          {wellbeing.teamMembers.map((member) => (
                            <div key={member.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{member.name}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  member.mood === "Energized"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : member.mood === "Stressed"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                }
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

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Ethical Metrics</CardTitle>
                    <CardDescription>Governance Dashboard</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ethicalMetrics ? (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span>Workload Balance</span>
                            <span className="font-medium">{ethicalMetrics.workloadBalance}%</span>
                          </div>
                          <Progress value={ethicalMetrics.workloadBalance} className="h-2 bg-muted" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span>DEI Task Distribution</span>
                            <span className="font-medium">{ethicalMetrics.deiTaskDistribution}%</span>
                          </div>
                          <Progress value={ethicalMetrics.deiTaskDistribution} className="h-2 bg-muted" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span>Pay Equity Compliance</span>
                            <span className="font-medium">{ethicalMetrics.payEquityCompliance}%</span>
                          </div>
                          <Progress value={ethicalMetrics.payEquityCompliance} className="h-2 bg-muted" />
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">My Tasks</h2>
            <Button size="sm" onClick={handleAddTask}>
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>

          <Tabs defaultValue="active">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="backlog">Backlog</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {loading ? (
                <>
                  <Card>
                    <CardHeader className="pb-2">
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
                    <CardContent>
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
                  <Card>
                    <CardHeader className="pb-2">
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
                    <CardContent>
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
                tasks.map((task) => (
                  <Card key={task.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <Badge>{task.status === "in_progress" ? "In Progress" : "To Do"}</Badge>
                          <span className="text-sm text-muted-foreground">JV-{task.id}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTaskAction("edit", task.id)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTaskAction("complete", task.id)}>
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTaskAction("assign", task.id)}>
                              Assign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <CardDescription>{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {task.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className={
                              tag.includes("Frontend")
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : tag.includes("Design")
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : tag.includes("High")
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : tag.includes("Medium")
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-purple-50 text-purple-700 border-purple-200"
                            }
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            Due in{" "}
                            {Math.ceil(
                              (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                            )}{" "}
                            days
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <span>Assigned to you</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      <div className="w-full">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{task.status === "in_progress" ? "60%" : "0%"}</span>
                        </div>
                        <Progress value={task.status === "in_progress" ? 60 : 0} className="h-2" />
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No active tasks found</p>
                    <Button className="mt-4" size="sm" onClick={handleAddTask}>
                      <Plus className="h-4 w-4 mr-1" /> Add Your First Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="backlog" className="space-y-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No backlog tasks found</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No completed tasks found</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Gamification Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Your Progress</h2>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              <span>Gamification</span>
            </Badge>
          </div>

          {loading ? (
            <Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Skill Tree Progress</CardTitle>
                <CardDescription>Level up your skills and unlock rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {gamification.skillTrees.map((skill, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{skill.name}</span>
                        <span>Level {skill.level}</span>
                      </div>
                      <Progress value={skill.progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">{skill.tasksToNextLevel} tasks to next level</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border rounded-md p-4 bg-muted/30">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <span className="text-primary">🏆</span> Next Reward
                  </h3>
                  <p className="text-sm">{gamification.nextReward}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No gamification data available</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
