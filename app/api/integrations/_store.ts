import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"

// Integration state lives inside the existing users.preferences jsonb column
// (drizzle/schema.ts -> users.preferences) under the dedicated
// `preferences.integrations` namespace:
//   { [key]: { connected, config{}, connectedAt, lastSyncAt, pendingConfig? } }
// All writes go through jsonb_set(..., '{integrations}', ...) merged at the DB
// level, so sibling namespaces owned by other products (preferences.settings,
// preferences.billing, ...) are never read or rewritten here.

export type StoredIntegration = {
  connected: boolean
  config: Record<string, unknown>
  connectedAt: string | null
  lastSyncAt: string | null
  pendingConfig?: Record<string, unknown> | null
  updatedAt?: string
}

// Minimal server-side catalog: product metadata used for key validation and
// required-field checks before a connection is persisted. The UI catalog with
// full field definitions lives in app/dashboard/integrations/page.tsx.
export const INTEGRATION_CATALOG: Record<string, { name: string; requiredConfig: string[] }> = {
  slack: { name: "Slack", requiredConfig: ["webhookUrl", "channelName"] },
  github: { name: "GitHub", requiredConfig: ["repoUrl"] },
  jira: { name: "Jira import", requiredConfig: ["siteUrl", "projectKey"] },
  gcal: { name: "Google Calendar", requiredConfig: [] },
  webhooks: { name: "Webhooks", requiredConfig: ["endpointUrl"] },
  csv: { name: "CSV bulk tasks", requiredConfig: [] },
  zapier: { name: "Zapier", requiredConfig: ["webhookUrl"] },
}

export const INTEGRATIONS_LINK = "/dashboard/integrations"

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function readIntegrations(userId: number): Promise<Record<string, StoredIntegration>> {
  const rows = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const namespace = asObject(asObject(rows[0]?.preferences).integrations)
  const result: Record<string, StoredIntegration> = {}
  for (const [key, raw] of Object.entries(namespace)) {
    const entry = asObject(raw)
    result[key] = {
      connected: entry.connected === true,
      config: asObject(entry.config),
      connectedAt: typeof entry.connectedAt === "string" ? entry.connectedAt : null,
      lastSyncAt: typeof entry.lastSyncAt === "string" ? entry.lastSyncAt : null,
      pendingConfig: entry.pendingConfig ? asObject(entry.pendingConfig) : null,
      updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : undefined,
    }
  }
  return result
}

/**
 * Upsert one integration entry at the DB level with jsonb_set so only the
 * '{integrations}' path (and within it only `key`) is modified.
 */
export async function upsertIntegration(
  userId: number,
  key: string,
  entry: StoredIntegration,
): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET preferences = jsonb_set(
          COALESCE(preferences, '{}'::jsonb),
          '{integrations}',
          COALESCE(COALESCE(preferences, '{}'::jsonb) -> 'integrations', '{}'::jsonb)
            || jsonb_build_object(${key}::text, ${JSON.stringify(entry)}::jsonb)
        ),
        updated_at = NOW()
    WHERE id = ${userId}
  `)
}

/** Remove one integration entry from the namespace (sibling keys untouched). */
export async function removeIntegration(userId: number, key: string): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET preferences = jsonb_set(
          COALESCE(preferences, '{}'::jsonb),
          '{integrations}',
          COALESCE(COALESCE(preferences, '{}'::jsonb) -> 'integrations', '{}'::jsonb)
            - ${key}
        ),
        updated_at = NOW()
    WHERE id = ${userId}
  `)
}

export function isKnownKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(INTEGRATION_CATALOG, key)
}
