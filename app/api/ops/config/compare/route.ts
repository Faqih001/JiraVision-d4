// /api/ops/config/compare — the current config vs the code-authored baseline.
//
// GET → { current, baseline, diff } where current is the live config from role_packs.ops_config, baseline is
// what the seed script would write (from lib/packs/ops/registry.ts), and diff is a summary of what changed
// (added/removed/modified items per section). The diff is computed server-side so the client does not have to
// walk the whole config tree.
//
// Scope: an admin compares the pack their own discipline resolves to. There is no packKey parameter — a body
// field naming someone else's pack would be a way to read another discipline's config.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { opsConfigForPackKey } from "@/lib/packs/ops/registry"
import { safeValidateOpsConfig } from "@/lib/packs/ops/validator"
import { diffConfig } from "@/lib/ops/config/diff"
import type { ConfigProposal } from "@/lib/ops/config/diff"
import { forbidden, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()
  if (session.role !== "admin" && session.role !== "super_admin") {
    return forbidden("Only an admin can compare configs.")
  }

  try {
    const discipline = defaultDisciplineOf(session)
    if (!discipline) {
      return NextResponse.json({ success: true, data: { current: null, baseline: null, diff: null } })
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    if (!ctx) {
      return NextResponse.json({ success: true, data: { current: null, baseline: null, diff: null } })
    }

    const baseline = opsConfigForPackKey(ctx.packKey)
    if (!baseline) {
      return NextResponse.json({
        success: true,
        data: { current: ctx.config, baseline: null, diff: null, message: "No code-authored baseline exists for this pack." },
      })
    }

    const checked = safeValidateOpsConfig(baseline)
    if (!checked.success) {
      return NextResponse.json({
        success: true,
        data: { current: ctx.config, baseline: null, diff: null, message: "The code-authored baseline no longer validates." },
      })
    }

    const diff = diffConfig(checked.data, ctx.config as unknown as ConfigProposal)

    return NextResponse.json({
      success: true,
      data: { current: ctx.config, baseline: checked.data, diff },
    })
  } catch (error) {
    return serverError(error, "compare ops config")
  }
}
