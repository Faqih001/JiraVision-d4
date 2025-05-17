"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CreateEventInput, eventColors } from "@/types/calendar"
import { toast } from "@/hooks/use-toast"

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onAddEvent: (event: CreateEventInput) => void
  defaultDate?: Date
  isEditing?: boolean
  initialEvent?: CreateEventInput & { id?: number }
}

const eventTypeOptions = [
  { value: "meeting", label: "Meeting" },
  { value: "sprint", label: "Sprint" },
  { value: "demo", label: "Demo" },
  { value: "retrospective", label: "Retrospective" },
  { value: "planning", label: "Planning" },
  { value: "workshop", label: "Workshop" },
  { value: "holiday", label: "Holiday" },
  { value: "other", label: "Other" }
]

export default function AddEventModal({
  isOpen,
  onClose,
  onAddEvent,
  defaultDate,
  isEditing = false,
  initialEvent
}: AddEventModalProps) {
  const [event, setEvent] = useState<CreateEventInput>({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    eventType: "meeting",
    isAllDay: false,
    color: "blue"
  })

  // Initialize form with default date or initial event data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setEvent({
          ...initialEvent,
          // Ensure dates are formatted correctly
          startTime: initialEvent.startTime,
          endTime: initialEvent.endTime
        })
      } else if (defaultDate) {
        const dateStr = defaultDate.toISOString().slice(0, 10)
        setEvent({
          title: "",
          description: "",
          // Set default times (9 AM to 10 AM on the selected date)
          startTime: `${dateStr}T09:00:00`,
          endTime: `${dateStr}T10:00:00`,
          location: "",
          eventType: "meeting",
          isAllDay: false,
          color: "blue"
        })
      }
    }
  }, [isOpen, initialEvent, defaultDate])

  const handleChange = (field: keyof CreateEventInput, value: any) => {
    setEvent(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    // Basic validation
    if (!event.title.trim()) {
      toast({
        title: "Error",
        description: "Event title is required",
        variant: "destructive"
      })
      return
    }

    if (!event.startTime || !event.endTime) {
      toast({
        title: "Error",
        description: "Start and end times are required",
        variant: "destructive"
      })
      return
    }

    // Check if end time is after start time
    if (new Date(event.endTime) <= new Date(event.startTime)) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive"
      })
      return
    }

    onAddEvent(event)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditing ? "Edit Event" : "Add New Event"}</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Event title"
              value={event.title}
              onChange={(e) => handleChange("title", e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Event description"
              value={event.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="isAllDay">All day</Label>
              <Switch
                id="isAllDay"
                checked={event.isAllDay}
                onCheckedChange={(checked) => handleChange("isAllDay", checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type={event.isAllDay ? "date" : "datetime-local"}
                value={event.isAllDay ? event.startTime.split("T")[0] : event.startTime}
                onChange={(e) => handleChange("startTime", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type={event.isAllDay ? "date" : "datetime-local"}
                value={event.isAllDay ? event.endTime.split("T")[0] : event.endTime}
                onChange={(e) => handleChange("endTime", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Event location"
              value={event.location}
              onChange={(e) => handleChange("location", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={event.eventType}
                onValueChange={(value) => handleChange("eventType", value)}
              >
                <SelectTrigger id="eventType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <Select
                value={event.color}
                onValueChange={(value) => handleChange("color", value)}
              >
                <SelectTrigger id="color">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventColors).map(([color, classes]) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${classes.bgClass}`} />
                        <span className="capitalize">{color}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? "Update Event" : "Add Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
