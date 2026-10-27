"use client"

import { useRef, useState, useCallback } from "react"
import type { GanttItem } from "@/lib/planner/gantt-data"

type GanttBarProps = {
  item: GanttItem
  x: number
  y: number
  width: number
  height: number
  isSelected: boolean
  prefersReducedMotion: boolean
  onClick: () => void
  onDrag: (dayDelta: number) => void
}

export default function GanttBar({
  item,
  x,
  y,
  width,
  height,
  isSelected,
  prefersReducedMotion,
  onClick,
  onDrag,
}: GanttBarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const barRef = useRef<SVGRectElement>(null)

  const getBarColor = () => {
    if (item.milestone) return "hsl(var(--primary))"
    switch (item.status) {
      case "done":
      case "completed":
        return "hsl(var(--success))"
      case "in-progress":
      case "in_progress":
        return "hsl(var(--warning))"
      default:
        return "hsl(var(--chart-1))"
    }
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      setDragStartX(e.clientX)
    },
    [],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - dragStartX
      const dayDelta = Math.round(deltaX / (width / 7))
      if (dayDelta !== 0) {
        onDrag(dayDelta)
        setDragStartX(e.clientX)
      }
    },
    [isDragging, dragStartX, width, onDrag],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick()
    }
  }

  const barColor = getBarColor()
  const strokeColor = isSelected ? "hsl(var(--ring))" : "transparent"
  const strokeWidth = isSelected ? 2 : 0

  if (item.milestone) {
    const cx = x + width / 2
    const cy = y + height / 2
    const size = height * 0.6

    return (
      <g
        ref={barRef as any}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${item.title} (milestone)`}
      >
        <polygon
          points={`${cx},${cy - size / 2} ${cx + size / 2},${cy} ${cx},${cy + size / 2} ${cx - size / 2},${cy}`}
          fill={barColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{
            cursor: "pointer",
            transition: prefersReducedMotion ? "none" : "all 0.15s ease",
          }}
        />
        {showTooltip && (
          <foreignObject x={cx - 100} y={cy - 60} width={200} height={50}>
            <div className="bg-popover text-popover-foreground border rounded shadow-lg p-2 text-xs">
              <div className="font-semibold">{item.title}</div>
              <div className="text-muted-foreground">Milestone</div>
            </div>
          </foreignObject>
        )}
      </g>
    )
  }

  return (
    <g
      ref={barRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false)
        setShowTooltip(false)
      }}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${item.title}, ${item.startDate || "no start"} to ${item.dueDate || "no end"}`}
      aria-grabbed={isDragging}
    >
      <rect
        x={x}
        y={y}
        width={Math.max(width, 20)}
        height={height}
        rx={4}
        fill={barColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          transition: prefersReducedMotion ? "none" : "all 0.15s ease",
          opacity: isDragging ? 0.7 : 1,
        }}
      />
      {width > 60 && (
        <text
          x={x + 8}
          y={y + height / 2}
          className="text-xs fill-white font-medium pointer-events-none"
          dominantBaseline="middle"
        >
          {item.title.length > 20 ? `${item.title.slice(0, 20)}...` : item.title}
        </text>
      )}
      {showTooltip && !isDragging && (
        <foreignObject x={x} y={y - 60} width={Math.max(width, 200)} height={50}>
          <div className="bg-popover text-popover-foreground border rounded shadow-lg p-2 text-xs">
            <div className="font-semibold">{item.title}</div>
            <div className="text-muted-foreground">
              {item.startDate || "No start"} → {item.dueDate || "No end"}
            </div>
            {item.discipline && <div className="text-muted-foreground">{item.discipline}</div>}
          </div>
        </foreignObject>
      )}
    </g>
  )
}
