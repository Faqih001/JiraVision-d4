import { describe, expect, it } from "vitest"
import { summariseExtraction, type ExtractionResult } from "@/lib/ops/import/extract"

function makeExtraction(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    logEntries: [],
    registerItems: [],
    playbooks: [],
    tasks: [],
    ...overrides,
  }
}

describe("summariseExtraction", () => {
  it("returns zero counts for an empty extraction", () => {
    const summary = summariseExtraction(makeExtraction())
    expect(summary.total).toBe(0)
    expect(summary.logEntries).toEqual({})
    expect(summary.registerItems).toBe(0)
    expect(summary.playbooks).toBe(0)
    expect(summary.tasks).toBe(0)
  })

  it("counts log entries by entity key", () => {
    const summary = summariseExtraction(
      makeExtraction({
        logEntries: [
          { entityKey: "backups", occurredAt: "2026-10-29", status: null, fields: {} },
          { entityKey: "backups", occurredAt: "2026-10-28", status: null, fields: {} },
          { entityKey: "incidents", occurredAt: null, status: "open", fields: {} },
        ],
      }),
    )
    expect(summary.logEntries).toEqual({ backups: 2, incidents: 1 })
    expect(summary.total).toBe(3)
  })

  it("counts all categories", () => {
    const summary = summariseExtraction(
      makeExtraction({
        logEntries: [{ entityKey: "backups", occurredAt: null, status: null, fields: {} }],
        registerItems: [
          { kind: "server", title: "SRV-01", fields: {} },
          { kind: "printer", title: "PRN-01", fields: {} },
        ],
        playbooks: [{ title: "Restore", summary: "", steps: ["Step 1"] }],
        tasks: [
          { title: "Check backups", description: "", status: "todo", priority: "medium" },
          { title: "Update firmware", description: "", status: "todo", priority: "high" },
        ],
      }),
    )
    expect(summary.logEntries).toEqual({ backups: 1 })
    expect(summary.registerItems).toBe(2)
    expect(summary.playbooks).toBe(1)
    expect(summary.tasks).toBe(2)
    expect(summary.total).toBe(6)
  })
})

describe("isGeminiQuotaError / isGeminiAuthError", () => {
  it("are importable without errors", async () => {
    const mod = await import("@/lib/ops/import/extract")
    expect(typeof mod.isGeminiQuotaError).toBe("function")
    expect(typeof mod.isGeminiAuthError).toBe("function")
    expect(mod.isGeminiQuotaError(new Error("nope"))).toBe(false)
    expect(mod.isGeminiAuthError(null)).toBe(false)
  })
})
