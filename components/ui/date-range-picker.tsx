"use client"

// DateRangePicker + DateField — the shadcn calendar replacements for the native
// type="date" controls (design: calendar upgrade). The popover opens below the
// trigger. Monday–Friday are the working days: weekend cells are muted and not
// selectable unless the "I am needed this weekend" toggle is on, and a range
// reports its working-day count. Values round-trip as plain "YYYY-MM-DD" strings,
// so every existing URL state and API filter keeps working unchanged.

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { type DateRange as DayRange, type Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { formatDay, fromIsoDate, toIsoDate, workingDaysBetween } from "@/lib/working-days"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const WEEKEND: Matcher = { day: [0, 6] }

const weekendToggle = (
  allowWeekends: boolean,
  setAllowWeekends: (value: boolean) => void,
) => (
  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
    <input
      type="checkbox"
      className="h-3.5 w-3.5 accent-primary"
      checked={allowWeekends}
      onChange={(event) => setAllowWeekends(event.target.checked)}
    />
    I am needed this weekend
  </label>
)

function triggerLabel(from: string | null, to: string | null, placeholder: string): string {
  if (from && to) return `${formatDay(from)} – ${formatDay(to)}`
  if (from) return `${formatDay(from)} – …`
  if (to) return `… – ${formatDay(to)}`
  return placeholder
}

export interface DateRangePickerProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  placeholder?: string
  min?: string | null
  max?: string | null
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Pick a date range",
  min,
  max,
  className,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  // Per-open, not persisted: excluding weekends is the default, and this week's
  // exception should not silently apply to next month's report.
  const [allowWeekends, setAllowWeekends] = React.useState(false)
  const working = workingDaysBetween(from, to)

  const disabledMatchers: Matcher[] = [
    ...(allowWeekends ? [] : [WEEKEND]),
    ...(min ? [{ before: fromIsoDate(min) ?? new Date(min) }] : []),
    ...(max ? [{ after: fromIsoDate(max) ?? new Date(max) }] : []),
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("justify-start text-left font-normal", !from && !to && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{triggerLabel(from, to, placeholder)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={from || to ? { from: fromIsoDate(from) ?? undefined, to: fromIsoDate(to) ?? undefined } : undefined}
          onSelect={(range: DayRange | undefined) => {
            onChange(range?.from ? toIsoDate(range.from) : null, range?.to ? toIsoDate(range.to) : null)
          }}
          disabled={disabledMatchers}
          modifiers={{ weekend: [WEEKEND] }}
          classNames={{ weekend: "text-muted-foreground/40" }}
          defaultMonth={fromIsoDate(from) ?? undefined}
        />
        <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
          {weekendToggle(allowWeekends, setAllowWeekends)}
          <div className="flex items-center gap-3">
            {working !== null ? (
              <span className="text-[11px] text-muted-foreground">{working} working {working === 1 ? "day" : "days"}</span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => onChange(null, null)}
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export interface DateFieldProps {
  value: string | null
  onChange: (iso: string | null) => void
  id?: string
  placeholder?: string
  min?: string | null
  max?: string | null
  className?: string
  disabled?: boolean
}

export function DateField({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  min,
  max,
  className,
  disabled,
}: DateFieldProps) {
  const [allowWeekends, setAllowWeekends] = React.useState(false)

  const disabledMatchers: Matcher[] = [
    ...(allowWeekends ? [] : [WEEKEND]),
    ...(min ? [{ before: fromIsoDate(min) ?? new Date(min) }] : []),
    ...(max ? [{ after: fromIsoDate(max) ?? new Date(max) }] : []),
  ]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{value ? formatDay(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={fromIsoDate(value) ?? undefined}
          onSelect={(day: Date | undefined) => onChange(day ? toIsoDate(day) : null)}
          disabled={disabledMatchers}
          modifiers={{ weekend: [WEEKEND] }}
          classNames={{ weekend: "text-muted-foreground/40" }}
          defaultMonth={fromIsoDate(value) ?? undefined}
        />
        <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
          {weekendToggle(allowWeekends, setAllowWeekends)}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
