import { useState, useEffect, useCallback } from 'react'
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  format,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns'
import { CalendarEvent, CalendarDay, CalendarViewType } from '@/types/calendar'

interface UseCalendarProps {
  events: CalendarEvent[];
  initialView?: CalendarViewType;
  initialDate?: Date;
}

export function useCalendar({ 
  events, 
  initialView = 'month', 
  initialDate = new Date() 
}: UseCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [currentView, setCurrentView] = useState<CalendarViewType>(initialView)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [visibleDateRange, setVisibleDateRange] = useState<{start: Date, end: Date}>({
    start: new Date(),
    end: new Date()
  })

  // Get the formatted title for the current view (e.g., "May 2025")
  const formattedDate = format(currentDate, currentView === 'day' ? 'EEEE, MMMM d, yyyy' : 'MMMM yyyy')

  // Calculate the calendar days based on the current view and date
  const calculateCalendarDays = useCallback(() => {
    let start: Date
    let end: Date

    // Determine date range based on current view
    if (currentView === 'day') {
      start = currentDate
      end = currentDate
    } else if (currentView === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 }) // Start on Monday
      end = endOfWeek(currentDate, { weekStartsOn: 1 })
    } else { // month view
      start = startOfMonth(currentDate)
      end = endOfMonth(currentDate)
      
      // For month view, we need to include days from previous/next month to fill the grid
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const monthStartWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 })
      const monthEndWeekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
      
      start = monthStartWeekStart
      end = monthEndWeekEnd
    }

    // Update the visible date range
    setVisibleDateRange({ start, end })

    // Generate an array of days in the range
    const daysInRange = eachDayOfInterval({ start, end })

    // Map days to CalendarDay objects
    const mappedDays = daysInRange.map(date => {
      // Filter events for this day
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.startTime)
        const eventEnd = new Date(event.endTime)
        
        // Check if event falls on this day
        return (
          (isSameDay(date, eventStart) || date >= eventStart) && 
          (isSameDay(date, eventEnd) || date <= eventEnd)
        )
      })

      return {
        date,
        isCurrentMonth: isSameMonth(date, currentDate),
        isToday: isSameDay(date, new Date()),
        events: dayEvents
      }
    })

    setCalendarDays(mappedDays)
  }, [currentDate, currentView, events])

  // Initialize and update calendar days when dependencies change
  useEffect(() => {
    calculateCalendarDays()
  }, [calculateCalendarDays])

  // Navigation functions
  const goToPreviousPeriod = () => {
    if (currentView === 'day') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1))
    } else if (currentView === 'week') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7))
    } else {
      setCurrentDate(prev => subMonths(prev, 1))
    }
  }

  const goToNextPeriod = () => {
    if (currentView === 'day') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1))
    } else if (currentView === 'week') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7))
    } else {
      setCurrentDate(prev => addMonths(prev, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Change the calendar view
  const changeView = (view: CalendarViewType) => {
    setCurrentView(view)
  }

  return {
    formattedDate,
    currentDate,
    currentView,
    calendarDays,
    visibleDateRange,
    goToPreviousPeriod,
    goToNextPeriod,
    goToToday,
    changeView
  }
}
