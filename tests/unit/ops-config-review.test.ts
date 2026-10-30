import { describe, expect, it } from "vitest"
import {
  SECTION_LABELS,
  defaultSelection,
  itemsInSection,
  selectAllInSection,
  selectionCounts,
  selectionSummary,
  sectionsPresent,
  toggleRef,
} from "@/lib/ops/config/review"
import type { ProposalItem } from "@/lib/ops/config/diff"

const items: ProposalItem[] = [
  { ref: "logs:backups", section: "logs", key: "backups", label: "Backups", status: "new", differences: [] },
  {
    ref: "logs:incidents",
    section: "logs",
    key: "incidents",
    label: "Incidents",
    status: "conflict",
    differences: ["fields.severity: absent -> enum [Low, High]"],
  },
  { ref: "kpis:open_tickets", section: "kpis", key: "open_tickets", label: "Open tickets", status: "duplicate", differences: [] },
  { ref: "recommendRules:sla", section: "recommendRules", key: "sla", label: "SLA at risk", status: "new", differences: [] },
]

describe("defaultSelection", () => {
  it("checks only what the pack does not already have", () => {
    expect(defaultSelection(items)).toEqual(["logs:backups", "recommendRules:sla"])
  })

  it("leaves a conflict and a duplicate for the reviewer to opt into", () => {
    const selected = defaultSelection(items)
    expect(selected).not.toContain("logs:incidents")
    expect(selected).not.toContain("kpis:open_tickets")
  })

  it("selects nothing for an empty diff", () => {
    expect(defaultSelection([])).toEqual([])
  })
})

describe("toggleRef", () => {
  it("adds an unselected ref and removes a selected one", () => {
    const once = toggleRef(["logs:backups"], "logs:incidents")
    expect(once).toEqual(["logs:backups", "logs:incidents"])
    expect(toggleRef(once, "logs:backups")).toEqual(["logs:incidents"])
  })
})

describe("selectAllInSection", () => {
  it("only ever touches the section it was asked about", () => {
    const next = selectAllInSection(items, "logs", [])
    expect(next).toEqual(["logs:backups", "logs:incidents"])
  })

  it("clears the section when every row in it was already selected", () => {
    const all = ["logs:backups", "logs:incidents", "kpis:open_tickets"]
    expect(selectAllInSection(items, "logs", all)).toEqual(["kpis:open_tickets"])
  })
})

describe("section grouping", () => {
  it("lists only sections the diff actually proposes into", () => {
    expect(sectionsPresent(items)).toEqual(["logs", "kpis", "recommendRules"])
  })

  it("names every section a proposal can touch", () => {
    expect(Object.keys(SECTION_LABELS)).toEqual([
      "logs",
      "kpis",
      "playbookSeeds",
      "reportTemplates",
      "automationTemplates",
      "recommendRules",
    ])
  })

  it("returns the rows of one section in diff order", () => {
    expect(itemsInSection(items, "logs").map((item) => item.ref)).toEqual(["logs:backups", "logs:incidents"])
  })
})

describe("selectionSummary", () => {
  it("counts additions, replacements and what was left alone", () => {
    expect(selectionSummary(items, ["logs:backups"])).toBe("add 1 new definition, leaving 3 unselected")
  })

  it("says replace when a rule already in force is being overwritten", () => {
    const selected = ["logs:backups", "logs:incidents", "kpis:open_tickets"]
    expect(selectionSummary(items, selected)).toBe("add 1 new definition, replace 1, restate 1 that already matches, leaving 1 unselected")
    expect(selectionCounts(items, selected)).toEqual({ new: 1, conflict: 1, duplicate: 1 })
  })

  it("refuses to describe an empty selection as a change", () => {
    expect(selectionSummary(items, [])).toBe("nothing — select at least one item")
  })
})
