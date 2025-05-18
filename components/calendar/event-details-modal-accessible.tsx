"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { X, MapPin, Clock, Calendar, Edit, Trash, Users, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarEvent, eventColors } from "@/types/calendar"
import { useToast } from "@/hooks/use-toast"

interface EventDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEdit: (event: CalendarEvent) => void
  onDelete: (eventId: number) => void
}

export default function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete
}: EventDetailsModalProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  if (!event) return null

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await onDelete(event.id)
      onClose()
      toast({
        title: "Success",
        description: "Event deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({
        title: "Error",
        description: "Failed to delete the event",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Format dates
  const startDate = parseISO(event.startTime)
  const endDate = parseISO(event.endTime)
  const formattedStartDate = format(startDate, "EEEE, MMMM d, yyyy")
  const formattedStartTime = format(startDate, "h:mm a")
  const formattedEndTime = format(endDate, "h:mm a")
  const isSameDay = formattedStartDate === format(endDate, "EEEE, MMMM d, yyyy")
  
  // Get color classes
  const colorClasses = eventColors[event.color] || eventColors.blue

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colorClasses.bgClass}`}></div>
              {event.title}
            </span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription id="event-details-description">
            Event details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Description */}
          {event.description && (
            <div className="text-sm text-muted-foreground">
              {event.description}
            </div>
          )}
          
          {/* Date and Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">{formattedStartDate}</div>
              <div className="text-sm text-muted-foreground">
                {event.isAllDay 
                  ? "All day" 
                  : `${formattedStartTime} - ${formattedEndTime}`}
              </div>
            </div>
          </div>
          
          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="font-medium">{event.location}</div>
            </div>
          )}
          
          {/* Organizer */}
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">Organizer</div>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  {event.organizer.avatar && <AvatarImage src={event.organizer.avatar} alt={event.organizer.name} />}
                  <AvatarFallback>
                    {event.organizer.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{event.organizer.name}</span>
              </div>
            </div>
          </div>
          
          {/* Attendees */}
          {event.attendees.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium">Attendees ({event.attendees.length})</div>
              <div className="flex flex-wrap gap-2">
                {event.attendees.map(attendee => (
                  <div key={attendee.id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {attendee.avatar && <AvatarImage src={attendee.avatar} alt={attendee.name} />}
                      <AvatarFallback>
                        {attendee.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{attendee.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto flex items-center gap-2"
            onClick={() => onEdit(event)}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            className="w-full sm:w-auto flex items-center gap-2"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
            ) : (
              <><Trash className="h-4 w-4" /> Delete</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
