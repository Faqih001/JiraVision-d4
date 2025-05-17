import { CalendarEvent, eventColors } from "@/types/calendar"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DayCellEventProps {
  event: CalendarEvent
  onEventClick: (event: React.MouseEvent) => void
}

export default function DayCellEvent({ event, onEventClick }: DayCellEventProps) {
  // Get the color classes for this event
  const colorClasses = eventColors[event.color || "blue"] || eventColors.blue
  
  // Format start time for display
  const timeDisplay = event.isAllDay 
    ? "All day" 
    : format(new Date(event.startTime), "h:mm a")

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`${colorClasses.bgClass} ${colorClasses.textClass} text-xs rounded p-1 mb-1 truncate cursor-pointer hover:opacity-80`}
            onClick={(e) => onEventClick(e)}
          >
            {event.title}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="max-w-[300px]">
          <div className="space-y-1">
            <p className="font-medium">{event.title}</p>
            <p className="text-xs">{timeDisplay}</p>
            {event.location && (
              <p className="text-xs text-muted-foreground">📍 {event.location}</p>
            )}
            {event.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
