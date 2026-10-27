// GET /api/registers/export — the visible register as a CSV file. It uses the page's own
// filter grammar, so the file matches the rows the member is looking at (design §4, §12).

import { NextResponse } from "next/server"
import { loadVisibleRegisters, withState } from "@/lib/registers/read"
import { filterRegisters, parseRegisterView, registersToCsv } from "@/lib/registers/view-state"
import { bad, registerSession } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const gate = await registerSession()
  if (!gate) return bad("Unauthorized", 401)

  try {
    const search = new URL(request.url).searchParams
    const rows = withState(await loadVisibleRegisters(gate.viewer), gate.today)
    const filtered = filterRegisters(rows, parseRegisterView(search), gate.viewer.id, gate.today)
    const requestedPack = search.get("pack")
    const scoped = requestedPack ? filtered.filter((row) => row.packKey === requestedPack) : filtered

    return new NextResponse(registersToCsv(scoped, gate.today), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registers-${gate.today}.csv"`,
      },
    })
  } catch (error) {
    console.error("Register export error:", error)
    return bad("Failed to export the register", 500)
  }
}
