import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

describe("gantt-component", () => {
  it("gantt.tsx is a client component", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/^"use client"/m)
  })

  it("gantt.tsx imports gantt-data functions", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/buildGanttData/)
    expect(component).toMatch(/generateTimeAxisLabels/)
    expect(component).toMatch(/calculateBarPosition/)
  })

  it("gantt.tsx accepts required props", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/items: GanttItem\[\]/)
    expect(component).toMatch(/groupBy/)
    expect(component).toMatch(/zoom/)
  })

  it("gantt.tsx renders SVG element", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/<svg/)
  })

  it("gantt.tsx renders lanes", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/ganttData\.lanes/)
  })

  it("gantt.tsx renders today marker", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/todayX/)
    expect(component).toMatch(/Today marker/)
  })

  it("gantt.tsx handles keyboard navigation", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/onKeyDown/)
    expect(component).toMatch(/ArrowLeft/)
    expect(component).toMatch(/ArrowRight/)
  })

  it("gantt.tsx respects prefers-reduced-motion", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/prefers-reduced-motion/)
  })

  it("gantt.tsx has ARIA labels", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/aria-label/)
    expect(component).toMatch(/role="application"/)
  })

  it("gantt.tsx is responsive with horizontal scroll", () => {
    const component = src("components/planner/gantt.tsx")
    expect(component).toMatch(/overflow-x-auto/)
  })
})

describe("gantt-bar", () => {
  it("gantt-bar.tsx is a client component", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/^"use client"/m)
  })

  it("gantt-bar.tsx renders SVG rect for regular items", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/<rect/)
  })

  it("gantt-bar.tsx renders diamond for milestones", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/<polygon/)
    expect(component).toMatch(/milestone/)
  })

  it("gantt-bar.tsx handles drag interactions", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/onMouseDown/)
    expect(component).toMatch(/onMouseMove/)
    expect(component).toMatch(/onMouseUp/)
    expect(component).toMatch(/isDragging/)
  })

  it("gantt-bar.tsx shows tooltip on hover", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/showTooltip/)
    expect(component).toMatch(/onMouseEnter/)
    expect(component).toMatch(/onMouseLeave/)
  })

  it("gantt-bar.tsx has ARIA attributes", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/role="button"/)
    expect(component).toMatch(/aria-label/)
    expect(component).toMatch(/aria-grabbed/)
  })

  it("gantt-bar.tsx handles keyboard interaction", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/onKeyDown/)
    expect(component).toMatch(/Enter/)
  })

  it("gantt-bar.tsx respects prefers-reduced-motion", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/prefersReducedMotion/)
  })

  it("gantt-bar.tsx color-codes by status", () => {
    const component = src("components/planner/gantt-bar.tsx")
    expect(component).toMatch(/getBarColor/)
    expect(component).toMatch(/done|completed/)
    expect(component).toMatch(/in-progress|in_progress/)
  })
})

describe("gantt-controls", () => {
  it("gantt-controls.tsx is a client component", () => {
    const component = src("components/planner/gantt-controls.tsx")
    expect(component).toMatch(/^"use client"/m)
  })

  it("gantt-controls.tsx renders zoom selector", () => {
    const component = src("components/planner/gantt-controls.tsx")
    expect(component).toMatch(/zoom/)
    expect(component).toMatch(/onZoomChange/)
    expect(component).toMatch(/day|week|month/)
  })

  it("gantt-controls.tsx renders group-by selector", () => {
    const component = src("components/planner/gantt-controls.tsx")
    expect(component).toMatch(/groupBy/)
    expect(component).toMatch(/onGroupByChange/)
    expect(component).toMatch(/discipline|assignee/)
  })

  it("gantt-controls.tsx uses Select components", () => {
    const component = src("components/planner/gantt-controls.tsx")
    expect(component).toMatch(/<Select/)
    expect(component).toMatch(/SelectContent/)
    expect(component).toMatch(/SelectItem/)
  })
})

describe("plan-editor-client integration", () => {
  it("imports Gantt component", () => {
    const component = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(component).toMatch(/import Gantt from/)
  })

  it("has view mode state", () => {
    const component = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(component).toMatch(/viewMode/)
    expect(component).toMatch(/list.*gantt/)
  })

  it("has Gantt control state", () => {
    const component = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(component).toMatch(/ganttZoom/)
    expect(component).toMatch(/ganttGroupBy/)
  })

  it("renders view mode toggle", () => {
    const component = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(component).toMatch(/List/)
    expect(component).toMatch(/Gantt/)
  })

  it("renders Gantt view conditionally", () => {
    const component = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(component).toMatch(/viewMode === "gantt"/)
    expect(component).toMatch(/<Gantt/)
  })

  it("passes onItemMove handler to Gantt", () => {
    const component = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(component).toMatch(/handleItemMove/)
    expect(component).toMatch(/onItemMove=/)
  })

  it("handleItemMove updates item dates", () => {
    const component = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(component).toMatch(/handleItemMove.*dayDelta/)
    expect(component).toMatch(/startDate.*newStart/)
    expect(component).toMatch(/dueDate.*newDue/)
  })

  it("transforms items to GanttItem format", () => {
    const component = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(component).toMatch(/ganttItems.*GanttItem\[\]/)
  })
})
