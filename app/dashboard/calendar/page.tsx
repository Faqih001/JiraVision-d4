"use client"

import { useState, useEffect } from "react"
import { format, parseISO, isSameDay } from "date-fns"
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Filter, 
  Plus, 
  Users, 
  Calendar as CalendarLucide,
  Loader2
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useCalendar } from "@/hooks/use-calendar"
import AddEventModal from "@/components/calendar/add-event-modal"
import EventDetailsModal from "@/components/calendar/event-details-modal"
import DayCellEvent from "@/components/calendar/day-cell-event"
import { CalendarEvent, CreateEventInput, CalendarViewType, eventColors } from "@/types/calendar"

export default function CalendarPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false)
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Initialize the calendar with today's date and month view
  const { 
    formattedDate,
    currentDate,
    currentView,
    calendarDays,
    goToPreviousPeriod,
    goToNextPeriod,
    goToToday,
    changeView
  } = useCalendar({
    events,
    initialView: 'month',
    initialDate: new Date()
  })

  // Fetch calendar events from the API
  const fetchEvents = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/calendar/events')
      const data = await response.json()
      
      if (data.success) {
        setEvents(data.events)
      } else {
        console.error('Error fetching events:', data.error)
        toast({
          title: "Error fetching events",
          description: data.error || "Could not load calendar events",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Exception fetching events:', error)
      toast({
        title: "Error",
        description: "Could not connect to the server",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch team members for the availability section
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team/members')
      const data = await response.json()
      
      if (data.success) {
        setTeamMembers(data.teamMembers)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    fetchEvents()
    fetchTeamMembers()
  }, [])

  // Create a new event
  const handleAddEvent = async (eventData: CreateEventInput) => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Event created successfully"
        })
        // Refresh events
        fetchEvents()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create event",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating event:', error)
      toast({
        title: "Error",
        description: "Could not connect to the server",
        variant: "destructive"
      })
    }
  }

  // Update an existing event
  const handleUpdateEvent = async (eventData: CreateEventInput & { id: number }) => {
    try {
      const { id, ...eventBody } = eventData
      const response = await fetch(`/api/calendar/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Event updated successfully"
        })
        // Refresh events
        fetchEvents()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update event",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating event:', error)
      toast({
        title: "Error",
        description: "Could not connect to the server",
        variant: "destructive"
      })
    }
  }

  // Delete an event
  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return
    }
    
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Event deleted successfully"
        })
        // Close the event details modal
        setIsEventDetailsModalOpen(false)
        // Refresh events
        fetchEvents()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete event",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({
        title: "Error",
        description: "Could not connect to the server",
        variant: "destructive"
      })
    }
  }

  // Open the add event modal for a specific date
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsEditingEvent(false)
    setIsAddEventModalOpen(true)
  }

  // Open the event details modal when clicking on an event
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventDetailsModalOpen(true)
  }

  // Edit an existing event
  const handleEditEvent = (event: CalendarEvent) => {
    // Close the details modal
    setIsEventDetailsModalOpen(false)
    
    // Open the edit modal with event data
    setSelectedEvent(event)
    setIsEditingEvent(true)
    setIsAddEventModalOpen(true)
  }

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.startTime)
      const today = new Date()
      return eventDate >= today && eventDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your team schedule and events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={fetchEvents}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarLucide className="h-4 w-4" />
            )}
            <span>Refresh</span>
          </Button>
          <Button 
            size="sm" 
            className="gap-1"
            onClick={() => {
              setSelectedDate(new Date())
              setIsEditingEvent(false)
              setIsAddEventModalOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <span className="font-medium">{formattedDate}</span>
          </div>
          <Button variant="outline" size="icon" onClick={goToNextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <Tabs 
            defaultValue={currentView} 
            value={currentView}
            onValueChange={(value) => changeView(value as CalendarViewType)}
          >
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center py-2 font-medium text-sm">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[100px] border rounded-md p-1 overflow-hidden
                ${day.isCurrentMonth ? "bg-background" : "bg-muted/30"}
                ${day.isToday ? "border-primary" : "border-border"}
                hover:bg-accent/30 hover:border-accent cursor-pointer transition-colors
              `}
              onClick={() => handleDateClick(day.date)}
            >
              <div className="flex justify-between">
                <div className={`text-xs font-medium p-1 ${day.isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                  {format(day.date, "d")}
                </div>
                {currentView === "month" && day.events.length > 3 && (
                  <div className="text-xs text-muted-foreground p-1">
                    +{day.events.length - 3} more
                  </div>
                )}
              </div>
              
              {/* Display events for this day */}
              <div className="space-y-1 overflow-hidden">
                {day.events
                  .slice(0, currentView === "month" ? 3 : undefined)
                  .map((event) => (
                    <DayCellEvent 
                      key={event.id} 
                      event={event} 
                      onEventClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }} 
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Events */}
      <div>
        <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map(event => {
              // Get color classes for this event
              const colorClasses = eventColors[event.color || "blue"] || eventColors.blue;
              // Format date for display
              const eventDate = new Date(event.startTime);
              const isToday = isSameDay(eventDate, new Date());
              const dateDisplay = isToday ? "Today" : format(eventDate, "MMM d");
              
              return (
                <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEventClick(event)}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <Badge className={`${colorClasses.bgClass} ${colorClasses.textClass} ${colorClasses.hoverClass}`}>
                        {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                      </Badge>
                      <div className="text-sm text-muted-foreground">{dateDisplay}</div>
                    </div>
                    <CardTitle className="text-lg mt-2">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {event.isAllDay ? "All day" : (
                          `${format(new Date(event.startTime), "h:mm a")} - ${format(new Date(event.endTime), "h:mm a")}`
                        )}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2">
                    <div className="flex -space-x-2">
                      <Avatar className="border-2 border-background h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {event.organizer.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {event.attendees.slice(0, 3).map(attendee => (
                        <Avatar key={attendee.id} className="border-2 border-background h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {attendee.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {event.attendees.length > 3 && (
                        <Avatar className="border-2 border-background h-7 w-7">
                          <AvatarFallback className="text-xs">+{event.attendees.length - 3}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              )
            })
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p>No upcoming events in the next 7 days</p>
              <Button 
                className="mt-2" 
                variant="outline" 
                onClick={() => {
                  setSelectedDate(new Date())
                  setIsEditingEvent(false)
                  setIsAddEventModalOpen(true)
                }}
              >
                Create a new event
              </Button>
            </div>
          )}
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
              {teamMembers.length > 0 ? (
                teamMembers.slice(0, 4).map((member, index) => (
                  <div key={member.id}>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        {member.avatar ? (
                          <AvatarImage src={member.avatar} alt={member.name} />
                        ) : (
                          <AvatarFallback>
                            {member.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          member.status === "online" 
                            ? "bg-green-50 text-green-700 border-green-200"
                            : member.status === "in_meeting" 
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }>
                          {member.status === "online" 
                            ? "Available" 
                            : member.status === "in_meeting" 
                              ? "In Meeting" 
                              : "Offline"}
                        </Badge>
                        {member.status === "online" && (
                          <div className="text-sm text-muted-foreground">Until 5:00 PM</div>
                        )}
                        {member.status === "in_meeting" && (
                          <div className="text-sm text-muted-foreground">Until 2:30 PM</div>
                        )}
                      </div>
                    </div>
                    {index < teamMembers.slice(0, 4).length - 1 && <Separator className="my-4" />}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No team members data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Event Modal */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onAddEvent={isEditingEvent && selectedEvent 
          ? (data) => handleUpdateEvent({ ...data, id: selectedEvent.id }) 
          : handleAddEvent
        }
        defaultDate={selectedDate || undefined}
        isEditing={isEditingEvent}
        initialEvent={isEditingEvent && selectedEvent 
          ? {
              id: selectedEvent.id,
              title: selectedEvent.title,
              description: selectedEvent.description || '',
              startTime: selectedEvent.startTime,
              endTime: selectedEvent.endTime,
              location: selectedEvent.location || '',
              eventType: selectedEvent.eventType,
              isAllDay: selectedEvent.isAllDay,
              isRecurring: selectedEvent.isRecurring,
              recurringPattern: selectedEvent.recurringPattern,
              attendees: selectedEvent.attendees.map(a => a.id),
              color: selectedEvent.color
            }
          : undefined
        }
      />

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={isEventDetailsModalOpen}
        onClose={() => setIsEventDetailsModalOpen(false)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  )
}
