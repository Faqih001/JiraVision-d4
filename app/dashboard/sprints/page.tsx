"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Calendar, CalendarDays, Check, ChevronDown, ChevronUp, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"

// Define types
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

type TeamMember = {
  id: number
  name: string
  availability: number
}

type SprintHistory = {
  id: number
  name: string
  startDate: string
  endDate: string
  planned: number
  completed: number
  tasks: number
  teamSize: number
  completionRate: number
}

export default function SprintsPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const { toast } = useToast()
  const [activeSprintExpanded, setActiveSprintExpanded] = useState(true)

  // State for data
  const [loading, setLoading] = useState(true)
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [teamAvailability, setTeamAvailability] = useState<TeamMember[]>([])
  const [sprintHistory, setSprintHistory] = useState<SprintHistory[]>([])

  // Fetch data
  useEffect(() => {
    async function fetchSprintData() {
      try {
        setLoading(true)

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

        // Set team availability
        setTeamAvailability([
          { id: 1, name: "John Doe", availability: 100 },
          { id: 2, name: "Alice Smith", availability: 50 },
          { id: 3, name: "Robert Johnson", availability: 80 },
          { id: 4, name: "Emily Wilson", availability: 100 },
        ])

        // Set sprint history
        setSprintHistory([
          {
            id: 1,
            name: "Sprint 22.04",
            startDate: "2023-04-17",
            endDate: "2023-04-30",
            planned: 40,
            completed: 40,
            tasks: 18,
            teamSize: 4,
            completionRate: 100,
          },
          {
            id: 2,
            name: "Sprint 22.03",
            startDate: "2023-04-03",
            endDate: "2023-04-16",
            planned: 38,
            completed: 32,
            tasks: 16,
            teamSize: 4,
            completionRate: 85,
          },
          {
            id: 3,
            name: "Sprint 22.02",
            startDate: "2023-03-20",
            endDate: "2023-04-02",
            planned: 35,
            completed: 33,
            tasks: 15,
            teamSize: 4,
            completionRate: 95,
          },
        ])
      } catch (error) {
        console.error("Error fetching sprint data:", error)
        toast({
          title: "Error",
          description: "Failed to load sprint data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSprintData()
  }, [toast])

  // Handle button actions
  const handleNewSprint = () => {
    toast({
      title: "New Sprint",
      description: "Opening sprint creation form...",
    })
  }

  const handleViewCalendar = () => {
    toast({
      title: "View Calendar",
      description: "Opening sprint calendar view...",
    })
  }

  const handleSprintReport = () => {
    toast({
      title: "Sprint Report",
      description: "Generating sprint report...",
    })
  }

  const handleManageTasks = () => {
    toast({
      title: "Manage Tasks",
      description: "Opening task management view...",
    })
  }

  const handlePlanSprint = () => {
    toast({
      title: "Plan Sprint",
      description: "Opening sprint planning view...",
    })
  }

  const handleAcceptRecommendation = () => {
    toast({
      title: "Recommendation Accepted",
      description: "AI recommendation has been applied to the sprint plan.",
    })
  }

  const handleModifyRecommendation = () => {
    toast({
      title: "Modify Recommendation",
      description: "Opening recommendation modification view...",
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sprints</h1>
          <p className="text-muted-foreground">Manage and track your team's sprint cycles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleViewCalendar}>
            <Calendar className="h-4 w-4" />
            <span>View Calendar</span>
          </Button>
          <Button size="sm" className="gap-1" onClick={handleNewSprint}>
            <Plus className="h-4 w-4" />
            <span>New Sprint</span>
          </Button>
        </div>
      </div>

      {/* Active Sprint */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Active Sprint</h2>
          {loading ? (
            <Skeleton className="h-6 w-32" />
          ) : activeSprint ? (
            <Badge variant="outline" className="gap-1">
              <CalendarDays className="h-3 w-3" />
              <span>
                {new Date(activeSprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -
                {new Date(activeSprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </Badge>
          ) : null}
        </div>

        {loading ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-4 w-64 mt-1" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>

                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="flex justify-between w-full">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
              </div>
            </CardFooter>
          </Card>
        ) : activeSprint ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>{activeSprint.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSprintExpanded(!activeSprintExpanded)}
                  className="gap-1"
                >
                  {activeSprintExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      <span className="sr-only">Collapse</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      <span className="sr-only">Expand</span>
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>{activeSprint.description}</CardDescription>
            </CardHeader>
            {activeSprintExpanded && (
              <>
                <CardContent className="pb-2">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Sprint Progress</span>
                        <span className="font-medium">
                          {Math.round((activeSprint.completed / activeSprint.capacity) * 100)}%
                        </span>
                      </div>
                      <Progress value={(activeSprint.completed / activeSprint.capacity) * 100} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-sm text-muted-foreground">Total Tasks</div>
                        <div className="text-2xl font-bold">24</div>
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-sm text-muted-foreground">Completed</div>
                        <div className="text-2xl font-bold">11</div>
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-sm text-muted-foreground">In Progress</div>
                        <div className="text-2xl font-bold">8</div>
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-sm text-muted-foreground">Remaining</div>
                        <div className="text-2xl font-bold">5</div>
                      </div>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-muted/40 px-4 py-2 font-medium">Team Velocity</div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Current Velocity</span>
                          <span className="font-medium">42 points/sprint</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">AI Prediction</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            On Track
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="outline" size="sm" onClick={handleSprintReport}>
                    Sprint Report
                  </Button>
                  <Button size="sm" onClick={handleManageTasks}>
                    Manage Tasks
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No active sprint found</p>
              <Button className="mt-4" size="sm" onClick={handleNewSprint}>
                <Plus className="h-4 w-4 mr-1" /> Create New Sprint
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Sprint Planning */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Sprint Planning</h2>
          <Badge variant="secondary">AI Assisted</Badge>
        </div>

        <Card className="bg-primary/5 border-primary/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">AI Recommendation</CardTitle>
            <CardDescription>Based on team capacity and historical data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Based on your team's velocity and current capacity, I recommend the following for the next sprint:
            </p>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Commit to 38 story points (10% less than current sprint due to upcoming company event)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Prioritize the Ethical Governance Dashboard (highest business value)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Allocate 20% of capacity to technical debt reduction</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Capacity Analysis</Badge>
              <Badge variant="outline">Business Priority</Badge>
              <Badge variant="outline">Risk Assessment</Badge>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={handleModifyRecommendation}>
              Modify
            </Button>
            <Button size="sm" onClick={handleAcceptRecommendation}>
              Accept Recommendation
            </Button>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Next Sprint</CardTitle>
              <CardDescription>May 15 - May 28</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Planned Capacity</span>
                  <span>38 points</span>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Candidate Tasks</h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center text-sm">
                      <span>Implement Ethical Dashboard</span>
                      <Badge>8 points</Badge>
                    </li>
                    <li className="flex justify-between items-center text-sm">
                      <span>Integrate IBM Granite Speech API</span>
                      <Badge>13 points</Badge>
                    </li>
                    <li className="flex justify-between items-center text-sm">
                      <span>Design Gamification Elements</span>
                      <Badge>5 points</Badge>
                    </li>
                    <li className="flex justify-between items-center text-sm">
                      <span>Technical Debt: Refactor Auth</span>
                      <Badge>8 points</Badge>
                    </li>
                    <li className="flex justify-between items-center text-sm">
                      <span>Fix Performance Issues</span>
                      <Badge>3 points</Badge>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button className="w-full" onClick={handlePlanSprint}>
                Plan Sprint
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Availability</CardTitle>
              <CardDescription>Next sprint capacity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Capacity</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Reduced
                  </Badge>
                </div>

                <div className="space-y-3">
                  {loading ? (
                    <>
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </>
                  ) : (
                    teamAvailability.map((member) => (
                      <div key={member.id}>
                        <div className="flex justify-between mb-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                          <span>{member.availability}%</span>
                        </div>
                        <Progress value={member.availability} className="h-2" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Last updated 2 hours ago</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Sprint History */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Sprint History</h2>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {sprintHistory.map((sprint) => (
              <AccordionItem
                key={sprint.id}
                value={`sprint-${sprint.id}`}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <div className="flex flex-col items-start">
                    <div className="font-medium">{sprint.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(sprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -
                      {new Date(sprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Completed</span>
                      <Badge
                        variant="outline"
                        className={
                          sprint.completionRate >= 95
                            ? "bg-green-50 text-green-700 border-green-200"
                            : sprint.completionRate >= 80
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {sprint.completionRate}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-muted/40 rounded-md p-2">
                        <div className="text-sm text-muted-foreground">Planned</div>
                        <div className="font-medium">{sprint.planned} points</div>
                      </div>
                      <div className="bg-muted/40 rounded-md p-2">
                        <div className="text-sm text-muted-foreground">Completed</div>
                        <div className="font-medium">{sprint.completed} points</div>
                      </div>
                      <div className="bg-muted/40 rounded-md p-2">
                        <div className="text-sm text-muted-foreground">Tasks</div>
                        <div className="font-medium">{sprint.tasks} tasks</div>
                      </div>
                      <div className="bg-muted/40 rounded-md p-2">
                        <div className="text-sm text-muted-foreground">Team</div>
                        <div className="font-medium">{sprint.teamSize} members</div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleSprintReport()}>
                        View Report
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>
    </div>
  )
}
