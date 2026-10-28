import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  EMPTY_ONBOARDING,
  ONBOARDING_EPOCH_ISO,
  decideOnboardingGate,
  isOnboardingSettled,
  readOnboardingPatch,
  readOnboardingRow,
  type OnboardingState,
} from "@/lib/onboarding/state"

const src = (relative: string) => readFileSync(path.join(path.resolve(__dirname, "..", ".."), relative), "utf8")
const codeOnly = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const NOW = "2026-10-28T09:00:00.000Z"
const BEFORE_EPOCH = `${ONBOARDING_EPOCH_ISO.slice(0, 4)}-10-01T08:00:00.000Z`
const AFTER_EPOCH = "2026-10-28T08:00:00.000Z"

const legacy = (patch: Partial<OnboardingState> = {}): OnboardingState => ({ ...EMPTY_ONBOARDING, ...patch })

const row = (patch: Partial<ReturnType<typeof readOnboardingRow> & object> = {}) => ({
  status: "in_progress" as const,
  step: 2,
  version: 1,
  source: "gate" as const,
  completedAt: null,
  skippedAt: null,
  ...patch,
})

describe("only a settled row lets a member into the workspace", () => {
  it("completed and skipped are settled; nothing else is", () => {
    expect(isOnboardingSettled("completed")).toBe(true)
    expect(isOnboardingSettled("skipped")).toBe(true)
    expect(isOnboardingSettled("in_progress")).toBe(false)
    expect(isOnboardingSettled("not_started")).toBe(false)
  })

  it("a completed row does not redirect", () => {
    const decision = decideOnboardingGate({
      row: row({ status: "completed", step: 7, completedAt: NOW }),
      legacy: legacy(),
      user: { createdAtIso: AFTER_EPOCH, hasActivity: false },
    })
    expect(decision).toMatchObject({ status: "completed", redirect: false, origin: "row", grandfathered: false })
  })

  it("a skipped row does not redirect either — 'set up later' is a decision", () => {
    const decision = decideOnboardingGate({
      row: row({ status: "skipped", step: 0, skippedAt: NOW }),
      legacy: legacy({ status: "in_progress", step: 3 }),
      user: { createdAtIso: AFTER_EPOCH, hasActivity: false },
    })
    expect(decision.redirect).toBe(false)
    expect(decision.status).toBe("skipped")
    expect(decision.skippedAt).toBe(NOW)
  })

  it("an in-progress row redirects and resumes at its own step", () => {
    const decision = decideOnboardingGate({
      row: row({ status: "in_progress", step: 4 }),
      legacy: legacy({ status: "completed", step: 7 }),
      user: { createdAtIso: AFTER_EPOCH, hasActivity: true },
    })
    expect(decision.redirect).toBe(true)
    expect(decision.step).toBe(4)
    // The row wins over a completed preference — this is what makes Restart setup work.
    expect(decision.origin).toBe("row")
  })

  it("a not-started row redirects to the first step", () => {
    const decision = decideOnboardingGate({
      row: row({ status: "not_started", step: 5 }),
      legacy: legacy(),
      user: { createdAtIso: AFTER_EPOCH, hasActivity: false },
    })
    expect(decision.redirect).toBe(true)
    expect(decision.status).toBe("not_started")
    expect(decision.step).toBe(0)
  })
})

describe("with no row the old rules decide, so nobody is dragged backwards", () => {
  it("an account created before the wizard is carried over", () => {
    const decision = decideOnboardingGate({
      row: null,
      legacy: legacy(),
      user: { createdAtIso: BEFORE_EPOCH, hasActivity: false },
    })
    expect(decision).toMatchObject({ status: "completed", redirect: false, grandfathered: true, origin: "grandfather" })
  })

  it("an account with work behind it is carried over even if it is newer", () => {
    const decision = decideOnboardingGate({
      row: null,
      legacy: legacy(),
      user: { createdAtIso: AFTER_EPOCH, hasActivity: true },
    })
    expect(decision.redirect).toBe(false)
    expect(decision.grandfathered).toBe(true)
  })

  it("a saved preference still counts when the table has no row yet", () => {
    const decision = decideOnboardingGate({
      row: null,
      legacy: legacy({ status: "completed", step: 7, completedAt: NOW }),
      user: { createdAtIso: BEFORE_EPOCH, hasActivity: false },
    })
    expect(decision).toMatchObject({ status: "completed", redirect: false, origin: "legacy", grandfathered: false })
  })

  it("a brand-new account with nothing done is sent to setup", () => {
    const decision = decideOnboardingGate({
      row: null,
      legacy: legacy(),
      user: { createdAtIso: AFTER_EPOCH, hasActivity: false },
    })
    expect(decision).toMatchObject({ status: "not_started", redirect: true, origin: "new", grandfathered: false })
    expect(decision.step).toBe(0)
  })

  it("an interrupted preference resumes where it stopped", () => {
    const decision = decideOnboardingGate({
      row: null,
      legacy: legacy({ status: "in_progress", step: 3 }),
      user: { createdAtIso: AFTER_EPOCH, hasActivity: false },
    })
    expect(decision).toMatchObject({ status: "in_progress", step: 3, redirect: true, origin: "legacy" })
  })
})

describe("reading a stored row", () => {
  it("keeps skipped and clamps a step outside the wizard", () => {
    expect(readOnboardingRow({ status: "skipped", step: 44 })).toMatchObject({ status: "skipped", step: 7 })
  })

  it("turns junk into null so the gate falls back instead of guessing", () => {
    expect(readOnboardingRow(null)).toBeNull()
    expect(readOnboardingRow("completed")).toBeNull()
    expect(readOnboardingRow([])).toBeNull()
  })

  it("degrades an unknown status to not_started rather than throwing", () => {
    expect(readOnboardingRow({ status: "finished" })?.status).toBe("not_started")
  })
})

describe("restart is the only way back", () => {
  const completed = legacy({ status: "completed", step: 7, completedAt: NOW })

  it("a normal save cannot downgrade a completed account", () => {
    expect(readOnboardingPatch({ status: "in_progress" }, completed, NOW)).toEqual({
      ok: false,
      error: "Setup is already complete.",
    })
  })

  it("a restart may, and it clears the old finish", () => {
    const parsed = readOnboardingPatch({ status: "in_progress", step: 1 }, completed, NOW, { allowRestart: true })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.status).toBe("in_progress")
    expect(parsed.value.completedAt).toBeNull()
  })
})

describe("the gate is wired where it can actually stop a request", () => {
  it("the dashboard layout redirects and writes the first-contact row", () => {
    const layout = codeOnly(src("app/dashboard/layout.tsx"))
    expect(layout).toMatch(/if \(gate\?\.redirect\)/)
    expect(layout).toMatch(/if \(!gate\.row\) await ensureGateRow\(/)
    expect(layout).toMatch(/redirect\("\/onboarding"\)/)
  })

  it("a gate read that failed never decides where somebody goes", () => {
    const layout = codeOnly(src("app/dashboard/layout.tsx"))
    expect(layout).toMatch(/catch \{\s*gate = null/)
  })

  it("the dashboard page itself still never redirects", () => {
    expect(codeOnly(src("app/dashboard/page.tsx"))).not.toMatch(/redirect\("\/onboarding"\)/)
  })

  it("the API accepts only skip and restart", () => {
    const route = codeOnly(src("app/api/onboarding/route.ts"))
    expect(route).toMatch(/if \(action !== "skip" && action !== "restart"\)/)
    expect(route).toMatch(/markOnboardingSkipped\(session\.id\)/)
    expect(route).toMatch(/restartOnboarding\(session\.id\)/)
  })

  it("the wizard's 'set up later' records the decision before leaving", () => {
    const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
    const call = wizard.indexOf('JSON.stringify({ action: "skip" })')
    const push = wizard.indexOf('router.push("/dashboard")', call)
    expect(call).toBeGreaterThan(-1)
    expect(push).toBeGreaterThan(call)
  })

  it("every saved wizard step lands on the row the gate reads", () => {
    const route = codeOnly(src("app/api/settings/route.ts"))
    expect(route).toMatch(/syncOnboardingRow\(\{ userId: session\.id, state: savedOnboarding \}\)/)
    expect(route).toMatch(/allowRestart: row\?\.status === "in_progress"/)
  })
})

describe("the table and its backfill", () => {
  it("is additive: created if missing, with a cascading foreign key", () => {
    const migration = src("scripts/create-user-onboarding-table.mjs")
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS user_onboarding/)
    expect(migration).toMatch(/REFERENCES users\(id\) ON DELETE CASCADE/)
    expect(migration).not.toMatch(/DROP TABLE/)
    expect(migration).not.toMatch(/INSERT INTO/)
  })

  it("has a rollback that refuses to run unconfirmed", () => {
    const rollback = src("scripts/rollback-user-onboarding-table.mjs")
    expect(rollback).toMatch(/USER_ONBOARDING_ROLLBACK !== "yes"/)
    expect(rollback).toMatch(/DROP TABLE IF EXISTS user_onboarding/)
  })

  it("backfills only when asked, and never overwrites a member's own row", () => {
    const backfill = src("scripts/backfill-user-onboarding.mjs")
    expect(backfill).toMatch(/const APPLY = process\.argv\.includes\("--apply"\)/)
    expect(backfill).toMatch(/if \(!APPLY\) \{[\s\S]*?process\.exit\(0\)/)
    expect(backfill).toMatch(/ON CONFLICT \(user_id\) DO NOTHING/)
    expect(backfill).toContain(`const EPOCH = "${ONBOARDING_EPOCH_ISO}"`)
  })
})
