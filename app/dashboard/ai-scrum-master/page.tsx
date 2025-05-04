"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import {
  ArrowRight,
  Brain,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  LineChart,
  MessageSquare,
  Play,
  RefreshCw,
  Settings,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import DashboardLayout from "@/components/dashboard-layout"

// Define types
type AIInsight = {
  id: number
  type: string
  title: string
  description: string
}

type SprintAnalytics = {
  burndownData: any // This would be chart data in a real implementation
  velocityData: any // This would be chart data in a real implementation
}

type AIReport = {
  id: number
  type: string
  title: string
  content: {
    accomplishments?: string
    blockers?: string
    focus?: string
    whatWentWell?: string
    areasForImprovement?: string
    actionItems?: string
    completionProbability?: number
    keyInsights?: string[]
  }
  timestamp: string
}

export default function AIScrumMasterPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const { toast } = useToast()

  // State for data
  const [loading, setLoading] = useState(true)
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([])
  const [sprintAnalytics, setSprintAnalytics] = useState<SprintAnalytics | null>(null)
  const [aiReports, setAIReports] = useState<AIReport[]>([])

  // Fetch data
  useEffect(() => {
    async function fetchAIData() {
      try {
        setLoading(true)

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Set AI insights
        setAIInsights([
          {
            id: 1,
            type: "risk_alert",
            title: "Risk Alert",
            description: 'The "Implement Ethical Dashboard" task is at risk of not being completed this sprint.',
          },
          {
            id: 2,
            type: "team_insight",
            title: "Team Insight",
            description: "Alice has capacity to help with the at-risk tasks. Consider reassigning.",
          },
          {
            id: 3,
            type: "opportunity",
            title: "Opportunity",
            description: "Team velocity is increasing. Consider taking on one more small task.",
          },
        ])

        // Set sprint analytics
        setSprintAnalytics({
          burndownData: {}, // This would be chart data in a real implementation
          velocityData: {}, // This would be chart data in a real implementation
        })

        // Set AI reports
        setAIReports([
          {
            id: 1,
            type: "daily_standup",
            title: "Daily Standup Summary",
            content: {
              accomplishments: "Team completed the frontend for the Gamification dashboard and fixed 3 critical bugs.",
              blockers: "API integration with IBM Granite is delayed due to authentication issues.",
              focus: "Team will focus on resolving API issues and starting work on the Ethical Dashboard.",
            },
            timestamp: "2 hours ago",
          },
          {
            id: 2,
            type: "sprint_prediction",
            title: "Sprint Prediction",
            content: {
              completionProbability: 85,
              keyInsights: [
                "Most tasks are on track for completion",
                "One high-priority task at risk",
                "Team morale is high based on meeting sentiment",
              ],
            },
            timestamp: "Updated daily",
          },
          {
            id: 3,
            type: "retrospective",
            title: "Retrospective Analysis",
            content: {
              whatWentWell: "Team collaboration improved and velocity increased by 10%.",
              areasForImprovement: "Task estimation accuracy was 70%. Consider more detailed planning.",
              actionItems: "Implement pair programming for complex tasks and improve documentation.",
            },
            timestamp: "From Sprint 22.04",
          },
        ])
      } catch (error) {
        console.error("Error fetching AI data:", error)
        toast({
          title: "Error",
          description: "Failed to load AI Scrum Master data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAIData()
  }, [toast])

  // Handle button actions
  const handleConfigure = () => {
    toast({
      title: "Configure",
      description: "Opening AI Scrum Master configuration settings...",
    })
  }

  const handleChatWithAI = () => {
    toast({
      title: "Chat with AI",
      description: "Opening AI chat interface...",
    })
  }

  const handleDismiss = () => {
    toast({
      title: "Dismissed",
      description: "AI insight has been dismissed.",
    })
  }

  const handleTakeAction = () => {
    toast({
      title: "Take Action",
      description: "Opening action menu for AI recommendation...",
    })
  }

  const handleViewFullReport = (reportId: number) => {
    toast({
      title: "View Full Report",
      description: `Opening full report for report #${reportId}...`,
    })
  }

  const handleOpenFeature = (feature: string) => {
    toast({
      title: feature,
      description: `Opening ${feature} feature...`,
    })
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">AI Scrum Master</h1>
            <p className="text-muted-foreground">Your intelligent project management assistant</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleConfigure}>
              <Settings className="h-4 w-4" />
              <span>Configure</span>
            </Button>
            <Button size="sm" className="gap-1" onClick={handleChatWithAI}>
              <MessageSquare className="h-4 w-4" />
              <span>Chat with AI</span>
            </Button>
          </div>
        </div>

        {/* AI Assistant Overview */}
        <section>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>AI Scrum Master Assistant</CardTitle>
                  <CardDescription>Powered by IBM Granite</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Hello team! I've analyzed your current sprint and have some insights to share. Your team is making
                  good progress, but there are a few areas that need attention.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aiInsights.map((insight) => (
                    <Card key={insight.id}>
                      <CardHeader className="p-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          {insight.type === "risk_alert" && <Clock className="h-4 w-4 text-amber-500" />}
                          {insight.type === "team_insight" && <Users className="h-4 w-4 text-blue-500" />}
                          {insight.type === "opportunity" && <Sparkles className="h-4 w-4 text-green-500" />}
                          <span>{insight.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-sm">
                        <p className="text-muted-foreground">{insight.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={handleDismiss}>
                Dismiss
              </Button>
              <Button size="sm" onClick={handleTakeAction}>
                Take Action
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Sprint Analytics */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Sprint Analytics</h2>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              <span>Current Sprint: May 1 - May 14</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Burndown Chart</CardTitle>
                <CardDescription>Story points remaining over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md">
                <div className="text-center">
                  <LineChart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Burndown Chart Visualization</p>
                </div>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>Updated in real-time</span>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Velocity Trend</CardTitle>
                <CardDescription>Team performance over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md">
                <div className="text-center">
                  <LineChart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Velocity Trend Visualization</p>
                </div>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  <span>AI predicts 5% velocity increase next sprint</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* AI-Generated Reports */}
        <section>
          <h2 className="text-2xl font-bold mb-4">AI-Generated Reports</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiReports.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>
                    {report.type === "daily_standup" && "Generated from today's meeting"}
                    {report.type === "sprint_prediction" && "AI forecast for current sprint"}
                    {report.type === "retrospective" && "Previous sprint insights"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.type === "daily_standup" && (
                      <>
                        <div className="border-l-2 border-green-500 pl-3">
                          <h4 className="font-medium">Accomplishments</h4>
                          <p className="text-sm text-muted-foreground">{report.content.accomplishments}</p>
                        </div>
                        <div className="border-l-2 border-amber-500 pl-3">
                          <h4 className="font-medium">Blockers</h4>
                          <p className="text-sm text-muted-foreground">{report.content.blockers}</p>
                        </div>
                        <div className="border-l-2 border-blue-500 pl-3">
                          <h4 className="font-medium">Today's Focus</h4>
                          <p className="text-sm text-muted-foreground">{report.content.focus}</p>
                        </div>
                      </>
                    )}

                    {report.type === "sprint_prediction" && (
                      <>
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span>Completion Probability</span>
                            <span className="font-medium">{report.content.completionProbability}%</span>
                          </div>
                          <Progress value={report.content.completionProbability} className="h-2" />
                        </div>
                        <div className="pt-2">
                          <h4 className="font-medium mb-1">Key Insights</h4>
                          <ul className="text-sm text-muted-foreground space-y-2">
                            {report.content.keyInsights?.map((insight, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {report.type === "retrospective" && (
                      <>
                        <div className="border-l-2 border-green-500 pl-3">
                          <h4 className="font-medium">What Went Well</h4>
                          <p className="text-sm text-muted-foreground">{report.content.whatWentWell}</p>
                        </div>
                        <div className="border-l-2 border-amber-500 pl-3">
                          <h4 className="font-medium">Areas for Improvement</h4>
                          <p className="text-sm text-muted-foreground">{report.content.areasForImprovement}</p>
                        </div>
                        <div className="border-l-2 border-blue-500 pl-3">
                          <h4 className="font-medium">Action Items</h4>
                          <p className="text-sm text-muted-foreground">{report.content.actionItems}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {report.type === "daily_standup" && (
                      <>
                        <Clock className="h-3 w-3 inline mr-1" />
                        <span>{report.timestamp}</span>
                      </>
                    )}
                    {report.type === "sprint_prediction" && (
                      <>
                        <RefreshCw className="h-3 w-3 inline mr-1" />
                        <span>{report.timestamp}</span>
                      </>
                    )}
                    {report.type === "retrospective" && (
                      <>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        <span>{report.timestamp}</span>
                      </>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleViewFullReport(report.id)}>
                    <FileText className="h-4 w-4" />
                    <span>Full Report</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* AI Scrum Master Features */}
        <section>
          <h2 className="text-2xl font-bold mb-4">AI Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="group hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <span>AI Chat</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Chat with your AI Scrum Master to get answers about your sprint, tasks, or team performance.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 group-hover:text-primary transition-colors"
                  onClick={() => handleOpenFeature("AI Chat")}
                >
                  <span>Open Chat</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card className="group hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Sprint Planning</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered recommendations for your next sprint based on team capacity and priorities.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 group-hover:text-primary transition-colors"
                  onClick={() => handleOpenFeature("Sprint Planning")}
                >
                  <span>Plan Sprint</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card className="group hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  <span>Auto Standups</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Let AI facilitate and summarize your daily standups, identifying key points and action items.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 group-hover:text-primary transition-colors"
                  onClick={() => handleOpenFeature("Auto Standups")}
                >
                  <span>Schedule Standup</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card className="group hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>AI Reports</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Generate comprehensive reports on sprint performance, team velocity, and project health.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 group-hover:text-primary transition-colors"
                  onClick={() => handleOpenFeature("AI Reports")}
                >
                  <span>Generate Report</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
