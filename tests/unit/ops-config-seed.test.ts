import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { IT_TECHNICIAN_OPS_CONFIG } from "@/lib/packs/ops/it-technician"
import { OPS_CONFIG_REGISTRY, opsConfigForPackKey } from "@/lib/packs/ops/registry"
import { safeValidateOpsConfig } from "@/lib/packs/ops/validator"
import { SEED_PACKS } from "@/lib/packs/seed"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("the opsConfig registry (the one source of pack config)", () => {
  it("maps the it-technician pack to the config the tests already validate", () => {
    expect(opsConfigForPackKey("it-technician")).toBe(IT_TECHNICIAN_OPS_CONFIG)
    expect(OPS_CONFIG_REGISTRY["it-technician"]).toBe(IT_TECHNICIAN_OPS_CONFIG)
  })

  it("returns null for a pack that does not exist rather than throwing", () => {
    expect(opsConfigForPackKey("no-such-pack")).toBeNull()
    expect(opsConfigForPackKey("")).toBeNull()
  })

  it("carries a config for every seeded pack, so no discipline is left dark", () => {
    for (const pack of SEED_PACKS) {
      expect(opsConfigForPackKey(pack.packKey), `${pack.packKey} must resolve a config`).not.toBeNull()
    }
  })

  it("derives the non-IT configs from the pack rather than inventing rules", () => {
    const designer = opsConfigForPackKey("designer")
    expect(designer).not.toBeNull()
    // the log entity per register kind is the pack's own kind label, untouched
    for (const kind of SEED_PACKS.find((pack) => pack.packKey === "designer")!.registerKinds) {
      expect(designer!.logs[kind.key]?.label).toBe(kind.label)
    }
    // and a derived pack claims no automation it has no source for
    expect(designer!.recommendRules).toBeUndefined()
    expect(designer!.automationTemplates).toBeUndefined()
  })

  it("holds only code that is valid OpsConfig", () => {
    for (const [packKey, config] of Object.entries(OPS_CONFIG_REGISTRY)) {
      const result = safeValidateOpsConfig(config)
      expect(result.success, `${packKey} must validate`).toBe(true)
    }
  })

  it("only names packs that actually seed", () => {
    const seeded = new Set(SEED_PACKS.map((pack) => pack.packKey))
    for (const packKey of Object.keys(OPS_CONFIG_REGISTRY)) {
      expect(seeded.has(packKey), `${packKey} has config but is not a seeded pack`).toBe(true)
    }
  })
})

describe("the opsConfig seed script", () => {
  const path = "scripts/seed-ops-config.mjs"

  it("exists", () => {
    expect(existsSync(resolve(process.cwd(), path))).toBe(true)
  })

  it("reads the registry rather than restating any config", () => {
    const script = codeOnly(src(path))
    expect(script).toMatch(/packs\/ops\/registry\.ts/)
    expect(script).not.toMatch(/IT_TECHNICIAN_OPS_CONFIG/)
  })

  it("validates each config before it is written", () => {
    const script = codeOnly(src(path))
    expect(script).toMatch(/safeValidateOpsConfig/)
  })

  it("is a dry run unless --write is passed", () => {
    const script = codeOnly(src(path))
    expect(script).toMatch(/process\.argv\.includes\("--write"\)/)
    // the UPDATE only runs inside the apply branch
    expect(script).toMatch(/if \(apply\)[\s\S]*UPDATE role_packs SET ops_config/)
  })

  it("only ever sets ops_config for a pack that already exists", () => {
    const script = codeOnly(src(path))
    expect(script).toMatch(/UPDATE role_packs SET ops_config/)
    expect(script).toMatch(/WHERE pack_key/)
    expect(script).not.toMatch(/INSERT INTO role_packs/)
  })

  it("is additive: no delete, truncate or drop, ever", () => {
    const script = codeOnly(src(path))
    expect(script).not.toMatch(/\bDROP\b/i)
    expect(script).not.toMatch(/DELETE FROM/i)
    expect(script).not.toMatch(/TRUNCATE/i)
  })

  it("stops if the ops_config column is missing instead of writing blind", () => {
    const script = codeOnly(src(path))
    expect(script).toMatch(/information_schema/i)
    expect(script).toMatch(/ops_config/)
  })

  it("never prints the connection string, only a masked host", () => {
    const script = codeOnly(src(path))
    // the raw URL (match[1]) is passed only to postgres(), never to a console call
    expect(script).toMatch(/postgres\(match\[1\]/)
    expect(script).not.toMatch(/console\.\w+\([^)]*match\[1\]/)
    expect(script).toMatch(/mask/i)
  })

  it("reads DATABASE_URL from .env.local past the commented stale line", () => {
    const script = codeOnly(src(path))
    expect(script).toMatch(/\^DATABASE_URL=.*\/m/)
  })
})

describe("wiring", () => {
  it("exposes an npm script for the seed", () => {
    const pkg = JSON.parse(src("package.json"))
    expect(pkg.scripts["db:ops:seed"]).toBe("node scripts/seed-ops-config.mjs")
  })

  it("the pack seed carries ops_config from the same registry for fresh installs", () => {
    const script = codeOnly(src("scripts/create-registers-tables.mjs"))
    expect(script).toMatch(/packs\/ops\/registry\.ts/)
    expect(script).toMatch(/ops_config/)
  })
})
