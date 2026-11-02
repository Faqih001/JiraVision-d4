import { describe, expect, it } from "vitest"
import { buildReportSections } from "@/lib/reports/task-report-generator"

describe("buildReportSections", () => {
  it("returns empty sections when no template sections provided", () => {
    const result = buildReportSections([], [], [])
    expect(result).toEqual([])
  })

  it("populates task_instances data source", () => {
    const sections = [
      {
        id: "completed-tasks",
        title: "Completed Tasks",
        dataSource: { type: "task_instances" as const, filters: { status: "done" } },
      },
    ]
    const instances = [
      { id: 1, taskId: 10, instanceDate: "2026-11-01", status: "done", notes: null },
      { id: 2, taskId: 11, instanceDate: "2026-11-02", status: "done", notes: null },
    ]
    const result = buildReportSections(sections, instances, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("completed-tasks")
    expect(result[0].data).toHaveLength(2)
  })

  it("leaves manual sections empty", () => {
    const sections = [{ id: "risks", title: "Risks", dataSource: null }]
    const result = buildReportSections(sections, [], [])
    expect(result).toHaveLength(1)
    expect(result[0].data).toBeNull()
  })

  it("filters by discipline when specified", () => {
    const sections = [
      {
        id: "it-tasks",
        title: "IT Tasks",
        dataSource: { type: "task_instances" as const, filters: { discipline: "it_operations", status: "done" } },
      },
    ]
    const instances = [
      { id: 1, taskId: 10, instanceDate: "2026-11-01", status: "done", discipline: "it_operations" },
      { id: 2, taskId: 11, instanceDate: "2026-11-02", status: "done", discipline: "engineering" },
    ]
    const result = buildReportSections(sections, instances, [])
    expect(result[0].data).toHaveLength(1)
    expect((result[0].data![0] as any).discipline).toBe("it_operations")
  })
})
