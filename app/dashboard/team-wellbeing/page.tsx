"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  Clock,
  Download,
  Heart,
  LineChart,
  RefreshCw,
  Settings,
  ThumbsUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import DashboardLayout from "@/components/dashboard-layout"

// Define types
type TeamMember = {
  id: number
  name: string
  role: string
  avatar?: string
  wellbeingScore: number
  mood: string
  workload: string
}

type TeamWellbeing = {
  overallScore: number
  happiness: number
  stress: number
  burnoutRisk: number
  sentimentTrend: string
}

type WellbeingInsight = {
  type: string
  title: string
  description: string
}

type WellbeingMetric = {
  name: string
  value: number
}

export default function TeamWellbeingPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const { toast } = useToast()

  // State for data
  const [loading, setLoading] = useState(true)
  const [teamWellbeing, setTeamWellbeing] = useState<TeamWellbeing | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [wellbeingInsights, setWellbeingInsights] = useState<WellbeingInsight[]>([])
  const [wellbeingMetrics, setWellbeingMetrics] = useState<WellbeingMetric[]>([])

  // Fetch data
  useEffect(() => {
    async function fetchWellbeingData() {
      try {
        setLoading(true)

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Set team wellbeing
        setTeamWellbeing({
          overallScore: 85,
          happiness: 85,
          stress: 12,
          burnoutRisk: 3,
          sentimentTrend: "positive",
        })

        // Set team members
        setTeamMembers([
          {
            id: 1,
            name: "John Doe",
            role: "Frontend Developer",
            wellbeingScore: 92,
            mood: "Energized",
            workload: "Balanced",
          },
          {
            id: 2,
            name: "Alice Smith",
            role: "UX Designer",
            wellbeingScore: 68,
            mood: "Stressed",
            workload: "High",
          },
          {
            id: 3,
            name: "Robert Johnson",
            role: "Backend Developer",
            wellbeingScore: 85,
            mood: "Focused",
            workload: "Balanced",
          },
          {
            id: 4,
            name: "Emily Wilson",
            role: "Project Manager",
            wellbeingScore: 78,
            mood: "Productive",
            workload: "Balanced",
          },
        ])

        // Set wellbeing insights
        setWellbeingInsights([
          {
            type: "warning",
            title: "Workload Imbalance",
            description: "Alice is showing signs of stress due to high workload. Consider redistributing some tasks.",
          },
          {
            type: "positive",
            title: "Positive Collaboration",
            description:
              "Team communication has improved significantly in the last two weeks, leading to better morale.",
          },
          {
            type: "info",
            title: "Work-Life Balance",
            description: "The team is maintaining a healthy work-life balance, with no after-hours work detected.",
          },
        ])

        // Set wellbeing metrics
        setWellbeingMetrics([
          { name: "Work-Life Balance", value: 92 },
          { name: "Team Collaboration", value: 88 },
          { name: "Workload Distribution", value: 75 },
          { name: "Meeting Satisfaction", value: 82 },
          { name: "Burnout Risk", value: 12 },
        ])
      } catch (error) {
        console.error("Error fetching wellbeing data:", error)
        toast({
          title: "Error",
          description: "Failed to load wellbeing data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchWellbeingData()
  }, [toast])

  // Handle button actions
  const handleConfigure = () => {
    toast({
      title: "Configure",
      description: "Opening wellbeing configuration settings...",
    })
  }

  const handleViewHistory = () => {
    toast({
      title: "View History",
      description: "Opening wellbeing history view...",
    })
  }

  const handleDownloadReport = () => {
    toast({
      title: "Download Report",
      description: "Generating and downloading wellbeing report...",
    })
  }

  const handleDownloadAnalysis = () => {
    toast({
      title: "Download Analysis",
      description: "Generating and downloading full wellbeing analysis...",
    })
  }

  const handleImplementRecommendations = () => {
    toast({
      title: "Implement Recommendations",
      description: "Applying wellbeing recommendations...",
    })
  }

  const handleViewMemberDetails = (memberId: number) => {
    toast({
      title: "View Details",
      description: `Opening details for team member #${memberId}...`,
    })
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team Wellbeing</h1>
            <p className="text-muted-foreground">Monitor and improve your team's emotional health</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleViewHistory}>
              <Calendar className="h-4 w-4" />
              <span>History</span>
            </Button>
            <Button size="sm" className="gap-1" onClick={handleConfigure}>
              <Settings className="h-4 w-4" />
              <span>Configure</span>
            </Button>
          </div>
        </div>

        {/* Team Mood Overview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Team Mood</h2>
            <Badge variant="outline" className="gap-1">
              <RefreshCw className="h-3 w-3" />
              <span>Updated 30 minutes ago</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-[400px] md:col-span-2" />
                <Skeleton className="h-[400px] md:col-span-2" />
              </>
            ) : (
              <>
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Overall Team Sentiment</CardTitle>
                    <CardDescription>Based on meeting analysis and check-ins</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-6">
                      <div className="text-center">
                        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
                          <Heart className="h-12 w-12 text-green-600" />
                        </div>
                        <h3 className="mt-4 text-2xl font-bold">Positive</h3>
                        <p className="text-muted-foreground">{teamWellbeing?.happiness}% happiness score</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center mt-4">
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-2xl font-bold">{teamWellbeing?.happiness}%</div>
                        <div className="text-xs text-muted-foreground">Happiness</div>
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-2xl font-bold">{teamWellbeing?.stress}%</div>
                        <div className="text-xs text-muted-foreground">Stress</div>
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-2xl font-bold">{teamWellbeing?.burnoutRisk}%</div>
                        <div className="text-xs text-muted-foreground">Burnout Risk</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleDownloadReport}>
                      <Download className="h-4 w-4" />
                      <span>Download Full Report</span>
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Sentiment Trend</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px] flex items-center justify-center bg-muted/30 rounded-md">
                    <div className="text-center">
                      <LineChart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Sentiment Trend Visualization</p>
                    </div>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      <span>Positive trend over the last 2 weeks</span>
                    </div>
                  </CardFooter>
                </Card>
              </>
            )}
          </div>
        </section>

        {/* Individual Team Member Wellbeing */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Team Member Wellbeing</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[300px]" />
              </>
            ) : (
              teamMembers.map((member) => (
                <Card key={member.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <CardDescription>{member.role}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>Wellbeing Score</span>
                          <span className="font-medium">{member.wellbeingScore}%</span>
                        </div>
                        <Progress
                          value={member.wellbeingScore}
                          className={`h-2 ${
                            member.wellbeingScore >= 80
                              ? "bg-green-100"
                              : member.wellbeingScore >= 60
                                ? "bg-amber-100"
                                : "bg-red-100"
                          }`}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mood</span>
                        <Badge
                          variant="outline"
                          className={
                            member.mood === "Energized"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : member.mood === "Stressed"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : member.mood === "Focused"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {member.mood}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Workload</span>
                        <Badge
                          variant="outline"
                          className={
                            member.workload === "Balanced"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : member.workload === "High"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {member.workload}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <div className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      <span>Updated today</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleViewMemberDetails(member.id)}>
                      Details
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Wellbeing Insights */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Wellbeing Insights</h2>
            <Badge>AI Generated</Badge>
          </div>

          {loading ? (
            <>
              <Skeleton className="h-[300px] mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[400px]" />
                <Skeleton className="h-[400px]" />
              </div>
            </>
          ) : (
            <>
              <Card className="bg-primary/5 border-primary/20 mb-6">
                <CardHeader className="pb-2">
                  <CardTitle>Team Wellbeing Analysis</CardTitle>
                  <CardDescription>Based on emotional intelligence data</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Your team is generally doing well, with an overall positive sentiment. However, there are a few
                    areas that need attention:
                  </p>
                  <div className="space-y-4">
                    {wellbeingInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center mt-1 ${
                            insight.type === "warning"
                              ? "bg-amber-100"
                              : insight.type === "positive"
                                ? "bg-green-100"
                                : "bg-blue-100"
                          }`}
                        >
                          {insight.type === "warning" ? (
                            <AlertCircle
                              className={`h-3 w-3 ${
                                insight.type === "warning"
                                  ? "text-amber-600"
                                  : insight.type === "positive"
                                    ? "text-green-600"
                                    : "text-blue-600"
                              }`}
                            />
                          ) : insight.type === "positive" ? (
                            <ThumbsUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <Activity className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{insight.title}</h3>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleDownloadAnalysis}>
                    <Download className="h-4 w-4" />
                    <span>Download Full Analysis</span>
                  </Button>
                </CardFooter>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Wellbeing Recommendations</CardTitle>
                    <CardDescription>AI-generated suggestions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                          <Heart className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Schedule a team building activity</span> - The team would
                            benefit from a collaborative non-work activity this week.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                          <Heart className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Redistribute Alice's workload</span> - Move 2-3 tasks to team
                            members with capacity to reduce her stress levels.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                          <Heart className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Implement "Focus Fridays"</span> - Dedicate Friday afternoons
                            to uninterrupted work time with no meetings.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                          <Heart className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Recognize team achievements</span> - Publicly acknowledge the
                            team's recent progress on the Gamification feature.
                          </p>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button size="sm" className="w-full" onClick={handleImplementRecommendations}>
                      Implement Recommendations
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Wellbeing Metrics</CardTitle>
                    <CardDescription>Key indicators of team health</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {wellbeingMetrics.map((metric, index) => (
                        <div key={index}>
                          <div className="flex justify-between mb-1 text-sm">
                            <span>{metric.name}</span>
                            <span className="font-medium">{metric.value}%</span>
                          </div>
                          <Progress
                            value={metric.value}
                            className={`h-2 ${
                              metric.name === "Burnout Risk"
                                ? metric.value <= 20
                                  ? "bg-green-100"
                                  : metric.value <= 50
                                    ? "bg-amber-100"
                                    : "bg-red-100"
                                : metric.value >= 80
                                  ? "bg-green-100"
                                  : metric.value >= 60
                                    ? "bg-amber-100"
                                    : "bg-red-100"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      <span>Metrics updated weekly based on team activity and feedback</span>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
