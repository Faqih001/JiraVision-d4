import { describe, expect, it } from "vitest"
import {
  applySelection,
  diffConfig,
  emptyProposal,
  mergeAndValidate,
  proposalCount,
  proposalIsEmpty,
  refFor,
} from "@/lib/ops/config/diff"
import type { ConfigProposal } from "@/lib/ops/config/diff"
import type { OpsConfig } from "@/lib/packs/ops/types"

const current: OpsConfig = {
  logs: {
    incidents: {
      label: "Incidents",
      fields: {
        date: { type: "date", label: "Date", required: true },
        note: { type: "text", label: "Note" },
      },
    },
    assets: {
      label: "Assets",
      fields: {
        item: { type: "string", label: "Item", required: true },
      },
    },
  },
  kpis: [
    { id: "incidents_logged", label: "Incidents logged", source: "incidents", aggregation: "count", unit: "entries" },
    { id: "assets_open", label: "Assets still open", source: "assets", aggregation: "count", unit: "open" },
  ],
  playbookSeeds: [
    { id: "monthly_review", label: "Monthly review", frequency: "monthly", method: ["Plan"], phases: [{ name: "Plan", steps: ["Review the month"] }] },
  ],
  aiPolicy: { level: "standard", excludedEntities: [], adminReadAccess: true, managerReadAccess: false },
}

function proposal(overrides: Partial<ConfigProposal> = {}): ConfigProposal {
  return { ...emptyProposal(), ...overrides }
}

describe("diffConfig", () => {
  it("marks an entity the pack does not have as new", () => {
    const diff = diffConfig(current, proposal({
      logs: { backups: { label: "Backups", fields: { date: { type: "date", label: "Date" } } } },
    }))

    expect(diff.items).toHaveLength(1)
    expect(diff.items[0]).toMatchObject({ section: "logs", key: "backups", status: "new", differences: [] })
    expect(diff.counts.new).toBe(1)
  })

  it("marks an identical entity as duplicate rather than hiding it", () => {
    const diff = diffConfig(current, proposal({ logs: { assets: current.logs.assets } }))
    expect(diff.items[0].status).toBe("duplicate")
    expect(diff.counts.duplicate).toBe(1)
  })

  it("lists what changed when an entity key already means something else", () => {
    const diff = diffConfig(current, proposal({
      logs: {
        incidents: {
          label: "Incidents",
          fields: {
            date: { type: "date", label: "Date", required: true },
            note: { type: "text", label: "Notes" },
            severity: { type: "enum", label: "Severity", values: ["Low", "High"] },
          },
        },
      },
    }))

    const [item] = diff.items
    expect(item.status).toBe("conflict")
    expect(item.differences).toContain("fields.note.label: Note -> Notes")
    expect(item.differences.join()).toContain("fields.severity")
  })

  it("shows an added enum list as its values, not as \"3 keys\"", () => {
    const diff = diffConfig(current, proposal({
      logs: {
        assets: { label: "Assets", fields: { item: { type: "string", label: "Item", required: true }, kind: { type: "enum", label: "Kind", values: ["Laptop", "Printer", "Server"] } } },
      },
    }))
    expect(diff.items[0].differences.join()).toContain("[Laptop, Printer, Server]")
  })

  it("classifies id-keyed sections the same way", () => {
    const diff = diffConfig(current, proposal({
      kpis: [
        { id: "incidents_logged", label: "Incidents closed", source: "incidents", aggregation: "count", unit: "entries" },
        { id: "assets_broken", label: "Assets broken", source: "assets", aggregation: "count", unit: "items" },
      ],
    }))

    expect(diff.items.find((item) => item.section === "kpis" && item.key === "incidents_logged")?.status).toBe("conflict")
    expect(diff.items.find((item) => item.key === "assets_broken")?.status).toBe("new")
  })

  it("keeps refs unique when the same id appears in two sections", () => {
    const diff = diffConfig(current, proposal({
      kpis: [{ id: "monthly_review", label: "Reviews", source: "incidents", aggregation: "count", unit: "entries" }],
      playbookSeeds: [
        { id: "monthly_review", label: "Monthly review", frequency: "monthly", method: ["Plan"], phases: [{ name: "Plan", steps: ["Something else"] }] },
      ],
    }))

    expect(diff.items.map((item) => item.ref)).toEqual([refFor("kpis", "monthly_review"), refFor("playbookSeeds", "monthly_review")])
    expect(new Set(diff.items.map((item) => item.ref)).size).toBe(diff.items.length)
  })

  it("reports every status count so an approval screen can be honest about the mix", () => {
    const diff = diffConfig(current, proposal({
      logs: {
        assets: current.logs.assets,
        backups: { label: "Backups", fields: { date: { type: "date", label: "Date" } } },
      },
      recommendRules: [
        { id: "old_ticket", label: "Ageing ticket", entity: "incidents", condition: "older_than", params: { days: 7 }, priority: "High", observation: "A ticket has aged.", risk: "It stalls.", action: "Escalate it." },
      ],
    }))

    expect(diff.counts).toEqual({ new: 2, conflict: 0, duplicate: 1 })
  })

  it("truncates a huge field diff instead of dumping the whole entity", () => {
    const fields = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [`field_${index}`, { type: "string" as const, label: `Old ${index}` }]),
    )
    const rewritten = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [`field_${index}`, { type: "string" as const, label: `New ${index}` }]),
    )

    const diff = diffConfig(
      { ...current, logs: { ...current.logs, assets: { label: "Assets", fields } } },
      proposal({ logs: { assets: { label: "Assets", fields: rewritten } } }),
    )

    const item = diff.items.find((entry) => entry.key === "assets")!
    expect(item.differences.some((line) => line.startsWith("+12 more"))).toBe(true)
    expect(item.differences.length).toBe(9)
  })
})

describe("applySelection", () => {
  const newEntity = { label: "Backups", fields: { date: { type: "date" as const, label: "Date" } } }

  it("returns the current config untouched when nothing is selected", () => {
    const merged = applySelection(current, proposal({ logs: { backups: newEntity }, kpis: [{ id: "x", label: "X", source: "incidents", aggregation: "count", unit: "u" }] }), [])
    expect(merged).toEqual(current)
  })

  it("adds only the selected entity", () => {
    const merged = applySelection(
      current,
      proposal({ logs: { backups: newEntity, restores: { label: "Restores", fields: { date: { type: "date", label: "Date" } } } } }),
      [refFor("logs", "backups")],
    )

    expect(Object.keys(merged.logs)).toEqual(["incidents", "assets", "backups"])
    expect(merged.logs.backups).toEqual(newEntity)
  })

  it("replaces a conflicting definition in place, keeping its position", () => {
    const rewritten: OpsConfig["kpis"][number] = { id: "assets_open", label: "Assets awaiting repair", source: "assets", aggregation: "count", unit: "open" }
    const merged = applySelection(current, proposal({ kpis: [rewritten] }), [refFor("kpis", "assets_open")])

    expect(merged.kpis.map((kpi) => kpi.id)).toEqual(["incidents_logged", "assets_open"])
    expect(merged.kpis[1].label).toBe("Assets awaiting repair")
  })

  it("appends a new id-keyed item rather than replacing the array", () => {
    const merged = applySelection(current, proposal({ kpis: [{ id: "assets_broken", label: "Broken", source: "assets", aggregation: "count", unit: "items" }] }), [refFor("kpis", "assets_broken")])
    expect(merged.kpis).toHaveLength(3)
  })

  it("cannot delete: entities the proposal never mentions survive", () => {
    const merged = applySelection(current, proposal({ logs: { backups: newEntity } }), [refFor("logs", "backups")])
    expect(merged.logs.incidents).toBeDefined()
    expect(merged.logs.assets).toBeDefined()
    expect(merged.kpis).toHaveLength(current.kpis.length)
  })

  it("fills in optional sections the pack does not have yet", () => {
    const merged = applySelection(current, proposal({ recommendRules: [{ id: "r", label: "Rule", entity: "incidents", condition: "older_than", params: { days: 7 }, priority: "High", observation: "o", risk: "r", action: "a" }] }), [refFor("recommendRules", "r")])

    expect(merged.recommendRules).toHaveLength(1)
    expect(merged.aiPolicy).toEqual(current.aiPolicy)
  })

  it("leaves an absent optional section absent", () => {
    const merged = applySelection(current, proposal({ logs: { backups: newEntity } }), [refFor("logs", "backups")])
    expect("reportTemplates" in merged).toBe(false)
  })
})

describe("mergeAndValidate", () => {
  it("runs the merged config through the seed script's own schema", () => {
    const merged = proposal({
      logs: { backups: { label: "Backups", fields: { date: { type: "date", label: "Date", required: true } } } },
      kpis: [{ id: "backups_logged", label: "Backups logged", source: "backups", aggregation: "count", unit: "entries" }],
    })
    const diff = diffConfig(current, merged)
    const result = mergeAndValidate(current, diff, merged, diff.items.map((item) => item.ref))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.logs.backups).toBeDefined()
      expect(result.applied.map((item) => item.ref)).toEqual(diff.items.map((item) => item.ref))
    }
  })

  it("refuses a merge that would violate the schema and names the path", () => {
    const merged = proposal({
      kpis: [{ id: "avg_time", label: "Average time", source: "incidents", aggregation: "average", unit: "days" }],
    })
    const diff = diffConfig(current, merged)
    const result = mergeAndValidate(current, diff, merged, [refFor("kpis", "avg_time")])

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join()).toContain("Average/sum KPIs must specify a field")
  })

  it("applies nothing when the reviewer selects nothing, and still validates", () => {
    const merged = proposal({ logs: { backups: { label: "Backups", fields: { note: { type: "text", label: "Note" } } } } })
    const diff = diffConfig(current, merged)
    const result = mergeAndValidate(current, diff, merged, [])

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.applied).toEqual([])
      expect(result.config.logs.backups).toBeUndefined()
    }
  })
})

describe("proposal helpers", () => {
  it("reports emptiness across all six sections", () => {
    expect(proposalIsEmpty(emptyProposal())).toBe(true)
    expect(proposalIsEmpty(proposal({ automationTemplates: [{ id: "a", label: "A", trigger: { entity: "e", condition: "c", params: {} }, action: { type: "create_task", params: {} } }] }))).toBe(false)
    expect(proposalCount(proposal({ kpis: [{ id: "k", label: "K", source: "incidents", aggregation: "count", unit: "" }], reportTemplates: [] }))).toBe(1)
  })

  it("builds refs that carry the section", () => {
    expect(refFor("kpis", "a")).toBe("kpis:a")
  })
})
