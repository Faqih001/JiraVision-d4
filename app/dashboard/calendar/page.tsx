"use client"

import { useState } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter, Plus, Users } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState("May 2023")
  const [currentView, setCurrentView] = useState("week")

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your team schedule and events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <span className="font-medium">{currentMonth}</span>
          </div>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <Tabs defaultValue={currentView} onValueChange={(value) => setCurrentView(value)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="text-center py-2 font-medium text-sm">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {Array.from({ length: 35 }).map((_, index) => {
          const dayNumber = index - 2 + 1 // Adjust for month start day
          const isCurrentMonth = dayNumber > 0 && dayNumber <= 31
          const isToday = dayNumber === 12 // Assuming today is the 12th

          return (
            <div
              key={index}
              className={`min-h-[100px] border rounded-md p-1 ${
                isCurrentMonth ? "bg-background" : "bg-muted/30"
              } ${isToday ? "border-primary" : "border-border"}`}
            >
              {isCurrentMonth && (
                <>
                  <div className="text-xs font-medium p-1">{dayNumber}</div>
                  {/* Events for specific days */}
                  {dayNumber === 12 && (
                    <div className="bg-blue-100 text-blue-800 text-xs rounded p-1 mb-1 truncate">Sprint Planning</div>
                  )}
                  {dayNumber === 14 && (
                    <div className="bg-green-100 text-green-800 text-xs rounded p-1 mb-1 truncate">
                      Team Retrospective
                    </div>
                  )}
                  {dayNumber === 15 && (
                    <div className="bg-purple-100 text-purple-800 text-xs rounded p-1 mb-1 truncate">Product Demo</div>
                  )}
                  {dayNumber === 18 && (
                    <div className="bg-amber-100 text-amber-800 text-xs rounded p-1 mb-1 truncate">
                      Stakeholder Meeting
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Upcoming Events */}
      <div>
        <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Event 1 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sprint Planning</Badge>
                <div className="text-sm text-muted-foreground">Today</div>
              </div>
              <CardTitle className="text-lg mt-2">Sprint 22.05 Planning</CardTitle>
              <CardDescription>Define goals and tasks for the next sprint</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>10:00 AM - 12:00 PM</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Development Team</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <div className="flex -space-x-2">
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">EW</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">JD</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">AS</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">+3</AvatarFallback>
                </Avatar>
              </div>
            </CardFooter>
          </Card>

          {/* Event 2 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Retrospective</Badge>
                <div className="text-sm text-muted-foreground">May 14</div>
              </div>
              <CardTitle className="text-lg mt-2">Sprint 22.04 Retrospective</CardTitle>
              <CardDescription>Review the completed sprint and identify improvements</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>2:00 PM - 3:30 PM</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Development Team</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <div className="flex -space-x-2">
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">EW</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">JD</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">AS</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">+3</AvatarFallback>
                </Avatar>
              </div>
            </CardFooter>
          </Card>

          {/* Event 3 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Demo</Badge>
                <div className="text-sm text-muted-foreground">May 15</div>
              </div>
              <CardTitle className="text-lg mt-2">Product Demo</CardTitle>
              <CardDescription>Showcase new features to stakeholders</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>11:00 AM - 12:00 PM</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>All Teams + Stakeholders</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <div className="flex -space-x-2">
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">EW</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">JD</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">AS</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background h-7 w-7">
                  <AvatarFallback className="text-xs">+5</AvatarFallback>
                </Avatar>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Team Availability */}
      <div>
        <h2 className="text-xl font-bold mb-4">Team Availability</h2>
        <Card>
          <CardHeader>
            <CardTitle>Team Member Schedule</CardTitle>
            <CardDescription>Today's availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Team Member 1 */}
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">John Doe</div>
                  <div className="text-sm text-muted-foreground">Frontend Developer</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Available
                  </Badge>
                  <div className="text-sm text-muted-foreground">Until 3:00 PM</div>
                </div>
              </div>
              <Separator />

              {/* Team Member 2 */}
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>AS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">Alice Smith</div>
                  <div className="text-sm text-muted-foreground">UX Designer</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    In Meeting
                  </Badge>
                  <div className="text-sm text-muted-foreground">Until 12:30 PM</div>
                </div>
              </div>
              <Separator />

              {/* Team Member 3 */}
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>RJ</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">Robert Johnson</div>
                  <div className="text-sm text-muted-foreground">Backend Developer</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Available
                  </Badge>
                  <div className="text-sm text-muted-foreground">All day</div>
                </div>
              </div>
              <Separator />

              {/* Team Member 4 */}
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>EW</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">Emily Wilson</div>
                  <div className="text-sm text-muted-foreground">Project Manager</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Out of Office
                  </Badge>
                  <div className="text-sm text-muted-foreground">Returns May 13</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
