"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import {
  buildGanttData,
  generateTimeAxisLabels,
  calculateBarPosition,
  type GanttItem,
  type GanttZoom,
  type GanttGroupBy,
  type GanttData,
} from "@/lib/planner/gantt-data"
import GanttBar from "./gantt-bar"
import GanttControls from "./gantt-controls"

const LANE_HEIGHT = 60
const BAR_HEIGHT = 32
const HEADER_HEIGHT = 40
const LABEL_WIDTH = 150
const PIXELS_PER_UNIT = 40

export type GanttProps = {
  items: GanttItem[]
  groupBy?: GanttGroupBy
  zoom?: GanttZoom
  onItemMove?: (itemId: number, dayDelta: number) => void
  onItemClick?: (item: GanttItem) => void
}

export default function Gantt({
  items,
  groupBy = "discipline",
  zoom = "week",
  onItemMove,
  onItemClick,
}: GanttProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    // Container width tracking can be added here if needed for responsive calculations
    return () => {}
  }, [])

  const ganttData: GanttData = useMemo(
    () => buildGanttData(items, groupBy, zoom),
    [items, groupBy, zoom],
  )

  const timeAxisLabels = useMemo(
    () => generateTimeAxisLabels(ganttData.dateRange, zoom),
    [ganttData.dateRange, zoom],
  )

  const pixelsPerDay = useMemo(() => {
    switch (zoom) {
      case "day":
        return PIXELS_PER_UNIT
      case "week":
        return PIXELS_PER_UNIT / 7
      case "month":
        return PIXELS_PER_UNIT / 30
    }
  }, [zoom])

  const totalWidth = LABEL_WIDTH + ganttData.dateRange.days * pixelsPerDay
  const totalHeight = HEADER_HEIGHT + ganttData.lanes.length * LANE_HEIGHT

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOffset = Math.round(
    (today.getTime() - ganttData.dateRange.start.getTime()) / 86400000,
  )
  const todayX = LABEL_WIDTH + todayOffset * pixelsPerDay
  const showTodayMarker = todayOffset >= 0 && todayOffset <= ganttData.dateRange.days

  const handleBarClick = (item: GanttItem) => {
    setSelectedItemId(item.id)
    onItemClick?.(item)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedItemId || !onItemMove) return

    const item = items.find((i) => i.id === selectedItemId)
    if (!item) return

    let dayDelta = 0
    if (e.key === "ArrowLeft") dayDelta = -1
    else if (e.key === "ArrowRight") dayDelta = 1
    else if (e.key === "ArrowUp") dayDelta = -7
    else if (e.key === "ArrowDown") dayDelta = 7
    else return

    e.preventDefault()
    onItemMove(selectedItemId, dayDelta)
  }

  return (
    <div className="space-y-4">
      <GanttControls
        zoom={zoom}
        groupBy={groupBy}
        onZoomChange={() => {}}
        onGroupByChange={() => {}}
      />

      <div
        ref={containerRef}
        className="border rounded-lg overflow-x-auto overflow-y-visible"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="application"
        aria-label="Gantt chart"
      >
        <svg
          width={totalWidth}
          height={totalHeight}
          className="select-none"
          style={{
            minWidth: totalWidth,
            transition: prefersReducedMotion ? "none" : "all 0.2s ease",
          }}
        >
          {/* Header background */}
          <rect x={0} y={0} width={totalWidth} height={HEADER_HEIGHT} fill="hsl(var(--muted))" />

          {/* Lane label column background */}
          <rect
            x={0}
            y={HEADER_HEIGHT}
            width={LABEL_WIDTH}
            height={totalHeight - HEADER_HEIGHT}
            fill="hsl(var(--muted))"
          />

          {/* Lane separators */}
          {ganttData.lanes.map((_, index) => (
            <line
              key={`lane-sep-${index}`}
              x1={0}
              y1={HEADER_HEIGHT + index * LANE_HEIGHT}
              x2={totalWidth}
              y2={HEADER_HEIGHT + index * LANE_HEIGHT}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
          ))}

          {/* Lane labels */}
          {ganttData.lanes.map((lane, index) => (
            <text
              key={`lane-label-${lane.key}`}
              x={10}
              y={HEADER_HEIGHT + index * LANE_HEIGHT + LANE_HEIGHT / 2}
              className="text-sm font-medium fill-foreground"
              dominantBaseline="middle"
            >
              {lane.label}
            </text>
          ))}

          {/* Time axis labels */}
          {timeAxisLabels.map((label, index) => {
            const x = LABEL_WIDTH + index * (pixelsPerDay * (zoom === "day" ? 1 : zoom === "week" ? 7 : 30))
            return (
              <text
                key={`time-${index}`}
                x={x + 5}
                y={HEADER_HEIGHT / 2}
                className="text-xs fill-muted-foreground"
                dominantBaseline="middle"
              >
                {label}
              </text>
            )
          })}

          {/* Today marker */}
          {showTodayMarker && (
            <g>
              <line
                x1={todayX}
                y1={HEADER_HEIGHT}
                x2={todayX}
                y2={totalHeight}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="4 4"
                aria-label="Today"
              />
              <circle cx={todayX} cy={HEADER_HEIGHT} r={4} fill="hsl(var(--destructive))" />
            </g>
          )}

          {/* Item bars */}
          {ganttData.lanes.map((lane, laneIndex) =>
            lane.items.map((item) => {
              const position = calculateBarPosition(item, ganttData.dateRange, zoom, PIXELS_PER_UNIT)
              if (!position) return null

              const y = HEADER_HEIGHT + laneIndex * LANE_HEIGHT + (LANE_HEIGHT - BAR_HEIGHT) / 2
              const x = LABEL_WIDTH + position.left

              return (
                <GanttBar
                  key={item.id}
                  item={item}
                  x={x}
                  y={y}
                  width={position.width}
                  height={BAR_HEIGHT}
                  isSelected={selectedItemId === item.id}
                  prefersReducedMotion={prefersReducedMotion}
                  onClick={() => handleBarClick(item)}
                  onDrag={(dayDelta) => onItemMove?.(item.id, dayDelta)}
                />
              )
            }),
          )}
        </svg>
      </div>
    </div>
  )
}
