import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const ROUTES = [
  "app/api/onboarding/route.ts",
  "app/api/onboarding/invitation/route.ts",
  "app/api/onboarding/request-access/route.ts",
  "app/api/onboarding/project/route.ts",
  "app/api/team/invitations/route.ts",
] as const

describe("the onboarding routes", () => {
  it.each(ROUTES)("%s exists", (file) => {
    expect(existsSync(resolve(process.cwd(), file))).toBe(true)
  })

  it.each(ROUTES)("%s checks the session before it reads anything", (file) => {
    const body = codeOnly(src(file))
    expect(body).toMatch(/getSession\(\)/)
    expect(body).toMatch(/401/)
  })

  it("accepts an invitation only through its hash and only once", () => {
    const write = codeOnly(src("lib/onboarding/write.ts"))
    expect(write).toMatch(/invitationTokenHash\(token\)/)
    expect(write).toMatch(/isNull\(workspaceInvitations\.acceptedAt\)/)
    expect(write).not.toMatch(/console\.log\([^)]*token/)
  })

  it("never writes tasks from the project step", () => {
    const write = codeOnly(src("lib/onboarding/write.ts"))
    expect(write).toMatch(/insert\(agentPlans\)/)
    expect(write).not.toMatch(/insert\(tasks\)/)
  })

  it("deduplicates a retried project so a second tap creates nothing", () => {
    const write = codeOnly(src("lib/onboarding/write.ts"))
    expect(write).toMatch(/sourceName/)
    expect(write).toMatch(/eq\(agentPlans\.createdBy, userId\)/)
  })

  it("grants nothing from a request for access", () => {
    expect(codeOnly(src("app/api/onboarding/request-access/route.ts"))).toMatch(/requestAccess\(/)
    const write = codeOnly(src("lib/onboarding/write.ts"))
    const body = write.slice(write.indexOf("export async function requestAccess"), write.indexOf("export type ProjectInput"))
    expect(body).toMatch(/notifyMany/)
    expect(body).not.toMatch(/update\(users\)/)
  })

  it("keeps invitation creation behind the super-admin wall", () => {
    const route = codeOnly(src("app/api/team/invitations/route.ts"))
    expect(route).toMatch(/isSuperAdmin\(session\)/)
    expect(route).toMatch(/403/)
  })

  it("returns the raw invitation token exactly once", () => {
    const route = codeOnly(src("app/api/team/invitations/route.ts"))
    expect(route).toMatch(/token:\s*invitation\.token/)
    expect(route).toContain("/onboarding?invite=")
  })

  it("refuses onboarding through the per-key settings route", () => {
    const route = codeOnly(src("app/api/settings/[key]/route.ts"))
    expect(route).toMatch(/RESERVED_SETTINGS_KEYS/)
    expect(route).toMatch(/onboarding/)
  })

  it("resolves the default pack from the saved disciplines under settings", () => {
    const read = codeOnly(src("lib/registers/read.ts"))
    expect(read).toMatch(/settings/)
    expect(read).toMatch(/workDisciplines/)
  })
})