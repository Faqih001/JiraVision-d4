// /api/reports/export — real file export of any dataset.
// GET ?dataset=&rangeDays=&groupBy=&format=csv|json → attachment download.

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  DATASETS,
  badRequest,
  buildDataset,
  isDatasetKey,
  serverError,
  toCsv,
  unauthorized,
} from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const datasetParam = searchParams.get("dataset")
    if (!isDatasetKey(datasetParam)) return badRequest("dataset must be tasks, sprints, team or wellbeing")
    const format = searchParams.get("format") === "json" ? "json" : "csv"

    const result = await buildDataset(datasetParam, {
      rangeDays: Number(searchParams.get("rangeDays")),
      groupBy: searchParams.get("groupBy") ?? undefined,
    })

    const nameKey =
      DATASETS[datasetParam].groupBys.find((g) => g.key === searchParams.get("groupBy"))?.label ??
      DATASETS[datasetParam].groupBys[0].label
    const stamp = new Date().toISOString().slice(0, 10)
    const filename = `jiravision-${datasetParam}-${stamp}.${format}`

    if (format === "json") {
      return new NextResponse(JSON.stringify({ dataset: datasetParam, nameKey, ...result }, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return new NextResponse(toCsv(result, nameKey), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return serverError(error, "export dataset")
  }
}
