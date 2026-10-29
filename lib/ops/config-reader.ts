// Ops config reader: loads the opsConfig for a user's resolved pack.
// The config lives in role_packs.ops_config as JSONB; this module fetches it and validates
// it against the OpsConfig Zod schema before handing it to the CRUD routes.

import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { rolePacks } from "@/drizzle/schema"
import { safeValidateOpsConfig, type OpsConfigValidated } from "@/lib/packs/ops/validator"

export type OpsPackContext = {
  packKey: string
  config: OpsConfigValidated
}

/**
 * Load a specific pack's opsConfig by pack key.
 */
export async function loadOpsConfigByPack(packKey: string): Promise<OpsConfigValidated | null> {
  const [row] = await db
    .select({ opsConfig: rolePacks.opsConfig })
    .from(rolePacks)
    .where(eq(rolePacks.packKey, packKey))
    .limit(1)

  if (!row?.opsConfig) return null

  const result = safeValidateOpsConfig(row.opsConfig)
  return result.success ? result.data : null
}

/**
 * Load the opsConfig for the pack that matches a discipline string.
 * Returns null if no active pack claims that discipline or has no opsConfig.
 */
export async function loadOpsConfigForDiscipline(discipline: string): Promise<OpsPackContext | null> {
  const allPacks = await db
    .select({ packKey: rolePacks.packKey, opsConfig: rolePacks.opsConfig, disciplines: rolePacks.disciplines })
    .from(rolePacks)
    .where(eq(rolePacks.isActive, true))

  for (const row of allPacks) {
    const disciplines = row.disciplines as unknown
    if (!Array.isArray(disciplines)) continue
    if (!disciplines.includes(discipline)) continue
    if (!row.opsConfig) continue

    const result = safeValidateOpsConfig(row.opsConfig)
    if (!result.success) continue

    return { packKey: row.packKey, config: result.data }
  }

  return null
}
