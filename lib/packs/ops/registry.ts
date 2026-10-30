// The opsConfig registry: the code-authored operations config for every seeded pack. The IT
// technician pack carries its own hand-authored workbook config; the rest are derived from the
// register kinds and method the pack already declares (see ./from-pack.ts), so no discipline is
// left dark and none gets rules we invented. scripts/seed-ops-config.mjs persists these into
// role_packs.ops_config, and scripts/create-registers-tables.mjs carries the same value into a
// fresh pack row, so the config the unit tests validate is exactly the config the database runs.
// An admin pack edit changes pack facets, not the ops engine rules. The one runtime door that writes
// config is /api/ops/config/apply (admin-only, additive, revalidated); /api/ops/config/reset puts a pack
// back on whatever this file declares, which is also what a re-run of the seed script would do.

import type { OpsConfig } from "./types"
import { IT_TECHNICIAN_OPS_CONFIG } from "./it-technician.ts"
import { SEED_PACKS } from "../seed.ts"
import { opsConfigFromPack } from "./from-pack.ts"

function buildRegistry(): Record<string, OpsConfig> {
  const registry: Record<string, OpsConfig> = { "it-technician": IT_TECHNICIAN_OPS_CONFIG }
  for (const pack of SEED_PACKS) {
    if (registry[pack.packKey]) continue
    const derived = opsConfigFromPack(pack)
    if (derived) registry[pack.packKey] = derived
  }
  return registry
}

export const OPS_CONFIG_REGISTRY: Record<string, OpsConfig> = buildRegistry()

export function opsConfigForPackKey(packKey: string): OpsConfig | null {
  return OPS_CONFIG_REGISTRY[packKey] ?? null
}
