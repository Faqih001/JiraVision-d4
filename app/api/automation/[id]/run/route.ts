// /api/automation/[id]/run — execute a rule against the CURRENT workspace state.
// POST           → applies actions for real (task updates + notifications),
//                  logs an automation_runs row and bumps run_count.
// POST ?dryRun=1 → evaluates and returns matched tasks + planned actions
//                  WITHOUT any writes.
// Inactive rules refuse to run unless dryRun=1 (so previews always work).

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import { badRequest, executeRule, fetchRuleById, parseIdParam, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid rule id")

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1"

  try {
    const rule = await fetchRuleById(id)
    if (!rule) return NextResponse.json({ success: false, message: "Rule not found" }, { status: 404 })
    if (!rule.isActive && !dryRun) {
      return badRequest("Rule is paused — enable it or use dry run")
    }

    const result = await executeRule(rule, { dryRun, actorName: session.name })

    if (!dryRun) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `Automation ran: ${rule.name}`,
        body: `${result.matched.length} task(s) matched · ${result.acted} action(s) applied.`,
        link: "/dashboard/automation",
        metadata: { ruleId: id, action: "run", matched: result.matched.length, acted: result.acted },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        dryRun: result.dryRun,
        matched: result.matched,
        planned: result.planned,
        acted: result.acted,
      },
    })
  } catch (error) {
    return serverError(error, "run automation rule")
  }
}
