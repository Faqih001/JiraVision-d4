"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Brain,
  CreditCard,
  MoreHorizontal,
  Plus,
  ShoppingCart,
  Ticket,
  Timer,
  Users,
  Wallet,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
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

type Transaction = {
  id: number
  type: string
  amount: number
  status: string
  date: string
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [supportTickets, setSupportTickets] = useState({
    total: 120,
    new: 42,
    open: 38,
    responseTime: "2h 15m",
  })

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

        // Set transactions
        setTransactions([
          {
            id: 1,
            type: "Team License",
            amount: 1200,
            status: "completed",
            date: "2023-05-01",
          },
          {
            id: 2,
            type: "AI Credits",
            amount: 450,
            status: "completed",
            date: "2023-05-03",
          },
          {
            id: 3,
            type: "Premium Support",
            amount: -200,
            status: "refunded",
            date: "2023-05-05",
          },
          {
            id: 4,
            type: "Additional Users",
            amount: 350,
            status: "completed",
            date: "2023-05-07",
          },
        ])
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
    <>
      {/* Dashboard content */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAddTask} className="gap-1">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Upgrade Plan Card */}
          <Card className="overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-500"></div>
              <CardContent className="p-6 relative z-10 text-white">
                <h3 className="text-xl font-bold mb-4">Upgrade Your Plan</h3>
                <p className="mb-6">Your free trial expires in 7 days</p>
                <Button className="w-full bg-white text-purple-600 hover:bg-white/90">Upgrade Now</Button>
              </CardContent>
            </div>
          </Card>

          {/* Total Sprints Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="rounded-md bg-blue-100 p-2 dark:bg-blue-900/20">
                  <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Export Data</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">Total Sprints</p>
                <h3 className="text-2xl font-bold mt-1">23</h3>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-600">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>12% from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Tasks Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="rounded-md bg-green-100 p-2 dark:bg-green-900/20">
                  <Ticket className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Export Data</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <h3 className="text-2xl font-bold mt-1">1,500</h3>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-600">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>8% from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Team Members Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="rounded-md bg-purple-100 p-2 dark:bg-purple-900/20">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Export Data</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <h3 className="text-2xl font-bold mt-1">12,300</h3>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-600">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>24% from last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Statistics and AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Statistics */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sprint Performance</CardTitle>
                <CardDescription>Velocity and completion rates over time</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                >
                  Velocity
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                >
                  Completion
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-end justify-between">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-full flex items-end gap-1">
                      <div
                        className="w-3 bg-blue-500 dark:bg-blue-600 rounded-t"
                        style={{ height: `${Math.floor(Math.random() * 100) + 50}px` }}
                      ></div>
                      <div
                        className="w-3 bg-purple-500 dark:bg-purple-600 rounded-t"
                        style={{ height: `${Math.floor(Math.random() * 100) + 30}px` }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Insights
              </CardTitle>
              <CardDescription>Recommendations based on your team's data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : (
                <>
                  <div className="rounded-lg border bg-card p-3">
                    <h4 className="font-medium mb-1">Sprint Planning</h4>
                    <p className="text-sm text-muted-foreground">
                      Reduce sprint commitment by 15% due to team PTO and company meetings.
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={handleIgnoreRecommendation}>
                        Ignore
                      </Button>
                      <Button size="sm" onClick={handleApplyRecommendation}>
                        Apply
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <h4 className="font-medium mb-1">Team Wellbeing</h4>
                    <p className="text-sm text-muted-foreground">
                      2 team members showing signs of burnout. Consider redistributing tasks.
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button size="sm" variant="ghost">
                        Ignore
                      </Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full justify-between">
                View All Insights
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Support Tracker and Daily Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Support Tracker */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Support Tracker</CardTitle>
                <CardDescription>Ticket status and response times</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Weekly
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Daily</DropdownMenuItem>
                  <DropdownMenuItem>Weekly</DropdownMenuItem>
                  <DropdownMenuItem>Monthly</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Ticket className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">New Tickets</span>
                  <span className="text-2xl font-bold">{supportTickets.new}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Ticket className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">Open Tickets</span>
                  <span className="text-2xl font-bold">{supportTickets.open}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Timer className="h-5 w-5 text-green-600 dark:text-green-400 mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">Response Time</span>
                  <span className="text-2xl font-bold">{supportTickets.responseTime}</span>
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="absolute text-center">
                  <div className="text-4xl font-bold">{supportTickets.total}</div>
                  <div className="text-sm text-muted-foreground">Total Tickets</div>
                </div>
                <svg className="w-full h-48" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset="62.8"
                    transform="rotate(-90 50 50)"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Average Daily Sales */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Average Daily Tasks</CardTitle>
                <CardDescription>Tasks completed per hour</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Weekly
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Daily</DropdownMenuItem>
                  <DropdownMenuItem>Weekly</DropdownMenuItem>
                  <DropdownMenuItem>Monthly</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-2xl font-bold">27,500.00</h3>
                <div className="flex items-center text-sm text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>12% increase from yesterday</span>
                </div>
              </div>
              <div className="h-[250px] flex items-end justify-between gap-2">
                {["2hr", "4hr", "6hr", "8hr", "10hr", "12hr", "14hr"].map((hour, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className={`bar ${i === 2 ? "opacity-100" : "opacity-70"}`}
                      style={{
                        height: `${[70, 120, 90, 180, 110, 60, 130][i]}px`,
                      }}
                    ></div>
                    <span className="text-xs text-muted-foreground">{hour}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your recent billing activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        transaction.amount > 0 ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20",
                      )}
                    >
                      {transaction.amount > 0 ? (
                        <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.type}</p>
                      <p className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "font-medium",
                      transaction.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
