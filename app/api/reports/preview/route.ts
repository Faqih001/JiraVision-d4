// /api/reports/preview — ad-hoc dataset preview for the report builder.
// POST { dataset, rangeDays?, groupBy? } → aggregated rows, nothing persisted.

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  badRequest,
  buildDataset,
  isDatasetKey,
  serverError,
  unauthorized,
} from "../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")
    if (!isDatasetKey(body.dataset)) return badRequest("dataset must be tasks, sprints, team or wellbeing")

    const result = await buildDataset(body.dataset, {
      rangeDays: Number(body.rangeDays),
      groupBy: typeof body.groupBy === "string" ? body.groupBy : undefined,
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return serverError(error, "preview dataset")
  }
}
