import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const PAGE = "app/dashboard/agent/page.tsx"
const CLIENT = "app/dashboard/agent/agent-client.tsx"

describe("the agent page", () => {
  it("exists behind a Suspense boundary", () => {
    expect(existsSync(resolve(process.cwd(), PAGE))).toBe(true)
    const page = codeOnly(src(PAGE))
    expect(page).toMatch(/Suspense/)
    expect(page).toMatch(/AgentClient/)
    expect(page).toMatch(/force-dynamic/)
  })

  it("keeps the tab in the URL", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/useSearchParams/)
    expect(client).toMatch(/tab/)
    expect(client).toMatch(/recommendations/)
    expect(client).toMatch(/handover/)
  })

  it("says the source is sent to Google and not stored", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/not stored/)
    expect(client).toMatch(/Google/)
  })

  it("shows refusals as an alert and names the path", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/role="alert"/)
    expect(client).toMatch(/refusal\.path/)
  })

  it("previews and then commits the selected rows", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/\/api\/agent\/handover/)
    expect(client).toMatch(/\/api\/agent\/handover\/commit/)
    expect(client).toMatch(/selected/)
  })

  it("loads rules first and asks for the AI twin on a button", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/\/api\/agent\/recommendations/)
    expect(client).toMatch(/ai: false/)
    expect(client).toMatch(/ai: true/)
    expect(client).toMatch(/aiAvailable/)
  })

  it("never injects model text as HTML", () => {
    expect(codeOnly(src(CLIENT))).not.toMatch(/dangerouslySetInnerHTML/)
  })

  it("has a sidebar entry next to the playbooks", () => {
    const layout = codeOnly(src("components/dashboard-layout.tsx"))
    expect(layout).toMatch(/title: "Agent"/)
    expect(layout).toMatch(/href: "\/dashboard\/agent"/)
  })

  it("renders a Suggest precautions button in the editor", () => {
    const editor = codeOnly(src("app/dashboard/playbooks/[id]/playbook-editor.tsx"))
    expect(editor).toMatch(/Suggest precautions/)
    expect(editor).toMatch(/\/api\/agent\/precautions/)
    expect(editor).toMatch(/aiMarked/)
  })

  it("lets the editor mark a row as containing model advice, but never unmark it", () => {
    const route = codeOnly(src("app/api/playbooks/[id]/route.ts"))
    expect(route).toMatch(/body\.aiMarked === true/)
  })
})
