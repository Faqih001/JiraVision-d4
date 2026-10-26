import { describe, expect, it } from "vitest"
import {
  VIEW_LABEL,
  WORKLOG_VIEWS,
  defaultViewState,
  parseViewState,
  resolveRange,
  serializeViewState,
  viewDays,
  type ViewState,
} from "@/lib/worklog/view-state"

const TODAY = "2026-10-26" // a Monday

const sp = (qs: string) => new URLSearchParams(qs)

/** The range controls (preset, custom pair) only drive the fetch for the range views. */
function listed(overrides: Partial<ViewState> = {}): ViewState {
  return { ...defaultViewState(TODAY), view: "list", ...overrides }
}

describe("defaults", () => {
  it("opens on the day view of today", () => {
    expect(defaultViewState(TODAY)).toMatchObject({ view: "day", day: TODAY, preset: "today", q: "" })
    expect(WORKLOG_VIEWS).toEqual(["day", "week", "list", "board", "heat"])
    expect(VIEW_LABEL.day).toBe("Day")
    expect(VIEW_LABEL.list).toBe("All entries")
  })

  it("omits every default from the query string", () => {
    expect(serializeViewState(defaultViewState(TODAY), TODAY)).toBe("")
    expect(serializeViewState({ ...defaultViewState(TODAY), view: "heat" }, TODAY)).toBe("v=heat")
  })
})

describe("parseViewState", () => {
  it("falls back to the default instead of throwing on a hand-edited URL", () => {
    const state = parseViewState(sp("v=gantt&kind=shipped&discipline=plumber&task=-4&day=not-a-date"), TODAY)
    expect(state.view).toBe("day")
    expect(state.kind).toBe("all")
    expect(state.discipline).toBe("all")
    expect(state.taskId).toBeNull()
    expect(state.day).toBe(TODAY)
  })

  it("reads every control back", () => {
    const state = parseViewState(
      sp("v=board&day=2026-10-20&p=custom&from=2026-10-01&to=2026-10-20&q=pump&kind=blocker&discipline=auditor&task=12&dstatus=in_review&dlv=1"),
      TODAY,
    )
    expect(state).toEqual({
      view: "board",
      day: "2026-10-20",
      preset: "custom",
      from: "2026-10-01",
      to: "2026-10-20",
      q: "pump",
      kind: "blocker",
      discipline: "auditor",
      taskId: 12,
      deliverableStatus: "in_review",
      hasDeliverable: true,
    })
  })

  it("round-trips", () => {
    const state = parseViewState(sp("v=list&p=last-7&kind=time&discipline=developer&q=audit&task=3"), TODAY)
    expect(parseViewState(sp(serializeViewState(state, TODAY)), TODAY)).toEqual(state)
  })
})

describe("resolveRange", () => {
  it("maps each preset to real calendar days", () => {
    expect(resolveRange(listed(), TODAY)).toEqual({ from: "2026-10-26", to: "2026-10-26" })
    expect(resolveRange(listed({ preset: "yesterday" }), TODAY)).toEqual({
      from: "2026-10-25",
      to: "2026-10-25",
    })
    expect(resolveRange(listed({ preset: "this-week" }), TODAY)).toEqual({
      from: "2026-10-26",
      to: "2026-11-01",
    })
    expect(resolveRange(listed({ preset: "last-7" }), TODAY)).toEqual({
      from: "2026-10-20",
      to: "2026-10-26",
    })
    expect(resolveRange(listed({ preset: "this-month" }), TODAY)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    })
  })

  it("uses from/to for custom, and repairs a broken pair", () => {
    const custom = listed({ preset: "custom" as const, from: "2026-10-01", to: "2026-10-20" })
    expect(resolveRange(custom, TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-20" })
    expect(resolveRange({ ...custom, from: "2026-10-20", to: "2026-10-01" }, TODAY)).toEqual({
      from: "2026-10-01",
      to: "2026-10-20",
    })
    expect(resolveRange({ ...custom, from: null, to: null }, TODAY)).toEqual({ from: TODAY, to: TODAY })
  })

  it("anchors a week or heat window on the selected day, not today", () => {
    expect(resolveRange({ ...defaultViewState(TODAY), view: "week", day: "2026-11-04" }, TODAY)).toEqual({
      from: "2026-11-02",
      to: "2026-11-08",
    })
    expect(resolveRange({ ...defaultViewState(TODAY), view: "heat", day: "2026-11-04" }, TODAY)).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    })
  })
})

describe("viewDays", () => {
  it("gives the week grid seven days and the heat map a month", () => {
    expect(viewDays({ ...defaultViewState(TODAY), view: "week", day: "2026-10-28" }, TODAY)).toHaveLength(7)
    expect(viewDays({ ...defaultViewState(TODAY), view: "week", day: "2026-10-28" }, TODAY)[0]).toBe("2026-10-26")
    const heat = viewDays({ ...defaultViewState(TODAY), view: "heat" }, TODAY)
    expect(heat[0]).toBe("2026-10-01")
    expect(heat[heat.length - 1]).toBe("2026-10-31")
    expect(viewDays(defaultViewState(TODAY), TODAY)).toEqual(["2026-10-26"])
    expect(viewDays({ ...defaultViewState(TODAY), view: "list" }, TODAY)).toHaveLength(1)
  })

  it("refuses to render a range wider than the view can hold", () => {
    const long = listed({ preset: "custom" as const, from: "2020-01-01", to: "2026-10-26" })
    expect(viewDays(long, TODAY)).toHaveLength(90)
  })
})
