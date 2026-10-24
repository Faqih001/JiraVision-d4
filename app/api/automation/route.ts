// /api/automation — automation rules + run history + template gallery.
// GET  → every rule (with run counts), the 50 most recent runs and the
//        template registry for one-click instantiation.
// POST → create a rule; notifies the owner.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import {
  TEMPLATES,
  describeTrigger,
  isTriggerKey,
  type TriggerKey,
} from "./registry"
import {
  badRequest,
  fetchRules,
  fetchRuns,
  sanitizeActions,
  sanitizeConditions,
  sanitizeTriggerParams,
  serverError,
  unauthorized,
} from "./_shared"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const [rules, runs] = await Promise.all([fetchRules(), fetchRuns(50)])
    return NextResponse.json({ success: true, data: { rules, runs, templates: TEMPLATES } })
  } catch (error) {
    return serverError(error, "fetch automation rules")
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name || name.length > 255) return badRequest("name is required (max 255 chars)")

    if (!isTriggerKey(body.trigger)) return badRequest(`trigger must be one of: ${TEMPLATES.length ? "see registry" : "known triggers"}`)
    const trigger = body.trigger as TriggerKey

    const description =
      typeof body.description === "string" && body.description.trim() ? body.description.trim() : null

    const conditions = sanitizeConditions(body.conditions)
    const triggerParams = sanitizeTriggerParams(trigger, body.triggerParams)
    const actions = sanitizeActions(body.actions)
    if (actions.length === 0) return badRequest("a rule needs at least one valid action")

    // conditions jsonb doubles as the rule config document (see _shared.serializeRule)
    const configDoc = { ...conditions, triggerParams }
    const isActive = body.isActive !== false

    const [row] = (await db.execute(sql`
      INSERT INTO automation_rules (user_id, name, description, trigger, conditions, actions, is_active)
      VALUES (${session.id}, ${name}, ${description}, ${trigger},
              ${JSON.stringify(configDoc)}::jsonb, ${JSON.stringify(actions)}::jsonb, ${isActive})
      RETURNING id
    `)) as unknown as { id: number }[]

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Automation rule created: ${name}`,
      body: `${describeTrigger(trigger, triggerParams)} → ${actions.length} action(s).`,
      link: "/dashboard/automation",
      metadata: { ruleId: row.id, action: "created" },
    })

    const rules = await fetchRules()
    return NextResponse.json(
      { success: true, data: { rule: rules.find((r) => r.id === row.id) ?? null } },
      { status: 201 },
    )
  } catch (error) {
    return serverError(error, "create automation rule")
  }
}
