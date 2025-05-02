"use client"
import { useTheme } from "next-themes"
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
import { useMobile } from "@/hooks/use-mobile"
import DashboardLayout from "@/components/dashboard-layout"

export default function AIScrumMasterPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">AI Scrum Master</h1>
            <p className="text-muted-foreground">Your intelligent project management assistant</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Settings className="h-4 w-4" />
              <span>Configure</span>
            </Button>
            <Button size="sm" className="gap-1">
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
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span>Risk Alert</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm">
                      <p className="text-muted-foreground">
                        The "Implement Ethical Dashboard" task is at risk of not being completed this sprint.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>Team Insight</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm">
                      <p className="text-muted-foreground">
                        Alice has capacity to help with the at-risk tasks. Consider reassigning.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-500" />
                        <span>Opportunity</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm">
                      <p className="text-muted-foreground">
                        Team velocity is increasing. Consider taking on one more small task.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" size="sm">
                Dismiss
              </Button>
              <Button size="sm">Take Action</Button>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Daily Standup Summary</CardTitle>
                <CardDescription>Generated from today's meeting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border-l-2 border-green-500 pl-3">
                    <h4 className="font-medium">Accomplishments</h4>
                    <p className="text-sm text-muted-foreground">
                      Team completed the frontend for the Gamification dashboard and fixed 3 critical bugs.
                    </p>
                  </div>
                  <div className="border-l-2 border-amber-500 pl-3">
                    <h4 className="font-medium">Blockers</h4>
                    <p className="text-sm text-muted-foreground">
                      API integration with IBM Granite is delayed due to authentication issues.
                    </p>
                  </div>
                  <div className="border-l-2 border-blue-500 pl-3">
                    <h4 className="font-medium">Today's Focus</h4>
                    <p className="text-sm text-muted-foreground">
                      Team will focus on resolving API issues and starting work on the Ethical Dashboard.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  <span>Generated 2 hours ago</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Full Report</span>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sprint Prediction</CardTitle>
                <CardDescription>AI forecast for current sprint</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Completion Probability</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="pt-2">
                    <h4 className="font-medium mb-1">Key Insights</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Most tasks are on track for completion</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>One high-priority task at risk</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Team morale is high based on meeting sentiment</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <RefreshCw className="h-3 w-3 inline mr-1" />
                  <span>Updated daily</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Full Report</span>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Retrospective Analysis</CardTitle>
                <CardDescription>Previous sprint insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border-l-2 border-green-500 pl-3">
                    <h4 className="font-medium">What Went Well</h4>
                    <p className="text-sm text-muted-foreground">
                      Team collaboration improved and velocity increased by 10%.
                    </p>
                  </div>
                  <div className="border-l-2 border-amber-500 pl-3">
                    <h4 className="font-medium">Areas for Improvement</h4>
                    <p className="text-sm text-muted-foreground">
                      Task estimation accuracy was 70%. Consider more detailed planning.
                    </p>
                  </div>
                  <div className="border-l-2 border-blue-500 pl-3">
                    <h4 className="font-medium">Action Items</h4>
                    <p className="text-sm text-muted-foreground">
                      Implement pair programming for complex tasks and improve documentation.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  <span>From Sprint 22.04</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Full Report</span>
                </Button>
              </CardFooter>
            </Card>
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
                <Button variant="ghost" size="sm" className="gap-1 group-hover:text-primary transition-colors">
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
                <Button variant="ghost" size="sm" className="gap-1 group-hover:text-primary transition-colors">
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
                <Button variant="ghost" size="sm" className="gap-1 group-hover:text-primary transition-colors">
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
                <Button variant="ghost" size="sm" className="gap-1 group-hover:text-primary transition-colors">
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
