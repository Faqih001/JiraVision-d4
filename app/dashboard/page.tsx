"use client"

import { useTheme } from "next-themes"
import { Brain, Calendar, Clock, Heart, MoreHorizontal, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DashboardLayout from "@/components/dashboard-layout"

export default function Dashboard() {
  const { theme, setTheme } = useTheme()

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
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Sprint Planning Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Based on your team's velocity and current capacity, I recommend reducing the sprint commitment by 15%
                this week. Three team members have PTO scheduled, and there's a company all-hands meeting.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">Capacity Alert</Badge>
                <Badge variant="secondary">Schedule Conflict</Badge>
                <Badge variant="secondary">Velocity Trend</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm">
                Ignore
              </Button>
              <Button size="sm">Apply Recommendation</Button>
            </CardFooter>
          </Card>
        </section>

        {/* Sprint Overview */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Current Sprint</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sprint Progress</CardTitle>
                <CardDescription>May 1 - May 14</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-muted rounded-md p-2">
                    <div className="font-medium">12</div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                  <div className="bg-muted rounded-md p-2">
                    <div className="font-medium">5</div>
                    <div className="text-muted-foreground">Done</div>
                  </div>
                  <div className="bg-muted rounded-md p-2">
                    <div className="font-medium">4</div>
                    <div className="text-muted-foreground">In Progress</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Team Mood</CardTitle>
                <CardDescription>Emotional Intelligence Insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-500" />
                    <span className="font-medium">Positive Overall</span>
                  </div>
                  <Badge>85% Happiness</Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">John Doe</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Energized
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>AS</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">Alice Smith</span>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Stressed
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Ethical Metrics</CardTitle>
                <CardDescription>Governance Dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Workload Balance</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2 bg-muted" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>DEI Task Distribution</span>
                      <span className="font-medium">88%</span>
                    </div>
                    <Progress value={88} className="h-2 bg-muted" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Pay Equity Compliance</span>
                      <span className="font-medium">100%</span>
                    </div>
                    <Progress value={100} className="h-2 bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tasks Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">My Tasks</h2>
            <Button size="sm">
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
              {/* Task 1 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>In Progress</Badge>
                      <span className="text-sm text-muted-foreground">JV-103</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Mark Complete</DropdownMenuItem>
                        <DropdownMenuItem>Assign</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg">Implement AI Scrum Master Dashboard</CardTitle>
                  <CardDescription>Create the main dashboard view for the AI Scrum Master feature</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Frontend
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      UI/UX
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      High Priority
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Due in 2 days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <span>Assigned to you</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="w-full">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                </CardFooter>
              </Card>

              {/* Task 2 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">To Do</Badge>
                      <span className="text-sm text-muted-foreground">JV-105</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Mark Complete</DropdownMenuItem>
                        <DropdownMenuItem>Assign</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg">Design Gamification Elements</CardTitle>
                  <CardDescription>Create visual assets for the gamified experience</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Design
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Medium Priority
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Due in 5 days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <span>Assigned to you</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="w-full">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>0%</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="backlog" className="space-y-4">
              {/* Backlog Task 1 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Backlog</Badge>
                      <span className="text-sm text-muted-foreground">JV-110</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Start Task</DropdownMenuItem>
                        <DropdownMenuItem>Assign</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg">Implement Ethical Governance Dashboard</CardTitle>
                  <CardDescription>
                    Create the dashboard for monitoring DEI metrics and workload balance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Frontend
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Backend
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      High Priority
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Sprint 2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Unassigned</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Backlog Task 2 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Backlog</Badge>
                      <span className="text-sm text-muted-foreground">JV-112</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Start Task</DropdownMenuItem>
                        <DropdownMenuItem>Assign</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg">Integrate IBM Granite Speech API</CardTitle>
                  <CardDescription>Connect to IBM Granite for meeting analysis and emotion detection</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      Integration
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Medium Priority
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Sprint 2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Unassigned</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {/* Completed Task */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Completed</Badge>
                      <span className="text-sm text-muted-foreground">JV-101</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Reopen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg line-through text-muted-foreground">
                    Project Setup and Architecture
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Initial project setup and architecture planning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      Infrastructure
                    </Badge>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      Planning
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Completed on Apr 28</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Completed by you</span>
                    </div>
                  </div>
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
          <Card>
            <CardHeader>
              <CardTitle>Skill Tree Progress</CardTitle>
              <CardDescription>Level up your skills and unlock rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Frontend Master</span>
                    <span>Level 3</span>
                  </div>
                  <Progress value={65} className="h-2" />
                  <p className="text-sm text-muted-foreground">7 tasks to next level</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Team Player</span>
                    <span>Level 4</span>
                  </div>
                  <Progress value={80} className="h-2" />
                  <p className="text-sm text-muted-foreground">3 tasks to next level</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Problem Solver</span>
                    <span>Level 2</span>
                  </div>
                  <Progress value={40} className="h-2" />
                  <p className="text-sm text-muted-foreground">12 tasks to next level</p>
                </div>
              </div>
              <div className="mt-6 border rounded-md p-4 bg-muted/30">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <span className="text-primary">🏆</span> Next Reward
                </h3>
                <p className="text-sm">Complete 5 more high-priority tasks to unlock a half-day PTO bonus!</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  )
}
