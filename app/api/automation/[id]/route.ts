// /api/automation/[id] — one automation rule.
// GET    → the rule + its run history.
// PATCH  → update name/description/trigger/triggerParams/conditions/actions/isActive;
//          toggling enable/disable notifies the owner.
// DELETE → removes the rule (runs cascade); notifies the owner.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import { describeTrigger, isTriggerKey, type TriggerKey } from "../registry"
import {
  badRequest,
  fetchRuleById,
  parseIdParam,
  sanitizeActions,
  sanitizeConditions,
  sanitizeTriggerParams,
  serverError,
  unauthorized,
} from "../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid rule id")

  try {
    const rule = await fetchRuleById(id)
    if (!rule) return NextResponse.json({ success: false, message: "Rule not found" }, { status: 404 })
    const runs = (await db.execute(sql`
      SELECT id, status::text AS status, matched, acted, detail,
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
      FROM automation_runs WHERE rule_id = ${id}
      ORDER BY created_at DESC LIMIT 50
    `)) as unknown as { id: number; status: string; matched: number; acted: number; detail: string | null; created_at: string }[]
    return NextResponse.json({
      success: true,
      data: {
        rule,
        runs: runs.map((r) => ({
          id: r.id,
          ruleId: id,
          status: r.status,
          matched: r.matched,
          acted: r.acted,
          detail: r.detail,
          createdAt: r.created_at,
        })),
      },
    })
  } catch (error) {
    return serverError(error, "fetch automation rule")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid rule id")

  try {
    const existing = await fetchRuleById(id)
    if (!existing) return NextResponse.json({ success: false, message: "Rule not found" }, { status: 404 })

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")

    const sets: ReturnType<typeof sql>[] = []

    if (body.name !== undefined) {
      const v = typeof body.name === "string" ? body.name.trim() : ""
      if (!v || v.length > 255) return badRequest("name must be a non-empty string (max 255)")
      sets.push(sql`name = ${v}`)
    }
    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== "string") {
        return badRequest("description must be a string or null")
      }
      sets.push(sql`description = ${body.description === null ? null : body.description.trim() || null}`)
    }

    let trigger: TriggerKey = existing.trigger
    if (body.trigger !== undefined) {
      if (!isTriggerKey(body.trigger)) return badRequest("unknown trigger")
      trigger = body.trigger
      sets.push(sql`trigger = ${trigger}`)
    }

    const conditions = body.conditions !== undefined ? sanitizeConditions(body.conditions) : existing.conditions
    const triggerParams =
      body.triggerParams !== undefined || body.trigger !== undefined
        ? sanitizeTriggerParams(trigger, body.triggerParams ?? existing.triggerParams)
        : existing.triggerParams

    if (body.conditions !== undefined || body.triggerParams !== undefined || body.trigger !== undefined) {
      sets.push(sql`conditions = ${JSON.stringify({ ...conditions, triggerParams })}::jsonb`)
    }

    if (body.actions !== undefined) {
      const actions = sanitizeActions(body.actions)
      if (actions.length === 0) return badRequest("a rule needs at least one valid action")
      sets.push(sql`actions = ${JSON.stringify(actions)}::jsonb`)
    }

    let toggled: "enabled" | "disabled" | null = null
    if (body.isActive !== undefined) {
      const v = body.isActive === true
      toggled = v ? "enabled" : "disabled"
      sets.push(sql`is_active = ${v}`)
    }

    if (sets.length === 0) return badRequest("No valid fields to update")
    sets.push(sql`updated_at = now()`)

    await db.execute(sql`UPDATE automation_rules SET ${sql.join(sets, sql`, `)} WHERE id = ${id}`)

    if (toggled) {
      await createNotification({
        userId: existing.userId,
        type: "system",
        title: `Automation rule ${toggled}: ${existing.name}`,
        link: "/dashboard/automation",
        metadata: { ruleId: id, action: toggled },
      })
    }

    const updated = await fetchRuleById(id)
    return NextResponse.json({ success: true, data: { rule: updated } })
  } catch (error) {
    return serverError(error, "update automation rule")
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid rule id")

  try {
    const existing = await fetchRuleById(id)
    if (!existing) return NextResponse.json({ success: false, message: "Rule not found" }, { status: 404 })

    await db.execute(sql`DELETE FROM automation_rules WHERE id = ${id}`)

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Automation rule deleted: ${existing.name}`,
      body: `Trigger was “${describeTrigger(existing.trigger, existing.triggerParams)}”; its run history was removed with it.`,
      link: "/dashboard/automation",
      metadata: { ruleId: id, action: "deleted" },
    })

    return NextResponse.json({ success: true, data: { deletedId: id } })
  } catch (error) {
    return serverError(error, "delete automation rule")
  }
}
