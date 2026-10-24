import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import { INTEGRATION_CATALOG, INTEGRATIONS_LINK, readIntegrations } from "../_store"

export const dynamic = "force-dynamic"

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

/**
 * POST /api/integrations/test  { key, payload }
 * Fires a webhook "test event" for a connected integration. HONEST SCOPE:
 * the delivered event is a real row in the notifications table pushed through
 * the app's Neon Realtime bell pipeline — this demo product makes no external
 * HTTP call to the configured endpoint URL.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = asObject(await request.json().catch(() => null))
    if (!body || typeof body.key !== "string") {
      return NextResponse.json({ success: false, message: "Body must include a string key" }, { status: 400 })
    }
    const key = body.key.toLowerCase()
    const definition = INTEGRATION_CATALOG[key]
    if (!definition) {
      return NextResponse.json({ success: false, message: `Unknown integration key "${key}"` }, { status: 404 })
    }
    const all = await readIntegrations(session.id)
    const entry = all[key]
    if (!entry || !entry.connected) {
      return NextResponse.json(
        { success: false, message: `${definition.name} must be connected before test events can be delivered` },
        { status: 409 },
      )
    }

    const payload = "payload" in body ? body.payload : {}
    const summary = JSON.stringify(payload ?? {})
    const truncated = summary.length > 300 ? `${summary.slice(0, 300)}…` : summary

    const notification = await createNotification({
      userId: session.id,
      type: "system",
      title: `Test event from ${definition.name}`,
      body: `Delivered in-app through the JiraVision event pipeline. Payload: ${truncated}`,
      link: INTEGRATIONS_LINK,
      metadata: {
        integrationKey: key,
        source: "webhook_test",
        payload: payload ?? {},
        endpointConfig: typeof entry.config.webhookUrl === "string"
          ? entry.config.webhookUrl
          : typeof entry.config.endpointUrl === "string"
            ? entry.config.endpointUrl
            : null,
      },
    })

    return NextResponse.json({
      success: true,
      delivered: "in-app notification",
      note: "The notification row above IS the delivered webhook event. No external HTTP request is made by this demo product.",
      notification,
    })
  } catch (error) {
    console.error("Integration test event error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to deliver test event" },
      { status: 500 },
    )
  }
}
