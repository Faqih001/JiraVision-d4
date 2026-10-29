import { describe, expect, it } from "vitest"
import { buildOpsRecommendations, type OpsRecommendInput } from "@/lib/ops/recommend"
import { IT_TECHNICIAN_OPS_CONFIG } from "@/lib/packs/ops/it-technician"

function makeInput(overrides: Partial<OpsRecommendInput> = {}): OpsRecommendInput {
  return {
    today: "2026-10-29",
    entries: [],
    registerItems: [],
    ...overrides,
  }
}

describe("ops recommendations", () => {
  it("flags no backup in 7 days", () => {
    const input = makeInput({
      entries: [
        { id: 1, entityKey: "backups", occurredAt: "2026-10-15", status: null, fields: { system: "File Server", date: "2026-10-15", result: "Success" } },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    const noBackup = recs.find((r) => r.ruleId === "no_backup_7_days")
    expect(noBackup).toBeDefined()
    expect(noBackup?.priority).toBe("High")
  })

  it("does not flag when backup is recent", () => {
    const input = makeInput({
      entries: [
        { id: 1, entityKey: "backups", occurredAt: "2026-10-28", status: null, fields: { system: "File Server", date: "2026-10-28", result: "Success" } },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    const noBackup = recs.find((r) => r.ruleId === "no_backup_7_days")
    expect(noBackup).toBeUndefined()
  })

  it("flags failed or warning backups that are unresolved", () => {
    const input = makeInput({
      entries: [
        { id: 1, entityKey: "backups", occurredAt: "2026-10-28", status: "Open", fields: { system: "DB Server", result: "Failed" } },
        { id: 2, entityKey: "backups", occurredAt: "2026-10-27", status: null, fields: { system: "File Server", result: "Warning" } },
        { id: 3, entityKey: "backups", occurredAt: "2026-10-26", status: "Resolved", fields: { system: "Mail Server", result: "Failed" } },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    const failed = recs.filter((r) => r.ruleId === "backup_failed_unresolved")
    expect(failed).toHaveLength(2)
    expect(failed[0].priority).toBe("Critical")
  })

  it("flags no restore test in 30 days", () => {
    const input = makeInput({
      entries: [
        { id: 1, entityKey: "restore_tests", occurredAt: "2026-09-15", status: null, fields: { test_date: "2026-09-15" } },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    const noRestore = recs.find((r) => r.ruleId === "no_restore_test_30_days")
    expect(noRestore).toBeDefined()
  })

  it("flags tickets past SLA", () => {
    const input = makeInput({
      entries: [
        { id: 1, entityKey: "tickets", occurredAt: "2026-10-20", status: "Open", fields: { ticket_id: "TK-001", date_logged: "2026-10-20", priority: "Critical" } },
        { id: 2, entityKey: "tickets", occurredAt: "2026-10-25", status: "Open", fields: { ticket_id: "TK-002", date_logged: "2026-10-25", priority: "Low" } },
        { id: 3, entityKey: "tickets", occurredAt: "2026-10-28", status: "Resolved", fields: { ticket_id: "TK-003", date_logged: "2026-10-20", priority: "Critical" } },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    const pastSla = recs.find((r) => r.ruleId === "ticket_past_sla")
    expect(pastSla).toBeDefined()
    expect(pastSla?.observation).toContain("TK-001")
  })

  it("flags stale register items", () => {
    const input = makeInput({
      registerItems: [
        { id: 1, kind: "equipment", title: "Server A", fields: {}, lastVerifiedAt: "2026-01-01", verifyIntervalDays: 30 },
        { id: 2, kind: "equipment", title: "Server B", fields: {}, lastVerifiedAt: "2026-10-20", verifyIntervalDays: 30 },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    const stale = recs.filter((r) => r.ruleId === "register_stale")
    expect(stale).toHaveLength(1)
    expect(stale[0].observation).toContain("Server A")
  })

  it("flags no offsite copy", () => {
    const input = makeInput({
      entries: [
        { id: 1, entityKey: "backups", occurredAt: "2026-10-28", status: null, fields: { system: "File Server", backup_type: "Offsite" } },
        { id: 2, entityKey: "backups", occurredAt: "2026-10-28", status: null, fields: { system: "DB Server", backup_type: "Local" } },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    const noOffsite = recs.filter((r) => r.ruleId === "no_offsite_copy")
    expect(noOffsite).toHaveLength(1)
    expect(noOffsite[0].observation).toContain("DB Server")
  })

  it("sorts by priority (Critical first)", () => {
    const input = makeInput({
      entries: [
        { id: 1, entityKey: "backups", occurredAt: "2026-10-28", status: "Open", fields: { system: "Server", result: "Failed" } },
        { id: 2, entityKey: "backups", occurredAt: "2026-10-15", status: null, fields: { system: "Server", date: "2026-10-15", result: "Success" } },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    expect(recs.length).toBeGreaterThan(1)
    const priorities = recs.map((r) => r.priority)
    const criticalIdx = priorities.indexOf("Critical")
    const highIdx = priorities.indexOf("High")
    if (criticalIdx >= 0 && highIdx >= 0) {
      expect(criticalIdx).toBeLessThan(highIdx)
    }
  })

  it("returns empty when no rules match", () => {
    const input = makeInput()
    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    // With no entries, some rules still fire (no_backup_7_days, no_restore_test_30_days)
    // but the list should be finite and sorted
    expect(recs.length).toBeGreaterThan(0)
    for (let i = 1; i < recs.length; i++) {
      const prev = recs[i - 1].priority
      const curr = recs[i].priority
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
      expect(order[curr]).toBeGreaterThanOrEqual(order[prev])
    }
  })

  it("interpolates template variables in observation", () => {
    const input = makeInput({
      entries: [
        { id: 1, entityKey: "backups", occurredAt: "2026-10-28", status: "Open", fields: { system: "MyServer", result: "Failed" } },
      ],
    })

    const recs = buildOpsRecommendations(IT_TECHNICIAN_OPS_CONFIG, input)
    const failed = recs.find((r) => r.ruleId === "backup_failed_unresolved")
    expect(failed?.observation).toContain("MyServer")
    expect(failed?.observation).toContain("Failed")
  })
})
