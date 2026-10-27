// Tests for lib/assistant/context.ts
import { describe, it, expect, vi } from "vitest"

// Mock db before importing context
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}))

import { formatContextForPrompt, type AssistantContext } from "@/lib/assistant/context"

describe("formatContextForPrompt", () => {
  it("returns no data message when context is empty", () => {
    const context = {
      tasks: [],
      taskEvents: [],
      workLogEntries: [],
      deliverables: [],
      workReports: [],
      dataAsOf: "2026-10-27T00:00:00.000Z",
    }

    const result = formatContextForPrompt(context)
    expect(result).toContain("No work data found")
  })

  it("formats tasks section", () => {
    const context = {
      tasks: [
        {
          id: 1,
          title: "Test task",
          description: "A test task description",
          status: "in_progress",
          priority: "high",
          dueDate: "2026-11-01",
          startDate: "2026-10-27",
          discipline: "development",
          assigneeId: 1,
          createdAt: new Date(),
        },
      ],
      taskEvents: [],
      workLogEntries: [],
      deliverables: [],
      workReports: [],
      dataAsOf: "2026-10-27T00:00:00.000Z",
    }

    const result = formatContextForPrompt(context)
    expect(result).toContain("## Tasks (1)")
    expect(result).toContain("#1: Test task")
    expect(result).toContain("development")
    expect(result).toContain("in_progress")
  })

  it("formats task events section", () => {
    const context = {
      tasks: [],
      taskEvents: [
        {
          id: 1,
          taskId: 1,
          taskTitle: "Test task",
          actorId: 1,
          fromStatus: "todo",
          toStatus: "in_progress",
          at: new Date("2026-10-27T10:00:00Z"),
          source: "route",
        },
      ],
      workLogEntries: [],
      deliverables: [],
      workReports: [],
      dataAsOf: "2026-10-27T00:00:00.000Z",
    }

    const result = formatContextForPrompt(context)
    expect(result).toContain("## Recent Task Events (1)")
    expect(result).toContain("Test task")
    expect(result).toContain("todo → in_progress")
  })

  it("formats work log entries section", () => {
    const context = {
      tasks: [],
      taskEvents: [],
      workLogEntries: [
        {
          id: 1,
          userId: 1,
          workedOn: "2026-10-27",
          taskId: 1,
          taskTitle: "Test task",
          kind: "action",
          title: "Completed feature",
          body: "Implemented the new feature",
          discipline: "development",
          minutes: 60,
          deliverableId: 1,
          deliverableName: "Feature code",
          source: "manual",
          createdAt: new Date(),
        },
      ],
      deliverables: [],
      workReports: [],
      dataAsOf: "2026-10-27T00:00:00.000Z",
    }

    const result = formatContextForPrompt(context)
    expect(result).toContain("## Work Log Entries (1)")
    expect(result).toContain("Completed feature")
    expect(result).toContain("60min")
    expect(result).toContain("Feature code")
  })

  it("formats deliverables section", () => {
    const context = {
      tasks: [],
      taskEvents: [],
      workLogEntries: [],
      deliverables: [
        {
          id: 1,
          name: "API documentation",
          type: "document",
          taskId: 1,
          taskTitle: "Write docs",
          ownerId: 1,
          discipline: "development",
          status: "delivered",
          producedOn: "2026-10-27",
          link: "https://example.com",
          createdAt: new Date(),
        },
      ],
      workReports: [],
      dataAsOf: "2026-10-27T00:00:00.000Z",
    }

    const result = formatContextForPrompt(context)
    expect(result).toContain("## Deliverables (1)")
    expect(result).toContain("API documentation")
    expect(result).toContain("document")
    expect(result).toContain("delivered")
  })

  it("formats work reports section", () => {
    const context = {
      tasks: [],
      taskEvents: [],
      workLogEntries: [],
      deliverables: [],
      workReports: [
        {
          id: 1,
          userId: 1,
          periodType: "weekly",
          periodStart: "2026-10-21",
          periodEnd: "2026-10-27",
          title: "Week 43 Report",
          template: "general",
          status: "submitted",
          submittedAt: new Date(),
          createdAt: new Date(),
        },
      ],
      dataAsOf: "2026-10-27T00:00:00.000Z",
    }

    const result = formatContextForPrompt(context)
    expect(result).toContain("## Work Reports (1)")
    expect(result).toContain("Week 43 Report")
    expect(result).toContain("weekly")
    expect(result).toContain("submitted")
  })

  it("truncates long descriptions", () => {
    const longDescription = "A".repeat(300)
    const context = {
      tasks: [
        {
          id: 1,
          title: "Test task",
          description: longDescription,
          status: "todo",
          priority: "medium",
          dueDate: null,
          startDate: null,
          discipline: null,
          assigneeId: 1,
          createdAt: new Date(),
        },
      ],
      taskEvents: [],
      workLogEntries: [],
      deliverables: [],
      workReports: [],
      dataAsOf: "2026-10-27T00:00:00.000Z",
    }

    const result = formatContextForPrompt(context)
    // Should be truncated to 200 chars
    expect(result.length).toBeLessThan(longDescription.length)
  })
})
