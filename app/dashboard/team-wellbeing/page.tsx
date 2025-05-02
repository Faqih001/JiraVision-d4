"use client"
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
import { useMobile } from "@/hooks/use-mobile"
import DashboardLayout from "@/components/dashboard-layout"

export default function TeamWellbeingPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team Wellbeing</h1>
            <p className="text-muted-foreground">Monitor and improve your team's emotional health</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Calendar className="h-4 w-4" />
              <span>History</span>
            </Button>
            <Button size="sm" className="gap-1">
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
                    <p className="text-muted-foreground">85% happiness score</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center mt-4">
                  <div className="bg-muted/40 rounded-md p-3">
                    <div className="text-2xl font-bold">85%</div>
                    <div className="text-xs text-muted-foreground">Happiness</div>
                  </div>
                  <div className="bg-muted/40 rounded-md p-3">
                    <div className="text-2xl font-bold">12%</div>
                    <div className="text-xs text-muted-foreground">Stress</div>
                  </div>
                  <div className="bg-muted/40 rounded-md p-3">
                    <div className="text-2xl font-bold">3%</div>
                    <div className="text-xs text-muted-foreground">Burnout Risk</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="outline" size="sm" className="w-full gap-1">
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
          </div>
        </section>

        {/* Individual Team Member Wellbeing */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Team Member Wellbeing</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Team Member 1 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">John Doe</CardTitle>
                    <CardDescription>Frontend Developer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Wellbeing Score</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2 bg-green-100" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mood</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Energized
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Workload</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Balanced
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  <span>Updated today</span>
                </div>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </CardFooter>
            </Card>

            {/* Team Member 2 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>AS</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">Alice Smith</CardTitle>
                    <CardDescription>UX Designer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Wellbeing Score</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <Progress value={68} className="h-2 bg-amber-100" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mood</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Stressed
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Workload</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      High
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  <span>Updated today</span>
                </div>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </CardFooter>
            </Card>

            {/* Team Member 3 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>RJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">Robert Johnson</CardTitle>
                    <CardDescription>Backend Developer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Wellbeing Score</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2 bg-green-100" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mood</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Focused
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Workload</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Balanced
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  <span>Updated today</span>
                </div>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </CardFooter>
            </Card>

            {/* Team Member 4 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>EW</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">Emily Wilson</CardTitle>
                    <CardDescription>Project Manager</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Wellbeing Score</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2 bg-green-100" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mood</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Productive
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Workload</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Moderate
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  <span>Updated today</span>
                </div>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Wellbeing Insights */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Wellbeing Insights</h2>
            <Badge>AI Generated</Badge>
          </div>

          <Card className="bg-primary/5 border-primary/20 mb-6">
            <CardHeader className="pb-2">
              <CardTitle>Team Wellbeing Analysis</CardTitle>
              <CardDescription>Based on emotional intelligence data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Your team is generally doing well, with an overall positive sentiment. However, there are a few areas
                that need attention:
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center mt-1">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Workload Imbalance</h3>
                    <p className="text-sm text-muted-foreground">
                      Alice is showing signs of stress due to high workload. Consider redistributing some tasks.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-1">
                    <ThumbsUp className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Positive Collaboration</h3>
                    <p className="text-sm text-muted-foreground">
                      Team communication has improved significantly in the last two weeks, leading to better morale.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                    <Activity className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Work-Life Balance</h3>
                    <p className="text-sm text-muted-foreground">
                      The team is maintaining a healthy work-life balance, with no after-hours work detected.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full gap-1">
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
                        <span className="font-medium">Schedule a team building activity</span> - The team would benefit
                        from a collaborative non-work activity this week.
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
                        <span className="font-medium">Implement "Focus Fridays"</span> - Dedicate Friday afternoons to
                        uninterrupted work time with no meetings.
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
                <Button size="sm" className="w-full">
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
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Work-Life Balance</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2 bg-green-100" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Team Collaboration</span>
                      <span className="font-medium">88%</span>
                    </div>
                    <Progress value={88} className="h-2 bg-green-100" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Workload Distribution</span>
                      <span className="font-medium">75%</span>
                    </div>
                    <Progress value={75} className="h-2 bg-amber-100" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Meeting Satisfaction</span>
                      <span className="font-medium">82%</span>
                    </div>
                    <Progress value={82} className="h-2 bg-green-100" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Burnout Risk</span>
                      <span className="font-medium">12%</span>
                    </div>
                    <Progress value={12} className="h-2 bg-green-100" />
                  </div>
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
        </section>
      </div>
    </DashboardLayout>
  )
}
