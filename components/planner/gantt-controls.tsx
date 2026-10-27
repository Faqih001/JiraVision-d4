"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Users } from "lucide-react"
import type { GanttZoom, GanttGroupBy } from "@/lib/planner/gantt-data"

type GanttControlsProps = {
  zoom: GanttZoom
  groupBy: GanttGroupBy
  onZoomChange: (zoom: GanttZoom) => void
  onGroupByChange: (groupBy: GanttGroupBy) => void
}

export default function GanttControls({
  zoom,
  groupBy,
  onZoomChange,
  onGroupByChange,
}: GanttControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={zoom} onValueChange={(v) => onZoomChange(v as GanttZoom)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Zoom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GanttGroupBy)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="discipline">Discipline</SelectItem>
            <SelectItem value="assignee">Assignee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      <div className="text-xs text-muted-foreground">
        Use arrow keys to move selected item · Click bar for details
      </div>
    </div>
  )
}
