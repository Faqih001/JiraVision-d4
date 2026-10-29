import { describe, expect, it } from "vitest"
import { computeKpis, computeMonthlyKpis, type OpsEntry, type RegisterItemRow } from "@/lib/ops/kpis"
import { IT_TECHNICIAN_OPS_CONFIG } from "@/lib/packs/ops/it-technician"

function makeEntry(overrides: Partial<OpsEntry> & { entityKey: string; fields: Record<string, unknown> }): OpsEntry {
  return {
    id: 0,
    packKey: "it-technician",
    ownerId: 1,
    occurredAt: "2026-10-29T10:00:00.000Z",
    status: null,
    source: "manual",
    createdAt: "2026-10-29T10:00:00.000Z",
    ...overrides,
  }
}

describe("KPI computation", () => {
  it("counts tickets logged in the month", () => {
    const entries: OpsEntry[] = [
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-01", status: "Open" } }),
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-15", status: "Open" } }),
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-09-20", status: "Open" } }),
    ]

    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, { today: "2026-10-29", entries })
    const logged = result.find((k) => k.id === "tickets_logged")
    expect(logged?.value).toBe(2)
  })

  it("counts tickets resolved within target as a ratio", () => {
    const entries: OpsEntry[] = [
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-01", status: "Resolved", date_resolved: "2026-10-02", within_target: "Yes" } }),
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-05", status: "Resolved", date_resolved: "2026-10-10", within_target: "No" } }),
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-10", status: "Closed", date_resolved: "2026-10-11", within_target: "Yes" } }),
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-15", status: "Open" } }),
    ]

    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, { today: "2026-10-29", entries })

    const resolved = result.find((k) => k.id === "tickets_resolved")
    expect(resolved?.value).toBe(3)

    const ratio = result.find((k) => k.id === "resolved_within_target")
    expect(ratio?.value).toBeCloseTo(2 / 3, 2)
    expect(ratio?.target).toBe(0.85)
    expect(ratio?.met).toBe(false)
  })

  it("counts open tickets regardless of month", () => {
    const entries: OpsEntry[] = [
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-09-01", status: "Open" } }),
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-01", status: "In Progress" } }),
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-05", status: "Resolved" } }),
    ]

    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, { today: "2026-10-29", entries })
    const open = result.find((k) => k.id === "tickets_open")
    expect(open?.value).toBe(2)
  })

  it("computes backup success rate", () => {
    const entries: OpsEntry[] = [
      makeEntry({ entityKey: "backups", fields: { date: "2026-10-01", result: "Success" } }),
      makeEntry({ entityKey: "backups", fields: { date: "2026-10-02", result: "Success" } }),
      makeEntry({ entityKey: "backups", fields: { date: "2026-10-03", result: "Failed" } }),
      makeEntry({ entityKey: "backups", fields: { date: "2026-10-04", result: "Warning" } }),
    ]

    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, { today: "2026-10-29", entries })

    const jobs = result.find((k) => k.id === "backup_jobs")
    expect(jobs?.value).toBe(4)

    const rate = result.find((k) => k.id === "backup_success_rate")
    expect(rate?.value).toBeCloseTo(0.5, 2)
    expect(rate?.target).toBe(0.98)
    expect(rate?.met).toBe(false)
  })

  it("computes average days to resolve", () => {
    const entries: OpsEntry[] = [
      makeEntry({ entityKey: "tickets", fields: { status: "Resolved", days_to_resolve: 2 } }),
      makeEntry({ entityKey: "tickets", fields: { status: "Resolved", days_to_resolve: 4 } }),
      makeEntry({ entityKey: "tickets", fields: { status: "Open" } }),
    ]

    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, { today: "2026-10-29", entries })
    const avg = result.find((k) => k.id === "avg_days_to_resolve")
    expect(avg?.value).toBe(3)
  })

  it("counts restore tests performed", () => {
    const entries: OpsEntry[] = [
      makeEntry({ entityKey: "restore_tests", fields: { test_date: "2026-10-05", result: "Pass" } }),
      makeEntry({ entityKey: "restore_tests", fields: { test_date: "2026-10-15", result: "Pass" } }),
      makeEntry({ entityKey: "restore_tests", fields: { test_date: "2026-10-25", result: "Fail" } }),
    ]

    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, { today: "2026-10-29", entries })

    const performed = result.find((k) => k.id === "restore_tests_performed")
    expect(performed?.value).toBe(3)
    expect(performed?.target).toBe(3)
    expect(performed?.met).toBe(true)

    const passed = result.find((k) => k.id === "restore_tests_passed")
    expect(passed?.value).toBeCloseTo(2 / 3, 2)
  })

  it("counts register items and verified ratio", () => {
    const registerItems: RegisterItemRow[] = [
      { id: 1, kind: "equipment", fields: {}, lastVerifiedAt: "2026-10-01" },
      { id: 2, kind: "equipment", fields: {}, lastVerifiedAt: null },
      { id: 3, kind: "software", fields: {}, lastVerifiedAt: "2026-10-15" },
    ]

    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, {
      today: "2026-10-29",
      entries: [],
      registerItems,
    })

    const assets = result.find((k) => k.id === "assets_in_register")
    expect(assets?.value).toBe(2) // only equipment kind

    const verified = result.find((k) => k.id === "assets_verified")
    expect(verified?.value).toBe(0.5) // 1 of 2 equipment verified
  })

  it("returns 0 for KPIs with no matching entries", () => {
    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, { today: "2026-10-29", entries: [] })
    for (const kpi of result) {
      expect(kpi.value).toBe(0)
    }
  })

  it("computeMonthlyKpis defaults to the 28th as today", () => {
    const entries: OpsEntry[] = [
      makeEntry({ entityKey: "tickets", fields: { date_logged: "2026-10-15", status: "Open" } }),
    ]

    const result = computeMonthlyKpis(IT_TECHNICIAN_OPS_CONFIG, entries, "2026-10")
    const logged = result.find((k) => k.id === "tickets_logged")
    expect(logged?.value).toBe(1)
  })

  it("every KPI has a non-null met field only when target is set", () => {
    const result = computeKpis(IT_TECHNICIAN_OPS_CONFIG, {
      today: "2026-10-29",
      entries: [],
    })
    for (const kpi of result) {
      if (kpi.target !== null) {
        expect(kpi.met).toBeTypeOf("boolean")
      } else {
        expect(kpi.met).toBeNull()
      }
    }
  })
})
