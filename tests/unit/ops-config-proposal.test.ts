import { describe, expect, it } from "vitest"
import { diffConfig, mergeAndValidate, refFor } from "@/lib/ops/config/diff"
import { normaliseProposal } from "@/lib/ops/config/proposal"
import { IT_TECHNICIAN_OPS_CONFIG } from "@/lib/packs/ops/it-technician"
import { safeValidateOpsConfig } from "@/lib/packs/ops/validator"
import type { OpsConfigValidated } from "@/lib/packs/ops/validator"

const derived = safeValidateOpsConfig({
  logs: {
    incidents: {
      label: "Incidents",
      fields: {
        date: { type: "date", required: true, label: "Date" },
        note: { type: "text", label: "Note" },
      },
    },
  },
  kpis: [{ id: "incidents_logged", label: "Incidents logged", source: "incidents", filter: { date: "in_month" }, aggregation: "count", unit: "entries" }],
})
if (!derived.success) throw new Error("fixture must validate")
const current = derived.data as OpsConfigValidated

function reasons(rejected: { reason: string; key: string }[]): string {
  return rejected.map((entry) => `${entry.key}: ${entry.reason}`).join("\n")
}

describe("normaliseProposal", () => {
  it("accepts a well-formed document definition", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      logs: {
        backups: {
          label: "Backups",
          fields: {
            date: { type: "date", label: "Date", required: true },
            server: { type: "enum", label: "Server", values: ["AAC Kenya", "MCS", "Advocates-Insurance"] },
            kind: { type: "enum", label: "Kind", values: ["Incremental", "Full"] },
          },
        },
      },
      kpis: [
        { id: "backups_logged", label: "Backups logged", source: "backups", aggregation: "count", unit: "entries" },
        { id: "restore_rate", label: "Restores tested", source: "backups", aggregation: "ratio", numerator: { tested: "Yes" }, denominator: "count", unit: "%", target: 0.9 },
      ],
    })

    expect(rejected).toEqual([])
    expect(Object.keys(proposal.logs)).toEqual(["backups"])
    expect(proposal.logs.backups.fields.server.values).toHaveLength(3)
    expect(proposal.kpis[1]).toMatchObject({ aggregation: "ratio", target: 0.9 })
  })

  it("refuses a field whose name is a credential", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      logs: {
        network: {
          label: "Network",
          fields: {
            ssid: { type: "string", label: "SSID" },
            wifi_password: { type: "string", label: "Wi-Fi password" },
          },
        },
      },
    })

    expect(proposal.logs.network.fields.wifi_password).toBeUndefined()
    expect(proposal.logs.network.fields.ssid).toBeDefined()
    expect(reasons(rejected)).toContain("looks like a credential")
  })

  it("refuses an enum with no closed list, which would reject every write", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      logs: { backups: { label: "Backups", fields: { status: { type: "enum", label: "Status" } } } },
    })

    expect(Object.keys(proposal.logs)).toEqual([])
    expect(reasons(rejected)).toContain("would refuse every entry")
  })

  it("refuses an unknown field type but keeps its siblings", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      logs: {
        backups: {
          label: "Backups",
          fields: { note: { type: "text", label: "Note" }, colour: { type: "dropdown", label: "Colour" } },
        },
      },
    })

    expect(Object.keys(proposal.logs.backups.fields)).toEqual(["note"])
    expect(reasons(rejected)).toContain("colour")
  })

  it("drops a default that is not one of the enum's values", () => {
    const { proposal } = normaliseProposal(current, {
      logs: { backups: { label: "Backups", fields: { status: { type: "enum", label: "Status", values: ["Pass", "Fail"], default: "Unknown" } } } },
    })
    expect(proposal.logs.backups.fields.status.default).toBeUndefined()
  })

  it("keeps a default that is one of the enum's values", () => {
    const { proposal } = normaliseProposal(current, {
      logs: { backups: { label: "Backups", fields: { status: { type: "enum", label: "Status", values: ["Pass", "Fail"], default: "Pass" } } } },
    })
    expect(proposal.logs.backups.fields.status.default).toBe("Pass")
  })

  it("snake_cases keys the model wrote in prose", () => {
    const { proposal } = normaliseProposal(current, {
      logs: { "Server Backup Log": { label: "Backups", fields: { "Date Taken": { type: "date", label: "Date taken" } } } },
    })
    expect(Object.keys(proposal.logs)).toEqual(["server_backup_log"])
    expect(Object.keys(proposal.logs.server_backup_log.fields)).toEqual(["date_taken"])
  })

  it("refuses an entity key that cannot be a slug", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      logs: { "2024": { label: "Year", fields: { note: { type: "text", label: "Note" } } }, "!!": { label: "Noise", fields: { note: { type: "text", label: "Note" } } } },
    })
    expect(Object.keys(proposal.logs)).toEqual([])
    expect(rejected).toHaveLength(2)
  })

  it("refuses an entity that ends up with no usable fields", () => {
    const { rejected } = normaliseProposal(current, { logs: { backups: { label: "Backups", fields: {} } } })
    expect(reasons(rejected)).toContain("defined no usable fields")
  })

  it("refuses a KPI that counts an entity nobody logs", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      kpis: [
        { id: "orphan", label: "Orphan", source: "ghosts", aggregation: "count", unit: "x" },
        { id: "incidents_note_avg", label: "Note length", source: "incidents", field: "note", aggregation: "average", unit: "chars" },
      ],
    })

    expect(proposal.kpis.map((kpi) => kpi.id)).toEqual(["incidents_note_avg"])
    expect(reasons(rejected)).toContain('"ghosts" is not an entity this pack logs')
  })

  it("lets a KPI count an entity the same proposal introduces", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      logs: { restores: { label: "Restores", fields: { date: { type: "date", label: "Date" } } } },
      kpis: [{ id: "restores_logged", label: "Restores logged", source: "restores", aggregation: "count", unit: "entries" }],
    })
    expect(rejected).toEqual([])
    expect(proposal.kpis[0].source).toBe("restores")
  })

  it("refuses an average with no field and a ratio with no numerator", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      kpis: [
        { id: "no_field", label: "No field", source: "incidents", aggregation: "average", unit: "d" },
        { id: "no_num", label: "No numerator", source: "incidents", aggregation: "ratio", unit: "%" },
      ],
    })
    expect(proposal.kpis).toEqual([])
    expect(reasons(rejected)).toContain("needs a field to add up")
    expect(reasons(rejected)).toContain("numerator and denominator")
  })

  it("keeps a target only when it is a real number", () => {
    const { proposal } = normaliseProposal(current, {
      kpis: [
        { id: "a", label: "A", source: "incidents", aggregation: "count", unit: "e", target: 3 },
        { id: "b", label: "B", source: "incidents", aggregation: "count", unit: "e", target: "as soon as possible" },
        { id: "c", label: "C", source: "incidents", aggregation: "count", unit: "e" },
      ],
    })
    expect(proposal.kpis.map((kpi) => kpi.target)).toEqual([3, undefined, undefined])
  })

  it("refuses a seed whose frequency the document did not commit to", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      playbookSeeds: [
        { id: "weekly", label: "Weekly sweep", frequency: "fortnightly", method: ["Plan"], phases: [{ name: "Plan", steps: ["Sweep"] }] },
        { id: "no_phases", label: "Vague", frequency: "weekly", method: ["Plan"], phases: [] },
      ],
    })
    expect(proposal.playbookSeeds).toEqual([])
    expect(reasons(rejected)).toContain("the document has to state how often")
    expect(reasons(rejected)).toContain("at least one phase with steps")
  })

  it("refuses a report section that points at an undefined KPI, and the template if none survive", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      reportTemplates: [
        { id: "monthly", label: "Monthly report", period: "monthly", sections: [{ kpiId: "incidents_logged", label: "Logged" }, { kpiId: "invented_kpi", label: "Ghost" }] },
        { id: "empty", label: "Nothing valid", period: "monthly", sections: [{ kpiId: "invented_kpi", label: "Ghost" }] },
      ],
    })

    expect(proposal.reportTemplates[0].sections).toHaveLength(1)
    expect(proposal.reportTemplates).toHaveLength(1)
    expect(reasons(rejected)).toContain("neither the pack nor the document defines")
  })

  it("accepts a report section pointing at a KPI the same proposal adds", () => {
    const { proposal } = normaliseProposal(current, {
      kpis: [{ id: "backups_logged", label: "Backups logged", source: "incidents", aggregation: "count", unit: "entries" }],
      reportTemplates: [{ id: "monthly", label: "Monthly report", period: "monthly", sections: [{ kpiId: "backups_logged", label: "Backups" }] }],
    })
    expect(proposal.reportTemplates[0].sections[0].kpiId).toBe("backups_logged")
  })

  it("refuses an automation whose action the engine cannot perform", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      automationTemplates: [
        { id: "a", label: "Page the on-call", trigger: { entity: "incidents", condition: "unassigned_over", params: { hours: 4 } }, action: { type: "page_pager", params: {} } },
        { id: "b", label: "Raise a task", trigger: { entity: "ghosts", condition: "missing", params: {} }, action: { type: "create_task", params: { title: "Check" } } },
      ],
    })
    expect(proposal.automationTemplates).toEqual([])
    expect(reasons(rejected)).toContain("action type must be one of")
    expect(reasons(rejected)).toContain('trigger names "ghosts"')
  })

  it("refuses a rule missing any half of observation, risk or action", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      recommendRules: [
        { id: "r", label: "Ageing incident", entity: "incidents", condition: "older_than", params: { days: 7 }, priority: "High", observation: "Open for a week." },
      ],
    })
    expect(proposal.recommendRules).toEqual([])
    expect(reasons(rejected)).toContain("in the document")
  })

  it("refuses a rule priority the vocabulary does not have", () => {
    const { rejected } = normaliseProposal(current, {
      recommendRules: [
        { id: "r", label: "R", entity: "incidents", condition: "older_than", params: {}, priority: "Blocker", observation: "o", risk: "r", action: "a" },
      ],
    })
    expect(reasons(rejected)).toContain("priority must be one of")
  })

  it("keeps a well-formed rule with its params", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      recommendRules: [
        { id: "sla", label: "SLA breach", entity: "incidents", condition: "older_than", params: { days: 7, note: "per contract" }, priority: "Critical", observation: "Seven days open.", risk: "Client escalation.", action: "Escalate to the account owner." },
      ],
    })
    expect(rejected).toEqual([])
    expect(proposal.recommendRules[0].params).toEqual({ days: 7, note: "per contract" })
  })

  it("never accepts an AI policy from a document", () => {
    const { rejected } = normaliseProposal(current, {
      aiPolicy: { level: "advanced", excludedEntities: [], adminReadAccess: true, managerReadAccess: true },
    })
    expect(reasons(rejected)).toContain("privacy stance")
  })

  it("caps a runaway proposal and says so", () => {
    const logs = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => [`entity_${index}`, { label: `Entity ${index}`, fields: { note: { type: "text", label: "Note" } } }]),
    )
    const { proposal, rejected } = normaliseProposal(current, { logs })

    expect(Object.keys(proposal.logs)).toHaveLength(10)
    expect(reasons(rejected)).toContain("capped at 10 entities")
  })

  it("keeps the first of a duplicated id and reports the collision", () => {
    const { proposal, rejected } = normaliseProposal(current, {
      logs: {
        backups: { label: "Backups first", fields: { note: { type: "text", label: "Note" } } },
        "Backups": { label: "Backups second", fields: { note: { type: "text", label: "Note" } } },
      },
    })
    expect(proposal.logs.backups.label).toBe("Backups first")
    expect(reasons(rejected)).toContain("proposed this entity twice")
  })

  it("survives nonsense without throwing", () => {
    for (const junk of [null, undefined, "text", 42, [], [{ logs: "no" }]]) {
      const { proposal, rejected } = normaliseProposal(current, junk)
      expect(Object.keys(proposal.logs)).toHaveLength(0)
      expect(proposal.kpis).toEqual([])
      expect(Array.isArray(rejected)).toBe(true)
    }
  })

  it("produces a proposal that merges into a config the seed validator accepts", () => {
    const { proposal } = normaliseProposal(IT_TECHNICIAN_OPS_CONFIG, {
      logs: {
        restore_tests: {
          label: "Restore tests",
          fields: {
            date: { type: "date", label: "Date", required: true },
            server: { type: "string", label: "Server", required: true },
            result: { type: "enum", label: "Result", values: ["Pass", "Fail"], required: true },
          },
        },
      },
      kpis: [{ id: "restore_tests_logged", label: "Restore tests logged", source: "restore_tests", aggregation: "count", unit: "tests" }],
    })

    const merged = {
      ...IT_TECHNICIAN_OPS_CONFIG,
      logs: { ...IT_TECHNICIAN_OPS_CONFIG.logs, ...proposal.logs },
      kpis: [...IT_TECHNICIAN_OPS_CONFIG.kpis, ...proposal.kpis],
    }
    expect(safeValidateOpsConfig(merged).success).toBe(true)
  })
})

describe("the apply pipeline", () => {
  const base = IT_TECHNICIAN_OPS_CONFIG

  /** Exactly what /api/ops/config/apply does with whatever the browser sends it. */
  function applyLike(payload: unknown) {
    const outcome = normaliseProposal(base, payload)
    const diff = diffConfig(base, outcome.proposal)
    const result = mergeAndValidate(base, { ...diff, rejected: outcome.rejected }, outcome.proposal, diff.items.map((item) => item.ref))
    return { outcome, diff, result }
  }

  it("re-gates a payload the browser edited, so AI policy stays the owner's", () => {
    const { outcome, result } = applyLike({
      aiPolicy: { level: "off", excludedEntities: ["incidents"], adminReadAccess: true, managerReadAccess: true },
      logs: {
        credentials: {
          label: "Credential vault",
          fields: {
            date: { type: "date", label: "Date", required: true },
            password: { type: "string", label: "Password" },
          },
        },
      },
    })

    expect(reasons(outcome.rejected)).toContain("AI policy is a privacy stance")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.aiPolicy).toEqual(base.aiPolicy)
      const entity = result.config.logs.credentials
      expect(entity ? Object.keys(entity.fields) : []).not.toContain("password")
    }
  })

  it("writes the items that survive the gate and leaves every other entity byte-identical", () => {
    const { result } = applyLike({
      logs: {
        asset_audits: {
          label: "Asset audits",
          fields: {
            date: { type: "date", label: "Date", required: true },
            result: { type: "enum", label: "Result", values: ["Pass", "Fail"], required: true },
          },
        },
      },
      kpis: [{ id: "asset_audits_logged", label: "Asset audits logged", source: "asset_audits", aggregation: "count", unit: "audits" }],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.config.logs).sort()).toEqual([...Object.keys(base.logs), "asset_audits"].sort())
      for (const key of Object.keys(base.logs)) expect(result.config.logs[key]).toEqual(base.logs[key])
      expect(result.config.kpis.map((kpi) => kpi.id).slice(0, base.kpis.length)).toEqual(base.kpis.map((kpi) => kpi.id))
      expect(result.applied.map((item) => item.ref)).toContain(refFor("logs", "asset_audits"))
    }
  })

  it("names a thin rewrite of an existing entity a conflict and shows the fields it drops", () => {
    const { diff, result } = applyLike({
      logs: {
        restore_tests: {
          label: "Restore tests",
          fields: {
            date: { type: "date", label: "Date", required: true },
            server: { type: "string", label: "Server", required: true },
          },
        },
      },
    })

    const item = diff.items.find((entry) => entry.ref === refFor("logs", "restore_tests"))
    expect(item?.status).toBe("conflict")
    expect(item?.differences.join()).toContain("fields.readable")
    expect(result.ok).toBe(true)
    if (result.ok) expect(Object.keys(result.config.logs.restore_tests.fields)).toEqual(["date", "server"])
  })
})
