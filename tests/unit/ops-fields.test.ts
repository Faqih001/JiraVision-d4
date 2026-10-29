import { describe, expect, it } from "vitest"
import { validateFields, entityKeys } from "@/lib/ops/fields"
import { IT_TECHNICIAN_OPS_CONFIG } from "@/lib/packs/ops/it-technician"

describe("ops field validation", () => {
  it("accepts a valid ticket entry", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "tickets", {
      ticket_id: "TK-001",
      date_logged: "2026-10-29",
      requested_by: "John Doe",
      site: "Main Office",
      category: "Printer",
      description: "Printer not working",
      priority: "Medium",
      support_type: "In-person",
      status: "Open",
      escalated: "No",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields.ticket_id).toBe("TK-001")
      expect(result.fields.category).toBe("Printer")
    }
  })

  it("rejects a missing required field", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "tickets", {
      ticket_id: "TK-001",
      // date_logged is required but missing
      requested_by: "John",
      site: "Office",
      category: "Printer",
      description: "Broken",
      priority: "Low",
      support_type: "Remote",
      status: "Open",
      escalated: "No",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("date_logged")
    }
  })

  it("rejects an invalid enum value", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "tickets", {
      ticket_id: "TK-001",
      date_logged: "2026-10-29",
      requested_by: "John",
      site: "Office",
      category: "InvalidCategory",
      description: "Broken",
      priority: "Low",
      support_type: "Remote",
      status: "Open",
      escalated: "No",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("category")
    }
  })

  it("rejects an invalid date format", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "tickets", {
      ticket_id: "TK-001",
      date_logged: "29/10/2026",
      requested_by: "John",
      site: "Office",
      category: "Printer",
      description: "Broken",
      priority: "Low",
      support_type: "Remote",
      status: "Open",
      escalated: "No",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("date_logged")
    }
  })

  it("rejects an unknown entity key", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "nonexistent", {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("Unknown entity")
    }
  })

  it("accepts a valid backup entry", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "backups", {
      date: "2026-10-29",
      system: "File Server",
      backup_type: "Cloud full",
      result: "Success",
      size_gb: 42.5,
    })
    expect(result.ok).toBe(true)
  })

  it("applies default values for optional fields", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "tickets", {
      ticket_id: "TK-002",
      date_logged: "2026-10-29",
      requested_by: "Jane",
      site: "Branch",
      category: "Network",
      description: "Slow internet",
      priority: "Low",
      support_type: "Email",
      // status and escalated have defaults
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields.status).toBe("Open")
      expect(result.fields.escalated).toBe("No")
    }
  })

  it("lists entity keys from the config", () => {
    const keys = entityKeys(IT_TECHNICIAN_OPS_CONFIG)
    expect(keys).toContain("tickets")
    expect(keys).toContain("backups")
    expect(keys).toContain("restore_tests")
    expect(keys).toContain("maintenance")
    expect(keys).toContain("incidents")
    expect(keys).toContain("daily_checklist")
    expect(keys).toContain("weekly_checklist")
    expect(keys).toHaveLength(7)
  })

  it("rejects non-object fields", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "tickets", "not an object")
    expect(result.ok).toBe(false)
  })

  it("rejects array fields", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "tickets", [1, 2, 3])
    expect(result.ok).toBe(false)
  })

  it("truncates long string fields", () => {
    const longString = "x".repeat(500)
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "tickets", {
      ticket_id: longString,
      date_logged: "2026-10-29",
      requested_by: "John",
      site: "Office",
      category: "Printer",
      description: "Issue",
      priority: "Low",
      support_type: "Remote",
      status: "Open",
      escalated: "No",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.fields.ticket_id as string).length).toBeLessThanOrEqual(200)
    }
  })

  it("accepts a valid daily checklist entry", () => {
    const result = validateFields(IT_TECHNICIAN_OPS_CONFIG, "daily_checklist", {
      date: "2026-10-29",
      technician: "Alice",
      servers_operational: "Yes",
      network_operational: "Yes",
      internet_operational: "Yes",
      critical_apps_operational: "Yes",
      security_ok: "Yes",
      backup_status_checked: "Yes",
      storage_capacity_checked: "Yes",
      new_requests_reviewed: "Yes",
      critical_tickets_addressed: "Yes",
      outstanding_tickets_followed_up: "Yes",
      tickets_updated: "Yes",
      maintenance_recorded: "No",
      hardware_changes_recorded: "No",
      backup_results_recorded: "Yes",
      escalations_documented: "No",
      daily_report_sent: "Yes",
    })
    expect(result.ok).toBe(true)
  })
})
