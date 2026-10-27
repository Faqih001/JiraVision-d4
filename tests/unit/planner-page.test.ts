import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

describe("planner page shell", () => {
  it("exports dynamic = force-dynamic", () => {
    const page = src("app/dashboard/planner/page.tsx")
    expect(page).toMatch(/export const dynamic = "force-dynamic"/)
  })

  it("wraps the client component in Suspense", () => {
    const page = src("app/dashboard/planner/page.tsx")
    expect(page).toMatch(/<Suspense/)
    expect(page).toMatch(/<PlannerClient/)
  })

  it("provides a skeleton fallback", () => {
    const page = src("app/dashboard/planner/page.tsx")
    expect(page).toMatch(/PlannerSkeleton/)
  })
})

describe("planner client component", () => {
  it("is marked as a client component", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/^"use client"/)
  })

  it("fetches plans on mount", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/\/api\/planner/)
    expect(client).toMatch(/useEffect/)
  })

  it("provides a text input mode", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/inputMode === "text"/)
    expect(client).toMatch(/Textarea/)
  })

  it("provides a PDF upload mode", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/inputMode === "pdf"/)
    expect(client).toMatch(/type="file"/)
    expect(client).toMatch(/accept="application\/pdf"/)
  })

  it("handles drag and drop for PDF", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/onDrop/)
    expect(client).toMatch(/onDragOver/)
  })

  it("calls the extract endpoint", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/\/api\/planner\/extract/)
    expect(client).toMatch(/method: "POST"/)
  })

  it("encodes PDF as base64 for the API", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/btoa/)
  })

  it("redirects to the editor after extraction", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/router\.push.*planner.*planId/)
  })

  it("lists plans with status badges", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/plan\.status/)
    expect(client).toMatch(/draft/)
    expect(client).toMatch(/promoted/)
  })

  it("provides a delete action for drafts", () => {
    const client = src("app/dashboard/planner/planner-client.tsx")
    expect(client).toMatch(/handleDelete/)
    expect(client).toMatch(/DELETE/)
  })
})

describe("plan editor page shell", () => {
  it("exports dynamic = force-dynamic", () => {
    const page = src("app/dashboard/planner/[id]/page.tsx")
    expect(page).toMatch(/export const dynamic = "force-dynamic"/)
  })

  it("wraps the client component in Suspense", () => {
    const page = src("app/dashboard/planner/[id]/page.tsx")
    expect(page).toMatch(/<Suspense/)
    expect(page).toMatch(/<PlanEditorClient/)
  })

  it("passes params to the client component", () => {
    const page = src("app/dashboard/planner/[id]/page.tsx")
    expect(page).toMatch(/params={params}/)
  })
})

describe("plan editor client component", () => {
  it("is marked as a client component", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/^"use client"/)
  })

  it("fetches the plan and items on mount", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/\/api\/planner\/\$\{planId\}/)
    expect(client).toMatch(/useEffect/)
  })

  it("allows inline editing of plan metadata", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/updatePlanField/)
    expect(client).toMatch(/savePlanMetadata/)
  })

  it("allows inline editing of items", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/updateItem/)
    expect(client).toMatch(/saveItem/)
  })

  it("provides add and delete item actions", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/addItem/)
    expect(client).toMatch(/deleteItem/)
  })

  it("provides a promote action", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/promote/)
    expect(client).toMatch(/\/api\/planner\/\$\{planId\}\/promote/)
  })

  it("provides a discard action", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/discard/)
  })

  it("disables editing for promoted plans", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/disabled=\{!isDraft\}/)
  })

  it("shows all item fields", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/title/)
    expect(client).toMatch(/description/)
    expect(client).toMatch(/discipline/)
    expect(client).toMatch(/estimatePoints/)
    expect(client).toMatch(/startDate/)
    expect(client).toMatch(/dueDate/)
    expect(client).toMatch(/milestone/)
    expect(client).toMatch(/cadence/)
    expect(client).toMatch(/deliverable/)
  })

  it("saves items on blur", () => {
    const client = src("app/dashboard/planner/[id]/plan-editor-client.tsx")
    expect(client).toMatch(/onBlur=\{.*saveItem/)
  })
})
