"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Calendar, CalendarDays, Check, ChevronDown, ChevronUp, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useMobile } from "@/hooks/use-mobile"
import DashboardLayout from "@/components/dashboard-layout"

export default function SprintsPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const [activeSprintExpanded, setActiveSprintExpanded] = useState(true)

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sprints</h1>
            <p className="text-muted-foreground">Manage and track your team's sprint cycles</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Calendar className="h-4 w-4" />
              <span>View Calendar</span>
            </Button>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span>New Sprint</span>
            </Button>
          </div>
        </div>

        {/* Active Sprint */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Active Sprint</h2>
            <Badge variant="outline" className="gap-1">
              <CalendarDays className="h-3 w-3" />
              <span>May 1 - May 14</span>
            </Badge>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Sprint 23.05</CardTitle>
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
              <CardDescription>AI-Powered Project Management Platform</CardDescription>
            </CardHeader>
            {activeSprintExpanded && (
              <>
                <CardContent className="pb-2">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Sprint Progress</span>
                        <span className="font-medium">45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
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
                  <Button variant="outline" size="sm">
                    Sprint Report
                  </Button>
                  <Button size="sm">Manage Tasks</Button>
                </CardFooter>
              </>
            )}
          </Card>
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
              <Button variant="outline" size="sm">
                Modify
              </Button>
              <Button size="sm">Accept Recommendation</Button>
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
                <Button className="w-full">Plan Sprint</Button>
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
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                          <span>John Doe</span>
                        </div>
                        <span>100%</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>AS</AvatarFallback>
                          </Avatar>
                          <span>Alice Smith</span>
                        </div>
                        <span>50%</span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>RJ</AvatarFallback>
                          </Avatar>
                          <span>Robert Johnson</span>
                        </div>
                        <span>80%</span>
                      </div>
                      <Progress value={80} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>EW</AvatarFallback>
                          </Avatar>
                          <span>Emily Wilson</span>
                        </div>
                        <span>100%</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
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

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="sprint-22-04" className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <div className="flex flex-col items-start">
                  <div className="font-medium">Sprint 22.04</div>
                  <div className="text-sm text-muted-foreground">Apr 17 - Apr 30</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Completed</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      100%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Planned</div>
                      <div className="font-medium">40 points</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Completed</div>
                      <div className="font-medium">40 points</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Tasks</div>
                      <div className="font-medium">18 tasks</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Team</div>
                      <div className="font-medium">4 members</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="sprint-22-03" className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <div className="flex flex-col items-start">
                  <div className="font-medium">Sprint 22.03</div>
                  <div className="text-sm text-muted-foreground">Apr 3 - Apr 16</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Completed</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      85%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Planned</div>
                      <div className="font-medium">38 points</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Completed</div>
                      <div className="font-medium">32 points</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Tasks</div>
                      <div className="font-medium">16 tasks</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Team</div>
                      <div className="font-medium">4 members</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="sprint-22-02" className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <div className="flex flex-col items-start">
                  <div className="font-medium">Sprint 22.02</div>
                  <div className="text-sm text-muted-foreground">Mar 20 - Apr 2</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Completed</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      95%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Planned</div>
                      <div className="font-medium">35 points</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Completed</div>
                      <div className="font-medium">33 points</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Tasks</div>
                      <div className="font-medium">15 tasks</div>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2">
                      <div className="text-sm text-muted-foreground">Team</div>
                      <div className="font-medium">4 members</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </DashboardLayout>
  )
}
