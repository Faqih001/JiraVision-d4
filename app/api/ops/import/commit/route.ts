// /api/ops/import/commit — write extracted data to the database.
// POST → accepts { extraction, selections } and commits each category.

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { commitExtraction, type CommitResult } from "@/lib/ops/import/commit"
import type { ExtractionResult } from "@/lib/ops/import/extract"
import { badRequest, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

type Selections = {
  logEntries?: number[]
  registerItems?: number[]
  playbooks?: number[]
  tasks?: number[]
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return badRequest("A JSON body is required.")

    const { extraction, selections } = body as {
      extraction?: unknown
      selections?: unknown
    }

    if (!extraction || typeof extraction !== "object") {
      return badRequest("extraction data is required.")
    }

    const discipline = defaultDisciplineOf(session)
    if (!discipline) {
      return badRequest("No discipline configured for your account.")
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    if (!ctx) {
      return badRequest("Your discipline does not have an operations pack yet.")
    }

    const validSelections = validateSelections(selections)
    const result: CommitResult = await commitExtraction({
      packKey: ctx.packKey,
      ownerId: session.id,
      discipline,
      extraction: extraction as ExtractionResult,
      config: ctx.config,
      selections: validSelections,
    })

    const totals = {
      logEntries: result.logEntries.inserted,
      registerItems: result.registerItems.inserted,
      playbooks: result.playbooks.inserted,
      tasks: result.tasks.inserted,
      total:
        result.logEntries.inserted +
        result.registerItems.inserted +
        result.playbooks.inserted +
        result.tasks.inserted,
    }

    return NextResponse.json({
      success: true,
      data: { result, totals },
    })
  } catch (error) {
    return serverError(error, "commit extraction")
  }
}

function validateSelections(raw: unknown): Selections | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const obj = raw as Record<string, unknown>
  const result: Selections = {}

  for (const key of ["logEntries", "registerItems", "playbooks", "tasks"] as const) {
    const value = obj[key]
    if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
      result[key] = value as number[]
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}
