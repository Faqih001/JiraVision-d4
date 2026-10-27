import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("registers page shell", () => {
  const page = codeOnly(src("app/dashboard/registers/page.tsx"))

  it("is a Suspense shell over a skeleton", () => {
    expect(page).toMatch(/<Suspense fallback=\{<RegistersSkeleton \/>\}>/)
    expect(page).toMatch(/<RegistersClient \/>/)
  })

  it("never imports the database into the page", () => {
    expect(page).not.toMatch(/@\/lib\/db|drizzle/)
  })

  it("opts out of static rendering", () => {
    expect(page).toMatch(/export const dynamic = "force-dynamic"/)
  })
})

describe("register workspace client", () => {
  const client = codeOnly(src("app/dashboard/registers/registers-client.tsx"))

  it("exports the skeleton the page falls back to", () => {
    expect(client).toMatch(/export function RegistersSkeleton\(\)/)
    expect(client).toMatch(/<Skeleton/)
  })

  it("reads the register and the stale queue through the API", () => {
    expect(client).toContain("fetch(`/api/registers?${query}`)")
    expect(client).toContain('send("/api/registers/stale"')
    expect(client).toMatch(/stalePlanId/)
  })

  it("keeps every filter in the URL grammar rather than in ad-hoc state", () => {
    expect(client).toMatch(/parseRegisterView\(new URLSearchParams/)
    expect(client).toMatch(/serializeRegisterView\(state\)/)
    expect(client).toMatch(/router\.replace\(/)
    expect(client).toMatch(/id="register-q"/)
    expect(client).toMatch(/value=\{state\.kind\}/)
    expect(client).toMatch(/value=\{state\.status\}/)
    expect(client).toMatch(/value=\{state\.custody\}/)
    expect(client).toMatch(/state\.mine/)
    expect(client).toMatch(/state\.stale/)
  })

  it("renders the three views the grammar names", () => {
    expect(client).toMatch(/REGISTER_VIEWS\.map/)
    expect(client).toMatch(/groupRegistersByKind\(rows\)/)
    expect(client).toMatch(/<table/)
  })

  it("offers verify, bulk verify, reassign and export", () => {
    expect(client).toContain("`/api/registers/${row.id}/verify`")
    expect(client).toContain('"/api/registers/bulk"')
    expect(client).toMatch(/action: "verify"/)
    expect(client).toMatch(/action: "reassign"/)
    expect(client).toContain("`/api/registers/export?${query}`")
  })

  it("shows the credential boundary instead of inviting a secret", () => {
    expect(client).toMatch(/CREDENTIAL_HINT/)
    expect(client).toMatch(/CREDENTIAL_PLACEHOLDER/)
  })

  it("creates with POST and edits with PATCH to the row's own route", () => {
    expect(client).toMatch(/jsonInit\("POST"/)
    expect(client).toContain("`/api/registers/${draft.id}`")
    expect(client).toMatch(/jsonInit\("PATCH"/)
  })

  it("asks for a reason when the lifecycle move needs one", () => {
    expect(client).toMatch(/transition\.requiresReason/)
    expect(client).toMatch(/Confirm move/)
    expect(client).toMatch(/draft-reason/)
  })

  it("schedules stale checks as a draft plan and links to it", () => {
    expect(client).toMatch(/Schedule checks/)
    expect(client).toContain("/dashboard/planner/${stalePlanId}")
  })
})

describe("admin pack authoring", () => {
  const page = codeOnly(src("app/admin/packs/page.tsx"))
  const editor = codeOnly(src("app/admin/packs/pack-editor.tsx"))

  it("mirrors the 401 and 403 walls the route enforces", () => {
    expect(page).toMatch(/res\.status === 401/)
    expect(page).toMatch(/res\.status === 403/)
    expect(page).toMatch(/Super-admin access required/)
    expect(page).toMatch(/Sign in required/)
  })

  it("reads every pack, including inactive ones", () => {
    expect(page).toContain('fetch("/api/packs?all=1")')
  })

  it("creates and saves through POST and PATCH", () => {
    expect(page).toMatch(/method: creating \? "POST" : "PATCH"/)
    expect(page).toContain('fetch("/api/packs"')
  })

  it("authors kinds, sections, method and onboarding without a code change", () => {
    expect(editor).toMatch(/WORK_DISCIPLINES\.map/)
    expect(editor).toMatch(/DASHBOARD_SECTIONS\.map/)
    expect(editor).toMatch(/Register kinds/)
    expect(editor).toMatch(/Method — one step per line/)
    expect(editor).toMatch(/Onboarding — one line per note/)
    expect(editor).toMatch(/disabled=\{editing\}/)
  })
})

describe("the way in", () => {
  it("puts Registers under the dashboard's Main group", () => {
    const layout = codeOnly(src("components/dashboard-layout.tsx"))
    expect(layout).toContain('href: "/dashboard/registers"')
    expect(layout).toMatch(/title: "Registers"/)
  })

  it("surfaces the stale count in the Today strip", () => {
    const dashboard = codeOnly(src("app/dashboard/page.tsx"))
    expect(dashboard).toContain('fetch("/api/registers/stale")')
    expect(dashboard).toContain('"/dashboard/registers?stale=1"')
    expect(dashboard).toMatch(/staleCount=\{staleCount\}/)
  })
})
