"use client"

import { format } from "date-fns"
import { CalendarEvent, eventColors } from "@/types/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Edit, Trash2, Clock, MapPin, Calendar, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface EventDetailsModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  onDelete: (eventId: number) => void
}

export default function EventDetailsModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete
}: EventDetailsModalProps) {
  if (!event) return null

  // Make sure organizer exists and has required properties with fallbacks
  const organizer = event.organizer || { id: 0, name: "Unknown", avatar: null };
  
  const colorClasses = eventColors[event.color || "blue"] || eventColors.blue

  // Format the start and end times for display
  const formatTimeRange = () => {
    if (event.isAllDay) {
      return "All day"
    }
    
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    
    // Same day
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${format(startDate, "MMM d, yyyy • h:mm a")} - ${format(endDate, "h:mm a")}`
    }
    
    // Different days
    return `${format(startDate, "MMM d, yyyy • h:mm a")} - ${format(endDate, "MMM d, yyyy • h:mm a")}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg overflow-y-auto max-h-[90vh]" aria-describedby="event-details-description">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${colorClasses.bgClass} ${colorClasses.textClass}`}>
                {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
              </Badge>
              <span className="line-clamp-1">{event.title}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2" id="event-details-description">
          {/* Time information */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Time</p>
              <p className="text-sm text-muted-foreground">{formatTimeRange()}</p>
            </div>
          </div>

          {/* Location information (if available) */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{event.location}</p>
              </div>
            </div>
          )}

          {/* Description (if available) */}
          {event.description && (
            <div className="pt-2">
              <Separator />
              <div className="py-4">
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{event.description}</p>
              </div>
              <Separator />
            </div>
          )}

          {/* Organizer */}
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Organizer</p>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  {event.organizer.avatar && <AvatarImage src={event.organizer.avatar} alt={event.organizer.name} />}
                  <AvatarFallback>
                    {event.organizer.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{event.organizer.name}</span>
              </div>
            </div>
          </div>

          {/* Attendees (if available) */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Attendees</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {event.attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-1 bg-secondary rounded-full pl-1 pr-2 py-0.5">
                      <Avatar className="h-6 w-6">
                        {attendee.avatar && <AvatarImage src={attendee.avatar} alt={attendee.name} />}
                        <AvatarFallback>
                          {attendee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm whitespace-nowrap">{attendee.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Created/Updated information */}
          <div className="text-xs text-muted-foreground pt-2">
            <p>Created: {format(new Date(event.createdAt), "MMM d, yyyy")}</p>
            {event.updatedAt && event.updatedAt !== event.createdAt && (
              <p>Last modified: {format(new Date(event.updatedAt), "MMM d, yyyy")}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-1"
            onClick={() => onDelete(event.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
          <Button 
            onClick={() => onEdit(event)} 
            size="sm" 
            className="gap-1"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
