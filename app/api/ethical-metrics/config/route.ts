// /api/ethical-metrics/config — alert thresholds for the ethical metrics
// workspace. Reads and writes users.preferences JSONB under the
// "ethicalMetrics" namespace (the schema has no config table), so every value
// round-trips instead of being a hard-coded sample.
//
// Response contract is unchanged from the original stub:
//   GET  -> { success, config }
//   POST -> { success, message }

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import {
  DEFAULT_CONFIG,
  ETHICS_LINK,
  mergeConfig,
  notifyEnabled,
  readEthicsMeta,
  writeEthicsMeta,
  type EthicsConfig,
  type EthicsNotificationPrefs,
} from "../route"

export const dynamic = "force-dynamic"

const NUMERIC_LIMITS: Record<string, [number, number]> = {
  maxOvertimeHours: [0, 40],
  overloadRatio: [1, 4],
  dispersionCeiling: [0.25, 4],
  priorityConcentrationAlertPct: [10, 100],
  snapshotStaleDays: [1, 90],
  payEquityAlertThreshold: [0, 100],
  workloadBalanceAlertThreshold: [0, 100],
  deiTaskDistributionAlertThreshold: [0, 100],
  overtimeAlertThreshold: [0, 40],
}

function collectErrors(body: Record<string, unknown>): string[] {
  const errors: string[] = []
  const check = (value: unknown, key: string, path: string) => {
    if (value === undefined || value === null) return
    const n = Number(value)
    if (!Number.isFinite(n)) {
      errors.push(`${path} must be a number`)
      return
    }
    const [min, max] = NUMERIC_LIMITS[key] ?? [0, 100]
    if (n < min || n > max) errors.push(`${path} must be between ${min} and ${max}`)
  }
  for (const key of ["maxOvertimeHours", "overloadRatio", "dispersionCeiling", "priorityConcentrationAlertPct", "snapshotStaleDays"]) {
    check(body[key], key, key)
  }
  const thresholds = body.alertThresholds
  if (thresholds && (typeof thresholds !== "object" || Array.isArray(thresholds))) {
    errors.push("alertThresholds must be an object")
  } else if (thresholds && typeof thresholds === "object") {
    const t = thresholds as Record<string, unknown>
    for (const key of [
      "payEquityAlertThreshold",
      "workloadBalanceAlertThreshold",
      "deiTaskDistributionAlertThreshold",
      "overtimeAlertThreshold",
    ]) {
      check(t[key], key, `alertThresholds.${key}`)
    }
  }
  for (const key of [
    "enablePayEquityTracking",
    "enableWorkloadBalanceTracking",
    "enableDeiTaskDistributionTracking",
    "enableOvertimeMonitoring",
  ]) {
    if (body[key] !== undefined && typeof body[key] !== "boolean") errors.push(`${key} must be a boolean`)
  }
  const notifications = body.notifications
  if (notifications !== undefined && (typeof notifications !== "object" || notifications === null || Array.isArray(notifications))) {
    errors.push("notifications must be an object")
  } else if (notifications && typeof notifications === "object") {
    const n = notifications as Record<string, unknown>
    for (const key of Object.keys(DEFAULT_CONFIG.notifications) as (keyof EthicsNotificationPrefs)[]) {
      if (n[key] !== undefined && typeof n[key] !== "boolean") errors.push(`notifications.${key} must be a boolean`)
    }
    for (const key of Object.keys(n)) {
      if (!(key in DEFAULT_CONFIG.notifications)) errors.push(`notifications.${key} is not a known preference`)
    }
  }
  return errors
}

// GET /api/ethical-metrics/config — stored config merged over defaults.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required", message: "Unauthorized" }, { status: 401 })
    }
    const meta = await readEthicsMeta(session.id)
    const config = mergeConfig(meta.config)
    return NextResponse.json({ success: true, config, defaults: DEFAULT_CONFIG })
  } catch (error) {
    console.error("Ethical metrics configuration fetch error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message, message: "Unknown error fetching configuration" },
      { status: 500 },
    )
  }
}

// POST /api/ethical-metrics/config — persist the threshold panel.
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required", message: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Request body is required", message: "Request body is required" }, { status: 400 })
    }
    // Preserve the legacy validation message the old stub returned.
    if (body.maxOvertimeHours !== undefined && !Number.isFinite(Number(body.maxOvertimeHours))) {
      return NextResponse.json({ success: false, error: "Invalid maxOvertimeHours value", message: "Invalid maxOvertimeHours value" }, { status: 400 })
    }

    const errors = collectErrors(body)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join("; "), message: errors.join("; ") }, { status: 400 })
    }

    const meta = await readEthicsMeta(session.id)
    const current = mergeConfig(meta.config)
    const merged: EthicsConfig = mergeConfig({
      ...current,
      ...body,
      alertThresholds: {
        ...current.alertThresholds,
        ...((body.alertThresholds as EthicsConfig["alertThresholds"] | undefined) ?? {}),
      },
      notifications: {
        ...current.notifications,
        ...((body.notifications as Partial<EthicsNotificationPrefs> | undefined) ?? {}),
      },
    })
    await writeEthicsMeta(session.id, { config: merged })

    if (notifyEnabled(merged, "configReceipts")) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: "Ethical metrics thresholds updated",
        body: `Weekly overtime limit ${merged.maxOvertimeHours}h · overload ratio ${merged.overloadRatio}x · floors W ${merged.alertThresholds.workloadBalanceAlertThreshold} / DEI ${merged.alertThresholds.deiTaskDistributionAlertThreshold} / pay ${merged.alertThresholds.payEquityAlertThreshold}.`,
        link: ETHICS_LINK,
        metadata: { action: "ethics_config_updated", config: merged },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Configuration updated successfully",
      data: { config: merged },
    })
  } catch (error) {
    console.error("Ethical metrics configuration update error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message, message: "Unknown error updating configuration" },
      { status: 500 },
    )
  }
}

// PUT mirrors POST so callers that speak PUT (the workspace panel) hit the same
// persistence path.
export async function PUT(request: Request) {
  return POST(request)
}
