import { describe, expect, it } from "vitest"
import { MODULE_LABEL, type SplitBucket, type TimelineRow } from "@/lib/reports/aggregate"
import { MODULE_SECTIONS } from "@/lib/reports/module-sections"
import {
  inScope,
  moduleInScope,
  parseModuleScope,
  scopeSummary,
  scopedByModule,
  scopedModuleSections,
  scopedTimeline,
  serializeModuleScope,
  toggleModuleScope,
} from "@/lib/reports/scope"

const row = (source: TimelineRow["source"], ref: string): TimelineRow => ({
  ref,
  title: ref,
  detail: "",
  date: "2026-10-27",
  source,
})

const bucket = (key: string): SplitBucket => ({
  key,
  label: key,
  count: { value: 1, refs: [`${key}:1`] },
  minutes: { value: 0, refs: [] },
})

describe("parseModuleScope", () => {
  it("reads no selection as all modules", () => {
    expect(parseModuleScope(null)).toBeNull()
    expect(parseModuleScope("")).toBeNull()
    expect(parseModuleScope(",,,")).toBeNull()
  })

  it("keeps only recognised module keys, trimmed and deduplicated, in card order", () => {
    expect(parseModuleScope("goals, serviceDesk ,goals,nonsense")).toEqual(["serviceDesk", "goals"])
  })

  it("collapses a selection of every card back to all, so the link stays clean", () => {
    expect(parseModuleScope(MODULE_SECTIONS.join(","))).toBeNull()
  })

  it("ignores a wholly unknown selection rather than scoping to nothing", () => {
    expect(parseModuleScope("achievements,widgets")).toBeNull()
  })
})

describe("serializeModuleScope", () => {
  it("omits the parameter for all modules and for an empty selection", () => {
    expect(serializeModuleScope(null)).toBeNull()
    expect(serializeModuleScope([])).toBeNull()
  })

  it("writes the keys in card order regardless of how they were picked", () => {
    expect(serializeModuleScope(["goals", "serviceDesk"])).toBe("serviceDesk,goals")
  })

  it("omits a selection that covers every card", () => {
    expect(serializeModuleScope([...MODULE_SECTIONS])).toBeNull()
  })

  it("round-trips through the URL grammar", () => {
    for (const scope of [["serviceDesk"], ["operations", "email"], ["goals", "meetings", "retros"]] as const) {
      const parsed = parseModuleScope(serializeModuleScope([...scope]))
      expect(parsed).toEqual([...scope])
    }
    expect(parseModuleScope(serializeModuleScope(null))).toBeNull()
  })
})

describe("inScope and scopedModuleSections", () => {
  it("admits every card when nothing is deselected", () => {
    for (const section of MODULE_SECTIONS) expect(inScope(section, null)).toBe(true)
    expect(scopedModuleSections(null)).toEqual([...MODULE_SECTIONS])
  })

  it("admits only the picked cards, in card order", () => {
    const scope = parseModuleScope("email,operations")
    expect(inScope("operations", scope)).toBe(true)
    expect(inScope("email", scope)).toBe(true)
    expect(inScope("goals", scope)).toBe(false)
    expect(scopedModuleSections(scope)).toEqual(["operations", "email"])
  })
})

describe("toggleModuleScope", () => {
  it("deselects one card from all, leaving the other fourteen", () => {
    const next = toggleModuleScope(null, "serviceDesk")
    expect(next).toHaveLength(MODULE_SECTIONS.length - 1)
    expect(next).not.toContain("serviceDesk")
  })

  it("returns to all when the last deselected card is picked again", () => {
    const one = toggleModuleScope(null, "serviceDesk")
    expect(toggleModuleScope(one, "serviceDesk")).toBeNull()
  })

  it("adds a card to an existing selection", () => {
    expect(toggleModuleScope(["serviceDesk"], "goals")).toEqual(["serviceDesk", "goals"])
  })

  it("refuses to scope to nothing: deselecting the last card returns to all", () => {
    expect(toggleModuleScope(["serviceDesk"], "serviceDesk")).toBeNull()
  })

  it("collapses a selection that grows to every card back to all", () => {
    const allButOne = MODULE_SECTIONS.filter((s) => s !== "email")
    expect(toggleModuleScope([...allButOne], "email")).toBeNull()
  })
})

describe("moduleInScope keeps the worklog backbone", () => {
  it("always admits the four modules that are not deselectable cards", () => {
    const scope = parseModuleScope("serviceDesk")
    for (const key of ["worklog", "tasks", "deliverables", "planner"] as const) {
      expect(moduleInScope(key, scope)).toBe(true)
    }
  })

  it("admits a picked card and refuses a deselected one", () => {
    const scope = parseModuleScope("serviceDesk")
    expect(moduleInScope("serviceDesk", scope)).toBe(true)
    expect(moduleInScope("goals", scope)).toBe(false)
    expect(moduleInScope("goals", null)).toBe(true)
  })
})

describe("scopedTimeline and scopedByModule", () => {
  const timeline = [
    row("worklog", "event:1"),
    row("serviceDesk", "ticket:2"),
    row("goals", "goal:3"),
    row("tasks", "task:4"),
  ]
  const byModule = [bucket("worklog"), bucket("serviceDesk"), bucket("goals"), bucket("tasks")]

  it("passes everything through when nothing is deselected", () => {
    expect(scopedTimeline(timeline, null)).toEqual(timeline)
    expect(scopedByModule(byModule, null)).toEqual(byModule)
  })

  it("drops deselected cards but keeps backbone activity", () => {
    const scope = parseModuleScope("serviceDesk")
    expect(scopedTimeline(timeline, scope).map((r) => r.ref)).toEqual(["event:1", "ticket:2", "task:4"])
    expect(scopedByModule(byModule, scope).map((b) => b.key)).toEqual(["worklog", "serviceDesk", "tasks"])
  })
})

describe("scopeSummary", () => {
  it("names all modules, a single card, and a count", () => {
    expect(scopeSummary(null)).toBe(`All ${MODULE_SECTIONS.length} modules`)
    expect(scopeSummary(["serviceDesk"])).toBe(`${MODULE_LABEL.serviceDesk} only`)
    expect(scopeSummary(["serviceDesk", "goals", "email"])).toBe(`3 of ${MODULE_SECTIONS.length} modules`)
  })
})