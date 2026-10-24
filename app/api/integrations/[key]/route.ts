import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import {
  INTEGRATION_CATALOG,
  INTEGRATIONS_LINK,
  readIntegrations,
  removeIntegration,
  upsertIntegration,
  type StoredIntegration,
} from "../_store"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ key: string }> }

const EMPTY_ENTRY: StoredIntegration = {
  connected: false,
  config: {},
  connectedAt: null,
  lastSyncAt: null,
  pendingConfig: null,
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

function isValidKey(raw: string): boolean {
  return /^[a-z0-9_-]{1,40}$/i.test(raw)
}

function missingRequired(key: string, config: Record<string, unknown>): string[] {
  const definition = INTEGRATION_CATALOG[key]
  if (!definition) return []
  return definition.requiredConfig.filter((field) => {
    const value = config[field]
    if (typeof value === "string") return value.trim().length === 0
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === null
  })
}

// GET /api/integrations/[key] -> one stored entry (or null when never used)
export async function GET(_request: NextRequest, context: Context) {
  try {
    const { key: rawKey } = await context.params
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const key = rawKey.toLowerCase()
    if (!isValidKey(key)) {
      return NextResponse.json({ success: false, message: "Invalid integration key" }, { status: 400 })
    }
    const all = await readIntegrations(session.id)
    return NextResponse.json({ success: true, integration: all[key] ?? null })
  } catch (error) {
    console.error("Integration fetch error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to load integration" },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/integrations/[key]
 * Body (all optional, combined in one call):
 *   { connected?: boolean, config?: {}, pendingConfig?: {} | null,
 *     publish?: boolean, discardPending?: boolean, markSynced?: boolean }
 * - connected=true persists connectedAt and fires a "connected" notification
 *   (only on the disconnected -> connected transition).
 * - config with connected=true is validated against the server-side required
 *   fields for the catalog key before the connection is stored.
 * - pendingConfig is a stored draft; publish moves it into the live config.
 * - markSynced refreshes lastSyncAt (used after a real in-app sync action such
 *   as a completed CSV import).
 */
export async function PUT(request: NextRequest, context: Context) {
  try {
    const { key: rawKey } = await context.params
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const key = rawKey.toLowerCase()
    if (!isValidKey(key) || !Object.prototype.hasOwnProperty.call(INTEGRATION_CATALOG, key)) {
      return NextResponse.json({ success: false, message: `Unknown integration key "${key}"` }, { status: 404 })
    }

    const body = asObject(await request.json().catch(() => null))
    if (!body) {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }

    const all = await readIntegrations(session.id)
    const previous = all[key] ?? { ...EMPTY_ENTRY }
    const next: StoredIntegration = {
      connected: previous.connected,
      config: { ...previous.config },
      connectedAt: previous.connectedAt,
      lastSyncAt: previous.lastSyncAt,
      pendingConfig: previous.pendingConfig ?? null,
    }

    const definition = INTEGRATION_CATALOG[key]
    let connectedNow = false
    let configChanged = false
    let draftSaved = false
    let published = false

    if ("config" in body) {
      const incoming = asObject(body.config)
      if (!incoming) {
        return NextResponse.json({ success: false, message: "config must be an object" }, { status: 400 })
      }
      if (body.connected === true) {
        const missing = missingRequired(key, incoming)
        if (missing.length > 0) {
          return NextResponse.json(
            {
              success: false,
              message: `Cannot connect ${definition.name}: missing required configuration (${missing.join(", ")})`,
              missingFields: missing,
            },
            { status: 400 },
          )
        }
      }
      next.config = incoming
      configChanged = true
    }

    if (typeof body.connected === "boolean") {
      if (body.connected && !("config" in body)) {
        // connecting without a config patch: validate the stored config too
        const missing = missingRequired(key, next.config)
        if (missing.length > 0) {
          return NextResponse.json(
            {
              success: false,
              message: `Cannot connect ${definition.name}: missing required configuration (${missing.join(", ")})`,
              missingFields: missing,
            },
            { status: 400 },
          )
        }
      }
      const wasConnected = next.connected
      next.connected = body.connected
      if (body.connected) {
        if (!wasConnected) next.connectedAt = new Date().toISOString()
        connectedNow = !wasConnected
      }
    }

    if ("pendingConfig" in body) {
      if (body.pendingConfig === null) {
        next.pendingConfig = null
      } else {
        const draft = asObject(body.pendingConfig)
        if (!draft) {
          return NextResponse.json({ success: false, message: "pendingConfig must be an object or null" }, { status: 400 })
        }
        next.pendingConfig = draft
        draftSaved = true
      }
    }

    if (body.publish === true) {
      if (!next.pendingConfig) {
        return NextResponse.json({ success: false, message: "No stored draft to publish" }, { status: 400 })
      }
      const missing = missingRequired(key, next.pendingConfig)
      if (missing.length > 0) {
        return NextResponse.json(
          { success: false, message: `Draft is missing required fields: ${missing.join(", ")}`, missingFields: missing },
          { status: 400 },
        )
      }
      next.config = { ...next.pendingConfig }
      next.pendingConfig = null
      published = true
      configChanged = false // avoid double-counting; notification below covers it
    }

    if (body.discardPending === true) {
      next.pendingConfig = null
    }

    if (body.markSynced === true) {
      next.lastSyncAt = new Date().toISOString()
    }

    next.updatedAt = new Date().toISOString()
    await upsertIntegration(session.id, key, next)

    if (connectedNow) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `${definition.name} connected`,
        body: `Configuration stored in your account preferences. This demo product makes no external call to ${definition.name}.`,
        link: INTEGRATIONS_LINK,
        metadata: { integrationKey: key, source: "integration_connect" },
      })
    } else if (typeof body.connected === "boolean" && !body.connected && previous.connected) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `${definition.name} disconnected`,
        body: `${definition.name} is no longer active. Its stored configuration was kept — reconnect any time.`,
        link: INTEGRATIONS_LINK,
        metadata: { integrationKey: key, source: "integration_disconnect" },
      })
    } else if (published) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `${definition.name} configuration updated`,
        body: `Stored draft was published to the live ${definition.name} configuration.`,
        link: INTEGRATIONS_LINK,
        metadata: { integrationKey: key, source: "integration_config" },
      })
    } else if (draftSaved && next.pendingConfig) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `${definition.name} draft saved`,
        body: `Unpublished ${definition.name} configuration draft stored. Publish it from the drafts banner.`,
        link: INTEGRATIONS_LINK,
        metadata: { integrationKey: key, source: "integration_draft" },
      })
    } else if (configChanged) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `${definition.name} configuration updated`,
        body: `New configuration stored for ${definition.name} in your account preferences.`,
        link: INTEGRATIONS_LINK,
        metadata: { integrationKey: key, source: "integration_config" },
      })
    }

    return NextResponse.json({ success: true, integration: next })
  } catch (error) {
    console.error("Integration save error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to save integration" },
      { status: 500 },
    )
  }
}

// DELETE /api/integrations/[key] -> remove the entry entirely + notify
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const { key: rawKey } = await context.params
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const key = rawKey.toLowerCase()
    if (!isValidKey(key) || !Object.prototype.hasOwnProperty.call(INTEGRATION_CATALOG, key)) {
      return NextResponse.json({ success: false, message: `Unknown integration key "${key}"` }, { status: 404 })
    }
    const all = await readIntegrations(session.id)
    if (!all[key]) {
      return NextResponse.json({ success: false, message: "Integration has no stored state" }, { status: 404 })
    }
    await removeIntegration(session.id, key)
    await createNotification({
      userId: session.id,
      type: "system",
      title: `${INTEGRATION_CATALOG[key].name} removed`,
      body: `${INTEGRATION_CATALOG[key].name} configuration deleted from your account preferences.`,
      link: INTEGRATIONS_LINK,
      metadata: { integrationKey: key, source: "integration_remove" },
    })
    return NextResponse.json({ success: true, removed: key })
  } catch (error) {
    console.error("Integration delete error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to delete integration" },
      { status: 500 },
    )
  }
}
