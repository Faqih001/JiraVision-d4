import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { WORK_DISCIPLINES } from "@/lib/roles"
import { GENERAL_PACK, IT_TECHNICIAN_PACK, SEED_PACKS } from "@/lib/packs/seed"
import {
  normalisePack,
  packForDiscipline,
  packView,
  readPackInput,
  resolvePack,
} from "@/lib/packs/pack"
import type { RolePack } from "@/lib/packs/types"

const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

// Exists only here and in nothing the UI imports: if the night audit's facets need a branch
// in the selectors, this fixture stops resolving.
const NIGHT_AUDIT: RolePack = {
  packKey: "night-audit",
  title: "Night audit",
  disciplines: ["auditor", "finance"],
  registerKinds: [
    { key: "workpapers", label: "Workpaper index" },
    { key: "keys", label: "Keys and cabinets" },
  ],
  sections: ["today", "registers", "reports"],
  reportTemplate: "assurance",
  ladderDiscipline: "auditor",
  onboarding: ["Which ledger close does your workpaper index serve?"],
  method: ["Count", "Reconcile", "Sign off"],
  isActive: true,
}

describe("role packs", () => {
  it("resolves a data-only pack through the same selectors as the seeded one", () => {
    expect(packView(normalisePack(NIGHT_AUDIT))).toEqual({
      packKey: "night-audit",
      title: "Night audit",
      registerKinds: NIGHT_AUDIT.registerKinds,
      sections: ["today", "registers", "reports"],
      reportTemplate: "assurance",
      ladderDiscipline: "auditor",
      method: ["Count", "Reconcile", "Sign off"],
      onboarding: ["Which ledger close does your workpaper index serve?"],
    })

    const seeded = packView(normalisePack(IT_TECHNICIAN_PACK))
    expect(seeded.registerKinds.map((kind) => kind.key)).toEqual([
      "infrastructure",
      "accounts",
      "equipment",
      "outstanding",
    ])
    expect(seeded.reportTemplate).toBe("technical")
    expect(seeded.ladderDiscipline).toBe("technician")
    expect(seeded.method).toEqual(["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"])
  })

  it("claims every work discipline exactly once", () => {
    for (const discipline of WORK_DISCIPLINES) {
      const claims = SEED_PACKS.filter((pack) => pack.disciplines.includes(discipline))
      expect(claims, discipline).toHaveLength(1)
    }
  })

  it("sends an unknown role string to the general pack", () => {
    expect(resolvePack(SEED_PACKS, "night-nurse")?.packKey).toBe("general")
    expect(resolvePack(SEED_PACKS, null)?.packKey).toBe("general")
    expect(resolvePack(SEED_PACKS, "")?.packKey).toBe("general")
  })

  it("resolves a named discipline to its own pack, not the fallback", () => {
    expect(resolvePack(SEED_PACKS, "technician")?.packKey).toBe("it-technician")
    expect(resolvePack(SEED_PACKS, "networking")?.packKey).toBe("it-technician")
    expect(resolvePack(SEED_PACKS, "finance")?.packKey).toBe("finance")
    // A discipline no pack claims still lands on the general fallback.
    expect(resolvePack(SEED_PACKS, "nurse")?.packKey).toBe("general")
    expect(packForDiscipline(SEED_PACKS, "nurse")?.packKey ?? null).toBeNull()
  })

  it("never branches on a specific pack key", () => {
    const source = codeOnly(src("lib/packs/pack.ts"))
    expect(source).not.toMatch(/it-technician|night-audit/)
  })

  it("drops malformed jsonb instead of throwing", () => {
    const pack = normalisePack({
      packKey: "broken",
      title: "Broken",
      disciplines: ["technician", "not-a-discipline", 7],
      registerKinds: [{ key: "ok", label: "Ok" }, { key: "missing-label" }, "nope"],
      sections: ["today", null, "  "],
      reportTemplate: null,
      ladderDiscipline: "not-a-discipline",
      onboarding: ["What are you the keeper of?", 42],
      method: [],
      isActive: false,
    })
    expect(pack.disciplines).toEqual(["technician"])
    expect(pack.registerKinds).toEqual([{ key: "ok", label: "Ok" }])
    expect(pack.sections).toEqual(["today"])
    expect(pack.ladderDiscipline).toBeNull()
    expect(pack.onboarding).toEqual(["What are you the keeper of?"])
    expect(pack.isActive).toBe(false)
  })
})

describe("pack authoring", () => {
  it("accepts a data-only pack", () => {
    const result = readPackInput(NIGHT_AUDIT)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.packKey).toBe("night-audit")
  })

  it("rejects a key the app cannot address", () => {
    const result = readPackInput({ ...NIGHT_AUDIT, packKey: "Night Audit!" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/packKey/)
  })

  it("rejects a discipline outside the canonical vocabulary", () => {
    const result = readPackInput({ ...NIGHT_AUDIT, disciplines: ["auditor", "wizard"] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/known work disciplines/)
  })

  it("rejects an onboarding question that asks for a credential value", () => {
    const result = readPackInput({
      ...NIGHT_AUDIT,
      onboarding: ["Enter the admin password for the backup console?"],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/where it is kept/i)
      expect(result.error).not.toMatch(/backup console password is/i)
    }
  })

  it("rejects a method that is not a list", () => {
    const result = readPackInput({ ...NIGHT_AUDIT, method: "Count then sign off" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/method/)
  })

  it("keeps every seeded pack addressable by key", () => {
    expect(SEED_PACKS.map((pack) => pack.packKey)).toEqual([
      "it-technician", "developer", "designer", "analyst", "finance", "operations",
      "hr", "sales-marketing", "healthcare-science", "engineering", "management", "general",
    ])
    expect(GENERAL_PACK.disciplines).not.toContain("technician")
    expect(IT_TECHNICIAN_PACK.disciplines).toContain("technician")
  })
})
